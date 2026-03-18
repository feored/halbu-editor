use halbu::format::FormatId;
use halbu::{GameEdition, ParseIssue, Save, Strictness};
use serde::{Deserialize, Serialize};

mod backups;
mod parsing;
mod saving;

pub use backups::{
    backup_all_detected_saves, get_backup_status, open_backup_folder, open_backup_folder_for_source,
};
pub use parsing::{get_character_from_path_with_meta, summary_folder};
pub use saving::{
    check_save_compatibility, get_skills_context, get_supported_output_formats, new_save,
    save_file_as_version,
};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SaveSummaryFile {
    path: String,
    name: Option<String>,
    title: Option<String>,
    class_name: Option<String>,
    level: Option<u8>,
    version: Option<u32>,
    format_id: Option<String>,
    game_edition: Option<String>,
    expansion_type: Option<String>,
    hardcore: Option<bool>,
    last_played: Option<u32>,
    parse_issue_count: usize,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SkillsContext {
    save_version: u32,
    meta_format: String,
    class_name: String,
    class_supported_for_version: bool,
    supported_classes: Vec<String>,
    skill_slot_count: usize,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OutputFormatOption {
    format_id: String,
    version: u32,
    game_edition: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ParsedCharacter {
    save: Save,
    parse_issue_count: usize,
    parse_issues: Vec<ParseIssue>,
    source_file_size: usize,
    header_checksum: Option<u32>,
    computed_checksum: Option<u32>,
    edition_hint: Option<GameEdition>,
    suggested_target_version: Option<u32>,
    parser_layout_version: Option<u32>,
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
