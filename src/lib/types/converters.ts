import { toEditorSkills } from "$lib/editor/skills/skillsAdapters";
import { DEFAULT_SKILL_SLOT_COUNT } from "$lib/editor/skills/skillsSlots";

import type {
	Act,
	Attribute,
	ClassName,
	Difficulty,
	EditorSave,
	EncodableSaveFormatId,
	KnownClassName,
	QuestFlag,
	QuestId,
	SaveLayoutVersion,
	SaveFormatId,
	SkillSlot,
} from "$lib/types/editor";
import type {
	BackendAct,
	BackendAttributeValue,
	BackendCharacter,
	BackendDifficulty,
	BackendEditorSave,
	BackendEnumValue,
	BackendOpenSaveResult,
	BackendQuestState,
	BackendSkillPointList,
} from "$lib/types/backend";
import type { OpenedSessionData } from "$lib/editor/editorSession";

type UnknownEnumName = `Unknown(${number})`;

type BackendFormatId = EncodableSaveFormatId | { Unknown: number };
type BackendClassId = KnownClassName | { Unknown: number };

const DIFFICULTY_KEY_PAIRS = [
	["Normal", "normal"],
	["Nightmare", "nightmare"],
	["Hell", "hell"],
] as const satisfies ReadonlyArray<readonly [Difficulty, BackendDifficulty]>;

const ACT_KEY_PAIRS = [
	["Act1", "act1"],
	["Act2", "act2"],
	["Act3", "act3"],
	["Act4", "act4"],
	["Act5", "act5"],
] as const satisfies ReadonlyArray<readonly [Act, BackendAct]>;

function toEnumName<KnownValue extends string>(
	value: BackendEnumValue<KnownValue>,
): KnownValue | UnknownEnumName {
	if (typeof value === "string") {
		return value;
	}

	return `Unknown(${value.Unknown})` as UnknownEnumName;
}

function toBackendEnum<KnownValue extends string>(
	value: KnownValue | `Unknown(${number})`,
): KnownValue | { Unknown: number } {
	if (!value.startsWith("Unknown(")) {
		return value as KnownValue;
	}

	const payload = Number(value.slice(8, -1));
	return { Unknown: payload };
}

function toClassName(value: BackendEnumValue<KnownClassName>): ClassName {
	return toEnumName(value);
}

function toSaveFormatId(value: BackendEnumValue<EncodableSaveFormatId>): SaveFormatId {
	return toEnumName(value);
}

function toAttributeMap(
	backendAttributes: Record<string, BackendAttributeValue>,
): EditorSave["attributes"] {
	return Object.fromEntries(
		Object.entries(backendAttributes).map(([name, attribute]) => [
			name,
			{
				id: attribute.id,
				name: attribute.name,
				bitLength: attribute.bit_length,
				value: attribute.value,
			},
		]),
	) as EditorSave["attributes"];
}

function toBackendAttributes(
	attributes: EditorSave["attributes"],
): Record<Attribute, BackendAttributeValue> {
	return Object.fromEntries(
		Object.entries(attributes).map(([name, attribute]) => [
			name,
			{
				id: attribute.id,
				name: attribute.name,
				bit_length: attribute.bitLength,
				value: attribute.value,
			},
		]),
	) as Record<Attribute, BackendAttributeValue>;
}

function toCharacter(backendCharacter: BackendCharacter): EditorSave["character"] {
	return {
		name: backendCharacter.name,
		className: toClassName(backendCharacter.class),
		level: backendCharacter.level,
		progression: backendCharacter.progression,
		act: backendCharacter.act,
		difficulty: backendCharacter.difficulty,
		mapSeed: backendCharacter.map_seed,
		lastPlayed: backendCharacter.last_played,
		status: {
			hardcore: backendCharacter.status.hardcore,
			ladder: backendCharacter.status.ladder,
			died: backendCharacter.status.died,
			expansion: backendCharacter.status.expansion,
		},
		mercenary: {
			id: backendCharacter.mercenary.id,
			isDead: backendCharacter.mercenary.is_dead,
			variantId: backendCharacter.mercenary.variant_id,
			experience: backendCharacter.mercenary.experience,
			nameId: backendCharacter.mercenary.name_id,
		},
	};
}

function toEditorQuestStates(
	backendActQuests: Record<string, BackendQuestState>,
): Record<QuestId, { flags: QuestFlag[] }> {
	return Object.fromEntries(
		Object.entries(backendActQuests).map(([questId, questState]) => [
			questId,
			{ flags: [...questState.state] },
		]),
	) as Record<QuestId, { flags: QuestFlag[] }>;
}

function toBackendQuestStates(
	editorActQuests: Record<QuestId, { flags: QuestFlag[] }>,
): Record<QuestId, BackendQuestState> {
	return Object.fromEntries(
		Object.entries(editorActQuests).map(([questId, questState]) => [
			questId,
			{ state: [...questState.flags] },
		]),
	) as Record<QuestId, BackendQuestState>;
}

function toEditorQuests(backendQuests: BackendEditorSave["quests"]): EditorSave["quests"] {
	const editorQuests = {} as EditorSave["quests"];

	for (const [editorDifficulty, backendDifficulty] of DIFFICULTY_KEY_PAIRS) {
		editorQuests[editorDifficulty] = {} as EditorSave["quests"][Difficulty];

		for (const [editorAct, backendAct] of ACT_KEY_PAIRS) {
			editorQuests[editorDifficulty][editorAct] = toEditorQuestStates(
				backendQuests[backendDifficulty][backendAct],
			);
		}
	}

	return editorQuests;
}

function toBackendQuests(editorQuests: EditorSave["quests"]): BackendEditorSave["quests"] {
	const backendQuests = {} as BackendEditorSave["quests"];

	for (const [editorDifficulty, backendDifficulty] of DIFFICULTY_KEY_PAIRS) {
		backendQuests[backendDifficulty] = {} as BackendEditorSave["quests"][BackendDifficulty];

		for (const [editorAct, backendAct] of ACT_KEY_PAIRS) {
			backendQuests[backendDifficulty][backendAct] = toBackendQuestStates(
				editorQuests[editorDifficulty][editorAct],
			);
		}
	}

	return backendQuests;
}

function toEditorWaypoints(
	backendWaypoints: BackendEditorSave["waypoints"],
): EditorSave["waypoints"] {
	const editorWaypoints = {} as EditorSave["waypoints"];

	for (const [editorDifficulty, backendDifficulty] of DIFFICULTY_KEY_PAIRS) {
		editorWaypoints[editorDifficulty] = {} as EditorSave["waypoints"][Difficulty];

		for (const [editorAct, backendAct] of ACT_KEY_PAIRS) {
			const backendWaypointGroup = backendWaypoints[backendDifficulty][backendAct];

			editorWaypoints[editorDifficulty][editorAct] = {
				act: editorAct,
				waypoints: backendWaypointGroup.waypoints.map((waypoint) => ({
					id: waypoint.id,
					acquired: waypoint.acquired,
				})),
			};
		}
	}

	return editorWaypoints;
}

function toBackendWaypoints(
	editorWaypoints: EditorSave["waypoints"],
): BackendEditorSave["waypoints"] {
	const backendWaypoints = {} as BackendEditorSave["waypoints"];

	for (const [editorDifficulty, backendDifficulty] of DIFFICULTY_KEY_PAIRS) {
		backendWaypoints[backendDifficulty] =
			{} as BackendEditorSave["waypoints"][BackendDifficulty];

		for (const [editorAct, backendAct] of ACT_KEY_PAIRS) {
			const editorWaypointGroup = editorWaypoints[editorDifficulty][editorAct];

			backendWaypoints[backendDifficulty][backendAct] = {
				act: editorAct,
				waypoints: editorWaypointGroup.waypoints.map((waypoint) => ({
					id: waypoint.id,
					acquired: waypoint.acquired,
				})),
			};
		}
	}

	return backendWaypoints;
}

export function toEditorSave(
	backendSave: BackendEditorSave,
	slotCount = DEFAULT_SKILL_SLOT_COUNT,
): EditorSave {
	return {
		version: backendSave.version,
		expansionType: backendSave.expansion_type,
		character: toCharacter(backendSave.character),
		quests: toEditorQuests(backendSave.quests),
		waypoints: toEditorWaypoints(backendSave.waypoints),
		npcs: backendSave.npcs,
		attributes: toAttributeMap(backendSave.attributes),
		skills: toEditorSkills(backendSave.skills, slotCount),
		items: backendSave.items,
		metadata: {
			formatId: toSaveFormatId(backendSave.meta.format),
		},
	};
}

export function toOpenedSessionData(
	backendResult: BackendOpenSaveResult,
	sourcePath: string | null,
	slotCount = DEFAULT_SKILL_SLOT_COUNT,
): OpenedSessionData {
	return {
		save: toEditorSave(backendResult.save, slotCount),
		sourceBackendSave: structuredClone(backendResult.save),
		parseIssueCount: backendResult.parse_issue_count,
		parseIssues: backendResult.parse_issues,
		headerChecksum: backendResult.header_checksum,
		computedChecksum: backendResult.computed_checksum,
		sourceFileSize: backendResult.source_file_size,
		sourcePath,
		editionHint: backendResult.edition_hint,
		suggestedTargetVersion: backendResult.suggested_target_version,
		parserLayoutVersion: backendResult.parser_layout_version,
	};
}

export function toBackendSkillPointList(skills: readonly SkillSlot[]): BackendSkillPointList {
	return {
		points: skills.map((skill) => skill.points),
	};
}

export function toBackendSave(
	sourceBackendSave: BackendEditorSave,
	editorSave: EditorSave,
	sourceLayoutVersion: SaveLayoutVersion | null = null,
): BackendEditorSave {
	const formatId =
		sourceLayoutVersion != null && editorSave.metadata.formatId.startsWith("Unknown(")
			? (`V${sourceLayoutVersion}` as EncodableSaveFormatId)
			: editorSave.metadata.formatId;

	return {
		...sourceBackendSave,
		version: editorSave.version,
		expansion_type: editorSave.expansionType,
		character: {
			...sourceBackendSave.character,
			name: editorSave.character.name,
			class: toBackendEnum(editorSave.character.className) as BackendClassId,
			level: editorSave.character.level,
			progression: editorSave.character.progression,
			act: editorSave.character.act,
			difficulty: editorSave.character.difficulty,
			map_seed: editorSave.character.mapSeed,
			last_played: editorSave.character.lastPlayed,
			status: {
				...sourceBackendSave.character.status,
				hardcore: editorSave.character.status.hardcore,
				ladder: editorSave.character.status.ladder,
				died: editorSave.character.status.died,
				expansion: editorSave.character.status.expansion,
			},
			mercenary: {
				...sourceBackendSave.character.mercenary,
				id: editorSave.character.mercenary.id,
				is_dead: editorSave.character.mercenary.isDead,
				variant_id: editorSave.character.mercenary.variantId,
				experience: editorSave.character.mercenary.experience,
				name_id: editorSave.character.mercenary.nameId,
			},
		},
		quests: toBackendQuests(editorSave.quests),
		waypoints: toBackendWaypoints(editorSave.waypoints),
		npcs: editorSave.npcs,
		attributes: toBackendAttributes(editorSave.attributes),
		skills: toBackendSkillPointList(editorSave.skills),
		items: editorSave.items,
		meta: {
			format: toBackendEnum(formatId) as BackendFormatId,
		},
	};
}