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
- **Compact "glance" mode** — shrink the height and the setup chrome drops away, leaving just the title, target, countdown, the ±5 / ±15 min pills, and a Reset. Set the target at a normal size, then shrink to monitor.
- **Remembers its size** and opens centered (so it can never restore off-screen).
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
