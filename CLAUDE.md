# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Module Overview

`escalating-encounters` is a standalone FoundryVTT GM tool for managing sequential, trigger-driven encounter tables.

- Module ID: `escalating-encounters`
- Requires FoundryVTT v13+
- No system dependency — works with any game system

## No Build Step

No `package.json`, no compiler, no bundler. All edits take effect immediately after saving. Register new files in `module.json` under `scripts` or `styles`.

## Script Load Order

Scripts are loaded in the order listed in `module.json`. Current order matters because each file populates the `window.EE` namespace that later files depend on:

1. `data.js` — defines `EE.Data`
2. `engine.js` — defines `EE.Engine` (depends on `EE.Data`)
3. `panel.js` — defines `EE.Panel` (depends on `EE.Data`, `EE.Engine`)
4. `table-editor.js` — defines `EE.TableEditor` (depends on `EE.Data`, `EE.Engine`, `EE.Panel`)
5. `trigger-editor.js` — defines `EE.TriggerEditor` (depends on `EE.Data`, `EE.Engine`)
6. `main.js` — registers settings, public API, scene-control button; calls `EE.Engine.initEngine()`

Each file opens with an IIFE and ends with `window.EE ??= {}; EE.X = ...`.

## Core Concepts

**EncounterTable** — A named list of slots. Each slot has a label, optional linked Foundry documents (actor, journal), and an ordered list of outcomes. When triggered, the slot advances to its next outcome sequentially.

**Slot** — One "creature" or "event" within a table. Has 1..N outcomes. State tracks `{ count, defeated }` per slot.

**TriggerRule** — Associates a firing condition with one or more table+slot targets. Implemented types:

- `manual` — GM fires from the panel only
- `sceneFirstVisit` — fires once when a scene becomes active; scene scope: `specific`, `any`, or `anyExcept`
- `sceneEveryVisit` — fires every time a scene becomes active; same scope options
- `macroNth` — fires when `game.escalatingEncounters.trigger(ruleId)` is called; optional `once` flag
- `hook` — fires on any named Foundry hook with an optional JS `condition` expression evaluated via `new Function`
- `timer` — fires at a random interval between `minMinutes` and `maxMinutes` (quantized to 20s steps, min 20s); reschedules itself after firing

**Targets** — A rule can advance multiple tables at once. Each target is `{ tableId, slotId }` where `slotId: null` means pick a random available (non-defeated, non-exhausted) slot.

## Data Model (world settings)

All state is stored in world-scoped `game.settings`:

```
ee-tables  : { [tableId]: { id, name, slots: [{ id, label, actorUuid, journalUuid, outcomes: [{ id, text, soundUuid }] }] } }
ee-triggers: { [ruleId]:  { id, name, type, enabled, params, targets: [{ tableId, slotId }] } }
ee-state   : { tables: { [tableId]: { [slotId]: { count, defeated } } }, scenesSeen: string[], macroCounts: { [ruleId]: number } }
```

## Application Architecture

All UI classes extend `HandlebarsApplicationMixin(ApplicationV2)` and follow a singleton pattern via a static `_instance`. Open via `ClassName.open()`, which brings an existing window to front or renders a new one.

**Panel** (`EE.Panel`) — read-only view. Listens to `ee.stateChanged` hook and re-renders. Supports portrait drag-start (sets actor UUID as `text/plain` JSON on `dataTransfer`).

**TableEditor** (`EE.TableEditor`) — holds a local `_tables` clone (deep copy of saved data) that is mutated in memory and flushed only on Save. Before any structural mutation the editor calls `_syncFromDOM()` to capture current form values into `_tables`. Preserves scroll position and open/closed slot accordion state across renders via `_captureUIState()`.

**TriggerEditor** (`EE.TriggerEditor`) — same local-clone + `_syncFromDOM()` pattern as `TableEditor`. Immediately persists enabled/disabled toggle (does not wait for Save). Calls `EE.Engine.rewireTriggers()` after every trigger save or enable/disable change.

## Key Engine Details

`EE.Engine.initEngine()` is called once on `init`. It wires:

- `canvasReady` hook — fires `sceneFirstVisit` / `sceneEveryVisit` rules
- `updateSetting` hook — broadcasts `ee.stateChanged` when `ee-state` changes

`rewireTriggers()` tears down and re-registers all `hook` and `timer` listeners. Call it after any trigger save.

`fireTargets(targets)` is the single entry point for advancing slots. It: picks random slot if `slotId` is null → calls `EE.Data.advanceSlot` → plays sound → posts a whisper chat card to GM → fires `ee.stateChanged`.

## Drag-and-Drop

UUID pill fields (`[data-uuid-type][data-field]`) accept drops from Foundry's document directory. Use `TextEditor.implementation.getDragEventData(event)` to extract the UUID. Validate `data.type` matches `data-uuid-type`. Outcome text `<textarea>` also accepts drops and inserts `@UUID[...]` links at the cursor.

## CSS

Single file: `styles/escalating-encounters.css`. All selectors scoped under `.ee-app`.

## Public API

Exposed on `game.escalatingEncounters` after `init`:

```js
game.escalatingEncounters.trigger(ruleId)        // fire a macroNth rule from a macro
game.escalatingEncounters.advance(tableId, slotId)  // directly advance one slot
game.escalatingEncounters.openPanel()            // open the GM panel
```

## Compatibility Shims

Use these patterns for v13 compatibility (the Foundry namespace changed between versions):

```js
// Sound playback
const helper = foundry.audio?.AudioHelper ?? globalThis.AudioHelper;
helper.play({ src, volume: 0.8, autoplay: true, loop: false }, true);

// HTML enrichment
const TE = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
const html = await TE.enrichHTML(rawText);

// Drag event data
TextEditor.implementation.getDragEventData(event)
```

## Localization

All user-facing strings are in `lang/en.json` under the `EE.*` namespace. Always use `game.i18n.localize('EE.Key')` or `game.i18n.format('EE.Key', { param })` rather than hardcoded strings.
