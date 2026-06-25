# CLAUDE.md

Guidance for AI assistants (and humans) working in this repo. Keep it short and current — update it when the layout or build flow changes.

## What this is

**Countdown** — a small countdown / stopwatch you can pin to your desktop. Pick a target date & time and it counts down; once the target passes it flips to a "started ago" elapsed timer. Title is editable, target is adjustable with presets, and state persists in `localStorage`.

Ships two ways as **two separate front-ends** (they share the design but have diverged — see Layout):

- A **web page** (repo root `index.html` + `assets/`) — open in any browser; owns the **shareable-URL** feature (`?at=` / `?title=`).
- A **Windows desktop app** (`app/`) built with **Tauri 2** (Rust shell + system WebView2): its own resizable window, a compact "glance" mode, taskbar entry, and remembered size.

## Layout

- **`app/`** — the Tauri desktop app; all desktop development happens here.
  - `app/src/` — frontend: `index.html`, `style.css`, `main.js`, `favicon.svg`. **Plain vanilla JS, no bundler/build step** — `frontendDist` points at this raw folder, so edits show up on reload. The only Tauri call is opening the credit link via `window.__TAURI__.opener.openUrl` (`withGlobalTauri: true` + `opener:allow-open-url`); everything else is plain browser JS. The short-window "glance" mode is a `@media (max-height: 440px)` block in `style.css`.
  - `app/src-tauri/src/main.rs` + `lib.rs` — the Rust shell. `main.rs` calls `countdown_app_lib::run()`; `lib.rs` registers `tauri-plugin-window-state` (size only — **not** position, so it can't restore off-screen) and `tauri-plugin-opener`.
  - `app/src-tauri/tauri.conf.json` — window size, a strict local-only CSP, `withGlobalTauri`, bundle target (NSIS), icons.
  - `app/src-tauri/capabilities/default.json` — permission allowlist for the main window.
- **`index.html` (repo root) + `assets/`** — the **web** version, deployed to GitHub Pages. It has its own evolution (shareable `?at=` URLs, ISO timestamps) and is **not** a copy of `app/src/` — the two front-ends diverged. Port features between them deliberately; there is no auto-sync.
- **`scripts/gen-icons.py`** — regenerates `app/src-tauri/icons/*` from the `favicon.svg` stopwatch design (Pillow, no SVG rasterizer needed). Run when the icon changes.

## Dev

```bash
cd app
npm install
npm run tauri dev      # run the desktop app locally
npm run tauri build    # release build -> src-tauri/target/release/
```

Requires Rust 1.77+ (MSVC toolchain), Node 20+, and Visual Studio Build Tools with the **Desktop development with C++** workload. WebView2 ships with Windows 10/11. There is no frontend build — edit `app/src/*` directly.

Build outputs:
- Portable exe: `app/src-tauri/target/release/countdown-app.exe` (runs standalone; WebView2 is system-provided).
- Installer: `app/src-tauri/target/release/bundle/nsis/Countdown_<version>_x64-setup.exe`.

## Releasing

No CI / signing / auto-updater (this is a personal tool). To cut a version, bump it in the three files and keep them in sync, then build:

- `app/package.json`
- `app/src-tauri/tauri.conf.json`
- `app/src-tauri/Cargo.toml`

## Conventions

- Layout mirrors the `claude-usage` repo (`app/` subproject, raw `frontendDist`, `main.rs` → `lib.rs` split). See the vault note **EdgeTPU Module Repo Conventions** / **Project Folder Naming Conventions** for the general repo style.
- Keep changes surgical and the diff small; this is a small, focused widget.
