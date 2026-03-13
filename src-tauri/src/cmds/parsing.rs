use halbu::format::FormatId;
use halbu::{ParsedSave, Save};
use log::{debug, info};
use std::cmp::Reverse;
use std::ffi::OsStr;
use std::fs::{self, read_dir};
use std::path::Path;

use super::{format_id_label, strictness_from_parse_mode, ParsedCharacter, SaveSummaryFile};

pub(crate) fn parse_save_from_path(
    path: &Path,
    parse_mode: Option<&str>,
) -> Result<(ParsedSave, usize), String> {
    let strictness = strictness_from_parse_mode(parse_mode);
    let parse_mode_label = match strictness {
        halbu::Strictness::Strict => "strict",
        halbu::Strictness::Lax => "lax",
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

fn read_u32_le_at(bytes: &[u8], offset: usize) -> Option<u32> {
    let end = offset.checked_add(4)?;
    let data = bytes.get(offset..end)?;
    let mut raw = [0u8; 4];
    raw.copy_from_slice(data);
    Some(u32::from_le_bytes(raw))
}

fn detect_hardcore_and_last_played(
    bytes: &[u8],
    format_id: Option<FormatId>,
) -> (Option<bool>, Option<u32>) {
    let Some(format_id) = format_id else {
        return (None, None);
    };

    const CHARACTER_SECTION_START: usize = 16;
    let (status_offset, last_played_offset) = match format_id {
        FormatId::V99 => (CHARACTER_SECTION_START + 20, CHARACTER_SECTION_START + 32),
        FormatId::V105 => (CHARACTER_SECTION_START + 4, CHARACTER_SECTION_START + 16),
        FormatId::Unknown(_) => return (None, None),
    };

    let hardcore = bytes.get(status_offset).map(|status| (status & (1 << 2)) != 0);
    let last_played = read_u32_le_at(bytes, last_played_offset);
    (hardcore, last_played)
}

#[tauri::command]
pub fn get_character_from_path_with_meta(
    path: String,
    parse_mode: Option<String>,
) -> Result<ParsedCharacter, String> {
    let path: &Path = Path::new(&path);
    let (parsed, source_file_size) = parse_save_from_path(path, parse_mode.as_deref())?;
    let parse_issue_count = parsed.issues.len();
    let header_checksum = parsed.header_checksum;
    let computed_checksum = parsed.computed_checksum;
    let parse_issues = parsed.issues;
    Ok(ParsedCharacter {
        save: parsed.save,
        parse_issue_count,
        parse_issues,
        source_file_size,
        header_checksum,
        computed_checksum,
    })
}

#[tauri::command]
pub fn summary_folder(path: String, parse_mode: Option<String>) -> Result<Vec<SaveSummaryFile>, String> {
    let path: &Path = Path::new(&path);
    let strictness = strictness_from_parse_mode(parse_mode.as_deref());

    let files = match read_dir(path) {
        Ok(res) => res,
        Err(e) => return Err(e.to_string()),
    };

    let mut saves: Vec<SaveSummaryFile> = Vec::<SaveSummaryFile>::new();
    for file in files {
        let file_path = match file {
            Ok(res) => res.path(),
            Err(_e) => continue,
        };

        if file_path.as_path().extension() != Some(OsStr::new("d2s")) {
            continue;
        }

        let file_path_string = match file_path.as_path().to_str() {
            Some(res) => res,
            None => continue,
        };

        let bytes = match fs::read(file_path.as_path()) {
            Ok(res) => res,
            Err(_e) => continue,
        };

        let summary = match Save::summarize(&bytes, strictness) {
            Ok(res) => res,
            Err(_e) => continue,
        };

        let (hardcore, last_played) = detect_hardcore_and_last_played(&bytes, summary.format);
        saves.push(SaveSummaryFile {
            path: file_path_string.to_string(),
            name: summary.name,
            title: summary.title,
            class_name: summary.class.as_ref().map(ToString::to_string),
            level: summary.level,
            version: summary.version,
            format_id: summary.format.map(format_id_label),
            game_edition: summary.edition.map(|edition| edition.label().to_string()),
            expansion_type: summary
                .expansion_type
                .map(|expansion_type| expansion_type.label().to_string()),
            hardcore,
            last_played,
            parse_issue_count: summary.issues.len(),
        });
    }
    saves.sort_unstable_by_key(|save_file| Reverse(save_file.last_played.unwrap_or(0)));
    Ok(saves)
}
