// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod cmds;
use cmds::*;

fn main() {
    let _ = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_character_from_path,
            save_file,
            blank_save
        ])
        .run(tauri::generate_context!());
}
