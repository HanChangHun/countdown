use tauri_plugin_window_state::StateFlags;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Persist the window size (but NOT its position) so a remembered window can
    // never be restored off-screen after a monitor is disconnected/rearranged —
    // it always reopens centered (tauri.conf `center: true`) at the saved size.
    let window_state = tauri_plugin_window_state::Builder::default()
        .with_state_flags(StateFlags::all() & !StateFlags::POSITION)
        .build();

    tauri::Builder::default()
        .plugin(window_state)
        // Open external links (the credit link) in the system browser.
        .plugin(tauri_plugin_opener::init())
        // Secure auto-update (signed GitHub releases) + relaunch after install.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .run(tauri::generate_context!())
        .expect("error while running countdown application");
}
