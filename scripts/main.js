// scripts/main.js — init, settings registration, public API, scene-control button
(function () {
  'use strict';
  const M = 'escalating-encounters';

  Hooks.once('init', function () {
    window.EE ??= {};

    game.settings.register(M, 'ee-tables', {
      scope: 'world', config: false, type: Object, default: {}
    });
    game.settings.register(M, 'ee-triggers', {
      scope: 'world', config: false, type: Object, default: {}
    });
    game.settings.register(M, 'ee-state', {
      scope: 'world', config: false, type: Object,
      default: { tables: {}, scenesSeen: [], macroCounts: {} }
    });

    game.escalatingEncounters = {
      trigger(ruleId) {
        if (!game.user.isGM) return Promise.resolve([]);
        const rule = EE.Data.getTriggers()[ruleId];
        if (!rule) {
          console.warn(`EE | No trigger rule found with id "${ruleId}"`);
          return Promise.resolve([]);
        }
        if (rule.enabled === false) return Promise.resolve([]);
        const state = EE.Data.getState();
        state.macroCounts[ruleId] = (state.macroCounts[ruleId] ?? 0) + 1;
        EE.Data.setState(state);
        return EE.Engine.fireTargets(rule.targets ?? []);
      },
      advance(tableId, slotId) {
        if (!game.user.isGM) return null;
        const result = EE.Data.advanceSlot(tableId, slotId);
        if (result) Hooks.callAll('ee.stateChanged');
        return result;
      },
      openPanel() {
        return EE.Panel.open();
      }
    };

    EE.Engine.initEngine();
  });

  Hooks.once('ready', async function () {
    await loadTemplates([
      `modules/${M}/templates/panel.hbs`,
      `modules/${M}/templates/table-editor.hbs`,
      `modules/${M}/templates/trigger-editor.hbs`
    ]);
  });

  Hooks.on('getSceneControlButtons', controls => {
    if (!game.user.isGM) return;
    if (!controls.tokens) return;
    const order = Object.keys(controls.tokens.tools).length;
    controls.tokens.tools['escalating-encounters'] = {
      name: 'escalating-encounters',
      title: 'EE.Panel.Title',
      icon: 'fas fa-dice-d20',
      order,
      button: true,
      visible: true,
      onChange: () => EE.Panel.open()
    };
  });
})();
