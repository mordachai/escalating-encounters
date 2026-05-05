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
      trigger(ruleId, callerId) {
        if (!game.user.isGM) return Promise.resolve([]);
        const rule = EE.Data.getTriggers()[ruleId];
        if (!rule) {
          console.warn(`EE | No trigger rule found with id "${ruleId}"`);
          return Promise.resolve([]);
        }
        if (rule.enabled === false) return Promise.resolve([]);

        const mode = rule.params?.mode ?? (rule.params?.once ? 'once' : 'unlimited');
        const state = EE.Data.getState();
        state.macroCalled ??= {};

        if (mode === 'once') {
          const count = state.macroCounts[ruleId] ?? 0;
          if (count >= 1) return Promise.resolve([]);
          state.macroCounts[ruleId] = count + 1;
          EE.Data.setState(state);
        } else if (mode === 'oncePerCaller') {
          if (!callerId) {
            console.warn(`EE | trigger("${ruleId}") called in oncePerCaller mode without a callerId — firing anyway`);
          } else {
            const called = state.macroCalled[ruleId] ?? [];
            if (called.includes(String(callerId))) return Promise.resolve([]);
            state.macroCalled[ruleId] = [...called, String(callerId)];
            EE.Data.setState(state);
          }
        } else {
          const count = state.macroCounts[ruleId] ?? 0;
          state.macroCounts[ruleId] = count + 1;
          EE.Data.setState(state);
        }

        return EE.Engine.fireTargets(rule.targets ?? []);
      },
      advance(tableId, slotId) {
        if (!game.user.isGM) return Promise.resolve([]);
        return EE.Engine.fireTargets([{ tableId, slotId }]);
      },
      openPanel() {
        return EE.Panel.open();
      }
    };

    EE.Engine.initEngine();
  });

  Hooks.on('getSceneControlButtons', controls => {
    if (!game.user?.isGM) return;
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
