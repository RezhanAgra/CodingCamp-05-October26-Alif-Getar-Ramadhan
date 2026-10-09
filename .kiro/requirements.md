# Requirements Document

## Introduction

A standalone, client-side web application called the **To-Do Life Dashboard** that combines four productivity widgets in a single HTML page: a contextual Greeting panel showing date and time, a Focus Timer with Pomodoro-style 25-minute countdown, a persistent To-Do List, and a Quick Links launcher. All data persists exclusively through the browser's Local Storage API. The app is built with plain HTML, CSS, and Vanilla JavaScript (no frameworks), works across all modern browsers, and presents a clean light-mode interface with optional dark mode via `prefers-color-scheme`.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Greeting Panel**: The UI section displaying the current date, time, and a time-of-day greeting message.
- **Focus Timer**: The UI section containing a 25-minute countdown timer with Start, Stop, and Reset controls.
- **To-Do List**: The UI section allowing the user to create, edit, complete, and delete task items.
- **Task**: A single to-do item stored in Local Storage, consisting of a text description and a completion state.
- **Quick Links**: The UI section allowing the user to store and launch URLs as labeled buttons.
- **Link Entry**: A single quick-link record stored in Local Storage, consisting of a label and a URL.
- **Local Storage**: The browser's `localStorage` API used as the sole persistence mechanism.
- **Timer Session**: A single run of the Focus Timer from its current value to zero.
- **Active Timer**: The Focus Timer while it is counting down (not paused and not reset).
- **Idle Timer**: The Focus Timer when it is not counting down (initial state, paused, or reset).
- **Modern Browser**: A current release of Chrome, Firefox, Edge, or Safari.

---

## Requirements

### Requirement 1 — Dashboard Bootstrap

**User Story:** As a user, I want the Dashboard to load instantly in any modern browser without any installation or build step, so that I can use it by simply opening the HTML file.

#### Acceptance Criteria

1. THE Dashboard SHALL consist of exactly one HTML file, one CSS file located inside a `css/` directory, and one JavaScript file located inside a `js/` directory.
2. THE Dashboard SHALL load and render all four widgets without network requests beyond the three local files.
3. WHEN the Dashboard is opened in a Modern Browser, THE Dashboard SHALL display all widgets within 500 ms on a standard desktop machine.
4. WHERE the operating system or browser applies `prefers-color-scheme: dark`, THE Dashboard SHALL apply a dark color scheme automatically without any user action.

---

### Requirement 2 — Greeting Panel

**User Story:** As a user, I want to see the current date, time, and a greeting that reflects my time of day, so that the Dashboard feels personal and contextually relevant.

#### Acceptance Criteria

1. THE Greeting Panel SHALL display the current full date in a human-readable format (e.g., "Monday, October 5, 2026").
2. THE Greeting Panel SHALL display the current time updated every second in HH:MM:SS format (24-hour or 12-hour with AM/PM indicator).
3. WHEN the local hour is between 05:00 and 11:59 inclusive, THE Greeting Panel SHALL display the message "Good Morning".
4. WHEN the local hour is between 12:00 and 17:59 inclusive, THE Greeting Panel SHALL display the message "Good Afternoon".
5. WHEN the local hour is between 18:00 and 20:59 inclusive, THE Greeting Panel SHALL display the message "Good Evening".
6. WHEN the local hour is between 21:00 and 04:59 inclusive, THE Greeting Panel SHALL display the message "Good Night".

---

### Requirement 3 — Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with Start, Stop, and Reset controls, so that I can time focused work sessions without leaving the Dashboard.

#### Acceptance Criteria

1. THE Focus Timer SHALL initialise at 25 minutes 00 seconds (25:00) when the Dashboard first loads.
2. THE Focus Timer SHALL display the remaining time in MM:SS format at all times.
3. WHEN the user activates the Start control while the Focus Timer is in the Idle Timer state, THE Focus Timer SHALL begin counting down one second per second.
4. WHEN the user activates the Stop control while the Focus Timer is in the Active Timer state, THE Focus Timer SHALL pause the countdown and retain the remaining time.
5. WHEN the user activates the Reset control, THE Focus Timer SHALL stop any active countdown and return the displayed time to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus Timer SHALL stop automatically and notify the user with a browser `alert` message stating that the session is complete.
7. WHILE the Focus Timer is in the Active Timer state, THE Dashboard SHALL disable the Start control and enable the Stop control.
8. WHILE the Focus Timer is in the Idle Timer state, THE Dashboard SHALL enable the Start control and disable the Stop control.

---

### Requirement 4 — To-Do List

**User Story:** As a user, I want to add, edit, mark as done, and delete tasks that persist across browser sessions, so that I can track my work reliably.

#### Acceptance Criteria

1. THE To-Do List SHALL provide an input field and an "Add" control that appends a new Task when the user submits a non-empty text value.
2. IF the user attempts to add a Task with an empty or whitespace-only description, THEN THE To-Do List SHALL reject the submission and not create a Task.
3. WHEN the user activates the complete control on a Task, THE To-Do List SHALL toggle the Task's completion state and apply a visual distinction (e.g., strikethrough) to completed Tasks.
4. WHEN the user activates the edit control on a Task, THE To-Do List SHALL replace the Task's display text with an editable input field pre-filled with the current description.
5. WHEN the user confirms an edit with a non-empty value, THE To-Do List SHALL update the Task's description to the new value and return to display mode.
6. IF the user confirms an edit with an empty or whitespace-only value, THEN THE To-Do List SHALL discard the edit and restore the original description.
7. WHEN the user activates the delete control on a Task, THE To-Do List SHALL permanently remove the Task from the list and from Local Storage.
8. WHEN any Task state changes (add, edit, complete, delete), THE To-Do List SHALL write the full updated Task array to Local Storage under a consistent key.
9. WHEN the Dashboard loads, THE To-Do List SHALL read all Task records from Local Storage and render them in the order they were originally added.

---

### Requirement 5 — Quick Links

**User Story:** As a user, I want to save and launch favorite URLs as labeled buttons, so that I can navigate to frequently visited sites without leaving or re-typing addresses.

#### Acceptance Criteria

1. THE Quick Links section SHALL provide a label input field, a URL input field, and an "Add Link" control.
2. WHEN the user submits both a non-empty label and a non-empty URL, THE Quick Links section SHALL create a new Link Entry and display it as a labeled button.
3. IF the user attempts to add a Link Entry with an empty label or an empty URL, THEN THE Quick Links section SHALL reject the submission and not create a Link Entry.
4. WHEN the user activates a Link Entry button, THE Dashboard SHALL open the associated URL in a new browser tab.
5. WHEN the user activates the delete control on a Link Entry, THE Quick Links section SHALL permanently remove the Link Entry from the display and from Local Storage.
6. WHEN any Link Entry changes (add, delete), THE Quick Links section SHALL write the full updated Link Entry array to Local Storage under a consistent key.
7. WHEN the Dashboard loads, THE Quick Links section SHALL read all Link Entry records from Local Storage and render them in the order they were originally added.

---

### Requirement 6 — Layout and Visual Design

**User Story:** As a user, I want a clean, readable, and responsive layout with clear visual hierarchy, so that I can use the Dashboard comfortably on any screen size.

#### Acceptance Criteria

1. THE Dashboard SHALL arrange the four widgets (Greeting Panel, Focus Timer, To-Do List, Quick Links) in a responsive grid layout that adapts to viewport widths from 320 px to 2560 px without horizontal scrolling.
2. THE Dashboard SHALL use a single CSS file for all styling; no inline styles SHALL be used for layout or theming.
3. THE Dashboard SHALL use a legible body font size of at least 16 px and maintain a minimum contrast ratio of 4.5:1 between text and background in both light and dark modes, in compliance with WCAG 2.1 AA.
4. THE Dashboard SHALL provide visible focus indicators on all interactive controls (buttons, inputs) for keyboard navigation.
5. WHEN the viewport width is below 600 px, THE Dashboard SHALL stack the widgets in a single-column layout.
