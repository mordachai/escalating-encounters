# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Module Overview

`escalating-encounters` is a standalone FoundryVTT GM tool for managing sequential, trigger-driven encounter tables.

- Module ID: `escalating-encounters`
- Requires FoundryVTT v13+
- No system dependency — works with any system

## No Build Step

No `package.json`, no compiler, no bundler. All edits take effect immediately after saving. Register new files in `module.json` under `scripts` or `styles`.

## Core Concepts

**EncounterTable** — A named list of slots. Each slot has a label, optional linked Foundry documents (actor, journal), and an ordered list of outcomes. When triggered, the slot advances to its next outcome sequentially.

**Slot** — One "creature" or "event" within a table. Has 1..N outcomes (not fixed at 4). A table with one slot is a single linear sequence.

**TriggerRule** — Associates a firing condition with one or more table+slot targets. Types:
- `manual` — GM fires from the panel
- `sceneFirstVisit` — fires once when a specific scene becomes active
- `sceneEveryVisit` — fires every time a specific scene becomes active
- `macroNth` — fires when `game.escalatingEncounters.trigger(ruleId)` is called (called from a macro)
- `hook` — fires on any named Foundry hook, with optional JS condition expression

**Targets** — A rule can advance multiple tables at once. Each target specifies `{ tableId, slotId | null }` where `null` means roll a random available slot from that table.

## Data Model (world settings)

```
EE_TABLES  : Object  → { [tableId]: EncounterTable }
EE_TRIGGERS: Object  → { [ruleId]: TriggerRule }
EE_STATE   : Object  → {
  tables: { [tableId]: { [slotId]: { count: number, defeated: boolean } } },
  scenesSeen: string[],     // scene UUIDs
  macroCounts: { [ruleId]: number }
}
```

## JavaScript

Scripts live in `scripts/`. Planned files:
- `main.js` — init, settings registration, template loading, scene-control button
- `data.js` — pure data helpers: CRUD for tables/triggers/state, no UI
- `engine.js` — trigger engine: hook wiring, slot advancement, sound playback, chat/panel notification
- `panel.js` — GM Panel (ApplicationV2): view all tables, roll/advance manually, defeated toggle
- `table-editor.js` — Table CRUD editor (ApplicationV2)
- `trigger-editor.js` — Trigger CRUD editor (ApplicationV2)

Use `Hooks.once('init', ...)` for settings registration. All apps extend `HandlebarsApplicationMixin(ApplicationV2)`.

## CSS

Single file: `styles/escalating-encounters.css`. Scope everything under `.ee-app`.

## Drag-and-Drop

UUID fields accept drag-drop from Foundry's document directory. Use `TextEditor.getDragEventData(e)` to extract the UUID. Validate `data.type` matches expected (`Actor`, `JournalEntry`, `PlaylistSound`).

## Public API

Exposed on `game.escalatingEncounters` after `init`:
```js
game.escalatingEncounters.trigger(ruleId)   // call from macros
game.escalatingEncounters.advance(tableId, slotId)  // direct advance
game.escalatingEncounters.openPanel()       // open GM panel
```

## Sound Playback

```js
const helper = foundry.audio?.AudioHelper ?? globalThis.AudioHelper;
helper.play({ src, volume, autoplay: true, loop: false }, true);
```

## Enrich HTML

```js
const TE = foundry.applications?.ux?.TextEditor?.implementation ?? globalThis.TextEditor;
const html = await TE.enrichHTML(rawText);
```
