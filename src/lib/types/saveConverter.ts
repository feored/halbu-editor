import type {
	Act,
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

const DIFFICULTIES = [
	{ editor: "Normal", backend: "normal" },
	{ editor: "Nightmare", backend: "nightmare" },
	{ editor: "Hell", backend: "hell" },
] as const satisfies readonly { editor: Difficulty; backend: BackendDifficulty }[];

const ACTS = [
	{ editor: "Act1", backend: "act1" },
	{ editor: "Act2", backend: "act2" },
	{ editor: "Act3", backend: "act3" },
	{ editor: "Act4", backend: "act4" },
	{ editor: "Act5", backend: "act5" },
] as const satisfies readonly { editor: Act; backend: BackendAct }[];

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

	for (const difficulty of DIFFICULTIES) {
		quests[difficulty.editor] = {} as EditorSave["quests"][Difficulty];

		for (const act of ACTS) {
			quests[difficulty.editor][act.editor] = toEditorQuestStates(
				backendQuests[difficulty.backend][act.backend],
			);
		}
	}

	return quests;
}

function toBackendQuests(editorQuests: EditorSave["quests"]): BackendEditorSave["quests"] {
	const quests = {} as BackendEditorSave["quests"];

	for (const difficulty of DIFFICULTIES) {
		quests[difficulty.backend] = {} as BackendEditorSave["quests"][BackendDifficulty];

		for (const act of ACTS) {
			quests[difficulty.backend][act.backend] = toBackendQuestStates(
				editorQuests[difficulty.editor][act.editor],
			);
		}
	}

	return quests;
}

function toEditorWaypoints(
	backendWaypoints: BackendEditorSave["waypoints"],
): EditorSave["waypoints"] {
	const waypoints = {} as EditorSave["waypoints"];

	for (const difficulty of DIFFICULTIES) {
		waypoints[difficulty.editor] = {} as EditorSave["waypoints"][Difficulty];

		for (const act of ACTS) {
			const backendWaypointGroup = backendWaypoints[difficulty.backend][act.backend];

			waypoints[difficulty.editor][act.editor] = {
				act: act.editor,
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

	for (const difficulty of DIFFICULTIES) {
		waypoints[difficulty.backend] =
			{} as BackendEditorSave["waypoints"][BackendDifficulty];

		for (const act of ACTS) {
			const editorWaypointGroup = editorWaypoints[difficulty.editor][act.editor];

			waypoints[difficulty.backend][act.backend] = {
				act: act.editor,
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

	const save = JSON.parse(JSON.stringify(sourceBackendSave)) as BackendEditorSave;
	save.version = editorSave.version;
	save.expansion_type = editorSave.expansionType;
	save.character.name = editorSave.character.name;
	save.character.class = toBackendEnum(editorSave.character.className);
	save.character.level = editorSave.character.level;
	save.character.progression = editorSave.character.progression;
	save.character.act = editorSave.character.act;
	save.character.difficulty = editorSave.character.difficulty;
	save.character.map_seed = editorSave.character.mapSeed;
	save.character.last_played = editorSave.character.lastPlayed;
	save.character.status.hardcore = editorSave.character.status.hardcore;
	save.character.status.ladder = editorSave.character.status.ladder;
	save.character.status.died = editorSave.character.status.died;
	save.character.status.expansion = editorSave.character.status.expansion;
	save.character.mercenary.id = editorSave.character.mercenary.id;
	save.character.mercenary.is_dead = editorSave.character.mercenary.isDead;
	save.character.mercenary.variant_id = editorSave.character.mercenary.variantId;
	save.character.mercenary.experience = editorSave.character.mercenary.experience;
	save.character.mercenary.name_id = editorSave.character.mercenary.nameId;
	save.quests = toBackendQuests(editorSave.quests);
	save.waypoints = toBackendWaypoints(editorSave.waypoints);
	save.npcs = JSON.parse(JSON.stringify(editorSave.npcs));
	save.attributes = toBackendAttributes(editorSave.attributes);
	save.skills.points = editorSave.skills.map((skill) => skill.points);
	save.items = JSON.parse(JSON.stringify(editorSave.items));
	save.meta.format = toBackendEnum(formatId);
	return save;
}
