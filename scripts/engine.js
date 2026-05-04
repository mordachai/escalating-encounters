// scripts/engine.js — trigger wiring, slot advancement, sound, chat notifications
(function () {
  'use strict';
  const M = 'escalating-encounters';
  const _hookRegistry = {};
  const _timerRegistry = {};

  function playSound(soundUuid) {
    if (!soundUuid) return;
    const helper = foundry.audio?.AudioHelper ?? globalThis.AudioHelper;
    fromUuid(soundUuid).then(doc => {
      if (!doc?.path) return;
      helper.play({ src: doc.path, volume: 0.8, autoplay: true, loop: false }, true);
    }).catch(() => {});
  }

  async function postChatCard(results) {
    for (const { slot, outcome, count } of results) {
      const enriched = outcome?.text ? await TextEditor.enrichHTML(outcome.text) : '';
      const actor = slot.actorUuid ? await fromUuid(slot.actorUuid).catch(() => null) : null;
      const journalLink = slot.journalUuid
        ? await TextEditor.enrichHTML(`@UUID[${slot.journalUuid}]`).catch(() => null)
        : null;
      const img = actor?.img
        ? `<img src="${actor.img}" class="ee-chat-portrait" alt="" />`
        : '';
      const content = `<div class="ee-chat-card">
        ${img}
        <div class="ee-chat-body">
          <strong class="ee-chat-slot-label">${slot.label}</strong>
          <em class="ee-chat-outcome-num">${game.i18n.format('EE.Chat.Outcome', { n: count })}</em>
          ${enriched ? `<div class="ee-chat-text">${enriched}</div>` : ''}
          ${journalLink ? `<div class="ee-chat-journal">${journalLink}</div>` : ''}
        </div>
      </div>`;
      await ChatMessage.create({
        content,
        whisper: ChatMessage.getWhisperRecipients('GM').map(u => u.id),
        speaker: { alias: game.i18n.localize('EE.Chat.Triggered') }
      });
    }
  }

  async function fireTargets(targets) {
    const results = [];
    for (const target of (targets ?? [])) {
      const { tableId, slotId } = target;
      const effectiveSlotId = slotId || EE.Data.pickRandomSlot(tableId)?.id;
      if (!effectiveSlotId) continue;
      const result = EE.Data.advanceSlot(tableId, effectiveSlotId);
      if (!result) continue;
      results.push(result);
      if (result.outcome?.soundUuid) playSound(result.outcome.soundUuid);
    }
    if (results.length) await postChatCard(results);
    Hooks.callAll('ee.stateChanged', results);
    return results;
  }

  // Returns true if sceneId matches the rule's scene scope params.
  function _sceneMatches(rule, sceneId) {
    const mode = rule.params?.sceneMode ?? 'specific';
    if (mode === 'any') return true;
    if (mode === 'anyExcept') return !(rule.params?.excludedSceneIds ?? []).includes(sceneId);
    return rule.params?.sceneId === sceneId;
  }

  function _rewireHookTriggers() {
    for (const [id, hid] of Object.entries(_hookRegistry)) {
      const rule = EE.Data.getTriggers()[id];
      if (rule?.type === 'hook' && rule.params?.hookName) {
        Hooks.off(rule.params.hookName, hid);
      }
    }
    Object.keys(_hookRegistry).forEach(k => delete _hookRegistry[k]);

    for (const [id, rule] of Object.entries(EE.Data.getTriggers())) {
      if (rule.type !== 'hook' || rule.enabled === false) continue;
      const { hookName, condition } = rule.params ?? {};
      if (!hookName) continue;
      _hookRegistry[id] = Hooks.on(hookName, (...args) => {
        if (condition) {
          try {
            if (!new Function('args', `return (${condition})`)(args)) return;
          } catch (err) {
            console.warn(`EE | Hook condition error for "${rule.name}":`, err);
            return;
          }
        }
        fireTargets(rule.targets ?? []);
        ui.notifications.info(game.i18n.format('EE.Notify.HookFired', { name: rule.name }));
      });
    }
  }

  function scheduleTimer(ruleId, rule) {
    const minMs = Math.max((rule.params?.minMinutes ?? 1) * 60_000, 20_000);
    const maxMs = Math.max((rule.params?.maxMinutes ?? 1) * 60_000, minMs);
    const step = 20_000;
    const steps = Math.round((maxMs - minMs) / step);
    const interval = minMs + Math.floor(Math.random() * (steps + 1)) * step;

    _timerRegistry[ruleId] = setTimeout(() => {
      if (!game.user?.isGM) return;
      const currentRule = EE.Data.getTriggers()[ruleId];
      if (!currentRule || currentRule.type !== 'timer') return;
      fireTargets(currentRule.targets ?? []);
      ui.notifications.info(game.i18n.format('EE.Notify.TimerFired', { name: currentRule.name }));
      delete _timerRegistry[ruleId];
      scheduleTimer(ruleId, currentRule);
    }, interval);
  }

  function _rewireTimerTriggers() {
    for (const id of Object.keys(_timerRegistry)) {
      clearTimeout(_timerRegistry[id]);
      delete _timerRegistry[id];
    }
    if (!game.user?.isGM) return;
    for (const [id, rule] of Object.entries(EE.Data.getTriggers())) {
      if (rule.type !== 'timer' || rule.enabled === false) continue;
      scheduleTimer(id, rule);
    }
  }

  function rewireTriggers() {
    _rewireHookTriggers();
    _rewireTimerTriggers();
  }

  function initEngine() {
    Hooks.on('canvasReady', () => {
      if (!game.user?.isGM) return;
      const sceneId = canvas.scene?.id;
      if (!sceneId) return;
      const triggers = EE.Data.getTriggers();
      const state = EE.Data.getState();
      const isNew = !state.scenesSeen.includes(sceneId);

      const firstVisitRules = [];
      const everyVisitRules = [];

      for (const rule of Object.values(triggers)) {
        if (rule.enabled === false) continue;
        if (rule.type === 'sceneFirstVisit' && isNew && _sceneMatches(rule, sceneId)) {
          firstVisitRules.push(rule);
        } else if (rule.type === 'sceneEveryVisit' && _sceneMatches(rule, sceneId)) {
          everyVisitRules.push(rule);
        }
      }

      if (isNew && firstVisitRules.length) {
        state.scenesSeen.push(sceneId);
        EE.Data.setState(state);
      }

      for (const rule of [...firstVisitRules, ...everyVisitRules]) {
        fireTargets(rule.targets ?? []);
        ui.notifications.info(game.i18n.format('EE.Notify.SceneFired', { name: rule.name }));
      }
    });

    Hooks.on('updateSetting', setting => {
      if (setting.key === `${M}.ee-state`) Hooks.callAll('ee.stateChanged');
    });

    rewireTriggers();
  }

  window.EE ??= {};
  EE.Engine = { fireTargets, playSound, rewireTriggers, initEngine };
})();
