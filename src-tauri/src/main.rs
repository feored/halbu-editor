// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]


use halbu;
use halbu::Save;
use base64::{Engine as _, engine::{general_purpose}};


// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn get_character(b64data : String) -> Result<Save, String> {
    let bytes = match general_purpose::STANDARD.decode(&b64data){
        Ok(res) => res,
        Err(e) =>  return Err(e.to_string())
    };
    let result = match halbu::parse(&bytes) {
        Ok(res) => res,
        Err(e) => return Err(e.to_string())
    };

    Ok(result)
    
}

#[tauri::command]
fn new_character(class : String) -> Result<Save, String> {
    let class = match halbu::Class::try_from(class){
        Ok(res) => res,
        Err(e) => return Err(e.to_string())
    };
    Ok(halbu::new_character(class))

    //Ok(format!("Character strength: {0}", result.attributes.strength))
    
}


fn main() {

    let _ = tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_character, new_character])
    .manage(halbu::Save::default())
    .run(tauri::generate_context!());
}
