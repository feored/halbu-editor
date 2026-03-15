import actQuestDefinitions from "../quests/actquests.json";
import {
	RESOURCE_Q8_SCALE,
	fixedPointToDisplay,
	formatDisplayNumber,
} from "../../utils/resources.js";
import {
	REQUIRED_EDITOR_ATTRIBUTE_IDS,
	type ActId,
	type DifficultyId,
	type EditorQuest,
	type EditorSave,
	type EditorWaypoint,
	type QuestId,
} from "../../types/editor";

export type ChangeReviewEntry = {
	label: string;
	before: string;
	after: string;
};

export type ChangeReviewGroup = {
	section: string;
	changes: ChangeReviewEntry[];
};

export type ChangeReview = {
	totalChanges: number;
	groups: ChangeReviewGroup[];
};

type QuestDefinition = {
	id: string;
	display: string;
};

type ActDefinition = {
	id: string;
	display: string;
	quests: QuestDefinition[];
};

type SectionBuilder = (originalSave: EditorSave, currentSave: EditorSave) => ChangeReviewEntry[];
type CharacterFieldKey = keyof EditorSave["character"];
type CharacterStatusKey = keyof EditorSave["character"]["status"];
type CharacterNumberListFieldKey =
	| "assigned_skills"
	| "menu_appearance"
	| "resurrected_menu_appearance";

type CharacterFieldConfig = {
	label: string;
	key: CharacterFieldKey;
};

type CharacterStatusFieldConfig = {
	label: string;
	key: CharacterStatusKey;
};

type CharacterListFieldConfig = {
	label: string;
	key: CharacterNumberListFieldKey;
};

const DIFFICULTY_ORDER: DifficultyId[] = ["normal", "nightmare", "hell"];
const ACT_ORDER: ActId[] = ["act1", "act2", "act3", "act4", "act5"];
const QUEST_ORDER: QuestId[] = [
	"prologue",
	"q1",
	"q2",
	"q3",
	"q4",
	"q5",
	"q6",
	"completion",
	"unused_1",
	"unused_2",
	"unused_3",
];

const DIFFICULTY_LABELS: Record<DifficultyId, string> = {
	normal: "Normal",
	nightmare: "Nightmare",
	hell: "Hell",
};

const ATTRIBUTE_LABELS: Record<string, string> = {
	statpts: "Stat Points",
	newskills: "Skill Points",
	experience: "Experience",
	level: "Level",
	gold: "Gold (Inventory)",
	goldbank: "Gold (Stash)",
	strength: "Strength",
	dexterity: "Dexterity",
	vitality: "Vitality",
	energy: "Energy",
	hitpoints: "Life (Current)",
	maxhp: "Life (Base)",
	mana: "Mana (Current)",
	maxmana: "Mana (Base)",
	stamina: "Stamina (Current)",
	maxstamina: "Stamina (Base)",
};

const QUEST_FALLBACK_LABELS: Record<string, string> = {
	prologue: "Prologue",
	q1: "Quest 1",
	q2: "Quest 2",
	q3: "Quest 3",
	q4: "Quest 4",
	q5: "Quest 5",
	q6: "Quest 6",
	completion: "Act Completion",
	unused_1: "Unused Quest 1",
	unused_2: "Unused Quest 2",
	unused_3: "Unused Quest 3",
};

const Q8_ATTRIBUTE_IDS = new Set([
	"hitpoints",
	"maxhp",
	"mana",
	"maxmana",
	"stamina",
	"maxstamina",
]);

const QUEST_ORDER_INDEX = new Map<string, number>(
	QUEST_ORDER.map((questId, index) => [questId, index]),
);

const CHARACTER_FIELDS: CharacterFieldConfig[] = [
	{ label: "Name", key: "name" },
	{ label: "Class", key: "class" },
	{ label: "Level", key: "level" },
	{ label: "Difficulty", key: "difficulty" },
	{ label: "Act", key: "act" },
	{ label: "Map Seed", key: "map_seed" },
	{ label: "Last Played", key: "last_played" },
	{ label: "Progression", key: "progression" },
	{ label: "Weapon Switch", key: "weapon_switch" },
	{ label: "Left Mouse Skill", key: "left_mouse_skill" },
	{ label: "Right Mouse Skill", key: "right_mouse_skill" },
	{ label: "Left Mouse Skill (Swap)", key: "left_mouse_switch_skill" },
	{ label: "Right Mouse Skill (Swap)", key: "right_mouse_switch_skill" },
];

const CHARACTER_STATUS_FIELDS: CharacterStatusFieldConfig[] = [
	{ label: "Hardcore", key: "hardcore" },
	{ label: "Ladder", key: "ladder" },
	{ label: "Died", key: "died" },
	{ label: "Expansion Flag", key: "expansion" },
];

const CHARACTER_LIST_FIELDS: CharacterListFieldConfig[] = [
	{ label: "Assigned Skills", key: "assigned_skills" },
	{ label: "Menu Appearance", key: "menu_appearance" },
	{ label: "Resurrected Menu Appearance", key: "resurrected_menu_appearance" },
];

const WAYPOINT_ACQUIRED_LABEL = "Acquired";
const WAYPOINT_NOT_ACQUIRED_LABEL = "Not acquired";

const { actLabelsById: ACT_LABELS_BY_ID, questLabelsByActId: QUEST_LABELS_BY_ACT_ID } =
	buildQuestLabelMaps(actQuestDefinitions as ActDefinition[]);

const REVIEW_SECTIONS: Array<{ section: string; build: SectionBuilder }> = [
	{ section: "Save", build: buildSaveSectionChanges },
	{ section: "Character", build: buildCharacterSectionChanges },
	{ section: "Mercenary", build: buildMercenarySectionChanges },
	{ section: "Attributes", build: buildAttributeSectionChanges },
	{ section: "Skills", build: buildSkillSectionChanges },
	{ section: "Quests", build: buildQuestSectionChanges },
	{ section: "Waypoints", build: buildWaypointSectionChanges },
	{ section: "Raw Data", build: buildRawDataSectionChanges },
];

function buildQuestLabelMaps(actDefinitions: readonly ActDefinition[]): {
	actLabelsById: Record<string, string>;
	questLabelsByActId: Record<string, Record<string, string>>;
} {
	const actLabelsById: Record<string, string> = {};
	const questLabelsByActId: Record<string, Record<string, string>> = {};
	for (const actDefinition of actDefinitions) {
		actLabelsById[actDefinition.id] = actDefinition.display;
		const questLabels: Record<string, string> = {};
		for (const questDefinition of actDefinition.quests) {
			questLabels[questDefinition.id] = questDefinition.display;
		}
		questLabelsByActId[actDefinition.id] = questLabels;
	}
	return { actLabelsById, questLabelsByActId };
}

function formatValue(value: unknown): string {
	if (value === null) {
		return "null";
	}
	if (value === undefined) {
		return "∅";
	}
	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}
	if (typeof value === "string") {
		return value.length > 0 ? value : '""';
	}
	return String(value);
}

function formatList(values: readonly string[] | readonly number[]): string {
	return values.length > 0 ? values.join(", ") : "None";
}

function formatWaypointAcquiredState(acquired: boolean): string {
	return acquired ? WAYPOINT_ACQUIRED_LABEL : WAYPOINT_NOT_ACQUIRED_LABEL;
}

function formatSkillSlot(slot: { id: number; points: number }): string {
	return `Skill ${slot.id}, ${slot.points} point(s)`;
}

function listValuesEqual<T>(before: readonly T[], after: readonly T[]): boolean {
	if (before.length !== after.length) {
		return false;
	}
	return before.every((value, index) => value === after[index]);
}

function countChangedEntries<T>(before: readonly T[], after: readonly T[]): number {
	const maxLength = Math.max(before.length, after.length);
	let changedEntries = 0;
	for (let index = 0; index < maxLength; index += 1) {
		if (before[index] !== after[index]) {
			changedEntries += 1;
		}
	}
	return changedEntries;
}

function pushChange(
	changes: ChangeReviewEntry[],
	label: string,
	before: unknown,
	after: unknown,
): void {
	if (Object.is(before, after)) {
		return;
	}
	changes.push({
		label,
		before: formatValue(before),
		after: formatValue(after),
	});
}

function pushListChange(
	changes: ChangeReviewEntry[],
	label: string,
	before: readonly number[],
	after: readonly number[],
): void {
	if (listValuesEqual(before, after)) {
		return;
	}
	changes.push({
		label,
		before: formatList(before),
		after: formatList(after),
	});
}

function pushByteDataChange(
	changes: ChangeReviewEntry[],
	label: string,
	before: readonly number[],
	after: readonly number[],
): void {
	const changedEntries = countChangedEntries(before, after);
	if (changedEntries === 0) {
		return;
	}
	changes.push({
		label,
		before: `${before.length} byte(s)`,
		after: `${after.length} byte(s), ${changedEntries} changed`,
	});
}

function buildGroup(section: string, changes: ChangeReviewEntry[]): ChangeReviewGroup | null {
	if (changes.length < 1) {
		return null;
	}
	return { section, changes };
}

function buildProgressLabel(difficultyId: DifficultyId, actId: ActId, entryLabel: string): string {
	return `${DIFFICULTY_LABELS[difficultyId]} / ${ACT_LABELS_BY_ID[actId] ?? actId} / ${entryLabel}`;
}

function orderedQuestIds(
	originalActQuests: Record<string, EditorQuest>,
	currentActQuests: Record<string, EditorQuest>,
): string[] {
	const questIds = new Set<string>([
		...Object.keys(originalActQuests),
		...Object.keys(currentActQuests),
	]);
	return Array.from(questIds).sort((left, right) => {
		const leftIndex = QUEST_ORDER_INDEX.get(left) ?? Number.MAX_SAFE_INTEGER;
		const rightIndex = QUEST_ORDER_INDEX.get(right) ?? Number.MAX_SAFE_INTEGER;
		if (leftIndex !== rightIndex) {
			return leftIndex - rightIndex;
		}
		return left.localeCompare(right);
	});
}

function questLabel(actId: ActId, questId: string): string {
	const actQuestLabels = QUEST_LABELS_BY_ACT_ID[actId] ?? {};
	return actQuestLabels[questId] ?? QUEST_FALLBACK_LABELS[questId] ?? questId;
}

function toWaypointMap(waypoints: readonly EditorWaypoint[]): Map<string, EditorWaypoint> {
	const result = new Map<string, EditorWaypoint>();
	for (const waypoint of waypoints) {
		result.set(waypoint.id, waypoint);
	}
	return result;
}

function formatAttributeValueForReview(attributeId: string, rawValue: number): string | number {
	if (!Q8_ATTRIBUTE_IDS.has(attributeId)) {
		return rawValue;
	}
	return formatDisplayNumber(fixedPointToDisplay(rawValue, RESOURCE_Q8_SCALE));
}

function buildSaveSectionChanges(
	originalSave: EditorSave,
	currentSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];
	pushChange(changes, "Version", originalSave.version, currentSave.version);
	pushChange(changes, "Expansion Mode", originalSave.expansion_type, currentSave.expansion_type);
	pushChange(changes, "Format ID", originalSave.meta.format, currentSave.meta.format);
	return changes;
}

function buildCharacterSectionChanges(
	originalSave: EditorSave,
	currentSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];
	const originalCharacter = originalSave.character;
	const currentCharacter = currentSave.character;

	for (const field of CHARACTER_FIELDS) {
		pushChange(changes, field.label, originalCharacter[field.key], currentCharacter[field.key]);
	}

	for (const field of CHARACTER_STATUS_FIELDS) {
		pushChange(
			changes,
			field.label,
			originalCharacter.status[field.key],
			currentCharacter.status[field.key],
		);
	}

	for (const field of CHARACTER_LIST_FIELDS) {
		pushListChange(
			changes,
			field.label,
			originalCharacter[field.key],
			currentCharacter[field.key],
		);
	}

	pushByteDataChange(
		changes,
		"Raw Character Section",
		originalCharacter.raw_section,
		currentCharacter.raw_section,
	);

	return changes;
}

function buildMercenarySectionChanges(
	originalSave: EditorSave,
	currentSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];
	const originalMercenary = originalSave.character.mercenary;
	const currentMercenary = currentSave.character.mercenary;

	pushChange(changes, "ID", originalMercenary.id, currentMercenary.id);
	pushChange(changes, "Dead", originalMercenary.is_dead, currentMercenary.is_dead);
	pushChange(changes, "Variant", originalMercenary.variant_id, currentMercenary.variant_id);
	pushChange(changes, "Experience", originalMercenary.experience, currentMercenary.experience);
	pushChange(changes, "Name Index", originalMercenary.name_id, currentMercenary.name_id);

	return changes;
}

function buildAttributeSectionChanges(
	originalSave: EditorSave,
	currentSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];
	for (const attributeId of REQUIRED_EDITOR_ATTRIBUTE_IDS) {
		const label = ATTRIBUTE_LABELS[attributeId] ?? attributeId;
		const originalValue = originalSave.attributes[attributeId].value;
		const currentValue = currentSave.attributes[attributeId].value;
		pushChange(
			changes,
			label,
			formatAttributeValueForReview(attributeId, originalValue),
			formatAttributeValueForReview(attributeId, currentValue),
		);
	}
	return changes;
}

function buildSkillSectionChanges(
	originalSave: EditorSave,
	currentSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];
	const originalSkills = originalSave.skills;
	const currentSkills = currentSave.skills;

	if (originalSkills.length !== currentSkills.length) {
		changes.push({
			label: "Skill Slot Count",
			before: String(originalSkills.length),
			after: String(currentSkills.length),
		});
	}

	const maxLength = Math.max(originalSkills.length, currentSkills.length);
	for (let index = 0; index < maxLength; index += 1) {
		const originalSlot = originalSkills[index] ?? null;
		const currentSlot = currentSkills[index] ?? null;
		const slotLabel = `Slot #${index + 1}`;

		if (originalSlot == null && currentSlot != null) {
			changes.push({
				label: `${slotLabel} Added`,
				before: "None",
				after: formatSkillSlot(currentSlot),
			});
			continue;
		}

		if (originalSlot != null && currentSlot == null) {
			changes.push({
				label: `${slotLabel} Removed`,
				before: formatSkillSlot(originalSlot),
				after: "None",
			});
			continue;
		}

		if (originalSlot == null || currentSlot == null) {
			continue;
		}

		if (originalSlot.id !== currentSlot.id) {
			changes.push({
				label: `${slotLabel} Skill ID`,
				before: String(originalSlot.id),
				after: String(currentSlot.id),
			});
		}

		if (originalSlot.points !== currentSlot.points) {
			changes.push({
				label: `${slotLabel} Points (Skill ${currentSlot.id})`,
				before: String(originalSlot.points),
				after: String(currentSlot.points),
			});
		}
	}

	return changes;
}

function buildQuestSectionChanges(
	originalSave: EditorSave,
	currentSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];

	for (const difficultyId of DIFFICULTY_ORDER) {
		for (const actId of ACT_ORDER) {
			const originalActQuests = originalSave.quests[difficultyId][actId];
			const currentActQuests = currentSave.quests[difficultyId][actId];
			for (const questId of orderedQuestIds(originalActQuests, currentActQuests)) {
				const originalState = originalActQuests[questId]?.state ?? [];
				const currentState = currentActQuests[questId]?.state ?? [];
				if (listValuesEqual(originalState, currentState)) {
					continue;
				}
				changes.push({
					label: buildProgressLabel(difficultyId, actId, questLabel(actId, questId)),
					before: formatList(originalState),
					after: formatList(currentState),
				});
			}
		}
	}

	return changes;
}

function buildWaypointSectionChanges(
	originalSave: EditorSave,
	currentSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];

	for (const difficultyId of DIFFICULTY_ORDER) {
		for (const actId of ACT_ORDER) {
			const originalWaypoints = originalSave.waypoints[difficultyId][actId];
			const currentWaypoints = currentSave.waypoints[difficultyId][actId];
			const originalById = toWaypointMap(originalWaypoints);
			const currentById = toWaypointMap(currentWaypoints);
			const waypointIds = new Set<string>([...originalById.keys(), ...currentById.keys()]);

			for (const waypointId of waypointIds) {
				const originalWaypoint = originalById.get(waypointId) ?? null;
				const currentWaypoint = currentById.get(waypointId) ?? null;
				const waypointName = currentWaypoint?.name ?? originalWaypoint?.name ?? waypointId;
				const label = buildProgressLabel(difficultyId, actId, waypointName);

				if (originalWaypoint == null && currentWaypoint != null) {
					changes.push({
						label,
						before: "Missing",
						after: formatWaypointAcquiredState(currentWaypoint.acquired),
					});
					continue;
				}

				if (originalWaypoint != null && currentWaypoint == null) {
					changes.push({
						label,
						before: formatWaypointAcquiredState(originalWaypoint.acquired),
						after: "Missing",
					});
					continue;
				}

				if (originalWaypoint == null || currentWaypoint == null) {
					continue;
				}

				if (originalWaypoint.acquired !== currentWaypoint.acquired) {
					changes.push({
						label,
						before: formatWaypointAcquiredState(originalWaypoint.acquired),
						after: formatWaypointAcquiredState(currentWaypoint.acquired),
					});
				}
			}
		}
	}

	return changes;
}

function buildRawDataSectionChanges(
	originalSave: EditorSave,
	currentSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];
	pushByteDataChange(changes, "Item Data", originalSave.items.data, currentSave.items.data);
	pushByteDataChange(changes, "NPC Data", originalSave.npcs.data, currentSave.npcs.data);
	return changes;
}

export function buildChangeReview(
	originalSave: EditorSave | null,
	currentSave: EditorSave | null,
): ChangeReview {
	if (originalSave == null || currentSave == null) {
		return { totalChanges: 0, groups: [] };
	}

	const groups: ChangeReviewGroup[] = [];
	for (const { section, build } of REVIEW_SECTIONS) {
		const group = buildGroup(section, build(originalSave, currentSave));
		if (group != null) {
			groups.push(group);
		}
	}

	const totalChanges = groups.reduce((sum, group) => sum + group.changes.length, 0);
	return { totalChanges, groups };
}
