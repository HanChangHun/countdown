use tauri::Manager;
use tauri_plugin_window_state::{AppHandleExt as _, StateFlags};

// Remember the window's size and position. The plugin only restores a saved
// position that still lands on a connected monitor, so after a monitor is
// disconnected or rearranged the window falls back to the config default
// (centered) instead of reopening off-screen. DECORATIONS is excluded: the
// frameless custom titlebar must not be overridden by a saved `decorated`
// state.
const WINDOW_STATE: StateFlags = StateFlags::SIZE.union(StateFlags::POSITION);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Registered first so a second launch exits before any other plugin or
        // the window comes up; it just brings the running window to the front.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            focus_main(app);
        }))
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(WINDOW_STATE)
                .build(),
        )
        // "Start with Windows" toggle in the timer sidebar (HKCU Run key).
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        // Open external links (the credit link) in the system browser.
        .plugin(tauri_plugin_opener::init())
        // Secure auto-update (signed GitHub releases) + relaunch after install.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        // Desktop notification when a countdown hits zero.
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // The window is declared hidden in tauri.conf.json: the window-state
            // plugin applies the saved geometry while it is created, so showing
            // it afterwards avoids a flash at the centered default position.
            if let Some(main) = app.get_webview_window("main") {
                main.show()?;
            }
            std::thread::spawn(cleanup_stale_updater_temp_dirs);
            Ok(())
        })
        // The plugin writes the state file only on a clean exit, which a widget
        // that stays open for days rarely gets (Windows shutdown just kills it).
        // Persist whenever the window loses focus so the last move or resize
        // survives.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Focused(false) = event {
                let _ = window.app_handle().save_window_state(WINDOW_STATE);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running countdown application");
}

/// Bring the running window to the front (second-launch callback).
fn focus_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

// Tauri's NSIS updater extracts each update into %TEMP% and never removes it
// afterward (tauri-apps/tauri#11862, unfixed upstream), so every update leaves
// a few MB behind. By the time this runs, any update that led to the current
// launch has already finished, so every matching folder here is stale.
fn cleanup_stale_updater_temp_dirs() {
    let Ok(entries) = std::fs::read_dir(std::env::temp_dir()) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        if name.starts_with("Countdown-") && name.contains("-updater-") && entry.path().is_dir() {
            let _ = std::fs::remove_dir_all(entry.path());
        }
    }
}
