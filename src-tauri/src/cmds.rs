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
    println!("{0:?}", path);
    let result = match halbu::parse(&save_file) {
        Ok(res) => res,
        Err(e) => return Err(e.to_string())
    };

    Ok(result)
    
}

// #[tauri::command]
// pub fn new_character(class : String) -> Result<Save, String> {
//     let class = match halbu::Class::try_from(class){
//         Ok(res) => res,
//         Err(e) => return Err(e.to_string())
//     };
//     let result = Save::new_character(class);
//     Ok(result)
    
// }

#[tauri::command]
pub fn save_file(path: String, save:Save) -> Result<String, String> {
    let path: &Path = Path::new(&path);
    let generated_save = halbu::generate(&save);

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .open(path)
        .unwrap();

    file.write_all(&generated_save).unwrap();
    Ok(String::from("Success!"))
}
