import type {
	Act,
	Attribute,
	Difficulty,
	EncodableSaveFormatId,
	ExpansionType,
	GameEdition,
	KnownClassName,
	QuestFlag,
	QuestId,
	SaveLayoutVersion,
} from "$lib/types/editor";

export type BackendAct = "act1" | "act2" | "act3" | "act4" | "act5";
export type BackendDifficulty = "normal" | "nightmare" | "hell";

export type ParseIssueSeverity = "Warning" | "Error";

export type ParseIssueKind =
	| "TruncatedSection"
	| "InvalidSignature"
	| "UnsupportedVersion"
	| "InvalidValue"
	| "InconsistentLayout"
	| "Other";

export type ParseMode = "lax" | "strict";

export type ParseIssue = {
	severity: ParseIssueSeverity;
	kind: ParseIssueKind;
	section: string | null;
	offset: number | null;
	expected: number | null;
	found: number | null;
	message: string;
};

export type CompatibilityCode =
	| "WarlockRequiresRotW"
	| "WarlockRequiresRotWExpansion"
	| "RotWExpansionRequiresRotWEdition"
	| "ExpansionClassRequiresExpansionMode"
	| "UnknownClassRequiresKnownTarget"
	| "MercenaryHireStateToggleUnsupported";

export type CompatibilityIssue = {
	code: CompatibilityCode;
	blocking: boolean;
	message: string;
};

export type ValidationCode =
	| "InvalidCharacterName"
	| "UnknownClassId"
	| "CharacterLevelMismatch"
	| "CharacterLevelOutOfRange"
	| "ProgressionNonCanonical"
	| "ImpossibleDifficultySelection"
	| "ImpossibleActSelection"
	| "MercenaryDataWithoutHire"
	| "MercenaryHireStateToggleUnsupported"
	| "MercenaryVariantUnknown"
	| "MercenaryNameIdOutOfRange"
	| "MercenaryLevelImpossible"
	| "QuestStateImpossible";

export type ValidationIssue = {
	code: ValidationCode;
	blocking: boolean;
	message: string;
};

export type ValidationReport = {
	issues: ValidationIssue[];
};

export type SaveCommandResult = {
	message: string;
	backupPerformed: boolean;
	backupPath: string | null;
	cleanupWarning: string | null;
};

export type OutputFormatOption = {
	formatId: EncodableSaveFormatId;
	version: SaveLayoutVersion;
	gameEdition: GameEdition;
};

export type BackendEnumValue<KnownValue extends string> =
	| KnownValue
	| { Unknown: number };

export type BackendSkillPointList = {
	points: number[];
};

export type BackendAttributeValue = {
	id: number;
	name: string;
	bit_length: number;
	value: number;
};

export type BackendCharacterStatus = {
	hardcore: boolean;
	ladder: boolean;
	died: boolean;
	expansion: boolean;
};

export type BackendMercenary = {
	id: number;
	is_dead: boolean;
	variant_id: number;
	experience: number;
	name_id: number;
};

export type BackendWaypoint = {
	id: string;
	acquired: boolean;
};

export type BackendActWaypoints = {
	act: Act;
	waypoints: BackendWaypoint[];
};

export type BackendRawDataSection = {
	data: number[];
};

export type BackendCharacter = {
	weapon_switch: boolean;
	assigned_skills: number[];
	left_mouse_skill: number;
	right_mouse_skill: number;
	left_mouse_switch_skill: number;
	right_mouse_switch_skill: number;
	menu_appearance: number[];
	resurrected_menu_appearance: number[];
	raw_section: number[];
	name: string;
	class: BackendEnumValue<KnownClassName>;
	level: number;
	progression: number;
	act: Act;
	difficulty: Difficulty;
	map_seed: number;
	last_played: number;
	status: BackendCharacterStatus;
	mercenary: BackendMercenary;
};

export type BackendSaveMetadata = {
	format: BackendEnumValue<EncodableSaveFormatId>;
};

export type BackendQuestState = {
	state: QuestFlag[];
};

export type BackendQuestMap = Record<
	BackendDifficulty,
	Record<BackendAct, Record<QuestId, BackendQuestState>>
>;

export type BackendWaypointMap = Record<
	BackendDifficulty,
	Record<BackendAct, BackendActWaypoints>
>;

export type BackendEditorSave = {
	version: number;
	expansion_type: ExpansionType;
	character: BackendCharacter;
	quests: BackendQuestMap;
	waypoints: BackendWaypointMap;
	npcs: BackendRawDataSection;
	attributes: Record<Attribute, BackendAttributeValue>;
	skills: BackendSkillPointList;
	items: BackendRawDataSection;
	meta: BackendSaveMetadata;
};

export type BackendOpenSaveResult = {
	save: BackendEditorSave;
	parse_issue_count: number;
	parse_issues: ParseIssue[];
	header_checksum: number | null;
	computed_checksum: number | null;
	source_file_size: number | null;
	edition_hint: GameEdition | null;
	suggested_target_version: SaveLayoutVersion | null;
	parser_layout_version: SaveLayoutVersion | null;
};
