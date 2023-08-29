use halbu::Save;
use serde::{Deserialize, Serialize};
use std::ffi::OsStr;
use std::fs::read_dir;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;

#[derive(Serialize, Deserialize, Debug)]
pub struct SaveFile {
    path: String,
    save: Save,
}

#[tauri::command]
pub fn get_character_from_path(path: String) -> Result<Save, String> {
    let path: &Path = Path::new(&path);
    let save_file: Vec<u8> = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(e) => return Err(e.to_string()),
    };

    let result = match halbu::parse(&save_file) {
        Ok(res) => res,
        Err(e) => return Err(e.to_string()),
    };

    Ok(result)
}

#[tauri::command]
pub fn new_save(class: halbu::Class) -> Save {
    Save::default_class(class)
}
#[tauri::command]
pub fn save_file(path: String, save: Save) -> Result<String, String> {
    let path: &Path = Path::new(&path);
    let generated_save = save.write();

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .open(path)
        .unwrap();

    file.write_all(&generated_save).unwrap();
    Ok(String::from("Success!"))
}

#[tauri::command]
pub fn summary_folder(path: String) -> Result<Vec<SaveFile>, String> {
    let path: &Path = Path::new(&path);

    let files = match read_dir(path) {
        Ok(res) => res,
        Err(e) => return Err(e.to_string()),
    };

    let mut saves: Vec<SaveFile> = Vec::<SaveFile>::new();
    for file in files {
        let file_path = match file {
            Ok(res) => res.path(),
            Err(_e) => continue,
        };

        if file_path.as_path().extension() != Some(OsStr::new("d2s")) {
            continue;
        };

        let file_path_string = match file_path.as_path().to_str() {
            Some(res) => res,
            None => continue,
        };

        match get_character_from_path(file_path_string.to_string()) {
            Ok(res) => saves.push(SaveFile {
                save: res,
                path: file_path_string.to_string(),
            }),
            Err(_e) => continue,
        };
    }
    // Sort all saves by last played order
    let mut sorted_saves: Vec<SaveFile> = Vec::<SaveFile>::new();
    let num_saves = saves.len();
    while sorted_saves.len() < num_saves {
        let mut last_date_played = saves[0].save.character.last_played;
        let mut last_date_index = 0;
        for (index, save_file) in saves.iter().enumerate() {
            if save_file.save.character.last_played > last_date_played {
                last_date_played = save_file.save.character.last_played;
                last_date_index = index;
            }
        }
        sorted_saves.push(saves.swap_remove(last_date_index));
    }
    Ok(sorted_saves)
}
