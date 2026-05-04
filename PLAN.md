# Escalating Encounters — Build Plan

## Architecture Summary

```
module.json
scripts/
  main.js           ← init, settings, template preload, scene-control button, public API
  data.js           ← pure CRUD helpers for tables / triggers / state (no UI)
  engine.js         ← trigger wiring (hooks), slot advancement, sound, notifications
  panel.js          ← GM Panel ApplicationV2
  table-editor.js   ← Table CRUD ApplicationV2
  trigger-editor.js ← Trigger CRUD ApplicationV2
templates/
  panel.hbs
  table-editor.hbs
  trigger-editor.hbs
styles/
  escalating-encounters.css
lang/
  en.json
```

## Data Shapes

```js
// EncounterTable
{ id, name, slots: [{ id, label, actorUuid, journalUuid, outcomes: [{ text, soundUuid }] }] }

// TriggerRule
{ id, name, type, params, targets: [{ tableId, slotId }] }
// type: "manual" | "sceneFirstVisit" | "sceneEveryVisit" | "macroNth" | "hook"
// params: { sceneId } | { hookName, condition } | {}

// State
{ tables: { [tableId]: { [slotId]: { count, defeated } } }, scenesSeen: [], macroCounts: {} }
```

---

## Phase 1 — Foundation

- [ ] **1.1** `main.js`: register world settings `ee-tables`, `ee-triggers`, `ee-state`
- [ ] **1.2** `main.js`: expose `game.escalatingEncounters = { trigger, advance, openPanel }` on `init`
- [ ] **1.3** `main.js`: add scene-control button (GM only) that opens the panel
- [ ] **1.4** `data.js`: `getTables()`, `setTables()`, `getTriggers()`, `setTriggers()`, `getState()`, `setState()`
- [ ] **1.5** `data.js`: `advanceSlot(tableId, slotId)` → increments count, returns `{ slot, outcome, count }`
- [ ] **1.6** `data.js`: `resetSlot(tableId, slotId)`, `resetTable(tableId)`, `markDefeated(tableId, slotId, bool)`
- [ ] **1.7** `data.js`: `pickRandomSlot(tableId)` → finds first available slot (not defeated, not exhausted)
- [ ] **1.8** `data.js**: `getOutcomeText(slot, count)` → journal page or plain text fallback
- [ ] **1.9** `engine.js`: `playSound(soundUuid)` helper
- [ ] **1.10** `engine.js`: `fireTargets(targets)` → advances each target, plays sound, posts chat card (whisper to GM)

## Phase 2 — Trigger Engine

- [ ] **2.1** `engine.js`: on `canvasReady` → check active scene against `sceneFirstVisit` rules; fire if not in `scenesSeen`
- [ ] **2.2** `engine.js`: on `canvasReady` → fire `sceneEveryVisit` rules matching active scene (always)
- [ ] **2.3** `engine.js`: `game.escalatingEncounters.trigger(ruleId)` → increments `macroCounts[ruleId]`, fires rule
- [ ] **2.4** `engine.js`: `game.escalatingEncounters.advance(tableId, slotId)` → direct advance, no rule needed
- [ ] **2.5** `engine.js`: on `init` → register `Hooks.on(hookName, ...)` for each `hook`-type rule; eval condition safely
- [ ] **2.6** `engine.js`: re-register hook-type rules when triggers are saved (call from trigger editor save)
- [ ] **2.7** `engine.js`: socket broadcast so result card appears on all clients (use `socketlib` if available, else `game.socket`)

## Phase 3 — GM Panel

- [ ] **3.1** `panel.js`: `EncounterPanel extends HandlebarsApplicationMixin(ApplicationV2)`
- [ ] **3.2** `panel.js`: `_prepareContext()` → all tables, all slots with current count/defeated/atMax, last result
- [ ] **3.3** `panel.hbs`: table tabs or accordion per table; slot rows showing label, avatar, outcome pips, defeated checkbox
- [ ] **3.4** Panel action: **Roll** (random available slot from selected table)
- [ ] **3.5** Panel action: **Manual advance** per slot (click slot row)
- [ ] **3.6** Panel action: **Reset slot** / **Reset table** / **Reset all**
- [ ] **3.7** Panel action: **Toggle defeated** checkbox per slot
- [ ] **3.8** Panel: **Result display** — enriched outcome text, actor image, slot label
- [ ] **3.9** Panel: **Open Table Editor** button
- [ ] **3.10** Panel: **Open Trigger Editor** button
- [ ] **3.11** Panel: re-render on state change (after any advance/reset)

## Phase 4 — Table Editor

- [ ] **4.1** `table-editor.js`: `TableEditor extends HandlebarsApplicationMixin(ApplicationV2)`
- [ ] **4.2** Table list view: show all tables with **New**, **Edit**, **Delete** per row
- [ ] **4.3** Table detail view (in-place or sub-app): edit table name
- [ ] **4.4** Slot list: **Add slot**, **Delete slot**, reorder (drag or up/down buttons)
- [ ] **4.5** Slot fields: label (text), actorUuid (drag-drop, Actor), journalUuid (drag-drop, JournalEntry)
- [ ] **4.6** Outcome list per slot: **Add outcome**, **Delete outcome**, reorder
- [ ] **4.7** Outcome fields: text (textarea), soundUuid (drag-drop, PlaylistSound), **Preview sound** button
- [ ] **4.8** Drag-drop wiring for UUID fields (same pattern as ccc-vagabond config)
- [ ] **4.9** Save → `setTables()` + re-render panel if open
- [ ] **4.10** Delete table → confirm dialog + remove from state

## Phase 5 — Trigger Editor

- [ ] **5.1** `trigger-editor.js`: `TriggerEditor extends HandlebarsApplicationMixin(ApplicationV2)`
- [ ] **5.2** Trigger list view: show all rules with **New**, **Edit**, **Delete**
- [ ] **5.3** Trigger form: name (text), type selector
- [ ] **5.4** Params section per type:
  - `sceneFirstVisit` / `sceneEveryVisit` → scene UUID drag-drop field (Scene)
  - `macroNth` → display-only note "call `game.escalatingEncounters.trigger(ruleId)` from a macro"
  - `hook` → hook name (text), condition expression (textarea, optional)
  - `manual` → no params
- [ ] **5.5** Targets section: list of `{ tableId, slotId }` pairs
  - **Add target** → pick table (dropdown), pick slot (dropdown, or "Random")
  - **Remove target** button per row
- [ ] **5.6** Save → `setTriggers()` + re-wire hook-type rules in engine
- [ ] **5.7** Delete trigger → confirm dialog; also removes any hook listener

## Phase 6 — Styling & i18n

- [ ] **6.1** `lang/en.json`: all UI strings (titles, labels, buttons, notifications, confirmations)
- [ ] **6.2** `styles/escalating-encounters.css`: panel layout, slot rows, outcome pips, result block
- [ ] **6.3** Style drag-drop hover state on UUID inputs
- [ ] **6.4** Responsive panel (resizable, scrollable slot list)
- [ ] **6.5** Dark/light mode compatibility (use Foundry CSS variables)

## Phase 7 — Polish

- [ ] **7.1** GM notification when a trigger fires automatically (scene enter, hook)
- [ ] **7.2** Chat whisper card for triggered outcomes (enriched HTML, actor portrait)
- [ ] **7.3** "Copy trigger ID" button in trigger editor (for macro use)
- [ ] **7.4** Validate UUIDs on save (warn if actor/journal/sound not found)
- [ ] **7.5** Export/import tables as JSON (for sharing between worlds)
- [ ] **7.6** `module.json` version bump to `1.0.0` + GitHub Actions release workflow

---

## Open Questions / Decisions Deferred

- **Chat card format**: whisper to GM only, or post to all players too?
- **Outcome exhaustion behavior**: after last outcome, loop back to 1? freeze? mark exhausted?
- **Hook condition eval**: use `Function()` with sandboxed scope, or a simple expression parser?
- **Socket sync**: use `socketlib` dependency or roll our own with `game.socket`?
