# Implementation Plan: To-Do Life Dashboard

## Overview

Implement a zero-dependency, client-side dashboard as three static files (`index.html`, `css/style.css`, `js/app.js`). Each task builds incrementally — shared utilities first, then individual widget modules, then final wiring and styling polish. All persistence uses the browser `localStorage` API.

---

## Tasks

- [x] 1. Create the HTML skeleton (`index.html`)
  - [x] 1.1 Write the `index.html` file with `<head>` metadata, viewport meta, stylesheet link, and deferred `app.js` script tag
    - Include `<main class="dashboard-grid">` containing the four `<section>` widget stubs: Greeting Panel, Focus Timer, To-Do List, Quick Links
    - Add `aria-label` attributes on each section for accessibility
    - Add static placeholder IDs: `#greeting`, `#date`, `#clock`, `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#todo-form`, `#todo-input`, `#todo-list`, `#link-form`, `#link-label`, `#link-url`, `#link-list`
    - _Requirements: 1.1, 1.2, 6.4_

- [x] 2. Implement `css/style.css` — layout and theming
  - [x] 2.1 Write the CSS custom-property tokens for light mode and dark-mode override
    - Define `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-primary`, `--color-border`, `--font-size-base`
    - Add `@media (prefers-color-scheme: dark)` block that redefines all tokens
    - _Requirements: 1.4, 6.2, 6.3_

  - [x] 2.2 Add responsive grid layout and widget base styles
    - Implement `.dashboard-grid` with `display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` and gap/padding
    - Add `@media (max-width: 599px)` single-column override
    - Style `.widget` cards (background, border-radius, padding, shadow) using CSS tokens
    - Set `body` base font size to at least 16 px
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [x] 2.3 Add focus indicators, timer display, and task/link item styles
    - Implement `:focus-visible` outline using `--color-primary` with 3 px width and 2 px offset
    - Style `#timer-display` with large monospace font
    - Add `.completed` class rule with `text-decoration: line-through` and muted color
    - Style `.link-btn` and delete icon buttons
    - _Requirements: 3.2, 4.3, 6.4_

- [x] 3. Implement `js/app.js` — shared utilities
  - [x] 3.1 Write the `StorageHelper` object with `KEYS`, `get(key)`, and `set(key, value)`
    - `get` must JSON-parse, guard against missing keys, and catch malformed JSON (return `[]`)
    - `set` must JSON-stringify the full array
    - Include `uid()` helper using `crypto.randomUUID()` with Date.now fallback
    - Wrap everything in a `DOMContentLoaded` listener to avoid global-scope pollution
    - _Requirements: 1.1, 4.8, 4.9, 5.6, 5.7_

  - [ ]* 3.2 Write property tests for `StorageHelper` round-trip
    - **Property 13: Task array localStorage round-trip** — for any array of task objects, `set` then `get` produces a deep-equal array in the same order
    - **Property 17: Links array localStorage round-trip** — same guarantee for link entry objects
    - **Validates: Requirements 4.8, 4.9, 5.6, 5.7**

- [x] 4. Implement `GreetingModule`
  - [x] 4.1 Write `GreetingModule` with `formatDate(date)`, `formatTime(date)`, `getGreeting(hour)`, and a `setInterval` update loop (1 000 ms)
    - `formatDate` must return the full weekday, month name, numeric day, and four-digit year
    - `formatTime` must return a string in HH:MM:SS format (24-hour or 12-hour with AM/PM)
    - `getGreeting` must map [5–11] → "Good Morning", [12–17] → "Good Afternoon", [18–20] → "Good Evening", [0–4, 21–23] → "Good Night"
    - `init()` wires to `#greeting`, `#date`, `#clock` and starts the interval
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 4.2 Write property tests for `GreetingModule`
    - **Property 1: Greeting covers all 24 hours** — for every integer 0–23, `getGreeting` returns exactly one of the four strings at the correct boundary
    - **Property 2: Date format contains all required components** — for any valid `Date`, `formatDate` contains weekday, month name, day, and year
    - **Validates: Requirements 2.1, 2.3, 2.4, 2.5, 2.6**

- [x] 5. Implement `TimerModule`
  - [x] 5.1 Write `TimerModule` with closure state (`remaining`, `timerId`), `formatTime(totalSeconds)`, `tick()`, `start()`, `stop()`, `reset()`, and `render()`
    - `formatTime` must return zero-padded `MM:SS` for any integer 0–1500
    - `render()` must update `#timer-display` and set `disabled` on Start/Stop buttons to reflect active/idle state
    - `tick()` decrements `remaining`, calls `render()`, and on reaching 0 clears the interval and fires `alert('Focus session complete! Take a break.')`
    - `init()` wires all three buttons and calls `render()`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 5.2 Write property tests for `TimerModule`
    - **Property 3: Time format is always MM:SS** — for any integer 0–1500, `formatTime` matches `/^\d{2}:\d{2}$/`
    - **Property 4: Stop preserves remaining time** — `start()` then `stop()` before a tick leaves `remaining` unchanged
    - **Property 5: Reset always produces initial state** — `reset()` from any state yields `{ remaining: 1500, active: false }`
    - **Property 6: Button state reflects timer activity** — after any state change, Start disabled ↔ active; Stop disabled ↔ idle
    - **Validates: Requirements 3.2, 3.4, 3.5, 3.7, 3.8**

- [x] 6. Checkpoint — core modules done
  - Ensure all automated tests pass and the `DOMContentLoaded` bootstrap correctly initialises `GreetingModule` and `TimerModule`. Ask the user if questions arise before continuing.

- [x] 7. Implement `TodoModule`
  - [x] 7.1 Write `TodoModule` with in-memory `tasks` array, `addTask(text)`, `toggleTask(id)`, `editTask(id, newText)`, `deleteTask(id)`, `persist()`, and `render()`
    - `addTask` must trim input and guard against empty/whitespace-only strings
    - `editTask` must trim input; if result is empty, discard the edit and re-render (restore original text)
    - `render()` rebuilds `#todo-list` from the in-memory array; each row includes a checkbox, description span/input, edit button, and delete button
    - Completed tasks receive a `.completed` CSS class for strikethrough styling
    - Edit mode: clicking Edit replaces the span with a pre-filled `<input>`; Save/Enter commits via `editTask`
    - `init()` loads from `StorageHelper.get(KEYS.TODOS)` and calls `render()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_

  - [ ]* 7.2 Write property tests for `TodoModule`
    - **Property 7: Adding a valid task grows the list** — any non-whitespace string increases count by 1 and `task.text === text.trim()`
    - **Property 8: Whitespace-only task input is rejected** — pure-whitespace input leaves the list unchanged
    - **Property 9: Completion toggle is its own inverse** — two `toggleTask` calls restore original `completed` value
    - **Property 10: Valid edit updates description** — non-whitespace `newText` sets `task.text` to `newText.trim()`
    - **Property 11: Whitespace-only edit discards change** — pure-whitespace `newText` leaves `task.text` unchanged
    - **Property 12: Delete removes exactly the targeted task** — `deleteTask(id)` removes only that id; all others remain
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6, 4.7**

- [x] 8. Implement `LinksModule`
  - [x] 8.1 Write `LinksModule` with in-memory `links` array, `addLink(label, url)`, `deleteLink(id)`, `persist()`, and `render()`
    - `addLink` must trim both fields and guard against either being empty/whitespace-only
    - Each rendered link entry is a `<button>` that calls `window.open(url, '_blank', 'noopener')` plus a delete icon button
    - `render()` rebuilds `#link-list` from the in-memory array
    - `init()` loads from `StorageHelper.get(KEYS.LINKS)` and calls `render()`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 8.2 Write property tests for `LinksModule`
    - **Property 14: Adding a valid link grows the list** — non-empty label + URL increases count by 1 with correct properties
    - **Property 15: Invalid link input is rejected** — any pair where label or URL is empty/whitespace leaves the list unchanged
    - **Property 16: Link delete removes exactly the targeted entry** — `deleteLink(id)` removes only that id; all others remain
    - **Validates: Requirements 5.2, 5.3, 5.5**

- [x] 9. Wire all modules together and verify full integration
  - [x] 9.1 Add the `DOMContentLoaded` bootstrap block that calls `GreetingModule.init()`, `TimerModule.init()`, `TodoModule.init()`, and `LinksModule.init()` in order
    - Confirm `app.js` is structured so all module objects are defined before the init calls
    - Verify form submission handlers (prevent default, read input values, call module functions, clear inputs)
    - _Requirements: 1.2, 1.3_

- [x] 10. Final checkpoint — full integration
  - Ensure all automated tests pass. Confirm `app.js` wires all four modules in `DOMContentLoaded`, form handlers call the correct module functions and clear inputs after submission, and the `.completed` and dark-mode CSS classes are applied correctly by the JS render functions. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- The design has a Correctness Properties section (Properties 1–17); optional property-test sub-tasks are included for full coverage
- No test framework setup is required — property/unit tests can be run inline in the browser console or with a zero-config runner of the implementer's choice
- Checkpoints validate incremental progress before adding more complexity

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2"] },
    { "id": 3, "tasks": ["2.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "5.1"] },
    { "id": 5, "tasks": ["5.2", "7.1"] },
    { "id": 6, "tasks": ["7.2", "8.1"] },
    { "id": 7, "tasks": ["8.2"] },
    { "id": 8, "tasks": ["9.1"] }
  ]
}
```
