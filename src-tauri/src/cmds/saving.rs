use halbu::format::FormatId;
use halbu::{Class, CompatibilityChecks, CompatibilityIssue, Save};
use std::fs::{remove_file, OpenOptions};
use std::io::ErrorKind;
use std::io::Write;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use super::backups::backup_existing_file;
use super::{format_id_label, BackupConfig, OutputFormatOption, SaveCommandResult};

fn supports_class_for_format(format: FormatId, class: Class) -> bool {
    let probe_save = Save::new(format, class);
    !probe_save
        .check_compatibility(format)
        .into_iter()
        .any(|issue| issue.blocking)
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
    let tmp_path = parent.join(format!(
        ".{file_name}.tmp-{}-{ts_nanos}",
        std::process::id()
    ));

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
pub fn new_save(version: u32, class: Class) -> Result<Save, String> {
    let format = FormatId::from_version(version)
        .ok_or_else(|| format!("Unsupported save version {version} for new save creation."))?;
    if !supports_class_for_format(format, class) {
        return Err(format!(
            "Class {class} is not supported for save version {version}."
        ));
    }
    Ok(Save::new(format, class))
}

#[tauri::command]
pub fn get_supported_output_formats() -> Vec<OutputFormatOption> {
    let mut options: Vec<OutputFormatOption> = FormatId::encodable_formats()
        .into_iter()
        .map(|format| OutputFormatOption {
            format_id: format_id_label(format),
            version: format.version(),
            game_edition: format
                .edition()
                .map(|edition| edition.label().to_string())
                .unwrap_or_else(|| "Unknown".to_string()),
        })
        .collect();
    options.sort_by_key(|option| option.version);
    options
}

#[tauri::command]
pub fn save_file_as_version(
    app: tauri::AppHandle,
    path: String,
    save: Save,
    target_version: u32,
    ignore_compatibility_checks: Option<bool>,
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
    let compatibility_checks = if ignore_compatibility_checks.unwrap_or(false) {
        CompatibilityChecks::Ignore
    } else {
        CompatibilityChecks::Enforce
    };

    let generated_save = save
        .encode_for(target_format, compatibility_checks)
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
pub fn check_save_compatibility(
    save: Save,
    target_version: u32,
) -> Result<Vec<CompatibilityIssue>, String> {
    let target_format = FormatId::from_version(target_version)
        .ok_or_else(|| format!("Unsupported save version {target_version}."))?;
    Ok(save.check_compatibility(target_format))
}
