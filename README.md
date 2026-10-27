# Countdown

<div align="center">

<img src="assets/favicon.svg" width="110" alt="Countdown icon">

[![Live](https://img.shields.io/badge/Web-Live-22c55e?style=for-the-badge)](https://hanchanghun.github.io/countdown/)
[![Windows](https://img.shields.io/badge/Desktop-Windows%2010%2B-blue?style=for-the-badge)](https://www.microsoft.com/windows)
[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?style=for-the-badge)](https://tauri.app)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)

**A clean, minimalist countdown for any event — meetings, deadlines, launches, flights, birthdays.**
Pick a target time and it counts down; once the target passes it flips to a "started ago" elapsed timer.

</div>

---

## Two ways to use it

| | Where | Best for | Highlights |
|---|---|---|---|
| 🌐 **Web** | [the live page](https://hanchanghun.github.io/countdown/) (or `index.html`) | a quick countdown, sharing | **shareable URLs** — the address bar auto-updates so you can copy a preconfigured countdown |
| 🖥️ **Desktop** | the Tauri app in [`app/`](app/) | keeping one pinned on your desktop | a **resizable native window** + a **compact "glance" mode** when you shrink it |

The two share the same look but are currently **separate front-ends** (see [Repo layout](#repo-layout)): the web version owns shareable URLs; the desktop version owns the native window and compact mode.

---

## 🌐 Web version

Open [the live page](https://hanchanghun.github.io/countdown/), or clone and open `index.html` locally. No build step, no dependencies.

### Sharing a countdown

Set your target and title — the URL in your address bar updates automatically. Copy and send it.

```
https://hanchanghun.github.io/countdown/?at=2027-01-01T00:00&title=New+Year
```

- `at` — target time in local ISO format (`YYYY-MM-DDTHH:MM`), interpreted in the viewer's local timezone
- `title` — display label (URL-encoded)
- Legacy `t=<ms since epoch>` links still work

State also persists in `localStorage` across reloads.

---

## 🖥️ Desktop app (Windows)

A [Tauri 2](https://tauri.app) build (Rust shell + system WebView2) that gives the same countdown its own window:

- **Resizable** — drag it to any size; the layout scales (the four boxes stay on one row).
- **Compact "glance" mode** — shrink the height and the setup chrome drops away, keeping the title, target, countdown and ±5 min / Reset / 🍅 controls together. Long titles scroll within the timer area while the controls stay visible. Completed Pomodoros sit quietly at the window's bottom-right edge in their own reserved space.
- **Remembers its size and position** — reopens where you left it; if that spot is no longer on a connected monitor it opens centered instead.
- **Lives in the system tray** — closing the window (✕) hides it to the tray; timers keep running and time's-up notifications still fire. Left-click the tray icon, pick **Open** from its menu, or launch the app again to bring it back. **Quit** is in the tray menu.
- **Quiet window switching** keeps the widget out of Alt+Tab while remaining available on the taskbar and in the system tray.
- **Single instance** — launching it again just brings the open window back.
- **Start with Windows** — a toggle in the tray menu and at the bottom of the timer sidebar (☰), off by default.
- **Opens the credit link in your browser** (not inside the app window).

### Build

```bash
cd app
npm install
npm run tauri dev      # run locally
npm run tauri build    # release build
```

Requires **Rust 1.77+** (MSVC toolchain), **Node 20+**, and **Visual Studio Build Tools** with the *Desktop development with C++* workload. WebView2 ships with Windows 10/11.

Outputs:

- Portable exe → `app/src-tauri/target/release/countdown-app.exe`
- Installer → `app/src-tauri/target/release/bundle/nsis/Countdown_<version>_x64-setup.exe` (installs it as **Countdown**)

---

## Repo layout

- `index.html` + `assets/` — the **web** version (deployed to GitHub Pages).
- `app/` — the **desktop** Tauri app (`app/src/` is its front-end; `app/src-tauri/` is the Rust shell). See [app/](app/) and [CLAUDE.md](CLAUDE.md).
- `scripts/gen-icons.py` — regenerates the desktop app icons from the stopwatch design.

---

## 📝 License

[MIT](LICENSE) © 2026 [HanChangHun](https://github.com/HanChangHun)

## 0.2.5

- Keep the desktop widget out of Alt+Tab while retaining its taskbar button.
- Preserve tray restoration, window state and always-on-top behavior.

## 0.2.4

- Keep the timer and its controls together as compact windows grow taller.
- Anchor completed Pomodoros to the window's bottom-right edge at every height.
- Remove the Today label, visible total, panel border and empty-state text.
- Restore faint tomatoes that brighten on hover or keyboard focus, with reserved space to prevent overlap.

## 0.2.3

- Completed Pomodoros now have a dedicated Today row below the controls.
- Show up to five tomatoes plus a +N remainder, keeping the timer unobstructed at any session count.
- Preserve completed-session counts and support removing a tomato with the keyboard.

## 0.2.2

- Short windows keep ±5 min, Reset and Pomodoro in an always-visible bottom row.
- Timer text and spacing adapt to the window height; long titles scroll above the buttons.
- Removed the ±15 min presets.

## 0.2.1

- Desktop windows now shrink to 280px wide (previously 360px).
- Text and spacing scale smoothly below 360px, with readable control labels and compact preset rows.
- Long titles wrap within the window; Korean words stay together where space permits.
