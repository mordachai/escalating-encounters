// scripts/data.js — pure CRUD helpers for tables / triggers / state
(function () {
  'use strict';
  const M = 'escalating-encounters';

  function getTables() { return game.settings.get(M, 'ee-tables') ?? {}; }
  function setTables(v) { return game.settings.set(M, 'ee-tables', v); }
  function getTriggers() { return game.settings.get(M, 'ee-triggers') ?? {}; }
  function setTriggers(v) { return game.settings.set(M, 'ee-triggers', v); }
  function getState() { return game.settings.get(M, 'ee-state') ?? { tables: {}, scenesSeen: [], macroCounts: {} }; }
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

  function resetAll() {
    return setState({ tables: {}, scenesSeen: [], macroCounts: {} });
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

  // ── CSV export / import ──────────────────────────────────────────────────

  function _csvField(v) {
    const s = String(v ?? '');
    if (/[,"\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function _parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i], nx = text[i + 1];
      if (inQ) {
        if (ch === '"' && nx === '"') { field += '"'; i++; }
        else if (ch === '"') inQ = false;
        else field += ch;
      } else if (ch === '"') {
        inQ = true;
      } else if (ch === ',') {
        row.push(field); field = '';
      } else if (ch === '\r' && nx === '\n') {
        row.push(field); rows.push(row); row = []; field = ''; i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field); rows.push(row); row = []; field = '';
      } else {
        field += ch;
      }
    }
    row.push(field);
    if (row.some(f => f)) rows.push(row);
    return rows;
  }

  function tablesToCSV(tables) {
    const COLS = ['tableName', 'slotLabel', 'actorUuid', 'journalUuid', 'outcomeNum', 'outcomeText', 'soundUuid'];
    const rows = [COLS];
    for (const t of Object.values(tables)) {
      for (const slot of t.slots ?? []) {
        const outs = slot.outcomes ?? [];
        if (outs.length) {
          outs.forEach((o, i) => rows.push([
            t.name, slot.label, slot.actorUuid ?? '', slot.journalUuid ?? '',
            i + 1, o.text ?? '', o.soundUuid ?? ''
          ]));
        } else {
          rows.push([t.name, slot.label, slot.actorUuid ?? '', slot.journalUuid ?? '', '', '', '']);
        }
      }
    }
    // BOM prefix for Excel UTF-8 compatibility
    return '﻿' + rows.map(r => r.map(_csvField).join(',')).join('\r\n');
  }

  function tablesFromCSV(csv) {
    const text = csv.startsWith('﻿') ? csv.slice(1) : csv;
    const rows = _parseCSV(text);
    if (rows.length < 2) return {};
    const hdr = rows[0].map(h => h.trim().toLowerCase());
    const col = name => hdr.indexOf(name);

    const tables = {};
    for (const row of rows.slice(1)) {
      const tableName = (row[col('tablename')] ?? '').trim();
      if (!tableName) continue;
      const slotLabel  = (row[col('slotlabel')]   ?? '').trim();
      const actorUuid  = (row[col('actoruuid')]   ?? '').trim();
      const journalUuid = (row[col('journaluuid')] ?? '').trim();
      const outcomeText = row[col('outcometext')] ?? '';
      const soundUuid  = (row[col('sounduuid')]   ?? '').trim();

      let table = Object.values(tables).find(t => t.name === tableName);
      if (!table) {
        const id = foundry.utils.randomID();
        table = { id, name: tableName, slots: [] };
        tables[id] = table;
      }

      if (!slotLabel) continue;
      let slot = table.slots.find(s => s.label === slotLabel);
      if (!slot) {
        slot = { id: foundry.utils.randomID(), label: slotLabel, actorUuid, journalUuid, outcomes: [] };
        table.slots.push(slot);
      } else {
        if (actorUuid)  slot.actorUuid  = actorUuid;
        if (journalUuid) slot.journalUuid = journalUuid;
      }

      if (outcomeText || soundUuid) {
        slot.outcomes.push({ id: foundry.utils.randomID(), text: outcomeText, soundUuid });
      }
    }
    return tables;
  }

  window.EE ??= {};
  EE.Data = {
    getTables, setTables, getTriggers, setTriggers, getState, setState,
    advanceSlot, resetSlot, resetTable, resetMacroCount, resetAll, markDefeated,
    pickRandomSlot, getOutcomeText, tablesToCSV, tablesFromCSV
  };
})();
