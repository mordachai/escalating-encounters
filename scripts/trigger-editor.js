// scripts/trigger-editor.js — Trigger CRUD editor ApplicationV2
(function () {
  'use strict';
  const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

  class TriggerEditor extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: 'ee-trigger-editor',
      classes: ['ee-app', 'ee-trigger-editor'],
      window: { title: 'EE.TriggerEditor.Title', resizable: true, minimizable: true },
      position: { width: 640, height: 580 }
    };

    static PARTS = {
      main: { template: 'modules/escalating-encounters/templates/trigger-editor.hbs' }
    };

    static _instance = null;

    _triggers = null;
    _selectedId = null;

    static open() {
      if (!TriggerEditor._instance) TriggerEditor._instance = new TriggerEditor();
      const inst = TriggerEditor._instance;
      if (inst.rendered) inst.bringToTop();
      else inst.render(true);
      return inst;
    }

    async _onClose(options) {
      TriggerEditor._instance = null;
    }

    async _prepareContext(options) {
      if (!this._triggers) this._triggers = foundry.utils.deepClone(EE.Data.getTriggers());

      const ruleList = Object.values(this._triggers).map(r => ({
        id: r.id, name: r.name, type: r.type, isSelected: r.id === this._selectedId,
        enabled: r.enabled !== false
      }));

      let selected = null;
      if (this._selectedId && this._triggers[this._selectedId]) {
        const rule = this._triggers[this._selectedId];
        const tables = EE.Data.getTables();
        const tableList = Object.values(tables);
        const isSceneType = rule.type === 'sceneFirstVisit' || rule.type === 'sceneEveryVisit';
        const sceneMode = isSceneType ? (rule.params?.sceneMode ?? 'specific') : 'specific';

        selected = {
          id: rule.id,
          name: rule.name,
          type: rule.type,
          params: rule.params ?? {},
          isManual: rule.type === 'manual',
          isSceneFirst: rule.type === 'sceneFirstVisit',
          isSceneEvery: rule.type === 'sceneEveryVisit',
          isSceneType,
          isSceneSpecific: isSceneType && sceneMode === 'specific',
          isSceneAnyExcept: isSceneType && sceneMode === 'anyExcept',
          sceneModeSpecific: sceneMode === 'specific',
          sceneModeAny: sceneMode === 'any',
          sceneModeAnyExcept: sceneMode === 'anyExcept',
          excludedScenes: (rule.params?.excludedSceneIds ?? []).map((uuid, idx) => ({ idx, uuid })),
          isMacro: rule.type === 'macroNth',
          isHook: rule.type === 'hook',
          isTimer: rule.type === 'timer',
          macroNote: game.i18n.format('EE.TriggerEditor.MacroNote', { id: rule.id }),
          tableList,
          targets: (rule.targets ?? []).map((target, idx) => ({
            idx,
            tableId: target.tableId ?? '',
            slotId: target.slotId ?? '',
            tableOptions: tableList.map(t => ({
              value: t.id, label: t.name, selected: t.id === target.tableId
            })),
            slotOptions: target.tableId ? [
              { value: '', label: game.i18n.localize('EE.TriggerEditor.SlotRandom'), selected: !target.slotId },
              ...(tables[target.tableId]?.slots ?? []).map(s => ({
                value: s.id, label: s.label, selected: s.id === target.slotId
              }))
            ] : [{ value: '', label: game.i18n.localize('EE.TriggerEditor.SlotRandom'), selected: true }]
          }))
        };
      }

      return { ruleList, selected };
    }

    async _onFirstRender(context, options) {
      this.element.addEventListener('change', this._onChange.bind(this));
      this.element.addEventListener('dragover', e => e.preventDefault());
      this.element.addEventListener('drop', this._onDrop.bind(this));
    }

    _onChange(event) {
      const sel = event.target;
      if (sel.name === 'ruleEnabled') {
        this._toggleEnabled(sel.dataset.ruleId, sel.checked);
        return;
      }
      if (sel.name === 'ruleType') {
        this._syncFromDOM();
        this._triggers[this._selectedId].type = sel.value;
        this.render();
        return;
      }
      if (sel.name === 'sceneMode') {
        this._syncFromDOM();
        this.render();
        return;
      }
      if (sel.dataset.targetIdx !== undefined && sel.name === 'targetTable') {
        this._syncFromDOM();
        const idx = Number(sel.dataset.targetIdx);
        const rule = this._triggers[this._selectedId];
        if (rule?.targets?.[idx] !== undefined) {
          rule.targets[idx].tableId = sel.value;
          rule.targets[idx].slotId = null;
        }
        this.render();
      }
    }

    _onDrop(event) {
      const input = event.target.closest('[data-uuid-type]');
      if (!input) return;
      event.preventDefault();
      const data = TextEditor.implementation.getDragEventData(event);
      if (!data?.uuid) return;
      const expected = input.dataset.uuidType;
      if (expected && data.type !== expected) {
        ui.notifications.warn(game.i18n.format('EE.TableEditor.WrongType', { expected }));
        return;
      }
      input.value = data.uuid;
    }

    _onClickAction(event, target) {
      const action = target.dataset.action;
      switch (action) {
        case 'new-rule':              this._newRule(); break;
        case 'select-rule':           this._selectRule(target.dataset.ruleId); break;
        case 'delete-rule':           this._deleteRule(target.dataset.ruleId); break;
        case 'add-target':            this._addTarget(); break;
        case 'remove-target':         this._removeTarget(Number(target.dataset.targetIdx)); break;
        case 'add-excluded-scene':    this._addExcludedScene(); break;
        case 'remove-excluded-scene': this._removeExcludedScene(Number(target.dataset.idx)); break;
        case 'copy-id':               this._copyId(target.dataset.ruleId); break;
        case 'save':                  this._save(); break;
      }
    }

    _syncFromDOM() {
      if (!this._selectedId) return;
      const rule = this._triggers[this._selectedId];
      if (!rule) return;

      const detail = this.element.querySelector('.ee-rule-detail');
      if (!detail) return;

      rule.name = detail.querySelector('[name="ruleName"]')?.value ?? rule.name;

      switch (rule.type) {
        case 'sceneFirstVisit':
        case 'sceneEveryVisit': {
          const mode = detail.querySelector('[name="sceneMode"]')?.value ?? 'specific';
          const params = { sceneMode: mode };
          if (mode === 'specific') {
            params.sceneId = detail.querySelector('[name="sceneUuid"]')?.value ?? '';
          } else if (mode === 'anyExcept') {
            params.excludedSceneIds = Array.from(
              detail.querySelectorAll('[name="excludedSceneId"]')
            ).map(i => i.value).filter(Boolean);
          }
          rule.params = params;
          break;
        }
        case 'hook':
          rule.params = {
            hookName: detail.querySelector('[name="hookName"]')?.value ?? '',
            condition: detail.querySelector('[name="condition"]')?.value ?? ''
          };
          break;
        case 'timer':
          rule.params = {
            minMinutes: Number(detail.querySelector('[name="timerMin"]')?.value ?? 1),
            maxMinutes: Number(detail.querySelector('[name="timerMax"]')?.value ?? 1)
          };
          break;
        default:
          rule.params = {};
      }

      const targetRows = detail.querySelectorAll('.ee-target-row');
      rule.targets = Array.from(targetRows).map(row => ({
        tableId: row.querySelector('[name="targetTable"]')?.value ?? '',
        slotId: row.querySelector('[name="targetSlot"]')?.value || null
      })).filter(t => t.tableId);
    }

    _newRule() {
      this._syncFromDOM();
      const id = foundry.utils.randomID();
      this._triggers[id] = { id, name: 'New Rule', type: 'manual', params: {}, targets: [] };
      this._selectedId = id;
      this.render();
    }

    _selectRule(ruleId) {
      this._syncFromDOM();
      this._selectedId = ruleId;
      this.render();
    }

    async _deleteRule(ruleId) {
      const confirmed = await DialogV2.confirm({
        content: `<p>${game.i18n.localize('EE.TriggerEditor.DeleteConfirm')}</p>`,
        rejectClose: false, modal: true
      });
      if (!confirmed) return;
      delete this._triggers[ruleId];
      if (this._selectedId === ruleId) this._selectedId = null;
      this.render();
    }

    _addTarget() {
      this._syncFromDOM();
      const rule = this._triggers[this._selectedId];
      if (!rule) return;
      rule.targets ??= [];
      rule.targets.push({ tableId: '', slotId: null });
      this.render();
    }

    _removeTarget(idx) {
      this._syncFromDOM();
      const rule = this._triggers[this._selectedId];
      if (!rule?.targets) return;
      rule.targets.splice(idx, 1);
      this.render();
    }

    _addExcludedScene() {
      this._syncFromDOM();
      const rule = this._triggers[this._selectedId];
      if (!rule) return;
      rule.params.excludedSceneIds ??= [];
      rule.params.excludedSceneIds.push('');
      this.render();
    }

    _removeExcludedScene(idx) {
      this._syncFromDOM();
      const rule = this._triggers[this._selectedId];
      if (!rule?.params?.excludedSceneIds) return;
      rule.params.excludedSceneIds.splice(idx, 1);
      this.render();
    }

    async _toggleEnabled(ruleId, enabled) {
      this._syncFromDOM();
      const rule = this._triggers[ruleId];
      if (!rule) return;
      rule.enabled = enabled;
      await EE.Data.setTriggers(this._triggers);
      EE.Engine.rewireTriggers();
      this.render();
    }

    async _copyId(ruleId) {
      await navigator.clipboard.writeText(ruleId);
      ui.notifications.info(game.i18n.localize('EE.TriggerEditor.IdCopied'));
    }

    async _save() {
      this._syncFromDOM();
      await EE.Data.setTriggers(this._triggers);
      EE.Engine.rewireTriggers();
      ui.notifications.info(game.i18n.localize('EE.TriggerEditor.Saved'));
    }
  }

  window.EE ??= {};
  EE.TriggerEditor = TriggerEditor;
})();
