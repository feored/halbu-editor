use std::path::Path;
use std::io::Write;
use std::fs::OpenOptions;

use halbu::Save;
use halbu::attributes::Level;
use halbu::attributes::Experience;

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
pub fn new_character(class : String) -> Result<Save, String> {
    let class = match halbu::Class::try_from(class){
        Ok(res) => res,
        Err(e) => return Err(e.to_string())
    };
    let result = Save::new_character(class);
    Ok(result)
    
}

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

#[tauri::command]
pub fn character_get_experience_range_from_level(level: u8) -> Result<(Experience, Experience), String> {
    let validated_level = match halbu::attributes::Level::from(level){
        Ok(res) => res,
        Err(e) => return Err(e.to_string())
    };
    let xp_range = halbu::attributes::get_experience_range_from_level(validated_level);
    Ok((xp_range.start, xp_range.end))
    
}

#[tauri::command]
pub fn character_get_level_from_experience(experience: u32) -> Result<Level, String> {
    let validated_xp = match Experience::from(experience){
        Ok(res) => res,
        Err(e) => return Err(e.to_string())
    };
    Ok(halbu::attributes::get_level_from_experience(validated_xp))
    
}



#[tauri::command]
pub fn character_validate_name(potential_name : String) -> Result<(), String> {
    match halbu::character::Name::from(&potential_name) {
        Ok(_res) => Ok(()),
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub fn character_get_title(character: halbu::character::Character) -> String {
    character.title()
}

#[tauri::command]
pub fn mercenary_get_names(variant: halbu::character::mercenary::Variant) -> &'static [&'static str] {
    halbu::character::mercenary::names_list(variant.0)
}

#[tauri::command]
pub fn mercenary_get_xp_from_level(mercenary: halbu::character::mercenary::Mercenary, level: u8) -> u32{
    mercenary.xp_from_level(level)
}

#[tauri::command]
pub fn mercenary_get_level_from_xp(mercenary: halbu::character::mercenary::Mercenary) -> u8{
    mercenary.level_from_xp()
}
