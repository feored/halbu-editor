// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::Path;
use std::sync::Mutex;
use std::io::Write;
use std::fs::OpenOptions;

use tauri::State;
use halbu;
use halbu::Save;




pub struct SaveState(pub Mutex<Save>);

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// #[tauri::command]
// fn get_character(b64data : String, state: tauri::State<SaveState>) -> Result<Save, String> {
//     let mut mutex_state = state.0.lock().unwrap();
//     let bytes = match general_purpose::STANDARD.decode(&b64data){
//         Ok(res) => res,
//         Err(e) =>  return Err(e.to_string())
//     };
//     let result = match halbu::parse(&bytes) {
//         Ok(res) => {
//             *mutex_state = res.clone();
//             res
//         },
//         Err(e) => return Err(e.to_string())
//     };

//     Ok(result)
    
// }

#[tauri::command]
fn get_character_from_path(path : String, state: State<SaveState>) -> Result<Save, String> {
    let mut mutex_state = state.0.lock().unwrap();
    let path: &Path = Path::new(&path);
    let save_file: Vec<u8> = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(e) => panic!("File invalid: {e:?}"),
    };
    let result = match halbu::parse(&save_file) {
        Ok(res) => {
            *mutex_state = res.clone();
            res
        },
        Err(e) => return Err(e.to_string())
    };

    Ok(result)
    
}

#[tauri::command]
fn new_character(class : String, state: State<SaveState>) -> Result<Save, String> {
    let mut mutex_state = state.0.lock().unwrap();
    let class = match halbu::Class::try_from(class){
        Ok(res) => res,
        Err(e) => return Err(e.to_string())
    };
    let result = halbu::new_character(class);
    *mutex_state = result.clone();
    Ok(result)

    //Ok(format!("Character strength: {0}", result.attributes.strength))
    
}

#[tauri::command]
fn save_file(path: String, state: State<SaveState>) -> Result<String, String> {
    let mut mutex_state = state.0.lock().unwrap();
    let path: &Path = Path::new(&path);
    let generated_save = halbu::generate(&mut *mutex_state);

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .open(path)
        .unwrap();

    file.write_all(&generated_save).unwrap();
    Ok(String::from("Success!"))
    
}


fn main() {
    let _ = tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_character_from_path, new_character, save_file])
    .manage(SaveState(Default::default()))
    .run(tauri::generate_context!());
}
