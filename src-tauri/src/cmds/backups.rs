use chrono::Local;
use halbu::{Save, Strictness};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::ffi::OsStr;
use std::fs::{self, read_dir, remove_file};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use tauri::Manager;
use uuid::Uuid;

use super::{BackupAllResult, BackupConfig, BackupStatusResult};
use super::parsing::parse_save_from_path;

#[derive(Debug)]
pub(crate) struct BackupOutcome {
    pub(crate) performed: bool,
    pub(crate) path: Option<PathBuf>,
    pub(crate) cleanup_warning: Option<String>,
}

static BACKUP_HASH_CACHE: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();

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
    let uuid = bucket_prefix_for_source(source_path);
    let old_prefix = format!("{uuid}-");
    let new_suffix = format!("-{uuid}");
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
        if file_name.starts_with(&old_prefix) || file_name.ends_with(&new_suffix) {
            dirs.push(path);
        }
    }

    Ok(dirs)
}

fn latest_timestamp_in_bucket(bucket_dir: &Path) -> Option<String> {
    let entries = read_dir(bucket_dir).ok()?;
    let mut latest: Option<String> = None;
    for entry in entries {
        let path = entry.ok()?.path();
        if !path.is_dir() {
            continue;
        }
        let timestamp = path.file_name()?.to_str()?.to_string();
        if latest.as_ref().map(|current| timestamp > *current).unwrap_or(true) {
            latest = Some(timestamp);
        }
    }
    latest
}

fn select_bucket_dir_for_source(app: &tauri::AppHandle, source_path: &Path) -> Result<PathBuf, String> {
    let bucket_dirs = list_bucket_dirs_for_source(app, source_path)?;
    if bucket_dirs.is_empty() {
        return Err("No backups exist yet for this character.".to_string());
    }

    let mut buckets_with_timestamps: Vec<(Option<String>, PathBuf)> = bucket_dirs
        .into_iter()
        .map(|bucket| (latest_timestamp_in_bucket(&bucket), bucket))
        .collect();
    buckets_with_timestamps.sort_by(|left, right| left.0.cmp(&right.0).then(left.1.cmp(&right.1)));

    buckets_with_timestamps
        .pop()
        .map(|(_, bucket)| bucket)
        .ok_or_else(|| "No backups exist yet for this character.".to_string())
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

#[derive(Default)]
struct BackupSourceSummary {
    class_name: Option<String>,
    character_name: Option<String>,
    level: Option<u8>,
}

fn summarize_save_for_backup_metadata(path: &Path) -> Option<BackupSourceSummary> {
    let bytes = fs::read(path).ok()?;
    let summary = Save::summarize(&bytes, Strictness::Lax).ok()?;
    Some(BackupSourceSummary {
        class_name: summary.class.as_ref().map(ToString::to_string),
        character_name: summary.name,
        level: summary.level,
    })
}

fn determine_bucket_dir(
    app: &tauri::AppHandle,
    source_path: &Path,
    fallback_save: &Save,
) -> Result<PathBuf, String> {
    let backup_root = backup_root_dir(app)?;
    let source_summary = summarize_save_for_backup_metadata(source_path).unwrap_or_default();
    let fallback_class = fallback_save.character.class.to_string();
    let fallback_name = fallback_save.character.name.clone();
    let fallback_level = fallback_save.character.level.to_string();
    let class_name = sanitize_component(
        source_summary
            .class_name
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or(&fallback_class),
        "class",
    );
    let character_name = sanitize_component(
        source_summary
            .character_name
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or(&fallback_name),
        "character",
    );
    let summary_level = source_summary.level.map(|level| level.to_string());
    let character_level = sanitize_component(summary_level.as_deref().unwrap_or(&fallback_level), "level");
    let uuid = bucket_prefix_for_source(source_path);
    Ok(backup_root.join(format!(
        "{character_name}-{class_name}-lvl{character_level}-{uuid}"
    )))
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

pub(crate) fn backup_existing_file(
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

#[tauri::command]
pub fn open_backup_folder(app: tauri::AppHandle) -> Result<String, String> {
    let backup_root = backup_root_dir(&app)?;
    open_path_in_file_manager(&backup_root)?;
    Ok(backup_root.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_backup_folder_for_source(
    app: tauri::AppHandle,
    source_path: String,
) -> Result<String, String> {
    let normalized_source_path = source_path.trim();
    if normalized_source_path.is_empty() {
        return Err("No source save path is available.".to_string());
    }

    let source = Path::new(normalized_source_path);
    let bucket_dir = select_bucket_dir_for_source(&app, source)?;
    open_path_in_file_manager(&bucket_dir)?;
    Ok(bucket_dir.to_string_lossy().to_string())
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
