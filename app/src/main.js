const STORAGE_KEY = 'ch-countdown:v1';
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

let targetMs = null;
let timerId = null;

const $ = (id) => document.getElementById(id);

function pad(n) { return String(n).padStart(2, '0'); }

function fmtDateTime(d) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const wd = DAYS_EN[d.getDay()];
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}.${m}.${day} (${wd}) ${hh}:${mm}`;
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

const MINUTE_STEP = 5;

function writeMsToInputs(ms) {
  const d = new Date(ms);
  $('dateInput').value = toDateInputValue(ms);
  $('hourInput').value = String(d.getHours());
  setMinuteValue(d.getMinutes());
}

// Select the given minute, injecting a one-off <option> when the target is
// off the 5-minute grid so the control always reflects the real target
// (otherwise the display would round independently of the stored target).
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

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      target: targetMs,
      title: $('title').textContent.trim(),
    }));
  } catch (e) { /* ignore */ }
}

function loadState() {
  const url = new URL(window.location.href);
  const qTarget = url.searchParams.get('t');
  const qTitle = url.searchParams.get('title');
  if (qTarget != null) {
    const t = Number(qTarget);
    if (Number.isFinite(t) && t > 0) targetMs = t;
  }
  if (qTitle != null) $('title').textContent = qTitle.trim();

  if (targetMs == null) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Number.isFinite(s.target) && s.target > 0) targetMs = s.target;
        if (s.title !== undefined) $('title').textContent = s.title;
      }
    } catch (e) { /* ignore */ }
  }

}

function setTarget(ms, { sync = true } = {}) {
  // Truncate to the minute so the controls (minute granularity) and the
  // stored target always agree — a no-op "Set" then can't shift the target.
  targetMs = Math.floor(ms / 60000) * 60000;
  writeMsToInputs(targetMs);
  if (sync) saveState();
  updateMeta();
  startLoop();
}

function updateMeta() {
  const now = new Date();
  if (targetMs == null) {
    $('metaTarget').textContent = 'Not set';
    $('metaNow').textContent = `${fmtDateTime(now)}:${pad(now.getSeconds())}`;
    return;
  }
  const target = new Date(targetMs);
  $('metaTarget').textContent = fmtDateTime(target);
  $('metaNow').textContent = isSameDay(target, now)
    ? fmtTimeWithSeconds(now)
    : `${fmtDateTime(now)}:${pad(now.getSeconds())}`;
}

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

const STATE_HTML = {
  active: ACTIVE_HTML,
  expired: ELAPSED_HTML,
  unset: UNSET_HTML,
};

function setCountdownState(state) {
  const cd = $('countdown');
  if (cd.dataset.state === state) return;
  cd.dataset.state = state;
  cd.innerHTML = STATE_HTML[state];
}

const BADGE_TEXT = {
  upcoming: 'UPCOMING',
  started: 'STARTED',
  unset: 'NOT SET',
};

function setBadgeState(state) {
  const b = $('badge');
  if (b.dataset.state === state) return;
  b.dataset.state = state;
  b.textContent = BADGE_TEXT[state];
}

function render() {
  if (targetMs == null) {
    setCountdownState('unset');
    setBadgeState('unset');
    return;
  }

  const diff = targetMs - Date.now();

  if (diff <= 0) {
    setCountdownState('expired');
    setBadgeState('started');
    const elapsed = -diff;
    $('elapsedNumber').textContent = fmtElapsed(elapsed);
    $('elapsedLabel').textContent = 'Started ago';
    return;
  }

  setCountdownState('active');
  setBadgeState('upcoming');

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  $('days').textContent = pad(days);
  $('hours').textContent = pad(hours);
  $('minutes').textContent = pad(minutes);
  $('seconds').textContent = pad(seconds);
}

// Tick once per wall-clock second while a target is set. The display only
// changes once per second, so a 1 Hz timer replaces the old per-frame
// requestAnimationFrame loop (which spun at 60-144 Hz forever, wasting
// CPU/battery on an always-open desktop widget).
function tick() {
  render();
  if (targetMs != null) {
    timerId = setTimeout(tick, 1000 - (Date.now() % 1000));
  }
}

function startLoop() {
  clearTimeout(timerId);
  tick();
}

// Event wiring
$('setBtn').addEventListener('click', () => {
  const ms = readInputsToMs();
  if (ms != null) setTarget(ms);
});

$('resetBtn').addEventListener('click', () => {
  targetMs = null;
  saveState();
  writeMsToInputs(Date.now());
  updateMeta();
  clearTimeout(timerId);
  render();
});

$('title').addEventListener('input', () => {
  // If user cleared everything, collapse whitespace so :empty::before
  // placeholder can show.
  if (!$('title').textContent.trim()) $('title').textContent = '';
  saveState();
});
$('title').addEventListener('blur', saveState);
$('title').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('title').blur(); }
});

document.querySelectorAll('[data-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const mins = Number(btn.dataset.preset);
    const base = targetMs ?? Date.now();
    setTarget(base + mins * 60000);
  });
});

// In the desktop (Tauri) build, open the credit link in the system browser
// instead of navigating the app's own chromeless webview. A plain browser has
// no window.__TAURI__, so it falls through to the normal <a target="_blank">.
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

// Particles
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

// Init
populateSelectOptions();
loadState();
if (targetMs == null) {
  writeMsToInputs(Date.now());
  updateMeta();
  render();
} else {
  setTarget(targetMs, { sync: false });
}
setInterval(updateMeta, 1000);
