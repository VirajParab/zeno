// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, GlobalShortcutManager};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            
            // Register global shortcut
            app_handle.global_shortcut_manager().register("CmdOrCtrl+Space", move || {
                println!("Global shortcut triggered!");
                app_handle.emit_all("toggle-overlay", ()).unwrap();
            }).unwrap();
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
