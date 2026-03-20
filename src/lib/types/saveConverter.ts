import { ACT_NAMES, DIFFICULTY_NAMES } from "$lib/types/editor";

import type {
	Difficulty,
	EditorSave,
	EncodableSaveFormatId,
	QuestFlag,
	QuestId,
	SaveLayoutVersion,
} from "$lib/types/editor";
import type {
	BackendAct,
	BackendCharacter,
	BackendDifficulty,
	BackendEditorSave,
	BackendEnumValue,
	BackendQuestState,
} from "$lib/types/backend";

function toEditorEnum<KnownValue extends string>(
	value: BackendEnumValue<KnownValue>,
): KnownValue | `Unknown(${number})` {
	if (typeof value === "string") {
		return value;
	}

	return `Unknown(${value.Unknown})`;
}

function toBackendEnum<KnownValue extends string>(
	value: KnownValue | `Unknown(${number})`,
): BackendEnumValue<KnownValue> {
	if (!value.startsWith("Unknown(")) {
		return value as KnownValue;
	}

	return {
		Unknown: Number(value.slice(8, -1)),
	};
}

function toEditorAttributes(
	backendAttributes: BackendEditorSave["attributes"],
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
): BackendEditorSave["attributes"] {
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
	) as BackendEditorSave["attributes"];
}

function toEditorCharacter(backendCharacter: BackendCharacter): EditorSave["character"] {
	return {
		name: backendCharacter.name,
		className: toEditorEnum(backendCharacter.class),
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
	backendQuestStates: Record<QuestId, BackendQuestState>,
): Record<QuestId, { flags: QuestFlag[] }> {
	return Object.fromEntries(
		Object.entries(backendQuestStates).map(([questId, questState]) => [
			questId,
			{ flags: [...questState.state] },
		]),
	) as Record<QuestId, { flags: QuestFlag[] }>;
}

function toBackendQuestStates(
	questStates: Record<QuestId, { flags: QuestFlag[] }>,
): Record<QuestId, BackendQuestState> {
	return Object.fromEntries(
		Object.entries(questStates).map(([questId, questState]) => [
			questId,
			{ state: [...questState.flags] },
		]),
	) as Record<QuestId, BackendQuestState>;
}

function toEditorQuests(backendQuests: BackendEditorSave["quests"]): EditorSave["quests"] {
	const quests = {} as EditorSave["quests"];

	for (const difficulty of DIFFICULTY_NAMES) {
		const backendDifficulty = difficulty.toLowerCase() as BackendDifficulty;
		quests[difficulty] = {} as EditorSave["quests"][Difficulty];

		for (const act of ACT_NAMES) {
			const backendAct = act.toLowerCase() as BackendAct;
			quests[difficulty][act] = toEditorQuestStates(
				backendQuests[backendDifficulty][backendAct],
			);
		}
	}

	return quests;
}

function toBackendQuests(editorQuests: EditorSave["quests"]): BackendEditorSave["quests"] {
	const quests = {} as BackendEditorSave["quests"];

	for (const difficulty of DIFFICULTY_NAMES) {
		const backendDifficulty = difficulty.toLowerCase() as BackendDifficulty;
		quests[backendDifficulty] = {} as BackendEditorSave["quests"][BackendDifficulty];

		for (const act of ACT_NAMES) {
			const backendAct = act.toLowerCase() as BackendAct;
			quests[backendDifficulty][backendAct] = toBackendQuestStates(
				editorQuests[difficulty][act],
			);
		}
	}

	return quests;
}

function toEditorWaypoints(
	backendWaypoints: BackendEditorSave["waypoints"],
): EditorSave["waypoints"] {
	const waypoints = {} as EditorSave["waypoints"];

	for (const difficulty of DIFFICULTY_NAMES) {
		const backendDifficulty = difficulty.toLowerCase() as BackendDifficulty;
		waypoints[difficulty] = {} as EditorSave["waypoints"][Difficulty];

		for (const act of ACT_NAMES) {
			const backendAct = act.toLowerCase() as BackendAct;
			const backendWaypointGroup = backendWaypoints[backendDifficulty][backendAct];

			waypoints[difficulty][act] = {
				act,
				waypoints: backendWaypointGroup.waypoints.map((waypoint) => ({
					id: waypoint.id,
					acquired: waypoint.acquired,
				})),
			};
		}
	}

	return waypoints;
}

function toBackendWaypoints(
	editorWaypoints: EditorSave["waypoints"],
): BackendEditorSave["waypoints"] {
	const waypoints = {} as BackendEditorSave["waypoints"];

	for (const difficulty of DIFFICULTY_NAMES) {
		const backendDifficulty = difficulty.toLowerCase() as BackendDifficulty;
		waypoints[backendDifficulty] =
			{} as BackendEditorSave["waypoints"][BackendDifficulty];

		for (const act of ACT_NAMES) {
			const backendAct = act.toLowerCase() as BackendAct;
			const editorWaypointGroup = editorWaypoints[difficulty][act];

			waypoints[backendDifficulty][backendAct] = {
				act,
				waypoints: editorWaypointGroup.waypoints.map((waypoint) => ({
					id: waypoint.id,
					acquired: waypoint.acquired,
				})),
			};
		}
	}

	return waypoints;
}

export function toEditorSave(backendSave: BackendEditorSave): EditorSave {
	return {
		version: backendSave.version,
		expansionType: backendSave.expansion_type,
		character: toEditorCharacter(backendSave.character),
		quests: toEditorQuests(backendSave.quests),
		waypoints: toEditorWaypoints(backendSave.waypoints),
		npcs: backendSave.npcs,
		attributes: toEditorAttributes(backendSave.attributes),
		skills: backendSave.skills.points.map((points, index) => ({
			id: index,
			points,
		})),
		items: backendSave.items,
		metadata: {
			formatId: toEditorEnum(backendSave.meta.format),
		},
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
			class: toBackendEnum(editorSave.character.className),
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
		skills: {
			points: editorSave.skills.map((skill) => skill.points),
		},
		items: editorSave.items,
		meta: {
			format: toBackendEnum(formatId),
		},
	};
}
