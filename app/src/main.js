const STORAGE_KEY = 'ch-countdown:v2';
const LEGACY_KEY = 'ch-countdown:v1';
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MINUTE_STEP = 5;

// timers: [{ id, title, targetMs|null }]
let timers = [];
let selectedId = null;
let timerId = null;

const $ = (id) => document.getElementById(id);

function pad(n) { return String(n).padStart(2, '0'); }

function uid() {
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function selected() {
  return timers.find((t) => t.id === selectedId) || null;
}

// ---------- formatting ----------
function fmtDateTime(d) {
  const wd = DAYS_EN[d.getDay()];
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} (${wd}) ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtTimeWithSeconds(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function fmtElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${pad(s)}s`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

// Short form for the sidebar list.
function fmtShort(ms) {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

function miniRemaining(t) {
  if (t.targetMs == null) return 'not set';
  const diff = t.targetMs - Date.now();
  return diff <= 0 ? 'started' : fmtShort(diff);
}

// ---------- date/time controls ----------
function toDateInputValue(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function readInputsToMs() {
  const dv = $('dateInput').value;
  if (!dv) return null;
  const [y, m, d] = dv.split('-').map(Number);
  const h = Number($('hourInput').value);
  const min = Number($('minuteInput').value);
  const t = new Date(y, m - 1, d, h, min, 0, 0).getTime();
  return Number.isFinite(t) ? t : null;
}

function writeMsToInputs(ms) {
  const d = new Date(ms);
  $('dateInput').value = toDateInputValue(ms);
  $('hourInput').value = String(d.getHours());
  setMinuteValue(d.getMinutes());
}

// Select the given minute, injecting a one-off <option> when the target is off
// the 5-minute grid so the control always reflects the real target.
function setMinuteValue(min) {
  const sel = $('minuteInput');
  const prevExtra = sel.querySelector('option[data-extra]');
  if (prevExtra) prevExtra.remove();
  if (min % MINUTE_STEP !== 0) {
    const opt = document.createElement('option');
    opt.value = String(min);
    opt.textContent = pad(min);
    opt.dataset.extra = '1';
    const after = [...sel.options].find((o) => Number(o.value) > min);
    sel.insertBefore(opt, after || null);
  }
  sel.value = String(min);
}

function populateSelectOptions() {
  const hourSel = $('hourInput');
  for (let h = 0; h < 24; h++) {
    const opt = document.createElement('option');
    opt.value = String(h);
    opt.textContent = pad(h);
    hourSel.appendChild(opt);
  }
  const minSel = $('minuteInput');
  for (let m = 0; m < 60; m += MINUTE_STEP) {
    const opt = document.createElement('option');
    opt.value = String(m);
    opt.textContent = pad(m);
    minSel.appendChild(opt);
  }
}

// ---------- persistence ----------
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ timers, selectedId }));
  } catch (e) { /* ignore */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (Array.isArray(s.timers)) {
        timers = s.timers
          .filter((t) => t && typeof t.id === 'string')
          .map((t) => ({
            id: t.id,
            title: typeof t.title === 'string' ? t.title : '',
            targetMs: Number.isFinite(t.targetMs) ? t.targetMs : null,
          }));
        selectedId = s.selectedId;
      }
    }
  } catch (e) { /* ignore */ }

  // Migrate the old single-timer state.
  if (!timers.length) {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        timers = [{
          id: uid(),
          title: typeof s.title === 'string' ? s.title : 'Meeting',
          targetMs: Number.isFinite(s.target) ? s.target : null,
        }];
      }
    } catch (e) { /* ignore */ }
  }

  if (!timers.length) timers = [{ id: uid(), title: 'Meeting', targetMs: null }];
  if (!selected()) selectedId = timers[0].id;

  // URL params apply to the selected timer (sharing / testing).
  const url = new URL(window.location.href);
  const at = url.searchParams.get('at');
  const t = url.searchParams.get('t');
  const title = url.searchParams.get('title');
  const sel = selected();
  if (at) {
    const ms = Date.parse(at);
    if (Number.isFinite(ms)) sel.targetMs = Math.floor(ms / 60000) * 60000;
  } else if (t) {
    const ms = Number(t);
    if (Number.isFinite(ms) && ms > 0) sel.targetMs = Math.floor(ms / 60000) * 60000;
  }
  if (title != null) sel.title = title.trim();
}

// ---------- main view ----------
const ACTIVE_HTML = `
  <div class="unit"><div class="number" id="days">--</div><div class="label">Days</div></div>
  <div class="unit"><div class="number" id="hours">--</div><div class="label">Hours</div></div>
  <div class="unit"><div class="number" id="minutes">--</div><div class="label">Min</div></div>
  <div class="unit"><div class="number" id="seconds">--</div><div class="label">Sec</div></div>`;

const ELAPSED_HTML = `
  <div class="elapsed">
    <div class="number" id="elapsedNumber">--</div>
    <div class="label" id="elapsedLabel">Started ago</div>
  </div>`;

const UNSET_HTML = `
  <div class="unset-prompt">
    <div>Pick a target below to start</div>
  </div>`;

const STATE_HTML = { active: ACTIVE_HTML, expired: ELAPSED_HTML, unset: UNSET_HTML };

function setCountdownState(state) {
  const cd = $('countdown');
  if (cd.dataset.state === state) return;
  cd.dataset.state = state;
  cd.innerHTML = STATE_HTML[state];
}

const BADGE_TEXT = { upcoming: 'UPCOMING', started: 'STARTED', unset: 'NOT SET' };

function setBadgeState(state) {
  const b = $('badge');
  if (b.dataset.state === state) return;
  b.dataset.state = state;
  b.textContent = BADGE_TEXT[state];
}

function updateMeta(ms) {
  const now = new Date();
  if (ms == null) {
    $('metaTarget').textContent = 'Not set';
    $('metaNow').textContent = `${fmtDateTime(now)}:${pad(now.getSeconds())}`;
    return;
  }
  const target = new Date(ms);
  $('metaTarget').textContent = fmtDateTime(target);
  $('metaNow').textContent = isSameDay(target, now)
    ? fmtTimeWithSeconds(now)
    : `${fmtDateTime(now)}:${pad(now.getSeconds())}`;
}

// Render the selected timer in the main area. Does NOT touch the title element
// (so editing isn't disrupted) — title is set on select/init.
function renderMain() {
  const sel = selected();
  const ms = sel ? sel.targetMs : null;
  updateMeta(ms);

  if (ms == null) {
    setCountdownState('unset');
    setBadgeState('unset');
    return;
  }

  const diff = ms - Date.now();
  if (diff <= 0) {
    setCountdownState('expired');
    setBadgeState('started');
    $('elapsedNumber').textContent = fmtElapsed(-diff);
    $('elapsedLabel').textContent = 'Started ago';
    return;
  }

  setCountdownState('active');
  setBadgeState('upcoming');
  $('days').textContent = pad(Math.floor(diff / 86400000));
  $('hours').textContent = pad(Math.floor((diff % 86400000) / 3600000));
  $('minutes').textContent = pad(Math.floor((diff % 3600000) / 60000));
  $('seconds').textContent = pad(Math.floor((diff % 60000) / 1000));
}

// ---------- sidebar ----------
function renderSidebar() {
  $('timerList').innerHTML = timers.map((t) => {
    const expired = t.targetMs != null && t.targetMs - Date.now() <= 0;
    const cls = `timer-item${t.id === selectedId ? ' active' : ''}${expired ? ' expired' : ''}`;
    return `
    <li class="${cls}" data-id="${t.id}">
      <span class="ti-title">${escapeHtml(t.title || 'Untitled')}</span>
      <span class="ti-rem" data-rem>${miniRemaining(t)}</span>
      <button class="ti-del" type="button" title="Remove" aria-label="Remove timer">×</button>
    </li>`;
  }).join('');
}

function updateSidebarTimes() {
  for (const li of $('timerList').children) {
    const t = timers.find((x) => x.id === li.dataset.id);
    if (!t) continue;
    const rem = li.querySelector('[data-rem]');
    if (rem) rem.textContent = miniRemaining(t);
    li.classList.toggle('expired', t.targetMs != null && t.targetMs - Date.now() <= 0);
  }
}

// ---------- loop (1 Hz, always running) ----------
function tick() {
  renderMain();
  updateSidebarTimes();
  timerId = setTimeout(tick, 1000 - (Date.now() % 1000));
}

function startLoop() {
  clearTimeout(timerId);
  tick();
}

// ---------- timer actions ----------
function selectTimer(id) {
  selectedId = id;
  const sel = selected();
  if (!sel) return;
  $('title').textContent = sel.title || '';
  writeMsToInputs(sel.targetMs ?? Date.now());
  save();
  renderMain();
  renderSidebar();
}

function setTargetForSelected(ms) {
  const sel = selected();
  if (!sel) return;
  // Truncate to the minute so the controls and the stored target always agree.
  sel.targetMs = Math.floor(ms / 60000) * 60000;
  writeMsToInputs(sel.targetMs);
  save();
  renderMain();
  renderSidebar();
}

function addTimer() {
  const t = { id: uid(), title: `Timer ${timers.length + 1}`, targetMs: null };
  timers.push(t);
  selectTimer(t.id);
}

function deleteTimer(id) {
  const i = timers.findIndex((t) => t.id === id);
  if (i < 0) return;
  timers.splice(i, 1);
  if (!timers.length) timers.push({ id: uid(), title: 'Meeting', targetMs: null });
  if (selectedId === id) selectedId = timers[Math.min(i, timers.length - 1)].id;
  const sel = selected();
  $('title').textContent = sel.title || '';
  writeMsToInputs(sel.targetMs ?? Date.now());
  save();
  renderMain();
  renderSidebar();
}

// ---------- event wiring ----------
$('setBtn').addEventListener('click', () => {
  const ms = readInputsToMs();
  if (ms != null) setTargetForSelected(ms);
});

$('resetBtn').addEventListener('click', () => {
  const sel = selected();
  if (!sel) return;
  sel.targetMs = null;       // title is intentionally preserved
  writeMsToInputs(Date.now());
  save();
  renderMain();
  renderSidebar();
});

$('title').addEventListener('input', () => {
  const sel = selected();
  if (!sel) return;
  if (!$('title').textContent.trim()) $('title').textContent = '';
  sel.title = $('title').textContent.trim();
  for (const li of $('timerList').children) {
    if (li.dataset.id === sel.id) {
      li.querySelector('.ti-title').textContent = sel.title || 'Untitled';
      break;
    }
  }
  save();
});
$('title').addEventListener('blur', save);
$('title').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('title').blur(); }
});

document.querySelectorAll('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const sel = selected();
    if (!sel) return;
    const base = sel.targetMs ?? Date.now();
    setTargetForSelected(base + Number(btn.dataset.preset) * 60000);
  });
});

$('addTimer').addEventListener('click', addTimer);

$('timerList').addEventListener('click', (e) => {
  const li = e.target.closest('.timer-item');
  if (!li) return;
  if (e.target.closest('.ti-del')) deleteTimer(li.dataset.id);
  else selectTimer(li.dataset.id);
});

// Desktop (Tauri): open the credit link in the system browser. A plain browser
// has no window.__TAURI__, so it falls through to the normal <a target="_blank">.
const creditLink = document.querySelector('.credit a');
if (creditLink && window.__TAURI__ && window.__TAURI__.opener) {
  creditLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.__TAURI__.opener.openUrl(creditLink.href);
  });
}

// ---------- auto-update (desktop / Tauri only) ----------
function flashCheckLabel(text) {
  const btn = $('checkUpdates');
  if (!btn) return;
  if (!btn.dataset.orig) btn.dataset.orig = btn.textContent;
  btn.textContent = text;
  clearTimeout(flashCheckLabel._t);
  flashCheckLabel._t = setTimeout(() => { btn.textContent = btn.dataset.orig; }, 2500);
}

function showUpdate(update) {
  $('updateMsg').textContent = `Update ${update.version} available`;
  $('updateBanner').hidden = false;
  $('updateInstall').onclick = async () => {
    const b = $('updateInstall');
    b.disabled = true;
    b.textContent = 'Installing…';
    try {
      await update.downloadAndInstall();
      await window.__TAURI__.process.relaunch();
    } catch (e) {
      $('updateMsg').textContent = 'Update failed — try again later';
      b.disabled = false;
      b.textContent = 'Install & restart';
    }
  };
}

async function checkForUpdates(manual) {
  const api = window.__TAURI__ && window.__TAURI__.updater;
  if (!api) return;
  if (manual) flashCheckLabel('Checking…');
  try {
    const update = await api.check();
    if (update) showUpdate(update);
    else if (manual) flashCheckLabel('You’re up to date');
  } catch (e) {
    if (manual) flashCheckLabel('Check failed');
  }
}

(function initUpdates() {
  const btn = $('checkUpdates');
  if (!btn) return;
  if (window.__TAURI__ && window.__TAURI__.updater) {
    btn.addEventListener('click', () => checkForUpdates(true));
    checkForUpdates(false);   // silent check on startup
  } else {
    btn.hidden = true;        // plain browser (web build): no updater
  }
})();

// ---------- particles ----------
(function createParticles() {
  const container = $('particles');
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (6 + Math.random() * 10) + 's';
    p.style.animationDelay = -(Math.random() * 16) + 's';
    p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
    container.appendChild(p);
  }
})();

// ---------- init ----------
populateSelectOptions();
load();
const initSel = selected();
$('title').textContent = initSel.title || '';
writeMsToInputs(initSel.targetMs ?? Date.now());
renderSidebar();
startLoop();
