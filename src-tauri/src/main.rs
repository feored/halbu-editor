// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_log::LogTarget;
use tauri_plugin_log::TimezoneStrategy;

pub mod cmds;
use cmds::*;

fn main() {
    let _ = tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .timezone_strategy(TimezoneStrategy::UseLocal)
                .max_file_size(128000u128)
                .targets([LogTarget::LogDir, LogTarget::Stdout, LogTarget::Webview])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_character_from_path,
            save_file,
            new_save,
            summary_folder
        ])
        .run(tauri::generate_context!());
}
