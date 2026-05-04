# Escalating Encounters

A GM tool for Foundry VTT (v13+) to manage sequential, trigger-driven encounter tables.

## Project Overview

**Escalating Encounters** allows GMs to create encounter tables where entries (slots) advance through a series of outcomes step-by-step. These advancements can be triggered manually, via scene transitions, macros, or automated Foundry hooks.

### Core Technologies
- **Foundry VTT v13+**: Uses `ApplicationV2` and modern Foundry APIs.
- **Vanilla JavaScript**: No build step (no npm/bundler).
- **Handlebars (.hbs)**: Client-side templating.
- **CSS**: Scoped styling using `.ee-app` class.

### Architecture
- `scripts/main.js`: Entry point, registers settings, and exposes the public API.
- `scripts/data.js`: CRUD operations for tables, triggers, and module state. Persists data to world settings.
- `scripts/engine.js`: The trigger engine. Handles hook registration and execution logic.
- `scripts/panel.js`: The main GM Panel (ApplicationV2).
- `scripts/table-editor.js` & `scripts/trigger-editor.js`: Specialized editors for configuration.
- `templates/`: Handlebars files for UI components.
- `styles/`: Module styling.

---

## Building and Running

### Installation
1. Link or copy the module directory into your Foundry Data `modules/` folder.
2. Enable "Escalating Encounters" in your world settings.

### Commands
- **No build step**: Edits to `.js`, `.hbs`, or `.css` files are reflected after refreshing the Foundry client.
- **Development**: Ensure `module.json` is updated if new script or style files are added.

---

## Development Conventions

### Coding Style
- **Scoping**: All scripts are wrapped in an IIFE with `'use strict';`.
- **Internal API**: Uses a global `window.EE` object for cross-file internal access before `init`.
- **Public API**: Exposed via `game.escalatingEncounters` for use in macros and other modules.
- **Naming**: Module ID is `escalating-encounters`.

### Public API
```javascript
game.escalatingEncounters.trigger(ruleId)   // Fire a trigger rule by ID
game.escalatingEncounters.advance(tableId, slotId)  // Manually advance a slot
game.escalatingEncounters.openPanel()       // Open the GM Panel
```

### Data Management
- Data is stored in `game.settings` under the `escalating-encounters` scope:
    - `ee-tables`: Configuration for encounter tables.
    - `ee-triggers`: Configuration for trigger rules.
    - `ee-state`: Runtime state (counts, defeated status, etc.).

### UI Patterns
- **ApplicationV2**: All new UI components must extend `foundry.applications.api.ApplicationV2` (usually mixed with `HandlebarsApplicationMixin`).
- **Drag-and-Drop**: UUID fields should support dragging Actors, Journal Entries, and Sounds from the sidebar. Use `TextEditor.getDragEventData(e)` for extraction.
- **i18n**: All UI strings should be localized using `lang/en.json` and `game.i18n.localize()`.

### Trigger Engine
- **Hook Rules**: Registered during `init` and re-evaluated when triggers are saved.
- **Condition Eval**: Hook conditions are evaluated as safe JS expressions.
