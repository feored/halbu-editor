use halbu::format::FormatId;
use halbu::{calc_checksum, Class, ParseIssue, ParsedSave, Save, Strictness};
use log::{debug, info};
use serde::{Deserialize, Serialize};
use std::ffi::OsStr;
use std::fs::read_dir;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;

fn supports_class_for_version(version: u32, class: Class) -> bool {
    match version {
        99 => matches!(
            class,
            Class::Amazon
                | Class::Assassin
                | Class::Barbarian
                | Class::Druid
                | Class::Necromancer
                | Class::Paladin
                | Class::Sorceress
        ),
        105 => matches!(
            class,
            Class::Amazon
                | Class::Assassin
                | Class::Barbarian
                | Class::Druid
                | Class::Necromancer
                | Class::Paladin
                | Class::Sorceress
                | Class::Warlock
        ),
        _ => false,
    }
}

fn supported_classes_for_version(version: u32) -> Vec<String> {
    let classes: &[&str] = match version {
        99 => &[
            "Amazon",
            "Assassin",
            "Barbarian",
            "Druid",
            "Necromancer",
            "Paladin",
            "Sorceress",
        ],
        105 => &[
            "Amazon",
            "Assassin",
            "Barbarian",
            "Druid",
            "Necromancer",
            "Paladin",
            "Sorceress",
            "Warlock",
        ],
        _ => &[],
    };
    classes.iter().map(|class_name| (*class_name).to_string()).collect()
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SaveFile {
    path: String,
    save: Save,
    expansion_type: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SaveStatus {
    save_version: u32,
    meta_format: String,
    meta_format_version: u32,
    version_matches_meta: bool,
    encoded_file_size: u32,
    header_file_size: u32,
    header_checksum: i32,
    computed_checksum: i32,
    checksum_matches: bool,
    character_raw_section_size: usize,
    assigned_skill_slots: usize,
    assigned_skill_slots_populated: usize,
    skill_point_slots: usize,
    mercenary_hired: bool,
    mercenary_id: u32,
    expansion_type: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SkillsContext {
    save_version: u32,
    meta_format: String,
    class_name: String,
    class_supported_for_version: bool,
    supported_classes: Vec<String>,
    skill_slot_count: usize,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ParsedCharacter {
    save: Save,
    parse_issue_count: usize,
    parse_issues: Vec<ParseIssue>,
    source_file_size: usize,
}

fn format_id_label(format: FormatId) -> String {
    match format {
        FormatId::V99 => "V99".to_string(),
        FormatId::V105 => "V105".to_string(),
        FormatId::Unknown(version) => format!("Unknown({version})"),
    }
}

fn strictness_from_parse_mode(parse_mode: Option<&str>) -> Strictness {
    match parse_mode {
        Some(mode) if mode.eq_ignore_ascii_case("strict") => Strictness::Strict,
        _ => Strictness::Lax,
    }
}

fn parse_save_from_path(path: &Path, parse_mode: Option<&str>) -> Result<(ParsedSave, usize), String> {
    let strictness = strictness_from_parse_mode(parse_mode);
    let parse_mode_label = match strictness {
        Strictness::Strict => "strict",
        Strictness::Lax => "lax",
    };
    info!("Parsing file {0}", path.display());
    debug!("Using {parse_mode_label} parse mode.");

    let save_file: Vec<u8> = std::fs::read(path).map_err(|e| e.to_string())?;
    let source_file_size = save_file.len();
    let parsed = Save::parse(&save_file, strictness).map_err(|e| e.to_string())?;
    if !parsed.issues.is_empty() {
        debug!(
            "File {0} parsed with {1} non-fatal issue(s).",
            path.display(),
            parsed.issues.len()
        );
    }
    debug!("File {0} parsed successfully.", path.display());
    Ok((parsed, source_file_size))
}

#[tauri::command]
pub fn get_character_from_path(path: String, parse_mode: Option<String>) -> Result<Save, String> {
    let path: &Path = Path::new(&path);
    let (parsed, _) = parse_save_from_path(path, parse_mode.as_deref())?;
    Ok(parsed.save)
}

#[tauri::command]
pub fn get_character_from_path_with_meta(
    path: String,
    parse_mode: Option<String>,
) -> Result<ParsedCharacter, String> {
    let path: &Path = Path::new(&path);
    let (parsed, source_file_size) = parse_save_from_path(path, parse_mode.as_deref())?;
    let parse_issue_count = parsed.issues.len();
    let parse_issues = parsed.issues;
    Ok(ParsedCharacter {
        save: parsed.save,
        parse_issue_count,
        parse_issues,
        source_file_size,
    })
}

#[tauri::command]
pub fn new_save(version: u32, class: Class) -> Result<Save, String> {
    if !supports_class_for_version(version, class) {
        return Err(format!(
            "Class {class} is not supported for save version {version}."
        ));
    }

    let format = FormatId::from_version(version)
        .ok_or_else(|| format!("Unsupported save version {version} for new save creation."))?;
    Ok(Save::new(format, class))
}

#[tauri::command]
pub fn get_skills_context(version: u32, class: Class) -> Result<SkillsContext, String> {
    let class_name = class.to_string();
    let supported_classes = supported_classes_for_version(version);
    let format = FormatId::from_version(version).unwrap_or(FormatId::Unknown(version));

    Ok(SkillsContext {
        save_version: version,
        meta_format: format_id_label(format),
        class_name: class_name.clone(),
        class_supported_for_version: supported_classes.iter().any(|name| name == &class_name),
        supported_classes,
        skill_slot_count: halbu::skills::SKILL_POINTS_COUNT,
    })
}
#[tauri::command]
pub fn save_file(path: String, save: Save) -> Result<String, String> {
    let path: &Path = Path::new(&path);
    let generated_save = save.to_bytes().map_err(|e| e.to_string())?;

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .open(path)
        .map_err(|e| e.to_string())?;

    file.write_all(&generated_save).map_err(|e| e.to_string())?;
    Ok(String::from("Success!"))
}

#[tauri::command]
pub fn save_file_as_version(path: String, save: Save, target_version: u32) -> Result<String, String> {
    let path: &Path = Path::new(&path);
    let target_format = FormatId::from_version(target_version)
        .ok_or_else(|| format!("Unsupported save version {target_version}."))?;

    let mut save_for_output = save.clone();
    save_for_output.set_format_id(target_format);
    let generated_save = save_for_output
        .to_bytes_for(target_format)
        .map_err(|e| e.to_string())?;

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .open(path)
        .map_err(|e| e.to_string())?;

    file.write_all(&generated_save).map_err(|e| e.to_string())?;
    Ok(String::from("Success!"))
}

#[tauri::command]
pub fn get_save_status(save: Save) -> Result<SaveStatus, String> {
    let mut encoded_bytes = save.to_bytes().map_err(|e| e.to_string())?;
    if encoded_bytes.len() < 16 {
        return Err(format!(
            "Encoded save bytes are too short: expected at least 16 bytes, found {}.",
            encoded_bytes.len()
        ));
    }

    let encoded_file_size = encoded_bytes.len() as u32;
    let header_file_size = u32::from_le_bytes(
        encoded_bytes[8..12]
            .try_into()
            .map_err(|_| "Failed to parse file size from encoded save header.".to_string())?,
    );
    let header_checksum = i32::from_le_bytes(
        encoded_bytes[12..16]
            .try_into()
            .map_err(|_| "Failed to parse checksum from encoded save header.".to_string())?,
    );

    encoded_bytes[12..16].copy_from_slice(&[0x00; 4]);
    let computed_checksum = calc_checksum(&encoded_bytes);

    let meta_format = save.format_id();
    let meta_format_version = meta_format.version();

    Ok(SaveStatus {
        save_version: save.version,
        meta_format: format_id_label(meta_format),
        meta_format_version,
        version_matches_meta: save.version == meta_format_version,
        encoded_file_size,
        header_file_size,
        header_checksum,
        computed_checksum,
        checksum_matches: header_checksum == computed_checksum,
        character_raw_section_size: save.character.raw_section.len(),
        assigned_skill_slots: save.character.assigned_skills.len(),
        assigned_skill_slots_populated: save
            .character
            .assigned_skills
            .iter()
            .filter(|skill| **skill != 0x0000FFFF)
            .count(),
        skill_point_slots: save.skills.points.len(),
        mercenary_hired: save.character.mercenary.is_hired(),
        mercenary_id: save.character.mercenary.id,
        expansion_type: save.expansion_type().label().to_string(),
    })
}

#[tauri::command]
pub fn summary_folder(path: String, parse_mode: Option<String>) -> Result<Vec<SaveFile>, String> {
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

        match get_character_from_path(file_path_string.to_string(), parse_mode.clone()) {
            Ok(res) => saves.push(SaveFile {
                expansion_type: res.expansion_type().label().to_string(),
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
