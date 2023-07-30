// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use tauri::State;
use halbu::Save;

pub mod cmds;
use cmds::*;

pub struct SaveState(pub Mutex<Save>);

fn main() {
    let _ = tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_character_from_path, new_character, save_file, set_level, set_strength])
    .manage(SaveState(Default::default()))
    .run(tauri::generate_context!());
}
