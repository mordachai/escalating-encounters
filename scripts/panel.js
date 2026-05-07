// scripts/panel.js — GM Panel ApplicationV2
(function () {
  'use strict';
  const { ApplicationV2, HandlebarsApplicationMixin } =
    foundry.applications.api;

  class EncounterPanel extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
      id: 'ee-panel',
      classes: ['ee-app', 'ee-panel'],
      window: { title: 'EE.Panel.Title', resizable: true, minimizable: true },
      position: { width: 400, height: 580 },
      actions: {
        'select-table': function (event, target) {
          this._activeTableId = target.dataset.tableId;
          this.render();
        },
        'roll-table': function (event, target) {
          this._doRollTable(target.dataset.tableId);
        },
        'advance-slot': function (event, target) {
          this._doAdvanceSlot(target.dataset.tableId, target.dataset.slotId);
        },
        'reset-slot': function (event, target) {
          EE.Data.resetSlot(target.dataset.tableId, target.dataset.slotId).then(
            () => this.render(),
          );
        },
        'reset-table': function (event, target) {
          EE.Data.resetTable(target.dataset.tableId).then(() => this.render());
        },
        'reset-all': function () {
          this._doResetAll();
        },
        'toggle-defeated': function (event, target) {
          EE.Data.markDefeated(
            target.dataset.tableId,
            target.dataset.slotId,
            target.checked,
          ).then(() => this.render());
        },
        'open-table-editor': function () {
          EE.TableEditor.open();
        },
        'open-trigger-editor': function () {
          EE.TriggerEditor.open();
        },
        'copy-open-panel': function () {
          navigator.clipboard.writeText(
            'game.escalatingEncounters.openPanel()',
          );
          ui.notifications.info(
            game.i18n.localize('EE.TriggerEditor.IdCopied'),
          );
        },
      },
    };

    static PARTS = {
      main: { template: 'modules/escalating-encounters/templates/panel.hbs' },
    };

    static _instance = null;

    _activeTableId = null;
    _lastResult = null;

    static open() {
      if (!EncounterPanel._instance)
        EncounterPanel._instance = new EncounterPanel();
      const inst = EncounterPanel._instance;
      if (inst.rendered) inst.bringToFront();
      else inst.render(true);
      return inst;
    }

    async _onFirstRender(context, options) {
      this._stateHookId = Hooks.on('ee.stateChanged', () => {
        if (this.rendered) this.render();
      });
      this.element.addEventListener('dragstart', this._onDragStart.bind(this));
    }

    _onDragStart(event) {
      // Portrait drag: actor UUID stored directly on the element.
      // Enriched content links (@UUID[...]) are handled by Foundry's own global handler.
      const portrait = event.target.closest('[data-actor-uuid]');
      if (!portrait?.dataset.actorUuid) return;
      event.dataTransfer.setData(
        'text/plain',
        JSON.stringify({ type: 'Actor', uuid: portrait.dataset.actorUuid }),
      );
      event.dataTransfer.effectAllowed = 'copy';
    }

    async _onClose(options) {
      Hooks.off('ee.stateChanged', this._stateHookId);
      EncounterPanel._instance = null;
    }

    async _prepareContext(options) {
      const tables = EE.Data.getTables();
      const state = EE.Data.getState();

      const tableList = await Promise.all(
        Object.values(tables).map(async (table) => {
          const slots = await Promise.all(
            (table.slots ?? []).map(async (slot) => {
              const ss = state.tables[table.id]?.[slot.id] ?? {
                count: 0,
                defeated: false,
              };
              const atMax = ss.count >= (slot.outcomes?.length ?? 0);
              const actor = slot.actorUuid
                ? await fromUuid(slot.actorUuid).catch(() => null)
                : null;
              const outcomes = (slot.outcomes ?? []).map((o, i) => ({
                ...o,
                done: i + 1 <= ss.count,
              }));
              return {
                id: slot.id,
                label: slot.label,
                actorImg: actor?.img ?? null,
                actorUuid: slot.actorUuid ?? null,
                outcomes,
                count: ss.count,
                total: slot.outcomes?.length ?? 0,
                defeated: ss.defeated,
                atMax,
                tableId: table.id,
              };
            }),
          );
          return {
            id: table.id,
            name: table.name,
            slots,
            isActive: table.id === this._activeTableId,
          };
        }),
      );

      // Auto-select first table when none is active
      if (!this._activeTableId && tableList.length) {
        this._activeTableId = tableList[0].id;
        tableList[0].isActive = true;
      }

      const activeTable =
        tableList.find((t) => t.id === this._activeTableId) ?? null;

      let lastResult = null;
      if (this._lastResult) {
        const { slot, outcome, count } = this._lastResult;
        const enriched = outcome?.text
          ? await TextEditor.enrichHTML(outcome.text)
          : '';
        const actor = slot.actorUuid
          ? await fromUuid(slot.actorUuid).catch(() => null)
          : null;
        const journalLink = slot.journalUuid
          ? await TextEditor.enrichHTML(`@UUID[${slot.journalUuid}]`).catch(
              () => null,
            )
          : null;
        lastResult = {
          slotLabel: slot.label,
          count,
          enriched,
          actorImg: actor?.img ?? null,
          actorUuid: slot.actorUuid ?? null,
          journalLink,
        };
      }

      return { tableList, activeTable, lastResult };
    }

    async _doRollTable(tableId) {
      const results = await EE.Engine.fireTargets([{ tableId, slotId: null }]);
      if (!results.length) {
        ui.notifications.warn(game.i18n.localize('EE.Panel.AllExhausted'));
      } else {
        this._lastResult = results[0];
      }
      this.render();
    }

    async _doAdvanceSlot(tableId, slotId) {
      const results = await EE.Engine.fireTargets([{ tableId, slotId }]);
      if (results.length) this._lastResult = results[0];
      this.render();
    }

    async _doResetAll() {
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        content: `<p>${game.i18n.localize('EE.Panel.ResetAllConfirm')}</p>`,
        rejectClose: false,
        modal: true,
      });
      if (!confirmed) return;
      await EE.Data.resetAll();
      this._lastResult = null;
      this.render();
    }
  }

  window.EE ??= {};
  EE.Panel = EncounterPanel;
})();
