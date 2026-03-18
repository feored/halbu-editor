import actQuests from "$lib/editor/quests/actquests.json";
import { ACT_NAMES, DIFFICULTY_NAMES } from "$lib/types/editor";
import { setActWaypoints } from "$lib/editor/waypoints/waypointsLogic";
import type {
	Difficulty,
	EditorSave,
	ExpansionType,
	QuestId,
} from "$lib/types/editor";

export type NewCharacterTemplateId = "blank" | "level99AllProgress";
export type NewCharacterTemplateOption = {
	id: NewCharacterTemplateId;
	label: string;
	description: string;
};

type ActQuestDisplay = {
	id: string;
	quests: Array<{ id: string }>;
};

export const NEW_CHARACTER_TEMPLATE_OPTIONS: readonly NewCharacterTemplateOption[] = [
	{
		id: "blank",
		label: "Blank Character",
		description: "Starts from class defaults and applies your selected basics only.",
	},
	{
		id: "level99AllProgress",
		label: "Level 99 + All Progress",
		description:
			"Level 99, all waypoints unlocked, and all standard quests completed across all difficulties.",
	},
] as const;

export function applyCampaignCompletedTemplate(
	saveData: EditorSave,
	expansionMode: ExpansionType,
): void {
	for (const difficultyId of DIFFICULTY_NAMES as readonly Difficulty[]) {
		for (const act of actQuests as ActQuestDisplay[]) {
			const actId = ACT_NAMES.find((candidate) => candidate.toLowerCase() === act.id);
			for (const quest of act.quests) {
				const questId = quest.id as QuestId;
				saveData.quests[difficultyId][actId][questId].flags = ["RewardGranted"];
			}
		}
	}
	saveData.character.difficulty = "Hell";
	saveData.character.act = "Act5";
	saveData.character.progression = (expansionMode === "Classic" ? 4 : 5) * 3;
}

export function applyAllWaypointsTemplate(saveData: EditorSave): void {
	for (const difficultyId of DIFFICULTY_NAMES as readonly Difficulty[]) {
		for (const actId of ACT_NAMES) {
			setActWaypoints(saveData.waypoints, difficultyId, actId, true);
		}
	}
}
