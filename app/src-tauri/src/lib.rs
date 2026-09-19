use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_window_state::{AppHandleExt as _, StateFlags};

// Remember the window's size and position. VISIBLE is deliberately left out:
// closing hides to the tray, so a Quit while hidden would otherwise restore
// the window hidden next time and look like a failed launch. DECORATIONS is
// excluded so the frameless custom titlebar is never overridden by a saved
// `decorated` state. The plugin only restores a saved position that still
// lands on a connected monitor, so a rearranged desktop falls back to the
// config default (centered) instead of reopening off-screen.
const WINDOW_STATE: StateFlags = StateFlags::SIZE.union(StateFlags::POSITION);

// The tray menu's "Start with Windows" item, kept in sync with the sidebar
// checkbox whichever side toggles it.
struct AutostartItem(CheckMenuItem<tauri::Wry>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Registered first so a second launch exits before any other plugin or
        // the window comes up; it just brings the running window back.
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            show_main(app);
        }))
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(WINDOW_STATE)
                .build(),
        )
        // "Start with Windows" (HKCU Run key), toggled from the tray menu or
        // the sidebar checkbox.
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

            // ---- System tray ----
            let open_item = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let autostart_item = CheckMenuItem::with_id(
                app,
                "autostart",
                "Start with Windows",
                true,
                app.autolaunch().is_enabled().unwrap_or(false),
                None::<&str>,
            )?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[&open_item, &sep1, &autostart_item, &sep2, &quit_item],
            )?;
            app.manage(AutostartItem(autostart_item));

            TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Countdown")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "autostart" => {
                        let enabled = app.autolaunch().is_enabled().unwrap_or(false);
                        set_autostart(app, !enabled);
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            std::thread::spawn(cleanup_stale_updater_temp_dirs);
            Ok(())
        })
        .on_window_event(|window, event| match event {
            // Close-to-tray: hide instead of quit. The window-state plugin
            // writes its file only on a clean exit, which a tray app rarely
            // gets (Windows shutdown just kills it), so persist before hiding.
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let _ = window.app_handle().save_window_state(WINDOW_STATE);
                let _ = window.hide();
                api.prevent_close();
            }
            // Also persist whenever the window loses focus, so the last move or
            // resize survives without an explicit Quit.
            tauri::WindowEvent::Focused(false) => {
                let _ = window.app_handle().save_window_state(WINDOW_STATE);
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            set_autostart_cmd,
            is_autostart_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running countdown application");
}

#[tauri::command]
fn set_autostart_cmd(app: AppHandle, enable: bool) -> bool {
    set_autostart(&app, enable)
}

#[tauri::command]
fn is_autostart_enabled(app: AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

/// Enable or disable launch at login, then mirror the state Windows actually
/// recorded to the tray item and (via an event) the sidebar checkbox.
fn set_autostart(app: &AppHandle, enable: bool) -> bool {
    let manager = app.autolaunch();
    let _ = if enable {
        manager.enable()
    } else {
        manager.disable()
    };
    let enabled = manager.is_enabled().unwrap_or(false);
    if let Some(item) = app.try_state::<AutostartItem>() {
        let _ = item.0.set_checked(enabled);
    }
    let _ = app.emit("autostart-changed", enabled);
    enabled
}

/// Bring the window back: tray click, the tray's "Open", or a second launch.
fn show_main(app: &AppHandle) {
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
