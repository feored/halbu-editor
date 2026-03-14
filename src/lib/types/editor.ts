export const REQUIRED_EDITOR_ATTRIBUTE_IDS = [
	"statpts",
	"newskills",
	"experience",
	"level",
	"gold",
	"goldbank",
	"strength",
	"dexterity",
	"vitality",
	"energy",
	"hitpoints",
	"maxhp",
	"mana",
	"maxmana",
	"stamina",
	"maxstamina",
] as const;

export type RequiredEditorAttributeId = (typeof REQUIRED_EDITOR_ATTRIBUTE_IDS)[number];
export type DifficultyId = "normal" | "nightmare" | "hell";
export type ActId = "act1" | "act2" | "act3" | "act4" | "act5";
export type ActLabel = "Act1" | "Act2" | "Act3" | "Act4" | "Act5";
export type DifficultyLabel = "Normal" | "Nightmare" | "Hell";
export type ExpansionTypeLabel = "Classic" | "Expansion" | "RotW";
export type GameEditionLabel = "D2R Legacy" | "RotW";
export type ParseIssueSeverity = "Warning" | "Error";
export type ParseIssueKind =
	| "TruncatedSection"
	| "InvalidSignature"
	| "UnsupportedVersion"
	| "InvalidValue"
	| "InconsistentLayout"
	| "Other";
export type CompatibilityCode =
	| "WarlockRequiresRotw"
	| "WarlockRequiresRotwExpansion"
	| "RotwExpansionRequiresRotwEdition"
	| "ExpansionClassRequiresExpansionMode"
	| "UnknownClassRequiresKnownTarget";
export type KnownClassName =
	| "Amazon"
	| "Sorceress"
	| "Necromancer"
	| "Paladin"
	| "Barbarian"
	| "Druid"
	| "Assassin"
	| "Warlock";
export type ClassName = KnownClassName | `Unknown(${number})`;
export type SaveFormatId = "V99" | "V105" | `Unknown(${number})`;
export type EncodableSaveFormatId = "V99" | "V105";
export type QuestFlag =
	| "RewardGranted"
	| "RewardPending"
	| "Started"
	| "LeaveTown"
	| "EnterArea"
	| "Custom1"
	| "Custom2"
	| "Custom3"
	| "Custom4"
	| "Custom5"
	| "Custom6"
	| "Custom7"
	| "UpdateQuestLog"
	| "PrimaryGoalDone"
	| "CompletedNow"
	| "CompletedBefore";
export type QuestId =
	| "prologue"
	| "q1"
	| "q2"
	| "q3"
	| "q4"
	| "q5"
	| "q6"
	| "completion"
	| "unused_1"
	| "unused_2"
	| "unused_3";

export type SkillSlot = {
	id: number;
	points: number;
};

export type BackendSkillPoints = {
	points: number[];
};

export type EditorAttributeValue = {
	id: number;
	name: string;
	bit_length: number;
	value: number;
};

export type RequiredEditorAttributes = Record<RequiredEditorAttributeId, EditorAttributeValue>;

export type EditorCharacterStatus = {
	hardcore: boolean;
	ladder: boolean;
	died: boolean;
	expansion: boolean;
};

export type EditorMercenary = {
	id: number;
	is_dead: boolean;
	variant_id: number;
	experience: number;
	name_id: number;
};

export type EditorCharacter = {
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
	class: ClassName;
	level: number;
	progression: number;
	act: ActLabel;
	difficulty: DifficultyLabel;
	map_seed: number;
	last_played: number;
	status: EditorCharacterStatus;
	mercenary: EditorMercenary;
};

export type EditorMeta = {
	format: SaveFormatId;
};

export type EditorAttributes = RequiredEditorAttributes;

export type EditorQuest = {
	state: QuestFlag[];
};

export type EditorQuests = Record<DifficultyId, Record<ActId, Record<QuestId, EditorQuest>>>;

export type EditorWaypoint = {
	id: string;
	act: ActLabel;
	name: string;
	acquired: boolean;
};

export type EditorWaypoints = Record<DifficultyId, Record<ActId, EditorWaypoint[]>>;

export type EditorSave = {
	version: number;
	expansion_type: ExpansionTypeLabel;
	character: EditorCharacter;
	quests: EditorQuests;
	waypoints: EditorWaypoints;
	npcs: {
		data: number[];
	};
	attributes: EditorAttributes;
	skills: SkillSlot[];
	items: {
		data: number[];
	};
	meta: EditorMeta;
};

export type EditValidation = {
	errors: string[];
	warnings: string[];
};

export type CompatibilityIssue = {
	code: CompatibilityCode;
	blocking: boolean;
	message: string;
};

export type OutputFormatOption = {
	formatId: EncodableSaveFormatId;
	version: number;
	gameEdition: GameEditionLabel;
};

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

export type EditorOpenPayload = {
	save: EditorSave;
	parseIssueCount: number;
	parseIssues: ParseIssue[];
	headerChecksum: number | null;
	computedChecksum: number | null;
	sourceFileSize: number | null;
	sourcePath: string | null;
};

export type SaveCommandResult = {
	message: string;
	backupPerformed: boolean;
	backupPath: string | null;
	cleanupWarning: string | null;
};

export type SaveSummaryEntry = {
	path: string;
	title: string | null;
	name: string | null;
	className: ClassName | null;
	level: number | null;
	formatId: SaveFormatId | null;
	hardcore: boolean | null;
	expansionType: ExpansionTypeLabel | null;
	gameEdition: GameEditionLabel | null;
	version: number | null;
	lastPlayed: number | null;
	parseIssueCount: number;
};

export type SkillsContext = {
	save_version: number;
	meta_format: SaveFormatId;
	class_name: KnownClassName;
	skill_slot_count: number;
	class_supported_for_version: boolean;
	supported_classes: KnownClassName[];
};

export type BackupStatus = {
	sourcePath: string;
	totalBackups: number;
	lastBackupTimestamp: string | null;
	lastBackupDatetime: string | null;
};

export type BackupAllDetectedSavesResult = {
	detectedFiles: number;
	backedUp: number;
	skippedUnchanged: number;
	failed: number;
	cleanupWarnings: string[];
	errors: string[];
};
