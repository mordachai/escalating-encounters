// scripts/data.js — pure CRUD helpers for tables / triggers / state
(function () {
  'use strict';
  const M = 'escalating-encounters';

  function getTables() { return game.settings.get(M, 'ee-tables') ?? {}; }
  function setTables(v) { return game.settings.set(M, 'ee-tables', v); }
  function getTriggers() { return game.settings.get(M, 'ee-triggers') ?? {}; }
  function setTriggers(v) { return game.settings.set(M, 'ee-triggers', v); }
  function getState() { return game.settings.get(M, 'ee-state') ?? { tables: {}, scenesSeen: [], macroCounts: {}, macroCalled: {} }; }
  function setState(v) { return game.settings.set(M, 'ee-state', v); }

  function advanceSlot(tableId, slotId) {
    const tables = getTables();
    const table = tables[tableId];
    const slot = table?.slots?.find(s => s.id === slotId);
    if (!slot) return null;

    const state = getState();
    (state.tables[tableId] ??= {})[slotId] ??= { count: 0, defeated: false };
    const ss = state.tables[tableId][slotId];
    const max = slot.outcomes?.length ?? 0;
    if (ss.count < max) ss.count++;

    setState(state);
    return { slot, outcome: slot.outcomes[ss.count - 1] ?? null, count: ss.count };
  }

  function resetSlot(tableId, slotId) {
    const state = getState();
    if (state.tables[tableId]?.[slotId]) state.tables[tableId][slotId].count = 0;
    return setState(state);
  }

  function resetTable(tableId) {
    const state = getState();
    delete state.tables[tableId];
    return setState(state);
  }

  function resetMacroCount(ruleId) {
    const state = getState();
    delete state.macroCounts[ruleId];
    return setState(state);
  }

  function resetCallers(ruleId) {
    const state = getState();
    state.macroCalled ??= {};
    delete state.macroCalled[ruleId];
    return setState(state);
  }

  function resetCaller(ruleId, callerId) {
    const state = getState();
    state.macroCalled ??= {};
    const list = state.macroCalled[ruleId];
    if (list) state.macroCalled[ruleId] = list.filter(id => id !== callerId);
    return setState(state);
  }

  function resetAll() {
    return setState({ tables: {}, scenesSeen: [], macroCounts: {}, macroCalled: {} });
  }

  function markDefeated(tableId, slotId, defeated) {
    const state = getState();
    (state.tables[tableId] ??= {})[slotId] ??= { count: 0, defeated: false };
    state.tables[tableId][slotId].defeated = defeated;
    return setState(state);
  }

  function pickRandomSlot(tableId) {
    const table = getTables()[tableId];
    if (!table) return null;
    const state = getState();
    const available = (table.slots ?? []).filter(s => {
      const ss = state.tables[tableId]?.[s.id] ?? { count: 0, defeated: false };
      return !ss.defeated && ss.count < (s.outcomes?.length ?? 0);
    });
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  function getOutcomeText(slot, count) {
    if (!count || count < 1) return '';
    return slot.outcomes?.[count - 1]?.text ?? '';
  }

  window.EE ??= {};
  EE.Data = {
    getTables, setTables, getTriggers, setTriggers, getState, setState,
    advanceSlot, resetSlot, resetTable, resetMacroCount, resetCallers, resetCaller, resetAll,
    markDefeated, pickRandomSlot, getOutcomeText
  };
})();
