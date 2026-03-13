// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_plugin_log::{Target, TargetKind};

pub mod cmds;
use cmds::*;

fn main() {
    let _ = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_character_from_path_with_meta,
            save_file,
            save_file_as_version,
            check_save_compatibility,
            open_backup_folder,
            open_backup_folder_for_source,
            get_backup_status,
            backup_all_detected_saves,
            new_save,
            get_supported_output_formats,
            get_skills_context,
            summary_folder
        ])
        .run(tauri::generate_context!());
}
