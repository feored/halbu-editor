#[macro_use]

use std::path::Path;
use std::sync::Mutex;
use std::io::Write;
use std::fs::OpenOptions;

use crate::SaveState;
use tauri::State;
use halbu::Save;

#[tauri::command]
pub fn get_character_from_path(path : String, state: State<SaveState>) -> Result<Save, String> {
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
pub fn new_character(class : String, state: State<SaveState>) -> Result<Save, String> {
    let mut mutex_state = state.0.lock().unwrap();
    let class = match halbu::Class::try_from(class){
        Ok(res) => res,
        Err(e) => return Err(e.to_string())
    };
    let result = Save::new_character(class);
    *mutex_state = result.clone();
    Ok(result)

    //Ok(format!("Character strength: {0}", result.attributes.strength))
    
}

#[tauri::command]
pub fn save_file(path: String, state: State<SaveState>) -> Result<String, String> {
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

#[tauri::command]
pub fn set_level(level: u8, state: State<SaveState>) -> Result<(), u8> {
    let mut save = state.0.lock().unwrap();
    let &old_level = save.character.level();
    match save.set_level(level) {
        Ok(()) => Ok(()),
        Err(e) => return Err(old_level)
    }
}

#[tauri::command]
pub fn set_strength(strength: u32, state: State<SaveState>) -> Result<(), u32> {
    let mut save = state.0.lock().unwrap();
    save.attributes.strength = strength;
    Ok(())
}
