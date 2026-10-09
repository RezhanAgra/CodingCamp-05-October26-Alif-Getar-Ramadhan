'use strict';

/* ==========================================================================
   Life Dashboard
   Sections: config → helpers → features (clock, timer, tasks, links, theme)
   ========================================================================== */

/* Config ------------------------------------------------------------------- */
const STORAGE_KEYS = {
  tasks: 'ld_tasks',
  links: 'ld_links',
  theme: 'ld_theme',
};

const FOCUS_DURATION_SECONDS = 25 * 60;

const DEFAULT_TASKS = [
  { id: 'seed-1', text: 'belanja', done: false },
  { id: 'seed-2', text: 'belajar', done: false },
];

const DEFAULT_LINKS = [
  { id: 'seed-1', name: 'Google', url: 'https://www.google.com' },
  { id: 'seed-2', name: 'Gmail', url: 'https://mail.google.com' },
  { id: 'seed-3', name: 'Calendar', url: 'https://calendar.google.com' },
];

/* Helpers ------------------------------------------------------------------ */
const $ = (selector, root = document) => root.querySelector(selector);

const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Storage unavailable (private mode / quota): keep working in memory. */
    }
  },
};

const createId = () => String(Date.now());

const pad = (number) => String(number).padStart(2, '0');

function cloneTemplate(id) {
  return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

/* Clock & greeting --------------------------------------------------------- */
function getGreeting(hour) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

function initClock() {
  const clock = $('#clock');
  const date = $('#date');
  const greeting = $('#greeting');

  function render() {
    const now = new Date();

    clock.textContent = now.toLocaleTimeString('en-GB');
    clock.dateTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    date.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    date.dateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    greeting.textContent = getGreeting(now.getHours());
  }

  render();
  setInterval(render, 1000);
}

/* Focus timer -------------------------------------------------------------- */
function initTimer() {
  const display = $('#timer-display');
  let remaining = FOCUS_DURATION_SECONDS;
  let endTime = null;
  let intervalId = null;

  const isRunning = () => intervalId !== null;

  function render() {
    const text = `${pad(Math.floor(remaining / 60))}:${pad(remaining % 60)}`;
    display.textContent = text;
    document.title = isRunning() ? `${text} - Focus` : 'Life Dashboard';
  }

  function tick() {
    remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    render();
    if (remaining === 0) complete();
  }

  function start() {
    if (isRunning() || remaining === 0) return;
    endTime = Date.now() + remaining * 1000;
    intervalId = setInterval(tick, 250);
  }

  function stop() {
    clearInterval(intervalId);
    intervalId = null;
    render();
  }

  function reset() {
    stop();
    remaining = FOCUS_DURATION_SECONDS;
    render();
  }

  function complete() {
    reset();
    alert('Waktu fokus selesai! Saatnya istirahat.');
  }

  $('#timer-start').addEventListener('click', start);
  $('#timer-stop').addEventListener('click', stop);
  $('#timer-reset').addEventListener('click', reset);
  render();
}

/* Tasks -------------------------------------------------------------------- */
function initTasks() {
  const form = $('#task-form');
  const input = $('#task-input');
  const list = $('#task-list');
  const emptyMessage = $('#task-empty');

  let tasks = storage.get(STORAGE_KEYS.tasks, DEFAULT_TASKS);

  const persist = () => storage.set(STORAGE_KEYS.tasks, tasks);

  function createItem(task) {
    const item = cloneTemplate('task-template');
    const checkbox = $('.task__checkbox', item);

    item.dataset.id = task.id;
    item.classList.toggle('task--done', task.done);
    checkbox.checked = task.done;
    $('.task__text', item).textContent = task.text;

    return item;
  }

  function render() {
    list.replaceChildren(...tasks.map(createItem));
    emptyMessage.hidden = tasks.length > 0;
  }

  function addTask(text) {
    tasks.push({ id: createId(), text, done: false });
    persist();
    render();
  }

  function toggleTask(id, done) {
    const task = tasks.find((item) => String(item.id) === id);
    if (task) task.done = done;
    persist();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((item) => String(item.id) !== id);
    persist();
    render();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addTask(text);
    form.reset();
    input.focus();
  });

  list.addEventListener('change', (event) => {
    if (!event.target.matches('.task__checkbox')) return;
    toggleTask(event.target.closest('.task').dataset.id, event.target.checked);
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="delete"]');
    if (button) deleteTask(button.closest('.task').dataset.id);
  });

  render();
}

/* Quick links -------------------------------------------------------------- */
function initLinks() {
  const form = $('#link-form');
  const nameInput = $('#link-name');
  const list = $('#link-list');

  let links = storage.get(STORAGE_KEYS.links, DEFAULT_LINKS);

  const persist = () => storage.set(STORAGE_KEYS.links, links);

  const normalizeUrl = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

  function createItem(link) {
    const item = cloneTemplate('link-template');
    const anchor = $('.link__anchor', item);
    const removeButton = $('.link__remove', item);

    item.dataset.id = link.id;
    anchor.href = link.url;
    anchor.textContent = link.name;
    removeButton.setAttribute('aria-label', `Hapus ${link.name}`);

    return item;
  }

  function render() {
    list.replaceChildren(...links.map(createItem));
  }

  function addLink(name, url) {
    links.push({ id: createId(), name, url: normalizeUrl(url) });
    persist();
    render();
  }

  function removeLink(id) {
    links = links.filter((item) => String(item.id) !== id);
    persist();
    render();
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get('name').trim();
    const url = data.get('url').trim();
    if (!name || !url) return;
    addLink(name, url);
    form.reset();
    nameInput.focus();
  });

  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="remove"]');
    if (button) removeLink(button.closest('.link').dataset.id);
  });

  render();
}

/* Theme -------------------------------------------------------------------- */
function initTheme() {
  const root = document.documentElement;
  const toggle = $('#theme-toggle');

  function apply(theme) {
    root.dataset.theme = theme;
    toggle.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    try {
      localStorage.setItem(STORAGE_KEYS.theme, theme);
    } catch {
      /* Ignore: theme just won't persist. */
    }
  }

  toggle.addEventListener('click', () => {
    apply(root.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  apply(root.dataset.theme || 'light');
}

/* Init --------------------------------------------------------------------- */
initClock();
initTimer();
initTasks();
initLinks();
initTheme();
