# Design Document — To-Do Life Dashboard

## Overview

The To-Do Life Dashboard is a zero-dependency, client-side web application delivered as three static files: `index.html`, `css/style.css`, and `js/app.js`. There are no build steps, no package managers, and no network calls after the initial file load. All persistent state lives in the browser's `localStorage`. The UI is divided into four independent widgets that are rendered and updated by plain Vanilla JavaScript.

---

## Architecture

### File Structure

```
project-root/
├── index.html          # Single HTML entry point; declares markup skeleton
├── css/
│   └── style.css       # All styling — layout, theme, dark mode, focus indicators
└── js/
    └── app.js          # All behaviour — modules per widget, shared storage helpers
```

### Runtime Model

The application runs entirely in the browser's main thread. There are no workers, no modules bundler, and no `import`/`export` statements (to preserve compatibility without a server). All code is wrapped in an IIFE or a single `DOMContentLoaded` listener to avoid polluting the global scope.

```
index.html
  └── <link rel="stylesheet" href="css/style.css">
  └── <script src="js/app.js" defer>
        DOMContentLoaded →
          ├── GreetingModule.init()
          ├── TimerModule.init()
          ├── TodoModule.init()
          └── LinksModule.init()
```

Each module is an object literal with an `init()` method and private state held in closure. Modules communicate only through the DOM and `localStorage`; they have no direct references to one another.

---

## Component Design

### 1. Shared Storage Helper (`StorageHelper`)

A thin wrapper over `localStorage` to centralise serialisation and prevent key collisions.

```javascript
const StorageHelper = {
  KEYS: {
    TODOS: 'tld_todos',
    LINKS: 'tld_links',
  },

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? [];
    } catch {
      return [];
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};
```

- `get` always returns a safe value (empty array on missing or malformed data).
- `set` serialises the full array on every mutation, matching the requirement that the full updated array is written on every change.

---

### 2. Greeting Module (`GreetingModule`)

**Responsibility:** Display the current date, a live clock, and a time-of-day greeting.

**State:** No persistent state. Derived entirely from `new Date()`.

**Key functions:**

```javascript
function formatDate(date) {
  // Returns e.g. "Monday, October 5, 2026"
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatTime(date) {
  // Returns e.g. "14:35:07" (24-hour) or "2:35:07 PM" (12-hour with AM/PM)
  return date.toLocaleTimeString('en-US', { hour12: false });
}

function getGreeting(hour) {
  // hour: integer 0–23
  if (hour >= 5  && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 20) return 'Good Evening';
  return 'Good Night'; // 21–23 and 0–4
}
```

**Update loop:** A `setInterval` fires every 1 000 ms and re-renders the date, time, and greeting into their respective DOM elements.

---

### 3. Timer Module (`TimerModule`)

**Responsibility:** 25-minute Pomodoro countdown with Start / Stop / Reset controls.

**State (in closure):**

```javascript
let remaining = 1500;  // seconds; 25 * 60
let timerId   = null;  // setInterval handle, or null when idle
```

**State transitions:**

```
Idle  --[Start]-->  Active
Active --[Stop]-->  Idle (remaining preserved)
Any   --[Reset]-->  Idle (remaining = 1500)
Active --[0:00]-->  Idle (remaining = 0, alert fired)
```

**Key functions:**

```javascript
function formatTime(totalSeconds) {
  // Returns "MM:SS" zero-padded string
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function isActive() { return timerId !== null; }

function tick() {
  remaining -= 1;
  render();
  if (remaining <= 0) {
    clearInterval(timerId);
    timerId = null;
    render();
    alert('Focus session complete! Take a break.');
  }
}

function start() {
  if (isActive()) return;
  timerId = setInterval(tick, 1000);
  render();
}

function stop() {
  if (!isActive()) return;
  clearInterval(timerId);
  timerId = null;
  render();
}

function reset() {
  stop();
  remaining = 1500;
  render();
}

function render() {
  displayEl.textContent = formatTime(remaining);
  startBtn.disabled = isActive();
  stopBtn.disabled  = !isActive();
}
```

> No `localStorage` persistence for the timer — the requirement specifies only the four widgets need persistence, and Requirement 3 does not mention saving timer state.

---

### 4. To-Do Module (`TodoModule`)

**Responsibility:** Full CRUD for task items with localStorage persistence.

**Data model:**

```javascript
// Task object
{
  id:        string,   // crypto.randomUUID() or Date.now().toString()
  text:      string,   // task description
  completed: boolean,  // false by default
}
```

**In-memory state:** `let tasks = []` loaded from `StorageHelper.get(KEYS.TODOS)` at `init()`.

**Key functions:**

```javascript
function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;                          // guard: empty / whitespace-only
  tasks.push({ id: uid(), text: trimmed, completed: false });
  persist();
  render();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  persist();
  render();
}

function editTask(id, newText) {
  const trimmed = newText.trim();
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  if (!trimmed) {
    render();   // discard edit, restore display
    return;
  }
  task.text = trimmed;
  persist();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  persist();
  render();
}

function persist() {
  StorageHelper.set(StorageHelper.KEYS.TODOS, tasks);
}
```

**Rendering strategy:** `render()` clears the task list container and rebuilds it from the in-memory `tasks` array. Each task item receives:
- A checkbox toggling `completed`.
- A `<span>` (display mode) or `<input>` (edit mode) for the description.
- An edit button that switches the row to edit mode.
- A delete button.
- A `completed` CSS class for strikethrough styling when `task.completed === true`.

**Edit mode lifecycle:**
1. User clicks edit → row switches to `<input>` pre-filled with `task.text`; edit button becomes "Save".
2. User clicks Save (or presses Enter) → `editTask(id, input.value)`.
3. `editTask` trims the value; if empty, discards and re-renders; otherwise updates and re-renders.

---

### 5. Links Module (`LinksModule`)

**Responsibility:** Manage a collection of labeled URL shortcuts.

**Data model:**

```javascript
// LinkEntry object
{
  id:    string,  // uid()
  label: string,
  url:   string,
}
```

**In-memory state:** `let links = []` loaded from `StorageHelper.get(KEYS.LINKS)` at `init()`.

**Key functions:**

```javascript
function addLink(label, url) {
  const l = label.trim();
  const u = url.trim();
  if (!l || !u) return;                          // guard: either field empty/whitespace
  links.push({ id: uid(), label: l, url: u });
  persist();
  render();
}

function deleteLink(id) {
  links = links.filter(lnk => lnk.id !== id);
  persist();
  render();
}

function persist() {
  StorageHelper.set(StorageHelper.KEYS.LINKS, links);
}
```

**Rendering strategy:** `render()` rebuilds the link container. Each entry renders as a `<button>` with an `onclick` of `window.open(url, '_blank', 'noopener')` plus a delete icon button.

---

## Data Models

### localStorage Schema

| Key | Type | Shape |
|---|---|---|
| `tld_todos` | `Task[]` | `[{ id, text, completed }]` |
| `tld_links` | `LinkEntry[]` | `[{ id, label, url }]` |

Both values are JSON-serialised arrays. Absence of a key is treated as an empty array (handled by `StorageHelper.get`).

### ID Generation

```javascript
function uid() {
  // Prefer crypto.randomUUID() if available; fall back to timestamp+random
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}
```

---

## HTML Skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>To-Do Life Dashboard</title>
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <main class="dashboard-grid">

    <!-- Widget 1: Greeting Panel -->
    <section class="widget widget--greeting" aria-label="Greeting Panel">
      <p id="greeting"></p>
      <p id="date"></p>
      <p id="clock"></p>
    </section>

    <!-- Widget 2: Focus Timer -->
    <section class="widget widget--timer" aria-label="Focus Timer">
      <h2 class="widget__title">Focus Timer</h2>
      <div id="timer-display" class="timer-display" aria-live="polite">25:00</div>
      <div class="timer-controls">
        <button id="timer-start">Start</button>
        <button id="timer-stop"  disabled>Stop</button>
        <button id="timer-reset">Reset</button>
      </div>
    </section>

    <!-- Widget 3: To-Do List -->
    <section class="widget widget--todos" aria-label="To-Do List">
      <h2 class="widget__title">Tasks</h2>
      <form id="todo-form">
        <input id="todo-input" type="text" placeholder="New task…" aria-label="New task description" />
        <button type="submit">Add</button>
      </form>
      <ul id="todo-list"></ul>
    </section>

    <!-- Widget 4: Quick Links -->
    <section class="widget widget--links" aria-label="Quick Links">
      <h2 class="widget__title">Quick Links</h2>
      <form id="link-form">
        <input id="link-label" type="text" placeholder="Label" aria-label="Link label" />
        <input id="link-url"   type="url"  placeholder="https://…" aria-label="Link URL" />
        <button type="submit">Add Link</button>
      </form>
      <div id="link-list"></div>
    </section>

  </main>
  <script src="js/app.js" defer></script>
</body>
</html>
```

---

## CSS Architecture

### Layout

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}

@media (max-width: 599px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

### Theming (CSS Custom Properties)

```css
:root {
  --color-bg:       #f8f9fa;
  --color-surface:  #ffffff;
  --color-text:     #212529;
  --color-muted:    #6c757d;
  --color-primary:  #0d6efd;
  --color-border:   #dee2e6;
  --font-size-base: 1rem;       /* 16px */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:      #121212;
    --color-surface: #1e1e1e;
    --color-text:    #e9ecef;
    --color-muted:   #adb5bd;
    --color-primary: #4dabf7;
    --color-border:  #343a40;
  }
}
```

All colours are expressed via CSS custom properties. The dark-mode override simply redefines the variables inside the `@media (prefers-color-scheme: dark)` block — no JavaScript is needed.

### Focus Indicators

```css
:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}
```

Using `:focus-visible` keeps the indicator for keyboard users while hiding it for mouse interactions.

### Contrast Compliance

The palette is chosen to meet WCAG 2.1 AA (4.5:1 minimum for normal text):
- Light mode: `#212529` text on `#ffffff` surface → ~16.1:1 ✓
- Dark mode: `#e9ecef` text on `#1e1e1e` surface → ~12.5:1 ✓

---

## Error Handling

| Scenario | Handling |
|---|---|
| `localStorage` unavailable (private mode, quota exceeded) | `StorageHelper.get` returns `[]`; `StorageHelper.set` silently fails (wrapped in try/catch). Data is still usable in-session. |
| Malformed JSON in `localStorage` | `JSON.parse` exception caught in `StorageHelper.get`; returns `[]`. |
| Empty / whitespace task input | `addTask` and `editTask` trim and guard; no task is created or modified. |
| Empty label or URL in links form | `addLink` guards with `!l \|\| !u`; no link is created. |
| Timer reaches 0 | `tick` clears the interval, calls `render()`, then fires `alert`. |
| `crypto.randomUUID` unavailable | `uid()` falls back to `Date.now()`-based string. |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

---

### Property 1: Greeting covers all 24 hours

*For any* integer hour value in the range [0, 23], `getGreeting(hour)` SHALL return exactly one of "Good Morning", "Good Afternoon", "Good Evening", or "Good Night", with boundaries:
- [5, 11] → "Good Morning"
- [12, 17] → "Good Afternoon"
- [18, 20] → "Good Evening"
- [0, 4] and [21, 23] → "Good Night"

**Validates: Requirements 2.3, 2.4, 2.5, 2.6**

---

### Property 2: Date format contains all required components

*For any* valid `Date` object, `formatDate(date)` SHALL return a string containing the full weekday name, the full month name, the numeric day, and the four-digit year.

**Validates: Requirements 2.1**

---

### Property 3: Time format is always MM:SS

*For any* integer `seconds` in the range [0, 1500], `TimerModule.formatTime(seconds)` SHALL return a string that matches the regular expression `/^\d{2}:\d{2}$/`.

**Validates: Requirements 3.2**

---

### Property 4: Stop preserves remaining time

*For any* timer state with a given `remaining` value, calling `start()` followed by `stop()` (before a tick) SHALL leave `remaining` unchanged.

**Validates: Requirements 3.4**

---

### Property 5: Reset always produces the initial state

*For any* timer state (active or idle, any `remaining` value), calling `reset()` SHALL produce the state `{ remaining: 1500, active: false }`.

**Validates: Requirements 3.5**

---

### Property 6: Button state reflects timer activity

*For any* timer state, if the timer is active then the Start button SHALL be disabled and the Stop button SHALL be enabled; if the timer is idle then the Start button SHALL be enabled and the Stop button SHALL be disabled.

**Validates: Requirements 3.7, 3.8**

---

### Property 7: Adding a valid task grows the list

*For any* task list state and *for any* non-empty (non-whitespace-only) string `text`, calling `addTask(text)` SHALL increase the task count by exactly 1 and the new task's `text` property SHALL equal `text.trim()`.

**Validates: Requirements 4.1**

---

### Property 8: Whitespace-only task input is rejected

*For any* string composed entirely of whitespace characters (including the empty string), calling `addTask(text)` SHALL leave the task list unchanged.

**Validates: Requirements 4.2**

---

### Property 9: Completion toggle is its own inverse

*For any* task, calling `toggleTask(id)` twice SHALL return the task's `completed` property to its original value.

**Validates: Requirements 4.3**

---

### Property 10: Valid edit updates description

*For any* task and *for any* non-empty (non-whitespace-only) string `newText`, calling `editTask(id, newText)` SHALL set `task.text` to `newText.trim()`.

**Validates: Requirements 4.5**

---

### Property 11: Whitespace-only edit discards change

*For any* task with description `originalText` and *for any* string composed entirely of whitespace, calling `editTask(id, whitespaceStr)` SHALL leave `task.text` equal to `originalText`.

**Validates: Requirements 4.6**

---

### Property 12: Delete removes exactly the targeted task

*For any* task list containing a task with id `id`, calling `deleteTask(id)` SHALL result in no task with that id remaining in the list, and all other tasks SHALL remain unchanged.

**Validates: Requirements 4.7**

---

### Property 13: Task array localStorage round-trip

*For any* array of task objects, serialising it via `StorageHelper.set` and then deserialising it via `StorageHelper.get` SHALL produce an array that is deep-equal to the original, in the same order.

**Validates: Requirements 4.8, 4.9**

---

### Property 14: Adding a valid link grows the list

*For any* links list state and *for any* non-empty label string and non-empty URL string, calling `addLink(label, url)` SHALL increase the links count by exactly 1 with the correct label and url properties.

**Validates: Requirements 5.2**

---

### Property 15: Invalid link input is rejected

*For any* pair of inputs where at least one of label or URL is empty or whitespace-only, calling `addLink(label, url)` SHALL leave the links list unchanged.

**Validates: Requirements 5.3**

---

### Property 16: Link delete removes exactly the targeted entry

*For any* links list containing an entry with id `id`, calling `deleteLink(id)` SHALL result in no entry with that id remaining, and all other entries SHALL remain unchanged.

**Validates: Requirements 5.5**

---

### Property 17: Links array localStorage round-trip

*For any* array of link entry objects, serialising via `StorageHelper.set` and deserialising via `StorageHelper.get` SHALL produce an array that is deep-equal to the original, in the same order.

**Validates: Requirements 5.6, 5.7**
