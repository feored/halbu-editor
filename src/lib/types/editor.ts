//
// GENERAL
//
export type EditorMode = "raw" | "game-rules";

export type SaveFormatId = "V99" | "V105" | `Unknown(${number})`;
export type EncodableSaveFormatId = "V99" | "V105";
export type SaveLayoutVersion = 99 | 105;

export const EXPANSION_TYPE_NAMES = ["Classic", "Expansion", "RotW"] as const;
export type ExpansionType = (typeof EXPANSION_TYPE_NAMES)[number];

export const GAME_EDITIONS = ["D2R Legacy", "RotW"] as const;
export type GameEdition = (typeof GAME_EDITIONS)[number];

export const DIFFICULTY_NAMES = ["Normal", "Nightmare", "Hell"] as const;
export type Difficulty = (typeof DIFFICULTY_NAMES)[number];

export const ACT_NAMES = ["Act1", "Act2", "Act3", "Act4", "Act5"] as const;
export type Act = (typeof ACT_NAMES)[number];


//
// CHARACTER
//

export const ATTRIBUTES = [
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
export type Attribute = (typeof ATTRIBUTES)[number];

export type AttributeValue = {
	id: number;
	name: string;
	bitLength: number;
	value: number;
};

export type AttributeMap = Record<Attribute, AttributeValue>;

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

export type CharacterStatus = {
	hardcore: boolean;
	ladder: boolean;
	died: boolean;
	expansion: boolean;
};

export type Mercenary = {
	id: number;
	isDead: boolean;
	variantId: number;
	experience: number;
	nameId: number;
};

export type Character = {
	name: string;
	className: ClassName;
	level: number;
	progression: number;
	act: Act;
	difficulty: Difficulty;
	mapSeed: number;
	lastPlayed: number;
	status: CharacterStatus;
	mercenary: Mercenary;
};

//
// QUESTS
//

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

export type QuestState = {
	flags: QuestFlag[];
};

export type QuestMap = Record<Difficulty, Record<Act, Record<QuestId, QuestState>>>;

//
// WAYPOINTS
//

export type Waypoint = {
	id: string;
	acquired: boolean;
};

export type ActWaypoints = {
	act: Act;
	waypoints: Waypoint[];
};

export type WaypointMap = Record<Difficulty, Record<Act, ActWaypoints>>;


//
// SAVE STRUCTURE
//

export type SaveMetadata = {
	formatId: SaveFormatId;
};

export type RawDataSection = {
	data: number[];
};

export type SkillSlot = {
	id: number;
	points: number;
};

export type EditorSave = {
	version: number;
	expansionType: ExpansionType;
	character: Character;
	quests: QuestMap;
	waypoints: WaypointMap;
	npcs: RawDataSection;
	attributes: AttributeMap;
	skills: SkillSlot[];
	items: RawDataSection;
	metadata: SaveMetadata;
};

export type SaveSummary = {
	path: string;
	title: string | null;
	name: string | null;
	className: ClassName | null;
	level: number | null;
	formatId: SaveFormatId | null;
	hardcore: boolean | null;
	expansionType: ExpansionType | null;
	gameEdition: GameEdition | null;
};

//
// BACKUPS
//

export type BackupStatus =
	| "Created"
	| "SkippedNoSourcePath"
	| "SkippedNotFile"
	| "SkippedByPolicy"
	| "Failed";

export type BackupAllDetectedSavesResult = {
	attempted: number;
	created: number;
	statuses: Record<string, BackupStatus>;
	errors: Record<string, string>;
};
