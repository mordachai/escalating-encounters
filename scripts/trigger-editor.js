// scripts/trigger-editor.js — Trigger CRUD editor ApplicationV2
(function () {
  'use strict';
  const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

  function slugify(str) {
    return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'rule';
  }

  class CallerAuditApp extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      classes: ['ee-app', 'ee-caller-audit'],
      window: { title: 'EE.TriggerEditor.CallerAuditTitle', resizable: true, minimizable: true },
      position: { width: 460, height: 'auto' },
      actions: {
        'reset-all': async function() {
          await EE.Data.resetCallers(this._ruleId);
          EE.TriggerEditor._instance?.render();
          this.render();
        },
        'reset-caller': async function(_event, target) {
          await EE.Data.resetCaller(this._ruleId, target.dataset.callerId);
          EE.TriggerEditor._instance?.render();
          this.render();
        }
      }
    };

    static PARTS = {
      main: { template: 'modules/escalating-encounters/templates/caller-audit.hbs' }
    };

    constructor(ruleId, options = {}) {
      super(foundry.utils.mergeObject({ id: `ee-caller-audit-${ruleId}` }, options));
      this._ruleId = ruleId;
    }

    async _prepareContext() {
      const state = EE.Data.getState();
      const callerIds = state.macroCalled?.[this._ruleId] ?? [];
      const rule = EE.Data.getTriggers()[this._ruleId];
      return {
        ruleName: rule?.name ?? this._ruleId,
        callers: callerIds.map(id => ({
          id,
          name: game.macros.get(id)?.name ?? game.i18n.localize('EE.TriggerEditor.MacroUnknown')
        }))
      };
    }
  }

  class TriggerEditor extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: 'ee-trigger-editor',
      classes: ['ee-app', 'ee-trigger-editor'],
      window: { title: 'EE.TriggerEditor.Title', resizable: true, minimizable: true },
      position: { width: 640, height: 580 },
      actions: {
        "new-rule": function() { this._newRule(); },
        "select-rule": function(event, target) { this._selectRule(target.dataset.ruleId); },
        "delete-rule": function(event, target) { this._deleteRule(target.dataset.ruleId); },
        "add-target": function() { this._addTarget(); },
        "remove-target": function(event, target) { this._removeTarget(Number(target.dataset.targetIdx)); },
        "add-excluded-scene": function() { this._addExcludedScene(); },
        "remove-excluded-scene": function(event, target) { this._removeExcludedScene(Number(target.dataset.idx)); },
        "copy-id": function() {
          this._syncFromDOM();
          const rule = this._triggers?.[this._selectedId];
          if (rule) this._copyToClipboard(rule._pendingSlug ?? rule.id);
        },
        "copy-command": function() {
          this._syncFromDOM();
          const rule = this._triggers?.[this._selectedId];
          if (!rule) return;
          const ruleId = rule._pendingSlug ?? rule.id;
          const mode = rule.params?.mode ?? (rule.params?.once ? 'once' : 'unlimited');
          const args = mode === 'oncePerCaller' ? `"${ruleId}", this.id` : `"${ruleId}"`;
          this._copyToClipboard(`game.escalatingEncounters.trigger(${args})`);
        },
        "copy-command-async": function() {
          this._syncFromDOM();
          const rule = this._triggers?.[this._selectedId];
          if (!rule) return;
          const ruleId = rule._pendingSlug ?? rule.id;
          const mode = rule.params?.mode ?? (rule.params?.once ? 'once' : 'unlimited');
          const args = mode === 'oncePerCaller' ? `"${ruleId}", this.id` : `"${ruleId}"`;
          this._copyToClipboard(`await game.escalatingEncounters.trigger(${args})`);
        },
        "reset-macro-count": function(event, target) {
          EE.Data.resetMacroCount(target.dataset.ruleId).then(() => this.render());
        },
        "open-caller-audit": function(_event, target) {
          new CallerAuditApp(target.dataset.ruleId).render(true);
        },
        "save": function() { this._save(); }
      }
    };

    static PARTS = {
      main: { template: 'modules/escalating-encounters/templates/trigger-editor.hbs' }
    };

    static _instance = null;

    _triggers = null;
    _selectedId = null;
    _slugManual = new Set();

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
        const type = rule.type ?? 'manual';
        const isSceneType = type === 'sceneFirstVisit' || type === 'sceneEveryVisit';
        const sceneMode = isSceneType ? (rule.params?.sceneMode ?? 'specific') : 'specific';
        const macroMode = type === 'macroNth'
          ? (rule.params?.mode ?? (rule.params?.once ? 'once' : 'unlimited'))
          : 'unlimited';
        const state = EE.Data.getState();
        const macroCallerCount = (state.macroCalled?.[rule.id] ?? []).length;

        selected = {
          id: rule.id,
          slug: rule._pendingSlug ?? rule.id,
          name: rule.name,
          type: type,
          params: rule.params ?? {},
          isManual: type === 'manual',
          isSceneFirst: type === 'sceneFirstVisit',
          isSceneEvery: type === 'sceneEveryVisit',
          isSceneType,
          isSceneSpecific: isSceneType && sceneMode === 'specific',
          isSceneAnyExcept: isSceneType && sceneMode === 'anyExcept',
          sceneModeSpecific: sceneMode === 'specific',
          sceneModeAny: sceneMode === 'any',
          sceneModeAnyExcept: sceneMode === 'anyExcept',
          excludedScenes: (rule.params?.excludedSceneIds ?? []).map((uuid, idx) => ({ idx, uuid })),
          isMacro: type === 'macroNth',
          macroMode,
          macroModeUnlimited: macroMode === 'unlimited',
          macroModeOnce: macroMode === 'once',
          macroModeOncePerCaller: macroMode === 'oncePerCaller',
          firedCount: state.macroCounts[rule.id] ?? 0,
          macroCallerCount,
          isHook: type === 'hook',
          isTimer: type === 'timer',
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
      if (sel.name === 'ruleName') {
        if (!this._slugManual.has(this._selectedId)) {
          const slugInput = this.element.querySelector('[name="ruleSlug"]');
          if (slugInput) slugInput.value = slugify(sel.value);
        }
        return;
      }
      if (sel.name === 'ruleSlug') {
        this._slugManual.add(this._selectedId);
        return;
      }
      if (sel.name === 'ruleType') {
        this._syncFromDOM();
        this._triggers[this._selectedId].type = sel.value;
        this.render();
        return;
      }
      if (sel.name === 'sceneMode' || sel.name === 'macroMode') {
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

    _syncFromDOM() {
      if (!this._selectedId) return;
      const rule = this._triggers[this._selectedId];
      if (!rule) return;

      const detail = this.element.querySelector('.ee-rule-detail');
      if (!detail) return;

      rule.name = detail.querySelector('[name="ruleName"]')?.value ?? rule.name;

      const slugVal = detail.querySelector('[name="ruleSlug"]')?.value?.trim();
      if (slugVal && slugVal !== this._selectedId) rule._pendingSlug = slugVal;
      else delete rule._pendingSlug;

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
        case 'macroNth':
          rule.params = {
            mode: detail.querySelector('[name="macroMode"]')?.value ?? 'unlimited'
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
      const base = slugify('new-rule');
      let id = base, n = 2;
      while (this._triggers[id]) id = `${base}-${n++}`;
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
      this._slugManual.delete(ruleId);
      if (this._selectedId === ruleId) this._selectedId = null;
      await EE.Data.setTriggers(this._triggers);
      EE.Engine.rewireTriggers();
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

    async _copyToClipboard(text) {
      await navigator.clipboard.writeText(text);
      ui.notifications.info(game.i18n.localize('EE.TriggerEditor.IdCopied'));
    }

    async _save() {
      this._syncFromDOM();

      // Apply pending slug renames
      const renames = Object.entries(this._triggers)
        .filter(([oldId, rule]) => rule._pendingSlug && rule._pendingSlug !== oldId)
        .map(([oldId, rule]) => ({ oldId, newId: slugify(rule._pendingSlug) }));

      for (const { oldId, newId } of renames) {
        if (!newId) continue;
        if (this._triggers[newId] && newId !== oldId) {
          ui.notifications.error(game.i18n.format('EE.TriggerEditor.SlugConflict', { slug: newId }));
          return;
        }
        const rule = this._triggers[oldId];
        delete rule._pendingSlug;
        rule.id = newId;
        this._triggers[newId] = rule;
        delete this._triggers[oldId];
        this._slugManual.delete(oldId);
        if (this._selectedId === oldId) this._selectedId = newId;
      }

      // Update macroCounts and macroCalled keys in state for renamed rules
      if (renames.length) {
        const state = EE.Data.getState();
        state.macroCalled ??= {};
        for (const { oldId, newId } of renames) {
          if (state.macroCounts?.[oldId] !== undefined) {
            state.macroCounts[newId] = state.macroCounts[oldId];
            delete state.macroCounts[oldId];
          }
          if (state.macroCalled[oldId] !== undefined) {
            state.macroCalled[newId] = state.macroCalled[oldId];
            delete state.macroCalled[oldId];
          }
        }
        await EE.Data.setState(state);
      }

      // Strip any leftover internal fields before saving
      for (const rule of Object.values(this._triggers)) delete rule._pendingSlug;

      await EE.Data.setTriggers(this._triggers);
      EE.Engine.rewireTriggers();
      ui.notifications.info(game.i18n.localize('EE.TriggerEditor.Saved'));
    }
  }

  window.EE ??= {};
  EE.TriggerEditor = TriggerEditor;
})();
