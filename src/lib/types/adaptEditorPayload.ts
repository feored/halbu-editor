import { adaptSkillsPayloadToEditorSkills } from "../editor/skills/skillAdapters";
import { DEFAULT_SKILL_SLOT_COUNT } from "../editor/skills/skillSlots";
import type {
	BackendSkillPoints,
	EncodableSaveFormatId,
	EditorOpenPayload,
	EditorSave,
	KnownClassName,
} from "./editor";

type UnknownEnumLabel = `Unknown(${number})`;

type BackendUnknownEnumVariant = {
	Unknown: number;
};

type BackendEnumLabel<KnownLabel extends string> = KnownLabel | BackendUnknownEnumVariant;

type BackendCharacterDto = Omit<EditorSave["character"], "class"> & {
	class: BackendEnumLabel<KnownClassName>;
};

type BackendMetaDto = Omit<EditorSave["meta"], "format"> & {
	format: BackendEnumLabel<EncodableSaveFormatId>;
};

export type BackendEditorSaveDto = Omit<
	EditorSave,
	"character" | "meta" | "skills"
> & {
	character: BackendCharacterDto;
	meta: BackendMetaDto;
	skills: BackendSkillPoints;
};

export type BackendOpenPayloadDto = {
	save: BackendEditorSaveDto;
	parse_issue_count: number;
	parse_issues: EditorOpenPayload["parseIssues"];
	source_file_size: number;
	header_checksum: number | null;
	computed_checksum: number | null;
};

function adaptUnknownEnumLabel<KnownLabel extends string>(
	value: BackendEnumLabel<KnownLabel>,
): KnownLabel | UnknownEnumLabel {
	if (typeof value === "string") {
		return value;
	}
	return `Unknown(${value.Unknown})` as UnknownEnumLabel;
}

export function adaptEditorSavePayload(
	backendSave: BackendEditorSaveDto,
	slotCount = DEFAULT_SKILL_SLOT_COUNT,
): EditorSave {
	return {
		...backendSave,
		character: {
			...backendSave.character,
			class: adaptUnknownEnumLabel(backendSave.character.class),
		},
		meta: {
			...backendSave.meta,
			format: adaptUnknownEnumLabel(backendSave.meta.format),
		},
		skills: adaptSkillsPayloadToEditorSkills(backendSave.skills, slotCount),
	};
}

export function adaptBackendOpenPayload(
	backendPayload: BackendOpenPayloadDto,
	sourcePath: string | null,
	slotCount = DEFAULT_SKILL_SLOT_COUNT,
): EditorOpenPayload {
	return {
		save: adaptEditorSavePayload(backendPayload.save, slotCount),
		parseIssueCount: backendPayload.parse_issue_count,
		parseIssues: backendPayload.parse_issues,
		headerChecksum: backendPayload.header_checksum,
		computedChecksum: backendPayload.computed_checksum,
		sourceFileSize: backendPayload.source_file_size,
		sourcePath,
	};
}
