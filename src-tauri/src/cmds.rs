use chrono::Local;
use halbu::format::FormatId;
use halbu::{Class, ParseIssue, ParsedSave, Save, Strictness};
use log::{debug, info};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::cmp::Reverse;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::fs::{self, read_dir, remove_file, OpenOptions};
use std::io::ErrorKind;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use uuid::Uuid;

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

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BackupConfig {
    enabled: bool,
    backups_per_character: u32,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SaveCommandResult {
    message: String,
    backup_performed: bool,
    backup_path: Option<String>,
    cleanup_warning: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupStatusResult {
    source_path: String,
    bucket_count: usize,
    total_backups: usize,
    last_backup_timestamp: Option<String>,
    last_backup_datetime: Option<String>,
    last_backup_file_path: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct BackupAllResult {
    detected_files: usize,
    backed_up: usize,
    skipped_unchanged: usize,
    failed: usize,
    cleanup_warnings: Vec<String>,
    errors: Vec<String>,
}

#[derive(Debug)]
struct BackupOutcome {
    performed: bool,
    path: Option<PathBuf>,
    cleanup_warning: Option<String>,
}

static BACKUP_HASH_CACHE: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();

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

fn backup_hash_cache() -> &'static Mutex<HashMap<String, String>> {
    BACKUP_HASH_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn backup_root_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?.join("backups");
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    Ok(root)
}

fn path_key_for_cache(path: &Path) -> String {
    path.canonicalize()
        .unwrap_or_else(|_| path.to_path_buf())
        .to_string_lossy()
        .to_string()
}

fn bucket_prefix_for_source(path: &Path) -> String {
    let path_key = path_key_for_cache(path);
    Uuid::new_v5(&Uuid::NAMESPACE_URL, path_key.as_bytes()).to_string()
}

fn list_bucket_dirs_for_source(app: &tauri::AppHandle, source_path: &Path) -> Result<Vec<PathBuf>, String> {
    let backup_root = backup_root_dir(app)?;
    let prefix = format!("{}-", bucket_prefix_for_source(source_path));
    let entries = read_dir(backup_root).map_err(|e| e.to_string())?;
    let mut dirs = Vec::<PathBuf>::new();

    for entry in entries {
        let entry = match entry {
            Ok(value) => value,
            Err(_) => continue,
        };
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let file_name = match path.file_name().and_then(|name| name.to_str()) {
            Some(value) => value,
            None => continue,
        };
        if file_name.starts_with(&prefix) {
            dirs.push(path);
        }
    }

    Ok(dirs)
}

fn sanitize_component(value: &str, fallback: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch);
        } else {
            out.push('_');
        }
    }
    let trimmed = out.trim_matches('_').to_string();
    if trimmed.is_empty() {
        fallback.to_string()
    } else {
        trimmed
    }
}

fn hash_bytes(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

fn format_backup_timestamp() -> String {
    Local::now().format("%Y%m%d-%H%M%S-%3f").to_string()
}

fn format_timestamp_for_display(value: &str) -> Option<String> {
    if value.len() < 19 {
        return None;
    }
    let year = &value[0..4];
    let month = &value[4..6];
    let day = &value[6..8];
    let hour = &value[9..11];
    let minute = &value[11..13];
    let second = &value[13..15];
    let millis = &value[16..19];
    Some(format!("{year}-{month}-{day} {hour}:{minute}:{second}.{millis}"))
}

fn enforce_backup_retention(bucket_dir: &Path, keep: usize) -> Result<(), String> {
    if keep == 0 {
        return Ok(());
    }

    let mut timestamp_dirs: Vec<PathBuf> = read_dir(bucket_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok().map(|e| e.path()))
        .filter(|path| path.is_dir())
        .collect();

    timestamp_dirs.sort();

    while timestamp_dirs.len() > keep {
        let oldest = timestamp_dirs.remove(0);
        fs::remove_dir_all(&oldest).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn parse_save_for_backup_metadata(path: &Path) -> Option<Save> {
    let (parsed, _) = parse_save_from_path(path, None).ok()?;
    Some(parsed.save)
}

fn determine_bucket_dir(
    app: &tauri::AppHandle,
    source_path: &Path,
    fallback_save: &Save,
) -> Result<PathBuf, String> {
    let backup_root = backup_root_dir(app)?;
    let source_save = parse_save_for_backup_metadata(source_path).unwrap_or_else(|| fallback_save.clone());
    let class_name = sanitize_component(&source_save.character.class.to_string(), "class");
    let character_name = sanitize_component(&source_save.character.name, "character");
    let prefix = bucket_prefix_for_source(source_path);
    Ok(backup_root.join(format!("{prefix}-{class_name}-{character_name}")))
}

fn open_path_in_file_manager(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[allow(unreachable_code)]
    Err("Opening folders is not supported on this platform.".to_string())
}

fn backup_existing_file(
    app: &tauri::AppHandle,
    backup_source_path: &Path,
    save: &Save,
    backup_config: &BackupConfig,
) -> Result<BackupOutcome, String> {
    if !backup_config.enabled || !backup_source_path.exists() {
        return Ok(BackupOutcome {
            performed: false,
            path: None,
            cleanup_warning: None,
        });
    }

    let source_bytes = fs::read(backup_source_path).map_err(|e| {
        format!(
            "Backup failed and save was aborted. Could not read existing file from disk: {}",
            e
        )
    })?;
    let source_hash = hash_bytes(&source_bytes);
    let path_key = path_key_for_cache(backup_source_path);

    {
        let cache = backup_hash_cache().lock().map_err(|e| e.to_string())?;
        if cache.get(&path_key) == Some(&source_hash) {
            return Ok(BackupOutcome {
                performed: false,
                path: None,
                cleanup_warning: None,
            });
        }
    }

    let bucket_dir = determine_bucket_dir(app, backup_source_path, save)?;
    let timestamp_dir = bucket_dir.join(format_backup_timestamp());
    fs::create_dir_all(&timestamp_dir).map_err(|e| {
        format!(
            "Backup failed and save was aborted. Could not create backup directory: {}",
            e
        )
    })?;

    let backup_file_name = backup_source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("save.d2s");
    let backup_file_path = timestamp_dir.join(backup_file_name);
    fs::copy(backup_source_path, &backup_file_path).map_err(|e| {
        format!(
            "Backup failed and save was aborted. Could not copy existing file to backup: {}",
            e
        )
    })?;

    {
        let mut cache = backup_hash_cache().lock().map_err(|e| e.to_string())?;
        cache.insert(path_key, source_hash);
    }

    let backups_to_keep = usize::try_from(backup_config.backups_per_character).unwrap_or(usize::MAX);
    let cleanup_warning = match enforce_backup_retention(&bucket_dir, backups_to_keep) {
        Ok(()) => None,
        Err(error) => Some(format!(
            "Backup retention cleanup failed for {}: {}",
            bucket_dir.display(),
            error
        )),
    };

    Ok(BackupOutcome {
        performed: true,
        path: Some(backup_file_path),
        cleanup_warning,
    })
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
pub fn save_file(
    app: tauri::AppHandle,
    path: String,
    save: Save,
    backup_source_path: Option<String>,
    backup_config: Option<BackupConfig>,
) -> Result<SaveCommandResult, String> {
    let path: &Path = Path::new(&path);
    let source_path = backup_source_path
        .as_deref()
        .filter(|candidate| !candidate.is_empty())
        .map(Path::new)
        .unwrap_or(path);
    let effective_backup_config = backup_config.unwrap_or(BackupConfig {
        enabled: true,
        backups_per_character: 20,
    });

    let backup_outcome = backup_existing_file(&app, source_path, &save, &effective_backup_config)?;
    let generated_save = save.to_bytes().map_err(|e| e.to_string())?;
    if let Err(write_error) = write_bytes_atomic(path, &generated_save) {
        if let Some(backup_path) = backup_outcome.path.as_ref() {
            return Err(format!(
                "Save failed after backup. Save was aborted, and the original file is safely backed up at: {}. Write error: {}",
                backup_path.display(),
                write_error
            ));
        }
        return Err(format!("Save failed. Write error: {write_error}"));
    }

    Ok(SaveCommandResult {
        message: String::from("Success!"),
        backup_performed: backup_outcome.performed,
        backup_path: backup_outcome
            .path
            .as_ref()
            .map(|path| path.to_string_lossy().to_string()),
        cleanup_warning: backup_outcome.cleanup_warning,
    })
}

#[tauri::command]
pub fn save_file_as_version(
    app: tauri::AppHandle,
    path: String,
    save: Save,
    target_version: u32,
    backup_source_path: Option<String>,
    backup_config: Option<BackupConfig>,
) -> Result<SaveCommandResult, String> {
    let path: &Path = Path::new(&path);
    let source_path = backup_source_path
        .as_deref()
        .filter(|candidate| !candidate.is_empty())
        .map(Path::new)
        .unwrap_or(path);
    let effective_backup_config = backup_config.unwrap_or(BackupConfig {
        enabled: true,
        backups_per_character: 20,
    });

    let backup_outcome = backup_existing_file(&app, source_path, &save, &effective_backup_config)?;
    let target_format = FormatId::from_version(target_version)
        .ok_or_else(|| format!("Unsupported save version {target_version}."))?;

    let mut save_for_output = save.clone();
    save_for_output.set_format_id(target_format);
    let generated_save = save_for_output
        .to_bytes_for(target_format)
        .map_err(|e| e.to_string())?;
    if let Err(write_error) = write_bytes_atomic(path, &generated_save) {
        if let Some(backup_path) = backup_outcome.path.as_ref() {
            return Err(format!(
                "Save failed after backup. Save was aborted, and the original file is safely backed up at: {}. Write error: {}",
                backup_path.display(),
                write_error
            ));
        }
        return Err(format!("Save failed. Write error: {write_error}"));
    }

    Ok(SaveCommandResult {
        message: String::from("Success!"),
        backup_performed: backup_outcome.performed,
        backup_path: backup_outcome
            .path
            .as_ref()
            .map(|path| path.to_string_lossy().to_string()),
        cleanup_warning: backup_outcome.cleanup_warning,
    })
}

#[tauri::command]
pub fn open_backup_folder(app: tauri::AppHandle) -> Result<String, String> {
    let backup_root = backup_root_dir(&app)?;
    open_path_in_file_manager(&backup_root)?;
    Ok(backup_root.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_backup_status(
    app: tauri::AppHandle,
    source_path: String,
) -> Result<BackupStatusResult, String> {
    let source_path = source_path.trim();
    if source_path.is_empty() {
        return Ok(BackupStatusResult::default());
    }

    let source = Path::new(source_path);
    let bucket_dirs = list_bucket_dirs_for_source(&app, source)?;

    let mut total_backups = 0usize;
    let mut latest_timestamp: Option<String> = None;
    let mut latest_backup_file_path: Option<String> = None;

    for bucket_dir in &bucket_dirs {
        let entries = match read_dir(bucket_dir) {
            Ok(value) => value,
            Err(_) => continue,
        };
        for entry in entries {
            let entry = match entry {
                Ok(value) => value,
                Err(_) => continue,
            };
            let timestamp_dir = entry.path();
            if !timestamp_dir.is_dir() {
                continue;
            }
            total_backups += 1;
            let timestamp = match timestamp_dir.file_name().and_then(|name| name.to_str()) {
                Some(value) => value.to_string(),
                None => continue,
            };
            let is_latest = latest_timestamp
                .as_ref()
                .map(|current| timestamp > *current)
                .unwrap_or(true);
            if is_latest {
                latest_timestamp = Some(timestamp);
                let backup_file = read_dir(&timestamp_dir)
                    .ok()
                    .and_then(|iter| {
                        iter.filter_map(|item| item.ok().map(|e| e.path()))
                            .find(|path| path.is_file())
                    })
                    .map(|path| path.to_string_lossy().to_string());
                latest_backup_file_path = backup_file;
            }
        }
    }

    let last_backup_datetime = latest_timestamp
        .as_ref()
        .and_then(|value| format_timestamp_for_display(value));

    Ok(BackupStatusResult {
        source_path: source.to_string_lossy().to_string(),
        bucket_count: bucket_dirs.len(),
        total_backups,
        last_backup_timestamp: latest_timestamp,
        last_backup_datetime,
        last_backup_file_path: latest_backup_file_path,
    })
}

#[tauri::command]
pub fn backup_all_detected_saves(
    app: tauri::AppHandle,
    folder_path: String,
    parse_mode: Option<String>,
    backups_per_character: u32,
) -> Result<BackupAllResult, String> {
    let folder = Path::new(folder_path.trim());
    if folder.as_os_str().is_empty() {
        return Err("No save folder configured.".to_string());
    }

    let files = read_dir(folder).map_err(|e| e.to_string())?;
    let parse_mode_ref = parse_mode.as_deref();
    let mut result = BackupAllResult::default();
    let backup_config = BackupConfig {
        enabled: true,
        backups_per_character,
    };

    for file in files {
        let file_path = match file {
            Ok(entry) => entry.path(),
            Err(_) => continue,
        };
        if file_path.extension() != Some(OsStr::new("d2s")) {
            continue;
        }

        let (parsed, _) = match parse_save_from_path(&file_path, parse_mode_ref) {
            Ok(value) => value,
            Err(err) => {
                result.failed += 1;
                result
                    .errors
                    .push(format!("{}: {}", file_path.display(), err));
                continue;
            }
        };

        result.detected_files += 1;
        match backup_existing_file(&app, &file_path, &parsed.save, &backup_config) {
            Ok(outcome) => {
                if outcome.performed {
                    result.backed_up += 1;
                } else {
                    result.skipped_unchanged += 1;
                }
                if let Some(warning) = outcome.cleanup_warning {
                    result.cleanup_warnings.push(warning);
                }
            }
            Err(err) => {
                result.failed += 1;
                result
                    .errors
                    .push(format!("{}: {}", file_path.display(), err));
            }
        }
    }

    Ok(result)
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
