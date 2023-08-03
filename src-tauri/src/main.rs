// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod cmds;
use cmds::*;

fn main() {
    let _ = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_character_from_path,
            new_character,
            save_file,
            character_get_experience_range_from_level,
            character_get_level_from_experience,
            character_validate_name,
            character_get_title,
            mercenary_get_names,
            mercenary_get_level_from_xp,
            mercenary_get_xp_from_level,
            mercenary_get_variants
        ])
        .run(tauri::generate_context!());
}
