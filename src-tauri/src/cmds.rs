use std::path::Path;
use std::io::Write;
use std::fs::OpenOptions;

use halbu::Save;

#[tauri::command]
pub fn get_character_from_path(path : String) -> Result<Save, String> {
    let path: &Path = Path::new(&path);
    let save_file: Vec<u8> = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(e) => panic!("File invalid: {e:?}"),
    };

    let result = match halbu::parse(&save_file) {
        Ok(res) => res,
        Err(e) => return Err(e.to_string())
    };

    Ok(result)
    
}

#[tauri::command]
pub fn new_save(class: halbu::Class) -> Save {
    Save::default_class(class)
}

#[tauri::command]
pub fn save_file(path: String, save:Save) -> Result<String, String> {
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
