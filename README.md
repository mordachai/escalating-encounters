This module is free. Wanna do a cool thing?

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/W7W01A1ZN1)

---

# Escalating Encounters

![Foundry v13](https://img.shields.io/badge/foundry-v13-green?style=for-the-badge) ![Github All Releases](https://img.shields.io/github/downloads/mordachai/escalating-encounters/total.svg?style=for-the-badge) ![GitHub Release](https://img.shields.io/github/v/release/mordachai/escalating-encounters?display_name=tag&style=for-the-badge&label=Current%20version)

**Escalating Encounters** is a GM tool for managing sequential, trigger-driven encounter tables. Instead of just rolling a random result, your tables advance step-by-step. Triggers can fire automatically on scene entry, macro calls, Foundry hooks, or you can just click a button.

## Features

*   **Sequential Advancement**: Each slot in a table has an ordered list of outcomes. Every time it triggers, it moves to the next one. Perfect for "escalating" a situation or tracking a multi-stage event.
*   **Automated Trigger Engine**: Set rules to fire on Scene entry (first visit or every visit), specific Foundry Hooks, or through Macros. 
*   **GM Panel**: A dedicated view to manage everything. Roll random slots, advance them manually, or toggle "defeated" status to skip slots.
*   **Rich Editors**: Build your tables and triggers with ease. Drag and drop Actors, Journals, and Sounds directly from your sidebars.
*   **CSV Import/Export**: Manage your massive encounter tables in external tools like Excel and bring them in with one click.
*   **Chat Integration**: Automatically whispers the outcome to the GM, complete with enriched HTML and actor portraits.

---

## Installation

To install, paste the following manifest URL in the **Install Module** dialog:

```
https://github.com/mordachai/escalating-encounters/releases/latest/download/module.json
```

---

## How to Use

### 1. The GM Panel
Access the main panel from the **Token Controls** (the dice icon). From here you can see all your tables, roll random slots, or manually advance/reset them.

### 2. Creating Tables
In the **Table Editor**, you create **Slots**. Each slot is a sequence. 
*   **Linked Documents**: Drag an Actor or Journal Entry into the slot to associate it.
*   **Outcomes**: Add as many outcomes as you want for each slot. Each can have its own text and sound effect.

### 3. Wiring Triggers
In the **Trigger Editor**, you define when tables should advance:
*   **Manual**: Only fires when you trigger it from the panel.
*   **Scene Visit**: Fires when a scene becomes active. You can exclude specific scenes or target only one.
*   **Macro Nth**: Fires when you call the trigger ID from a macro.
*   **Hook**: Fires on any Foundry hook (e.g., `createCombat`, `pauseGame`) with optional JS conditions.

---

## Public API

You can trigger your encounters from other modules or macros using the public API:

```javascript
game.escalatingEncounters.trigger(ruleId)           // Fire a specific trigger rule
game.escalatingEncounters.advance(tableId, slotId)  // Manually advance a slot
game.escalatingEncounters.openPanel()               // Open the GM panel
```

---

## Compatibility

- **Foundry VTT v13+** (minimum v13.332)
- System agnostic - works with any game system.
