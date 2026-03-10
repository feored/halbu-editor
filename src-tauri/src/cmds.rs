use halbu::format::FormatId;
use halbu::{Class, ParseIssue, ParsedSave, Save, Strictness};
use log::{debug, info};
use serde::{Deserialize, Serialize};
use std::cmp::Reverse;
use std::ffi::OsStr;
use std::fs::{read_dir, remove_file, OpenOptions};
use std::io::ErrorKind;
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

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

fn write_bytes_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path.parent().unwrap_or_else(|| Path::new("."));
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("save");
    let ts_nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let tmp_path = parent.join(format!(".{file_name}.tmp-{}-{ts_nanos}", std::process::id()));

    let mut tmp_file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&tmp_path)
        .map_err(|e| e.to_string())?;
    tmp_file.write_all(bytes).map_err(|e| e.to_string())?;
    tmp_file.sync_all().map_err(|e| e.to_string())?;
    drop(tmp_file);

    if let Err(rename_err) = std::fs::rename(&tmp_path, path) {
        if rename_err.kind() == ErrorKind::AlreadyExists {
            remove_file(path).map_err(|e| e.to_string())?;
            std::fs::rename(&tmp_path, path).map_err(|e| e.to_string())?;
        } else {
            let _ = remove_file(&tmp_path);
            return Err(rename_err.to_string());
        }
    }

    Ok(())
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
    write_bytes_atomic(path, &generated_save)?;
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
    write_bytes_atomic(path, &generated_save)?;
    Ok(String::from("Success!"))
}

#[tauri::command]
pub fn summary_folder(path: String, parse_mode: Option<String>) -> Result<Vec<SaveFile>, String> {
    let path: &Path = Path::new(&path);
    let parse_mode_ref = parse_mode.as_deref();

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

        let (parsed, _) = match parse_save_from_path(file_path.as_path(), parse_mode_ref) {
            Ok(res) => res,
            Err(_e) => continue,
        };

        let save = parsed.save;
        saves.push(SaveFile {
            expansion_type: save.expansion_type().label().to_string(),
            save,
            path: file_path_string.to_string(),
        });
    }
    saves.sort_unstable_by_key(|save_file| Reverse(save_file.save.character.last_played));
    Ok(saves)
}
