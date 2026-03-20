import { getAttributeLabel } from "$lib/editor/editorMetadata";
import namesJson from "$lib/editor/mercenary/names.json";
import variantsJson from "$lib/editor/mercenary/variants.json";
import { ACTS, getQuestFlagLabel, type QuestDisplay } from "$lib/editor/quests/quests";
import { WAYPOINT_NAMES } from "$lib/editor/waypoints/waypoints";
import {
	ACT_NAMES,
	ATTRIBUTES,
	DIFFICULTY_NAMES,
	type Act,
	type Difficulty,
	type EditorSave,
	type QuestFlag,
} from "$lib/types/editor";
import { getSkillsDataset } from "$lib/utils/gameData";
import {
	RESOURCE_Q8_SCALE,
	fixedPointToDisplay,
} from "$lib/utils/numbers";

export type Change = {
	label: string;
	before: string;
	after: string;
};

export type ChangeGroup = {
	section: string;
	collapsed?: boolean;
	changes: Change[];
};

export type ChangeReview = {
	totalChanges: number;
	groups: ChangeGroup[];
};

type MercenaryVariant = {
	id: number;
	type: string;
	variant: string;
	difficulty: Difficulty;
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
const questDisplaysByAct: Record<string, Record<string, QuestDisplay>> = {};
const questLabelsByAct: Record<string, Record<string, string>> = {};
const questOrderByAct: Record<string, Record<string, number>> = {};
const mercenaryVariants = variantsJson as MercenaryVariant[];
const mercenaryNamesByType = namesJson as Record<string, string[]>;
const mercenaryVariantsById = new Map(mercenaryVariants.map((variant) => [variant.id, variant]));

for (const act of ACTS) {
	actLabelsById[act.id] = act.display;
	questDisplaysByAct[act.id] = {};
	questLabelsByAct[act.id] = {};
	questOrderByAct[act.id] = {};

	for (let index = 0; index < act.quests.length; index += 1) {
		const quest = act.quests[index];
		questDisplaysByAct[act.id][quest.id] = quest;
		questLabelsByAct[act.id][quest.id] = quest.display;
		questOrderByAct[act.id][quest.id] = index;
	}
}

function formatNumber(value: number, maxFractionDigits = Number.isInteger(value) ? 0 : 3): string {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: maxFractionDigits,
	}).format(value);
}

function formatValue(value: unknown): string {
	if (value === null) {
		return "null";
	}

	if (value === undefined) {
		return "Missing";
	}

	if (typeof value === "boolean") {
		return value ? "On" : "Off";
	}

	if (typeof value === "number") {
		return formatNumber(value);
	}

	if (typeof value === "string") {
		return value.length > 0 ? value : '""';
	}

	return String(value);
}

function formatWaypointState(acquired: boolean): string {
	return acquired ? "Acquired" : "Locked";
}

function getSkillName(save: EditorSave, slotIndex: number): string | null {
	const skills = getSkillsDataset(save.version);
	if (skills == null) {
		return null;
	}

	const skill = skills.find(
		(entry) => entry.class === save.character.className && entry.saveId === slotIndex,
	);
	return skill?.name ?? null;
}

function getSkillLabel(save: EditorSave, slotIndex: number): string {
	return getSkillName(save, slotIndex) ?? `Slot #${slotIndex + 1}`;
}

function formatSkillPoints(points: number): string {
	return `${points} point(s)`;
}

function formatSkillSlot(
	save: EditorSave,
	slotIndex: number,
	slot: { points: number },
): string {
	return `${getSkillLabel(save, slotIndex)}, ${formatSkillPoints(slot.points)}`;
}

function formatAttributeValue(attributeId: string, value: number): string {
	return q8Attributes.has(attributeId)
		? formatNumber(fixedPointToDisplay(value, RESOURCE_Q8_SCALE), 3)
		: formatNumber(value);
}

function formatQuestFlag(flag: string): string {
	return getQuestFlagLabel(flag as QuestFlag);
}

function formatQuestFlags(flags: readonly string[]): string {
	return flags.map((flag) => formatQuestFlag(flag)).join(", ");
}

function formatQuestState(act: Act, questId: string, flags: readonly string[]): string {
	if (flags.length < 1) {
		return "Not started";
	}

	const states = questDisplaysByAct[act]?.[questId]?.states ?? [];
	const matchedStates = states.filter((state) =>
		state.flags.every((flag) => flags.includes(flag)),
	);

	if (matchedStates.length < 1) {
		return flags.length === 1 ? formatQuestFlag(flags[0]) : formatQuestFlags(flags);
	}

	const labels = [...new Set(matchedStates.map((state) => state.display))];
	const matchedFlags = new Set(matchedStates.flatMap((state) => state.flags));
	const extraFlags = flags.filter((flag) => !matchedFlags.has(flag as QuestFlag));

	if (extraFlags.length < 1) {
		return labels.join(", ");
	}

	return `${labels.join(", ")} + ${formatQuestFlags(extraFlags)}`;
}

function getMercenaryVariantLabel(variantId: number): string {
	const variant = mercenaryVariantsById.get(variantId);
	if (variant == null) {
		return `Unknown (${variantId})`;
	}

	return `${variant.type} / ${variant.variant} / ${variant.difficulty}`;
}

function getMercenaryNameLabel(variantId: number, nameId: number): string {
	const variant = mercenaryVariantsById.get(variantId);
	if (variant == null) {
		return `Name #${nameId}`;
	}

	const name = mercenaryNamesByType[variant.type]?.[nameId];
	return name ?? `Name #${nameId}`;
}

function formatWaypointId(waypointId: string): string {
	return WAYPOINT_NAMES[waypointId] ?? waypointId.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
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
	pushFormattedChange(
		changes,
		"Act",
		actLabelsById[before.act] ?? before.act,
		actLabelsById[after.act] ?? after.act,
	);
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

	pushChange(changes, "Hired", before.id !== 0, after.id !== 0);
	pushChange(changes, "ID", before.id, after.id);
	pushChange(changes, "Dead", before.isDead, after.isDead);
	pushFormattedChange(
		changes,
		"Variant",
		getMercenaryVariantLabel(before.variantId),
		getMercenaryVariantLabel(after.variantId),
	);
	pushFormattedChange(
		changes,
		"Name",
		getMercenaryNameLabel(before.variantId, before.nameId),
		getMercenaryNameLabel(after.variantId, after.nameId),
	);
	pushChange(changes, "Experience", before.experience, after.experience);

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
		const slotLabel = `Slot #${index + 1}`;

		if (before == null && after != null) {
			changes.push({
				label: `${getSkillLabel(afterSave, index)} Added`,
				before: "None",
				after: formatSkillPoints(after.points),
			});
			continue;
		}

		if (before != null && after == null) {
			changes.push({
				label: `${getSkillLabel(beforeSave, index)} Removed`,
				before: formatSkillPoints(before.points),
				after: "None",
			});
			continue;
		}

		if (before == null || after == null) {
			continue;
		}

		const beforeLabel = getSkillLabel(beforeSave, index);
		const afterLabel = getSkillLabel(afterSave, index);

		if (beforeLabel !== afterLabel) {
			pushFormattedChange(changes, slotLabel, beforeLabel, afterLabel);
		}

		if (before.points !== after.points) {
			if (beforeLabel === afterLabel) {
				pushFormattedChange(
					changes,
					afterLabel,
					formatSkillPoints(before.points),
					formatSkillPoints(after.points),
				);
				continue;
			}

			pushFormattedChange(
				changes,
				`${slotLabel} Points`,
				formatSkillSlot(beforeSave, index, before),
				formatSkillSlot(afterSave, index, after),
			);
		}
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
					before: formatQuestState(act, questId, beforeFlags),
					after: formatQuestState(act, questId, afterFlags),
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

function addGroup(
	groups: ChangeGroup[],
	section: string,
	changes: Change[],
	collapsed = false,
): void {
	if (changes.length < 1) {
		return;
	}

	groups.push({
		section,
		collapsed,
		changes,
	});
}

export function getChangeReview(beforeSave: EditorSave, afterSave: EditorSave): ChangeReview {
	const groups: ChangeGroup[] = [];

	let changes = getCharacterChanges(beforeSave, afterSave);
	addGroup(groups, "Character", changes);

	changes = getMercenaryChanges(beforeSave, afterSave);
	addGroup(groups, "Mercenary", changes);

	changes = getAttributeChanges(beforeSave, afterSave);
	addGroup(groups, "Attributes", changes);

	changes = getSkillChanges(beforeSave, afterSave);
	addGroup(groups, "Skills", changes);

	changes = getQuestChanges(beforeSave, afterSave);
	addGroup(groups, "Quests", changes);

	changes = getWaypointChanges(beforeSave, afterSave);
	addGroup(groups, "Waypoints", changes);

	changes = getSaveChanges(beforeSave, afterSave);
	addGroup(groups, "Save", changes, true);

	changes = getRawDataChanges(beforeSave, afterSave);
	addGroup(groups, "Raw Data", changes, true);

	return {
		totalChanges: groups.reduce((sum, group) => sum + group.changes.length, 0),
		groups,
	};
}
