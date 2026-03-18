import actQuestDisplays from "$lib/editor/quests/actquests.json";
import {
	RESOURCE_Q8_SCALE,
	fixedPointToDisplay,
	formatDisplayNumber,
} from "$lib/utils/numbers";
import {
	ACT_NAMES,
	ATTRIBUTES,
	DIFFICULTY_NAMES,
	type Act,
	type Difficulty,
	type EditorSave,
} from "$lib/types/editor";
import { getAttributeLabel } from "$lib/editor/editorMetadata";

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

type QuestDisplay = {
	id: string;
	display: string;
};

type ActDisplay = {
	id: string;
	display: string;
	quests: QuestDisplay[];
};

type SectionBuilder = (beforeSave: EditorSave, afterSave: EditorSave) => ChangeReviewEntry[];

const Q8_ATTRIBUTE_NAMES = new Set([
	"hitpoints",
	"maxhp",
	"mana",
	"maxmana",
	"stamina",
	"maxstamina",
]);

const REVIEW_SECTIONS: Array<{ section: string; build: SectionBuilder }> = [
	{ section: "Save", build: buildSaveChanges },
	{ section: "Character", build: buildCharacterChanges },
	{ section: "Mercenary", build: buildMercenaryChanges },
	{ section: "Attributes", build: buildAttributeChanges },
	{ section: "Skills", build: buildSkillChanges },
	{ section: "Quests", build: buildQuestChanges },
	{ section: "Waypoints", build: buildWaypointChanges },
	{ section: "Raw Data", build: buildRawDataChanges },
];

const {
	actLabelsById,
	questLabelsByActId,
	questOrderIndexByActId,
} = buildQuestMaps(actQuestDisplays as ActDisplay[]);

function buildQuestMaps(actDefinitions: readonly ActDisplay[]): {
	actLabelsById: Record<string, string>;
	questLabelsByActId: Record<string, Record<string, string>>;
	questOrderIndexByActId: Record<string, Record<string, number>>;
} {
	const nextActLabelsById: Record<string, string> = {};
	const nextQuestLabelsByActId: Record<string, Record<string, string>> = {};
	const nextQuestOrderIndexByActId: Record<string, Record<string, number>> = {};

	for (const actDefinition of actDefinitions) {
		nextActLabelsById[actDefinition.id] = actDefinition.display;

		const questLabels: Record<string, string> = {};
		const questOrderIndex: Record<string, number> = {};

		for (let index = 0; index < actDefinition.quests.length; index += 1) {
			const questDisplay = actDefinition.quests[index];
			questLabels[questDisplay.id] = questDisplay.display;
			questOrderIndex[questDisplay.id] = index;
		}

		nextQuestLabelsByActId[actDefinition.id] = questLabels;
		nextQuestOrderIndexByActId[actDefinition.id] = questOrderIndex;
	}

	return {
		actLabelsById: nextActLabelsById,
		questLabelsByActId: nextQuestLabelsByActId,
		questOrderIndexByActId: nextQuestOrderIndexByActId,
	};
}

function formatValue(value: unknown): string {
	if (value === null) {
		return "null";
	}
	if (value === undefined) {
		return "∅";
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

function formatAttributeValue(attributeName: string, rawValue: number): string {
	if (!Q8_ATTRIBUTE_NAMES.has(attributeName)) {
		return String(rawValue);
	}
	return formatDisplayNumber(fixedPointToDisplay(rawValue, RESOURCE_Q8_SCALE));
}

function formatWaypointId(waypointId: string): string {
	return waypointId.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function getActLabel(act: Act): string {
	return actLabelsById[act] ?? act;
}

function formatProgressLabel(
	difficulty: Difficulty,
	act: Act,
	entryLabel: string,
): string {
	return `${difficulty} / ${getActLabel(act)} / ${entryLabel}`;
}

function listValuesEqual<T>(beforeValues: readonly T[], afterValues: readonly T[]): boolean {
	if (beforeValues.length !== afterValues.length) {
		return false;
	}

	for (let index = 0; index < beforeValues.length; index += 1) {
		if (beforeValues[index] !== afterValues[index]) {
			return false;
		}
	}

	return true;
}

function countChangedEntries<T>(beforeValues: readonly T[], afterValues: readonly T[]): number {
	const maxLength = Math.max(beforeValues.length, afterValues.length);
	let changedEntryCount = 0;

	for (let index = 0; index < maxLength; index += 1) {
		if (beforeValues[index] !== afterValues[index]) {
			changedEntryCount += 1;
		}
	}

	return changedEntryCount;
}

function pushValueChange(
	changes: ChangeReviewEntry[],
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
	changes: ChangeReviewEntry[],
	label: string,
	beforeText: string,
	afterText: string,
): void {
	if (beforeText === afterText) {
		return;
	}

	changes.push({
		label,
		before: beforeText,
		after: afterText,
	});
}

function pushByteDataChange(
	changes: ChangeReviewEntry[],
	label: string,
	beforeBytes: readonly number[],
	afterBytes: readonly number[],
): void {
	const changedEntryCount = countChangedEntries(beforeBytes, afterBytes);
	if (changedEntryCount < 1) {
		return;
	}

	changes.push({
		label,
		before: `${beforeBytes.length} byte(s)`,
		after: `${afterBytes.length} byte(s), ${changedEntryCount} changed`,
	});
}

function buildGroup(section: string, changes: ChangeReviewEntry[]): ChangeReviewGroup | null {
	if (changes.length < 1) {
		return null;
	}

	return {
		section,
		changes,
	};
}

function orderedQuestIds(
	act: Act,
	beforeActQuests: Record<string, { flags: string[] }>,
	afterActQuests: Record<string, { flags: string[] }>,
): string[] {
	const questIds = new Set<string>([
		...Object.keys(beforeActQuests),
		...Object.keys(afterActQuests),
	]);

	const questOrderIndex = questOrderIndexByActId[act] ?? {};

	return Array.from(questIds).sort((left, right) => {
		const leftIndex = questOrderIndex[left] ?? Number.MAX_SAFE_INTEGER;
		const rightIndex = questOrderIndex[right] ?? Number.MAX_SAFE_INTEGER;

		if (leftIndex !== rightIndex) {
			return leftIndex - rightIndex;
		}

		return left.localeCompare(right);
	});
}

function getQuestLabel(act: Act, questId: string): string {
	const labelsForAct = questLabelsByActId[act] ?? {};
	return labelsForAct[questId] ?? questId;
}

function buildSaveChanges(beforeSave: EditorSave, afterSave: EditorSave): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];

	pushValueChange(changes, "Version", beforeSave.version, afterSave.version);
	pushValueChange(
		changes,
		"Expansion Mode",
		beforeSave.expansionType,
		afterSave.expansionType,
	);
	pushValueChange(
		changes,
		"Format ID",
		beforeSave.metadata.formatId,
		afterSave.metadata.formatId,
	);

	return changes;
}

function buildCharacterChanges(
	beforeSave: EditorSave,
	afterSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];

	const beforeCharacter = beforeSave.character;
	const afterCharacter = afterSave.character;

	pushValueChange(changes, "Name", beforeCharacter.name, afterCharacter.name);
	pushValueChange(changes, "Class", beforeCharacter.className, afterCharacter.className);
	pushValueChange(changes, "Level", beforeCharacter.level, afterCharacter.level);
	pushValueChange(changes, "Difficulty", beforeCharacter.difficulty, afterCharacter.difficulty);
	pushValueChange(changes, "Act", beforeCharacter.act, afterCharacter.act);
	pushValueChange(changes, "Map Seed", beforeCharacter.mapSeed, afterCharacter.mapSeed);
	pushValueChange(changes, "Last Played", beforeCharacter.lastPlayed, afterCharacter.lastPlayed);
	pushValueChange(changes, "Progression", beforeCharacter.progression, afterCharacter.progression);

	pushValueChange(
		changes,
		"Hardcore",
		beforeCharacter.status.hardcore,
		afterCharacter.status.hardcore,
	);
	pushValueChange(
		changes,
		"Ladder",
		beforeCharacter.status.ladder,
		afterCharacter.status.ladder,
	);
	pushValueChange(
		changes,
		"Died",
		beforeCharacter.status.died,
		afterCharacter.status.died,
	);
	pushValueChange(
		changes,
		"Expansion Flag",
		beforeCharacter.status.expansion,
		afterCharacter.status.expansion,
	);

	return changes;
}

function buildMercenaryChanges(
	beforeSave: EditorSave,
	afterSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];

	const beforeMercenary = beforeSave.character.mercenary;
	const afterMercenary = afterSave.character.mercenary;

	pushValueChange(changes, "ID", beforeMercenary.id, afterMercenary.id);
	pushValueChange(changes, "Dead", beforeMercenary.isDead, afterMercenary.isDead);
	pushValueChange(changes, "Variant", beforeMercenary.variantId, afterMercenary.variantId);
	pushValueChange(
		changes,
		"Experience",
		beforeMercenary.experience,
		afterMercenary.experience,
	);
	pushValueChange(changes, "Name Index", beforeMercenary.nameId, afterMercenary.nameId);

	return changes;
}

function buildAttributeChanges(
	beforeSave: EditorSave,
	afterSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];

	for (const attributeName of ATTRIBUTES) {
		const label = getAttributeLabel(attributeName);
		const beforeValue = beforeSave.attributes[attributeName].value;
		const afterValue = afterSave.attributes[attributeName].value;

		pushFormattedChange(
			changes,
			label,
			formatAttributeValue(attributeName, beforeValue),
			formatAttributeValue(attributeName, afterValue),
		);
	}

	return changes;
}

function buildSkillChanges(beforeSave: EditorSave, afterSave: EditorSave): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];

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
		const beforeSlot = beforeSkills[index] ?? null;
		const afterSlot = afterSkills[index] ?? null;
		const slotLabel = `Slot #${index + 1}`;

		if (beforeSlot == null && afterSlot != null) {
			changes.push({
				label: `${slotLabel} Added`,
				before: "None",
				after: formatSkillSlot(afterSlot),
			});
			continue;
		}

		if (beforeSlot != null && afterSlot == null) {
			changes.push({
				label: `${slotLabel} Removed`,
				before: formatSkillSlot(beforeSlot),
				after: "None",
			});
			continue;
		}

		if (beforeSlot == null || afterSlot == null) {
			continue;
		}

		pushValueChange(changes, `${slotLabel} Skill ID`, beforeSlot.id, afterSlot.id);
		pushValueChange(
			changes,
			`${slotLabel} Points (Skill ${afterSlot.id})`,
			beforeSlot.points,
			afterSlot.points,
		);
	}

	return changes;
}

function buildQuestChanges(beforeSave: EditorSave, afterSave: EditorSave): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];

	for (const difficulty of DIFFICULTY_NAMES) {
		for (const act of ACT_NAMES) {
			const beforeActQuests = beforeSave.quests[difficulty][act];
			const afterActQuests = afterSave.quests[difficulty][act];

			for (const questId of orderedQuestIds(act, beforeActQuests, afterActQuests)) {
				const beforeFlags = beforeActQuests[questId]?.flags ?? [];
				const afterFlags = afterActQuests[questId]?.flags ?? [];

				if (listValuesEqual(beforeFlags, afterFlags)) {
					continue;
				}

				changes.push({
					label: formatProgressLabel(difficulty, act, getQuestLabel(act, questId)),
					before: formatList(beforeFlags),
					after: formatList(afterFlags),
				});
			}
		}
	}

	return changes;
}

function buildWaypointChanges(
	beforeSave: EditorSave,
	afterSave: EditorSave,
): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];

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

			const waypointIds = new Set<string>([
				...beforeWaypoints.keys(),
				...afterWaypoints.keys(),
			]);

			for (const waypointId of waypointIds) {
				const beforeWaypoint = beforeWaypoints.get(waypointId) ?? null;
				const afterWaypoint = afterWaypoints.get(waypointId) ?? null;
				const label = formatProgressLabel(
					difficulty,
					act,
					formatWaypointId(waypointId),
				);

				if (beforeWaypoint == null && afterWaypoint != null) {
					changes.push({
						label,
						before: "Missing",
						after: formatWaypointState(afterWaypoint.acquired),
					});
					continue;
				}

				if (beforeWaypoint != null && afterWaypoint == null) {
					changes.push({
						label,
						before: formatWaypointState(beforeWaypoint.acquired),
						after: "Missing",
					});
					continue;
				}

				if (beforeWaypoint == null || afterWaypoint == null) {
					continue;
				}

				if (beforeWaypoint.acquired !== afterWaypoint.acquired) {
					changes.push({
						label,
						before: formatWaypointState(beforeWaypoint.acquired),
						after: formatWaypointState(afterWaypoint.acquired),
					});
				}
			}
		}
	}

	return changes;
}

function buildRawDataChanges(beforeSave: EditorSave, afterSave: EditorSave): ChangeReviewEntry[] {
	const changes: ChangeReviewEntry[] = [];

	pushByteDataChange(changes, "Item Data", beforeSave.items.data, afterSave.items.data);
	pushByteDataChange(changes, "NPC Data", beforeSave.npcs.data, afterSave.npcs.data);

	return changes;
}

export function buildChangeReview(
	beforeSave: EditorSave,
	afterSave: EditorSave,
): ChangeReview {
	const groups: ChangeReviewGroup[] = [];

	for (const section of REVIEW_SECTIONS) {
		const changes = section.build(beforeSave, afterSave);
		const group = buildGroup(section.section, changes);

		if (group != null) {
			groups.push(group);
		}
	}

	const totalChanges = groups.reduce((sum, group) => sum + group.changes.length, 0);

	return {
		totalChanges,
		groups,
	};
}
