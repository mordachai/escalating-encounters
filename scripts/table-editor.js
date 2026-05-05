// scripts/table-editor.js — Table CRUD editor ApplicationV2
(function () {
  'use strict';
  const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

  class TableEditor extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: 'ee-table-editor',
      classes: ['ee-app', 'ee-table-editor'],
      window: { title: 'EE.TableEditor.Title', resizable: true, minimizable: true },
      position: { width: 700, height: 640 },
      actions: {
        "new-table": function() { this._newTable(); },
        "select-table": function(event, target) { this._selectTable(target.dataset.tableId); },
        "delete-table": function(event, target) { this._deleteTable(target.dataset.tableId); },
        "add-slot": function(event, target) { this._addSlot(target.dataset.tableId); },
        "delete-slot": function(event, target) { this._deleteSlot(target.dataset.tableId, target.dataset.slotId); },
        "add-outcome": function(event, target) { this._addOutcome(target.dataset.tableId, target.dataset.slotId); },
        "delete-outcome": function(event, target) { this._deleteOutcome(target.dataset.tableId, target.dataset.slotId, target.dataset.outcomeId); },
        "clear-uuid": function(event, target) { this._clearUuid(target.dataset); },
        "preview-sound": function(event, target) { this._previewSound(target.dataset.soundUuid); },
        "save": function() { this._save(); },
        "move-slot-up": function(event, target) { this._moveSlot(target.dataset.tableId, target.dataset.slotId, -1); },
        "move-slot-down": function(event, target) { this._moveSlot(target.dataset.tableId, target.dataset.slotId, 1); },
        "copy-advance": function(event, target) {
          navigator.clipboard.writeText(`game.escalatingEncounters.advance("${target.dataset.tableId}", "${target.dataset.slotId}")`);
          ui.notifications.info(game.i18n.localize('EE.TriggerEditor.IdCopied'));
        },
        "export-json": function() { this._exportJSON(); },
        "import-json": function() { this._importJSON(); }
      }
    };

    static PARTS = {
      main: { template: 'modules/escalating-encounters/templates/table-editor.hbs' }
    };

    static _instance = null;

    _tables = null;
    _selectedId = null;
    _openSlots = new Set();
    _scrollTop = null;

    static open() {
      if (!TableEditor._instance) TableEditor._instance = new TableEditor();
      const inst = TableEditor._instance;
      if (inst.rendered) inst.bringToTop();
      else inst.render(true);
      return inst;
    }

    async _onClose(options) {
      TableEditor._instance = null;
    }

    async _prepareContext(options) {
      if (!this._tables) this._tables = foundry.utils.deepClone(EE.Data.getTables());

      const tableList = Object.values(this._tables).map(t => ({
        id: t.id, name: t.name, isSelected: t.id === this._selectedId
      }));

      let selected = null;
      if (this._selectedId && this._tables[this._selectedId]) {
        const t = this._tables[this._selectedId];
        const TE = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
        selected = {
          id: t.id,
          name: t.name,
          slots: await Promise.all((t.slots ?? []).map(async (slot, si) => {
            const [actorLink, journalLink] = await Promise.all([
              slot.actorUuid ? TE.enrichHTML(`@UUID[${slot.actorUuid}]`) : Promise.resolve(null),
              slot.journalUuid ? TE.enrichHTML(`@UUID[${slot.journalUuid}]`) : Promise.resolve(null)
            ]);
            return {
              id: slot.id,
              label: slot.label,
              actorUuid: slot.actorUuid ?? '',
              journalUuid: slot.journalUuid ?? '',
              actorLink,
              journalLink,
              tableId: t.id,
              num: si + 1,
              isOpen: this._openSlots.has(slot.id),
              outcomes: await Promise.all((slot.outcomes ?? []).map(async (o, oi) => {
                const soundLink = o.soundUuid
                  ? await TE.enrichHTML(`@UUID[${o.soundUuid}]`)
                  : null;
                return {
                  id: o.id,
                  text: o.text ?? '',
                  soundUuid: o.soundUuid ?? '',
                  soundLink,
                  num: oi + 1,
                  tableId: t.id,
                  slotId: slot.id
                };
              }))
            };
          }))
        };
      }

      return { tableList, selected };
    }

    async _onFirstRender(context, options) {
      this.element.addEventListener('dragover', e => e.preventDefault());
      this.element.addEventListener('drop', this._onDrop.bind(this));
    }

    async _onRender(context, options) {
      if (this._scrollTop != null) {
        const pane = this.element.querySelector('.ee-detail-pane');
        if (pane) pane.scrollTop = this._scrollTop;
        this._scrollTop = null;
      }
    }

    _onDrop(event) {
      // UUID drop target: display pill (filled) or text input (empty) — both carry data-uuid-type + data-field
      const uuidTarget = event.target.closest('[data-uuid-type][data-field]');
      if (uuidTarget) {
        event.preventDefault();
        const data = TextEditor.implementation.getDragEventData(event);
        if (!data?.uuid) return;
        const { uuidType, field, tableId, slotId, outcomeId } = uuidTarget.dataset;
        const allowedTypes = uuidType ? uuidType.split(' ') : [];
        if (allowedTypes.length && !allowedTypes.includes(data.type)) {
          ui.notifications.warn(game.i18n.format('EE.TableEditor.WrongType', { expected: allowedTypes.join(' or ') }));
          return;
        }
        this._syncFromDOM();
        if (outcomeId) {
          const outcome = this._tables[tableId]?.slots?.find(s => s.id === slotId)?.outcomes?.find(o => o.id === outcomeId);
          if (outcome) outcome[field] = data.uuid;
        } else {
          const slot = this._tables[tableId]?.slots?.find(s => s.id === slotId);
          if (slot) slot[field] = data.uuid;
        }
        this.render();
        return;
      }

      // Outcome text textarea — insert @UUID[...] link at cursor position
      const textarea = event.target.closest('textarea[name="outcomeText"]');
      if (textarea) {
        event.preventDefault();
        const data = TextEditor.implementation.getDragEventData(event);
        if (!data?.uuid) return;
        const link = `@UUID[${data.uuid}]`;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.slice(0, start) + link + textarea.value.slice(end);
        textarea.selectionStart = textarea.selectionEnd = start + link.length;
      }
    }

    _captureUIState() {
      if (!this.element) return;
      const pane = this.element.querySelector('.ee-detail-pane');
      this._scrollTop = pane?.scrollTop ?? null;
      this._openSlots = new Set();
      for (const det of this.element.querySelectorAll('.ee-slot-editor')) {
        if (det.open) this._openSlots.add(det.dataset.slotId);
      }
    }

    _syncFromDOM() {
      this._captureUIState();
      if (!this._selectedId) return;
      const t = this._tables[this._selectedId];
      if (!t) return;

      const detail = this.element.querySelector('.ee-table-detail');
      if (!detail) return;

      t.name = detail.querySelector('[name="tableName"]')?.value ?? t.name;

      const slotEls = detail.querySelectorAll('.ee-slot-editor');
      for (const slotEl of slotEls) {
        const slotId = slotEl.dataset.slotId;
        const slot = t.slots?.find(s => s.id === slotId);
        if (!slot) continue;
        slot.label = slotEl.querySelector('[name="slotLabel"]')?.value ?? slot.label;
        slot.actorUuid = slotEl.querySelector('[name="actorUuid"]')?.value ?? slot.actorUuid;
        slot.journalUuid = slotEl.querySelector('[name="journalUuid"]')?.value ?? slot.journalUuid;

        const outcomeEls = slotEl.querySelectorAll('.ee-outcome-row');
        for (const oEl of outcomeEls) {
          const outcomeId = oEl.dataset.outcomeId;
          const outcome = slot.outcomes?.find(o => o.id === outcomeId);
          if (!outcome) continue;
          outcome.text = oEl.querySelector('[name="outcomeText"]')?.value ?? outcome.text;
          outcome.soundUuid = oEl.querySelector('[name="soundUuid"]')?.value ?? outcome.soundUuid;
        }
      }
    }

    _newTable() {
      this._syncFromDOM();
      const id = foundry.utils.randomID();
      this._tables[id] = { id, name: 'New Table', slots: [] };
      this._selectedId = id;
      this.render();
    }

    _selectTable(tableId) {
      this._syncFromDOM();
      this._selectedId = tableId;
      this.render();
    }

    async _deleteTable(tableId) {
      const confirmed = await DialogV2.confirm({
        content: `<p>${game.i18n.localize('EE.TableEditor.DeleteConfirm')}</p>`,
        rejectClose: false, modal: true
      });
      if (!confirmed) return;
      delete this._tables[tableId];
      if (this._selectedId === tableId) this._selectedId = null;
      await EE.Data.setTables(this._tables);
      const state = EE.Data.getState();
      for (const tid of Object.keys(state.tables)) {
        if (!this._tables[tid]) delete state.tables[tid];
      }
      await EE.Data.setState(state);
      if (EE.Panel._instance?.rendered) EE.Panel._instance.render();
      this.render();
    }

    _addSlot(tableId) {
      this._syncFromDOM();
      const t = this._tables[tableId];
      if (!t) return;
      t.slots ??= [];
      t.slots.push({ id: foundry.utils.randomID(), label: 'New Slot', actorUuid: '', journalUuid: '', outcomes: [] });
      this.render();
    }

    _deleteSlot(tableId, slotId) {
      this._syncFromDOM();
      const t = this._tables[tableId];
      if (!t) return;
      t.slots = (t.slots ?? []).filter(s => s.id !== slotId);
      this.render();
    }

    _moveSlot(tableId, slotId, dir) {
      this._syncFromDOM();
      const t = this._tables[tableId];
      if (!t) return;
      const slots = t.slots ?? [];
      const idx = slots.findIndex(s => s.id === slotId);
      if (idx < 0) return;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= slots.length) return;
      [slots[idx], slots[newIdx]] = [slots[newIdx], slots[idx]];
      this.render();
    }

    _addOutcome(tableId, slotId) {
      this._syncFromDOM();
      const slot = this._tables[tableId]?.slots?.find(s => s.id === slotId);
      if (!slot) return;
      slot.outcomes ??= [];
      slot.outcomes.push({ id: foundry.utils.randomID(), text: '', soundUuid: '' });
      this.render();
    }

    _deleteOutcome(tableId, slotId, outcomeId) {
      this._syncFromDOM();
      const slot = this._tables[tableId]?.slots?.find(s => s.id === slotId);
      if (!slot) return;
      slot.outcomes = (slot.outcomes ?? []).filter(o => o.id !== outcomeId);
      this.render();
    }

    _clearUuid({ tableId, slotId, outcomeId, field }) {
      this._syncFromDOM();
      if (outcomeId) {
        const outcome = this._tables[tableId]?.slots?.find(s => s.id === slotId)?.outcomes?.find(o => o.id === outcomeId);
        if (outcome) outcome[field] = '';
      } else {
        const slot = this._tables[tableId]?.slots?.find(s => s.id === slotId);
        if (slot) slot[field] = '';
      }
      this.render();
    }

    _previewSound(soundUuid) {
      if (soundUuid) EE.Engine.playSound(soundUuid);
    }

    async _exportJSON() {
      this._syncFromDOM();
      const payload = {
        version: 1,
        tables: this._tables ?? EE.Data.getTables(),
        triggers: EE.Data.getTriggers()
      };
      const json = JSON.stringify(payload, null, 2);

      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: 'escalating-encounters.json',
            types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(json);
          await writable.close();
        } catch (err) {
          if (err.name !== 'AbortError') console.error('EE | Export failed:', err);
        }
      } else {
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'escalating-encounters.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }

    async _importJSON() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.addEventListener('change', async () => {
        const file = input.files[0];
        if (!file) return;
        let payload;
        try { payload = JSON.parse(await file.text()); }
        catch { ui.notifications.error(game.i18n.localize('EE.TableEditor.ImportInvalid')); return; }

        const tables = payload.tables ?? {};
        const triggers = payload.triggers ?? {};
        const tableCount = Object.keys(tables).length;
        const triggerCount = Object.keys(triggers).length;

        if (!tableCount && !triggerCount) {
          ui.notifications.warn(game.i18n.localize('EE.TableEditor.ImportEmpty'));
          return;
        }

        const tableNames = Object.values(tables).map(t => `<li>${t.name}</li>`).join('');
        const triggerNames = Object.values(triggers).map(r => `<li>${r.name}</li>`).join('');
        const confirmed = await DialogV2.confirm({
          content: `<p>${game.i18n.format('EE.TableEditor.ImportConfirm', { tables: tableCount, triggers: triggerCount })}</p>
            ${tableNames ? `<ul>${tableNames}</ul>` : ''}
            ${triggerNames ? `<ul>${triggerNames}</ul>` : ''}`,
          rejectClose: false, modal: true
        });
        if (!confirmed) return;

        this._tables = tables;
        this._selectedId = null;
        await EE.Data.setTables(tables);
        await EE.Data.setTriggers(triggers);

        // Prune orphaned state
        const state = EE.Data.getState();
        for (const tid of Object.keys(state.tables)) {
          if (!tables[tid]) delete state.tables[tid];
        }
        for (const rid of Object.keys(state.macroCounts ?? {})) {
          if (!triggers[rid]) delete state.macroCounts[rid];
        }
        await EE.Data.setState(state);

        EE.Engine.rewireTriggers();
        if (EE.TriggerEditor._instance?.rendered) {
          EE.TriggerEditor._instance._triggers = null;
          EE.TriggerEditor._instance._selectedId = null;
          EE.TriggerEditor._instance.render();
        }
        if (EE.Panel._instance?.rendered) EE.Panel._instance.render();
        ui.notifications.info(game.i18n.format('EE.TableEditor.ImportDone', { tables: tableCount, triggers: triggerCount }));
        this.render();
      });
      input.click();
    }

    async _save() {
      this._syncFromDOM();
      await EE.Data.setTables(this._tables);

      // Remove orphaned state for deleted tables
      const state = EE.Data.getState();
      for (const tableId of Object.keys(state.tables)) {
        if (!this._tables[tableId]) delete state.tables[tableId];
      }
      await EE.Data.setState(state);

      ui.notifications.info(game.i18n.localize('EE.TableEditor.Saved'));
      if (EE.Panel._instance?.rendered) EE.Panel._instance.render();
    }
  }

  window.EE ??= {};
  EE.TableEditor = TableEditor;
})();
