import actQuestDefinitions from "../quests/actquests.json";
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

const QUEST_ORDER_INDEX = new Map<string, number>(
	QUEST_ORDER.map((questId, index) => [questId, index]),
);

const ACT_LABELS_BY_ID: Record<string, string> = {};
const QUEST_LABELS_BY_ACT_ID: Record<string, Record<string, string>> = {};

for (const actDefinition of actQuestDefinitions as ActDefinition[]) {
	ACT_LABELS_BY_ID[actDefinition.id] = actDefinition.display;
	const questLabels: Record<string, string> = {};
	for (const questDefinition of actDefinition.quests) {
		questLabels[questDefinition.id] = questDefinition.display;
	}
	QUEST_LABELS_BY_ACT_ID[actDefinition.id] = questLabels;
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

function formatNumberList(values: readonly number[]): string {
	return values.length > 0 ? values.join(", ") : "None";
}

function formatFlagList(flags: readonly string[]): string {
	return flags.length > 0 ? flags.join(", ") : "None";
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
	const sameLength = before.length === after.length;
	const allEqual = sameLength && before.every((value, index) => value === after[index]);
	if (allEqual) {
		return;
	}
	changes.push({
		label,
		before: formatNumberList(before),
		after: formatNumberList(after),
	});
}

function countChangedEntries(before: readonly number[], after: readonly number[]): number {
	const maxLength = Math.max(before.length, after.length);
	let changedEntries = 0;
	for (let index = 0; index < maxLength; index += 1) {
		if (before[index] !== after[index]) {
			changedEntries += 1;
		}
	}
	return changedEntries;
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

function buildSaveSectionChanges(
	originalSave: EditorSave,
	currentSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];
	pushChange(changes, "Version", originalSave.version, currentSave.version);
	pushChange(
		changes,
		"Expansion Mode",
		originalSave.expansion_type,
		currentSave.expansion_type,
	);
	pushChange(
		changes,
		"Format ID",
		originalSave.meta.format,
		currentSave.meta.format,
	);
	return changes;
}

function buildCharacterSectionChanges(
	originalSave: EditorSave,
	currentSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];
	const originalCharacter = originalSave.character;
	const currentCharacter = currentSave.character;

	pushChange(changes, "Name", originalCharacter.name, currentCharacter.name);
	pushChange(changes, "Class", originalCharacter.class, currentCharacter.class);
	pushChange(changes, "Level", originalCharacter.level, currentCharacter.level);
	pushChange(changes, "Difficulty", originalCharacter.difficulty, currentCharacter.difficulty);
	pushChange(changes, "Act", originalCharacter.act, currentCharacter.act);
	pushChange(changes, "Map Seed", originalCharacter.map_seed, currentCharacter.map_seed);
	pushChange(
		changes,
		"Last Played",
		originalCharacter.last_played,
		currentCharacter.last_played,
	);
	pushChange(
		changes,
		"Progression",
		originalCharacter.progression,
		currentCharacter.progression,
	);
	pushChange(
		changes,
		"Weapon Switch",
		originalCharacter.weapon_switch,
		currentCharacter.weapon_switch,
	);
	pushChange(
		changes,
		"Left Mouse Skill",
		originalCharacter.left_mouse_skill,
		currentCharacter.left_mouse_skill,
	);
	pushChange(
		changes,
		"Right Mouse Skill",
		originalCharacter.right_mouse_skill,
		currentCharacter.right_mouse_skill,
	);
	pushChange(
		changes,
		"Left Mouse Skill (Swap)",
		originalCharacter.left_mouse_switch_skill,
		currentCharacter.left_mouse_switch_skill,
	);
	pushChange(
		changes,
		"Right Mouse Skill (Swap)",
		originalCharacter.right_mouse_switch_skill,
		currentCharacter.right_mouse_switch_skill,
	);
	pushChange(
		changes,
		"Hardcore",
		originalCharacter.status.hardcore,
		currentCharacter.status.hardcore,
	);
	pushChange(
		changes,
		"Ladder",
		originalCharacter.status.ladder,
		currentCharacter.status.ladder,
	);
	pushChange(changes, "Died", originalCharacter.status.died, currentCharacter.status.died);
	pushChange(
		changes,
		"Expansion Flag",
		originalCharacter.status.expansion,
		currentCharacter.status.expansion,
	);

	pushListChange(
		changes,
		"Assigned Skills",
		originalCharacter.assigned_skills,
		currentCharacter.assigned_skills,
	);
	pushListChange(
		changes,
		"Menu Appearance",
		originalCharacter.menu_appearance,
		currentCharacter.menu_appearance,
	);
	pushListChange(
		changes,
		"Resurrected Menu Appearance",
		originalCharacter.resurrected_menu_appearance,
		currentCharacter.resurrected_menu_appearance,
	);
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
	pushChange(
		changes,
		"Experience",
		originalMercenary.experience,
		currentMercenary.experience,
	);
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
		pushChange(
			changes,
			label,
			originalSave.attributes[attributeId].value,
			currentSave.attributes[attributeId].value,
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
				after: `Skill ${currentSlot.id}, ${currentSlot.points} point(s)`,
			});
			continue;
		}

		if (originalSlot != null && currentSlot == null) {
			changes.push({
				label: `${slotLabel} Removed`,
				before: `Skill ${originalSlot.id}, ${originalSlot.points} point(s)`,
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
				const sameLength = originalState.length === currentState.length;
				const sameState =
					sameLength && originalState.every((flag, index) => flag === currentState[index]);
				if (sameState) {
					continue;
				}
				const label = `${DIFFICULTY_LABELS[difficultyId]} / ${ACT_LABELS_BY_ID[actId] ?? actId} / ${questLabel(actId, questId)}`;
				changes.push({
					label,
					before: formatFlagList(originalState),
					after: formatFlagList(currentState),
				});
			}
		}
	}

	return changes;
}

function toWaypointMap(waypoints: readonly EditorWaypoint[]): Map<string, EditorWaypoint> {
	const result = new Map<string, EditorWaypoint>();
	for (const waypoint of waypoints) {
		result.set(waypoint.id, waypoint);
	}
	return result;
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
			const waypointIds = new Set<string>([
				...originalById.keys(),
				...currentById.keys(),
			]);

			for (const waypointId of waypointIds) {
				const originalWaypoint = originalById.get(waypointId) ?? null;
				const currentWaypoint = currentById.get(waypointId) ?? null;
				const waypointName =
					currentWaypoint?.name ?? originalWaypoint?.name ?? waypointId;
				const label = `${DIFFICULTY_LABELS[difficultyId]} / ${ACT_LABELS_BY_ID[actId] ?? actId} / ${waypointName}`;

				if (originalWaypoint == null && currentWaypoint != null) {
					changes.push({
						label,
						before: "Missing",
						after: currentWaypoint.acquired ? "Acquired" : "Not acquired",
					});
					continue;
				}

				if (originalWaypoint != null && currentWaypoint == null) {
					changes.push({
						label,
						before: originalWaypoint.acquired ? "Acquired" : "Not acquired",
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
						before: originalWaypoint.acquired ? "Acquired" : "Not acquired",
						after: currentWaypoint.acquired ? "Acquired" : "Not acquired",
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
	const sectionBuilders: Array<[string, (original: EditorSave, current: EditorSave) => ChangeReviewEntry[]]> = [
		["Save", buildSaveSectionChanges],
		["Character", buildCharacterSectionChanges],
		["Mercenary", buildMercenarySectionChanges],
		["Attributes", buildAttributeSectionChanges],
		["Skills", buildSkillSectionChanges],
		["Quests", buildQuestSectionChanges],
		["Waypoints", buildWaypointSectionChanges],
		["Raw Data", buildRawDataSectionChanges],
	];

	for (const [sectionName, buildSectionChanges] of sectionBuilders) {
		const sectionGroup = buildGroup(sectionName, buildSectionChanges(originalSave, currentSave));
		if (sectionGroup != null) {
			groups.push(sectionGroup);
		}
	}

	const totalChanges = groups.reduce((sum, group) => sum + group.changes.length, 0);
	return {
		totalChanges,
		groups,
	};
}
