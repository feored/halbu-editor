import { getAttributeLabel } from "$lib/editor/editorMetadata";
import actQuestDisplays from "$lib/editor/quests/actquests.json";
import {
	ACT_NAMES,
	ATTRIBUTES,
	DIFFICULTY_NAMES,
	type Act,
	type Difficulty,
	type EditorSave,
} from "$lib/types/editor";
import {
	RESOURCE_Q8_SCALE,
	fixedPointToDisplay,
	formatDisplayNumber,
} from "$lib/utils/numbers";

export type Change = {
	label: string;
	before: string;
	after: string;
};

export type ChangeGroup = {
	section: string;
	changes: Change[];
};

export type ChangeReview = {
	totalChanges: number;
	groups: ChangeGroup[];
};

type QuestDisplay = {
	id: string;
	display: string;
};

type ActDisplay = {
	id: string;
	display: string;
	quests: QuestDisplay[];
};

const q8Attributes = new Set([
	"hitpoints",
	"maxhp",
	"mana",
	"maxmana",
	"stamina",
	"maxstamina",
]);

const actLabelsById: Record<string, string> = {};
const questLabelsByAct: Record<string, Record<string, string>> = {};
const questOrderByAct: Record<string, Record<string, number>> = {};

for (const act of actQuestDisplays as ActDisplay[]) {
	actLabelsById[act.id] = act.display;
	questLabelsByAct[act.id] = {};
	questOrderByAct[act.id] = {};

	for (let index = 0; index < act.quests.length; index += 1) {
		const quest = act.quests[index];
		questLabelsByAct[act.id][quest.id] = quest.display;
		questOrderByAct[act.id][quest.id] = index;
	}
}

function formatValue(value: unknown): string {
	if (value === null) {
		return "null";
	}

	if (value === undefined) {
		return "Missing";
	}

	if (typeof value === "boolean") {
		return value ? "True" : "False";
	}

	if (typeof value === "string") {
		return value.length > 0 ? value : '""';
	}

	return String(value);
}

function formatList(values: readonly string[] | readonly number[]): string {
	return values.length > 0 ? values.join(", ") : "None";
}

function formatWaypointState(acquired: boolean): string {
	return acquired ? "Acquired" : "Not acquired";
}

function formatSkillSlot(slot: { id: number; points: number }): string {
	return `Skill ${slot.id}, ${slot.points} point(s)`;
}

function formatAttributeValue(attributeId: string, value: number): string {
	if (!q8Attributes.has(attributeId)) {
		return String(value);
	}

	return formatDisplayNumber(fixedPointToDisplay(value, RESOURCE_Q8_SCALE));
}

function formatWaypointId(waypointId: string): string {
	return waypointId.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function formatProgressLabel(
	difficulty: Difficulty,
	act: Act,
	entryLabel: string,
): string {
	return `${difficulty} / ${actLabelsById[act] ?? act} / ${entryLabel}`;
}

function sameList<T>(left: readonly T[], right: readonly T[]): boolean {
	if (left.length !== right.length) {
		return false;
	}

	for (let index = 0; index < left.length; index += 1) {
		if (left[index] !== right[index]) {
			return false;
		}
	}

	return true;
}

function pushChange(
	changes: Change[],
	label: string,
	beforeValue: unknown,
	afterValue: unknown,
): void {
	if (Object.is(beforeValue, afterValue)) {
		return;
	}

	changes.push({
		label,
		before: formatValue(beforeValue),
		after: formatValue(afterValue),
	});
}

function pushFormattedChange(
	changes: Change[],
	label: string,
	before: string,
	after: string,
): void {
	if (before === after) {
		return;
	}

	changes.push({ label, before, after });
}

function pushByteChange(
	changes: Change[],
	label: string,
	beforeBytes: readonly number[],
	afterBytes: readonly number[],
): void {
	let changedBytes = 0;
	const maxLength = Math.max(beforeBytes.length, afterBytes.length);

	for (let index = 0; index < maxLength; index += 1) {
		if (beforeBytes[index] !== afterBytes[index]) {
			changedBytes += 1;
		}
	}

	if (changedBytes < 1) {
		return;
	}

	changes.push({
		label,
		before: `${beforeBytes.length} byte(s)`,
		after: `${afterBytes.length} byte(s), ${changedBytes} changed`,
	});
}

function getOrderedQuestIds(
	act: Act,
	beforeQuests: Record<string, { flags: string[] }>,
	afterQuests: Record<string, { flags: string[] }>,
): string[] {
	const ids = new Set<string>([...Object.keys(beforeQuests), ...Object.keys(afterQuests)]);

	return [...ids].sort((left, right) => {
		const leftIndex = questOrderByAct[act]?.[left] ?? Number.MAX_SAFE_INTEGER;
		const rightIndex = questOrderByAct[act]?.[right] ?? Number.MAX_SAFE_INTEGER;

		if (leftIndex !== rightIndex) {
			return leftIndex - rightIndex;
		}

		return left.localeCompare(right);
	});
}

function getSaveChanges(beforeSave: EditorSave, afterSave: EditorSave): Change[] {
	const changes: Change[] = [];

	pushChange(changes, "Version", beforeSave.version, afterSave.version);
	pushChange(changes, "Expansion Mode", beforeSave.expansionType, afterSave.expansionType);
	pushChange(
		changes,
		"Format ID",
		beforeSave.metadata.formatId,
		afterSave.metadata.formatId,
	);

	return changes;
}

function getCharacterChanges(beforeSave: EditorSave, afterSave: EditorSave): Change[] {
	const changes: Change[] = [];
	const before = beforeSave.character;
	const after = afterSave.character;

	pushChange(changes, "Name", before.name, after.name);
	pushChange(changes, "Class", before.className, after.className);
	pushChange(changes, "Level", before.level, after.level);
	pushChange(changes, "Difficulty", before.difficulty, after.difficulty);
	pushChange(changes, "Act", before.act, after.act);
	pushChange(changes, "Map Seed", before.mapSeed, after.mapSeed);
	pushChange(changes, "Last Played", before.lastPlayed, after.lastPlayed);
	pushChange(changes, "Progression", before.progression, after.progression);
	pushChange(changes, "Hardcore", before.status.hardcore, after.status.hardcore);
	pushChange(changes, "Ladder", before.status.ladder, after.status.ladder);
	pushChange(changes, "Died", before.status.died, after.status.died);
	pushChange(changes, "Expansion Flag", before.status.expansion, after.status.expansion);

	return changes;
}

function getMercenaryChanges(beforeSave: EditorSave, afterSave: EditorSave): Change[] {
	const changes: Change[] = [];
	const before = beforeSave.character.mercenary;
	const after = afterSave.character.mercenary;

	pushChange(changes, "ID", before.id, after.id);
	pushChange(changes, "Dead", before.isDead, after.isDead);
	pushChange(changes, "Variant", before.variantId, after.variantId);
	pushChange(changes, "Experience", before.experience, after.experience);
	pushChange(changes, "Name Index", before.nameId, after.nameId);

	return changes;
}

function getAttributeChanges(beforeSave: EditorSave, afterSave: EditorSave): Change[] {
	const changes: Change[] = [];

	for (const attributeId of ATTRIBUTES) {
		pushFormattedChange(
			changes,
			getAttributeLabel(attributeId),
			formatAttributeValue(attributeId, beforeSave.attributes[attributeId].value),
			formatAttributeValue(attributeId, afterSave.attributes[attributeId].value),
		);
	}

	return changes;
}

function getSkillChanges(beforeSave: EditorSave, afterSave: EditorSave): Change[] {
	const changes: Change[] = [];
	const beforeSkills = beforeSave.skills;
	const afterSkills = afterSave.skills;

	if (beforeSkills.length !== afterSkills.length) {
		changes.push({
			label: "Skill Slot Count",
			before: String(beforeSkills.length),
			after: String(afterSkills.length),
		});
	}

	const maxLength = Math.max(beforeSkills.length, afterSkills.length);
	for (let index = 0; index < maxLength; index += 1) {
		const before = beforeSkills[index] ?? null;
		const after = afterSkills[index] ?? null;
		const label = `Slot #${index + 1}`;

		if (before == null && after != null) {
			changes.push({
				label: `${label} Added`,
				before: "None",
				after: formatSkillSlot(after),
			});
			continue;
		}

		if (before != null && after == null) {
			changes.push({
				label: `${label} Removed`,
				before: formatSkillSlot(before),
				after: "None",
			});
			continue;
		}

		if (before == null || after == null) {
			continue;
		}

		pushChange(changes, `${label} Skill ID`, before.id, after.id);
		pushChange(changes, `${label} Points (Skill ${after.id})`, before.points, after.points);
	}

	return changes;
}

function getQuestChanges(beforeSave: EditorSave, afterSave: EditorSave): Change[] {
	const changes: Change[] = [];

	for (const difficulty of DIFFICULTY_NAMES) {
		for (const act of ACT_NAMES) {
			const beforeQuests = beforeSave.quests[difficulty][act];
			const afterQuests = afterSave.quests[difficulty][act];

			for (const questId of getOrderedQuestIds(act, beforeQuests, afterQuests)) {
				const beforeFlags = beforeQuests[questId]?.flags ?? [];
				const afterFlags = afterQuests[questId]?.flags ?? [];

				if (sameList(beforeFlags, afterFlags)) {
					continue;
				}

				changes.push({
					label: formatProgressLabel(
						difficulty,
						act,
						questLabelsByAct[act]?.[questId] ?? questId,
					),
					before: formatList(beforeFlags),
					after: formatList(afterFlags),
				});
			}
		}
	}

	return changes;
}

function getWaypointChanges(beforeSave: EditorSave, afterSave: EditorSave): Change[] {
	const changes: Change[] = [];

	for (const difficulty of DIFFICULTY_NAMES) {
		for (const act of ACT_NAMES) {
			const beforeWaypoints = new Map(
				beforeSave.waypoints[difficulty][act].waypoints.map((waypoint) => [
					waypoint.id,
					waypoint,
				]),
			);
			const afterWaypoints = new Map(
				afterSave.waypoints[difficulty][act].waypoints.map((waypoint) => [
					waypoint.id,
					waypoint,
				]),
			);
			const ids = new Set<string>([...beforeWaypoints.keys(), ...afterWaypoints.keys()]);

			for (const waypointId of ids) {
				const before = beforeWaypoints.get(waypointId) ?? null;
				const after = afterWaypoints.get(waypointId) ?? null;
				const label = formatProgressLabel(
					difficulty,
					act,
					formatWaypointId(waypointId),
				);

				if (before == null && after != null) {
					changes.push({
						label,
						before: "Missing",
						after: formatWaypointState(after.acquired),
					});
					continue;
				}

				if (before != null && after == null) {
					changes.push({
						label,
						before: formatWaypointState(before.acquired),
						after: "Missing",
					});
					continue;
				}

				if (before == null || after == null || before.acquired === after.acquired) {
					continue;
				}

				changes.push({
					label,
					before: formatWaypointState(before.acquired),
					after: formatWaypointState(after.acquired),
				});
			}
		}
	}

	return changes;
}

function getRawDataChanges(beforeSave: EditorSave, afterSave: EditorSave): Change[] {
	const changes: Change[] = [];

	pushByteChange(changes, "Item Data", beforeSave.items.data, afterSave.items.data);
	pushByteChange(changes, "NPC Data", beforeSave.npcs.data, afterSave.npcs.data);

	return changes;
}

export function getChangeReview(beforeSave: EditorSave, afterSave: EditorSave): ChangeReview {
	const groups: ChangeGroup[] = [];

	let changes = getSaveChanges(beforeSave, afterSave);
	if (changes.length > 0) {
		groups.push({ section: "Save", changes });
	}

	changes = getCharacterChanges(beforeSave, afterSave);
	if (changes.length > 0) {
		groups.push({ section: "Character", changes });
	}

	changes = getMercenaryChanges(beforeSave, afterSave);
	if (changes.length > 0) {
		groups.push({ section: "Mercenary", changes });
	}

	changes = getAttributeChanges(beforeSave, afterSave);
	if (changes.length > 0) {
		groups.push({ section: "Attributes", changes });
	}

	changes = getSkillChanges(beforeSave, afterSave);
	if (changes.length > 0) {
		groups.push({ section: "Skills", changes });
	}

	changes = getQuestChanges(beforeSave, afterSave);
	if (changes.length > 0) {
		groups.push({ section: "Quests", changes });
	}

	changes = getWaypointChanges(beforeSave, afterSave);
	if (changes.length > 0) {
		groups.push({ section: "Waypoints", changes });
	}

	changes = getRawDataChanges(beforeSave, afterSave);
	if (changes.length > 0) {
		groups.push({ section: "Raw Data", changes });
	}

	return {
		totalChanges: groups.reduce((sum, group) => sum + group.changes.length, 0),
		groups,
	};
}
