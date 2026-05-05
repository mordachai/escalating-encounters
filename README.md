This module is free. Wanna do a cool thing?

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/W7W01A1ZN1)

---

# Escalating Encounters

![Foundry v13](https://img.shields.io/badge/foundry-v13-green?style=for-the-badge) ![Github All Releases](https://img.shields.io/github/downloads/mordachai/escalating-encounters/total.svg?style=for-the-badge) ![GitHub Release](https://img.shields.io/github/v/release/mordachai/escalating-encounters?display_name=tag&style=for-the-badge&label=Current%20version)

<img width="869" height="748" alt="image" src="https://github.com/user-attachments/assets/6a95b467-0df1-4826-a1ea-92a1dd1cd2a2" />

Lots adventures and sourcebooks use the "random escalating encounter" to make the game feel more alive and remove some of the burden for the GM. So I decided to build a tool for creating and running such encounter: easy to set, implement it and you're free to focus on all other parts of your adventure.

I've made this module to run the awesome **[The Castle, The Count & the Curse](https://www.drivethrurpg.com/en/product/458350/the-count-the-castle-the-curse)** from [**_Deficient Master_**](https://www.youtube.com/watch?v=hNNTk2Rbljo) (image above), and the module pretty much automated the hell out of it. Its system agnostic, so you can use with any system or adventure. Go check it out!

## Features

- **Sequential Advancement**: Each slot in a table has an ordered list of outcomes. Every time it triggers, it moves to the next one. Perfect for escalating a situation or tracking a multi-stage event.
- **Automated Trigger Engine**: Set rules to fire on scene entry (first visit or every visit), on specific Foundry hooks, on a random timer, or from a macro.
- **GM Panel**: A dedicated view to manage everything. Roll random slots, advance them manually, or toggle "defeated" status to skip slots.
- **Journal Links**: Link a Journal Entry or a specific Journal Page to a slot. Every time that slot fires, the chat card shows a clickable link that opens the journal directly to that page.
- **Rich Editors**: Build your tables and triggers with ease. Drag and drop Actors, Journals, and Sounds directly from the sidebar.
- **JSON Import/Export**: Back up or share your tables and triggers as a JSON file. Export opens a native Save As dialog so you choose where the file lands.
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

<img width="306" height="372" alt="image" src="https://github.com/user-attachments/assets/30d2afbb-3f72-429e-a971-45de63436db3" />


Access the main panel from the **Token Controls** (the dice icon). From here you can see all your tables, roll random slots, or manually advance and reset them.

### 2. Creating Tables

<img width="733" height="772" alt="image" src="https://github.com/user-attachments/assets/47598ba5-a14c-4ad2-9faa-d1346be63a04" />


In the **Table Editor**, you create **Slots**. Each slot is one sequence of escalating events.

- **Linked Actor**: Drag an Actor from the sidebar — its portrait appears in the chat card and panel.
- **Linked Journal / Journal Page**: Drag a Journal Entry _or_ a specific Journal Page onto the slot. When the slot fires, the outcome card shows a clickable link that opens the journal to that exact page.
- **Outcomes**: Add as many outcomes as you want for each slot. Each can have its own text and sound effect.

> **Tip — using journal pages as outcomes**: Create a journal with one page per escalation stage, then link the relevant page to each slot. When the slot advances, click the link in the chat card to jump straight to that page's description.

### 3. Wiring Triggers

<img width="666" height="613" alt="image" src="https://github.com/user-attachments/assets/db2f3a0a-2f13-407b-a5b3-60d6ee3f2b94" />

In the **Trigger Editor**, you define when tables should advance:

- **Manual**: Only fires when you click from the panel.
- **Scene — First Visit**: Fires once the first time a scene becomes active. Scope to a specific scene, any scene, or any scene except a list of exclusions.
- **Scene — Every Visit**: Same as above but fires every time, not just the first.
- **Macro API Call**: Fires when you call the rule from a macro. Three repeat modes — **Unlimited** (fires every call), **Once total** (fires only on the first call ever, then ignores all others until reset), or **Once per macro** (each individual macro can only fire this rule once; subsequent calls from the same macro are ignored). The caller audit dialog lets you see which macros have fired and reset them individually or all at once.
- **Foundry Hook**: Fires on any named Foundry hook (e.g. `createCombat`, `pauseGame`) with an optional JS condition expression.
- **Timer**: Fires at a random interval between a minimum and maximum number of minutes you set, then re-schedules itself automatically.

---

## Public API

```javascript
// Fire a trigger rule from a macro.
// Pass this.id as the second argument when the rule uses "Once per macro" mode
// so the module can track which macro called it.
game.escalatingEncounters.trigger(ruleId);
game.escalatingEncounters.trigger(ruleId, this.id); // Once per macro mode

game.escalatingEncounters.advance(tableId, slotId); // Directly advance one slot
game.escalatingEncounters.openPanel();              // Open the GM panel
```

> **Tip — Once per macro**: Set a rule to _Once per macro_ mode, then use the **Copy Command** button in the Trigger Editor — it automatically includes `this.id` as the second argument. Paste the copied command into each macro that should fire the rule. The Trigger Editor's caller audit shows every macro that has fired and lets you reset them individually.

---

## Compatibility

- **Foundry VTT v13+** (minimum v13.332)
- System agnostic — works with any game system.
