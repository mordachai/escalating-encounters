# Escalating Encounters — Build Plan

## Architecture Summary

```text
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
// type: "manual" | "sceneFirstVisit" | "sceneEveryVisit" | "macroNth" | "hook" | "timer"
// params (sceneFirstVisit|sceneEveryVisit): { sceneMode: "specific"|"any"|"anyExcept", sceneId?, excludedSceneIds? }
// params (hook): { hookName, condition }
// params (timer): { minMinutes, maxMinutes }   — interval randomised in 20s steps

// State
{ tables: { [tableId]: { [slotId]: { count, defeated } } }, scenesSeen: [], macroCounts: {} }
```

---

## Phase 1 — Foundation

- [x] **1.1** `main.js`: register world settings `ee-tables`, `ee-triggers`, `ee-state`
- [x] **1.2** `main.js`: expose `game.escalatingEncounters = { trigger, advance, openPanel }` on `init`
- [x] **1.3** `main.js`: add scene-control button (GM only) that opens the panel
- [x] **1.4** `data.js`: `getTables()`, `setTables()`, `getTriggers()`, `setTriggers()`, `getState()`, `setState()`
- [x] **1.5** `data.js`: `advanceSlot(tableId, slotId)` → increments count, returns `{ slot, outcome, count }`
- [x] **1.6** `data.js`: `resetSlot(tableId, slotId)`, `resetTable(tableId)`, `markDefeated(tableId, slotId, bool)`
- [x] **1.7** `data.js`: `pickRandomSlot(tableId)` → finds first available slot (not defeated, not exhausted)
- [x] **1.8** `data.js`: `getOutcomeText(slot, count)` → plain text from outcomes array
- [x] **1.9** `engine.js`: `playSound(soundUuid)` helper
- [x] **1.10** `engine.js`: `fireTargets(targets)` → advances each target, plays sound, posts chat card (whisper to GM)

## Phase 2 — Trigger Engine

- [x] **2.1** `engine.js`: on `canvasReady` → check active scene against `sceneFirstVisit` rules; fire if not in `scenesSeen`
- [x] **2.2** `engine.js`: on `canvasReady` → fire `sceneEveryVisit` rules matching active scene (always)
- [x] **2.3** `engine.js`: `game.escalatingEncounters.trigger(ruleId)` → increments `macroCounts[ruleId]`, fires rule
- [x] **2.4** `engine.js`: `game.escalatingEncounters.advance(tableId, slotId)` → direct advance, no rule needed
- [x] **2.5** `engine.js`: on `init` → register `Hooks.on(hookName, ...)` for each `hook`-type rule; eval condition safely
- [x] **2.6** `engine.js`: re-register hook-type rules when triggers are saved (call from trigger editor save)
- [x] **2.7** State changes sync to all clients via Foundry's world settings mechanism; panel re-renders via `Hooks.callAll('ee.stateChanged')` and `updateSetting` hook

## Phase 3 — GM Panel

- [x] **3.1** `panel.js`: `EncounterPanel extends HandlebarsApplicationMixin(ApplicationV2)`
- [x] **3.2** `panel.js`: `_prepareContext()` → all tables, all slots with current count/defeated/atMax, last result
- [x] **3.3** `panel.hbs`: table tabs; slot rows showing label, avatar, outcome pips, defeated checkbox
- [x] **3.4** Panel action: **Roll** (random available slot from selected table)
- [x] **3.5** Panel action: **Manual advance** per slot
- [x] **3.6** Panel action: **Reset slot** / **Reset table** / **Reset all**
- [x] **3.7** Panel action: **Toggle defeated** checkbox per slot
- [x] **3.8** Panel: **Result display** — enriched outcome text, actor image, slot label
- [x] **3.9** Panel: **Open Table Editor** button
- [x] **3.10** Panel: **Open Trigger Editor** button
- [x] **3.11** Panel: re-render on state change (after any advance/reset)

## Phase 4 — Table Editor

- [x] **4.1** `table-editor.js`: `TableEditor extends HandlebarsApplicationMixin(ApplicationV2)`
- [x] **4.2** Table list view: show all tables with **New**, **Edit**, **Delete** per row
- [x] **4.3** Table detail view: edit table name
- [x] **4.4** Slot list: **Add slot**, **Delete slot**, **Move up/down** buttons
- [x] **4.5** Slot fields: label (text), actorUuid (drag-drop, Actor), journalUuid (drag-drop, JournalEntry)
- [x] **4.6** Outcome list per slot: **Add outcome**, **Delete outcome**
- [x] **4.7** Outcome fields: text (textarea), soundUuid (drag-drop, PlaylistSound), **Preview sound** button
- [x] **4.8** Drag-drop wiring via `TextEditor.implementation.getDragEventData`
- [x] **4.9** Save → `setTables()` + re-render panel if open + prune orphaned state
- [x] **4.10** Delete table → `DialogV2.confirm` + remove from state

## Phase 5 — Trigger Editor

- [x] **5.1** `trigger-editor.js`: `TriggerEditor extends HandlebarsApplicationMixin(ApplicationV2)`
- [x] **5.2** Trigger list view: show all rules with **New**, **Edit**, **Delete**
- [x] **5.3** Trigger form: name (text), type selector
- [x] **5.4** Params section per type (conditional render based on selected type)
- [x] **5.5** Targets section: table + slot dropdowns; slot options update when table changes
- [x] **5.6** Save → `setTriggers()` + `rewireHookTriggers()`
- [x] **5.7** Delete trigger → `DialogV2.confirm`

## Phase 6 — Styling & i18n

- [x] **6.1** `lang/en.json`: all UI strings present and accounted for
- [x] **6.2** `styles/escalating-encounters.css`: panel layout, slot rows, outcome pips, result block
- [x] **6.3** UUID input drag-drop hover state via `:focus` + `.dragover` CSS
- [x] **6.4** Scrollable slot list, resizable windows
- [x] **6.5** All colors use Foundry CSS variables (`--color-*`, `--font-*`)

## Phase 7 — Polish

- [x] **7.1** GM notification when a trigger fires automatically (scene enter, hook) via `ui.notifications.info`
- [x] **7.2** Chat whisper card for triggered outcomes (enriched HTML, actor portrait)
- [x] **7.3** "Copy trigger ID" button in trigger editor
- [ ] **7.4** Validate UUIDs on save (warn if actor/journal/sound not found) — deferred
- [ ] **7.5** Export/import tables as JSON — deferred
- [ ] **7.6** `module.json` version bump to `1.0.0` + GitHub Actions release workflow — deferred

---

## Decisions Made

- **Chat card format**: whisper to GM only
- **Outcome exhaustion**: freeze at last outcome (count stops at `outcomes.length`)
- **Hook condition eval**: `new Function('args', ...)` with try/catch
- **State sync**: Foundry world settings auto-sync to all clients; panel subscribes to `Hooks.on('ee.stateChanged')`
