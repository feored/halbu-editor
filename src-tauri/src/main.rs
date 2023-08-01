// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use halbu::Save;

pub mod cmds;
use cmds::*;

fn main() {
    let _ = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_character_from_path,
            new_character,
            save_file,
            get_experience_range_from_level,
            get_level_from_experience,
            validate_name
        ])
        .run(tauri::generate_context!());
}
