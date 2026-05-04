This module is free. Wanna do a cool thing?

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/W7W01A1ZN1)

---

# Escalating Encounters

![Foundry v13](https://img.shields.io/badge/foundry-v13-green?style=for-the-badge) ![Github All Releases](https://img.shields.io/github/downloads/mordachai/escalating-encounters/total.svg?style=for-the-badge) ![GitHub Release](https://img.shields.io/github/v/release/mordachai/escalating-encounters?display_name=tag&style=for-the-badge&label=Current%20version)

Countless adventures and sourcebooks use the same powerful design pattern: a region feels alive because its random encounters aren't truly random — they _escalate_. Every roll pushes toward something. Wolves become a pack. A distant fire becomes a warband. Drips of tension build until something big finally breaks loose.

**Escalating Encounters** brings that mechanic to Foundry VTT. Define your tables once, wire up a trigger (scene entry, a hook, a macro, a timer — or just a button), and the module handles the rest. Outcomes advance automatically, chat cards go straight to the GM, and everything resets cleanly when the story moves on.

## Features

- **Sequential Advancement**: Each slot in a table has an ordered list of outcomes. Every time it triggers, it moves to the next one. Perfect for escalating a situation or tracking a multi-stage event.
- **Automated Trigger Engine**: Set rules to fire on scene entry (first visit or every visit), on specific Foundry hooks, on a random timer, or from a macro.
- **GM Panel**: A dedicated view to manage everything. Roll random slots, advance them manually, or toggle "defeated" status to skip slots.
- **Journal Links**: Link a Journal Entry or a specific Journal Page to a slot. Every time that slot fires, the chat card shows a clickable link that opens the journal directly to that page.
- **Rich Editors**: Build your tables and triggers with ease. Drag and drop Actors, Journals, and Sounds directly from the sidebar.
- **CSV Import/Export**: Manage large encounter tables in a spreadsheet and import them with one click.
- **Chat Integration**: Automatically whispers the outcome to the GM — enriched HTML text, actor portrait, and journal link all in one card.

---

## Installation

Paste the following manifest URL in the **Install Module** dialog:

```
https://github.com/mordachai/escalating-encounters/releases/latest/download/module.json
```

---

## How to Use

### 1. The GM Panel

Access the main panel from the **Token Controls** (the dice icon). From here you can see all your tables, roll random slots, or manually advance and reset them.

### 2. Creating Tables

In the **Table Editor**, you create **Slots**. Each slot is one sequence of escalating events.

- **Linked Actor**: Drag an Actor from the sidebar — its portrait appears in the chat card and panel.
- **Linked Journal / Journal Page**: Drag a Journal Entry _or_ a specific Journal Page onto the slot. When the slot fires, the outcome card shows a clickable link that opens the journal to that exact page.
- **Outcomes**: Add as many outcomes as you want for each slot. Each can have its own text and sound effect.

> **Tip — using journal pages as outcomes**: Create a journal with one page per escalation stage, then link the relevant page to each slot. When the slot advances, click the link in the chat card to jump straight to that page's description.

### 3. Wiring Triggers

In the **Trigger Editor**, you define when tables should advance:

- **Manual**: Only fires when you click from the panel.
- **Scene — First Visit**: Fires once the first time a scene becomes active. Scope to a specific scene, any scene, or any scene except a list of exclusions.
- **Scene — Every Visit**: Same as above but fires every time, not just the first.
- **Macro API Call**: Fires when you call the rule from a macro. Optionally set it to fire only once ever.
- **Foundry Hook**: Fires on any named Foundry hook (e.g. `createCombat`, `pauseGame`) with an optional JS condition expression.
- **Timer**: Fires at a random interval between a minimum and maximum number of minutes you set, then re-schedules itself automatically.

---

## Public API

```javascript
game.escalatingEncounters.trigger(ruleId); // Fire a specific trigger rule (for macros)
game.escalatingEncounters.advance(tableId, slotId); // Directly advance one slot
game.escalatingEncounters.openPanel(); // Open the GM panel
```

---

## Compatibility

- **Foundry VTT v13+** (minimum v13.332)
- System agnostic — works with any game system.
