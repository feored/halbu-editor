import actQuests from "../editor/quests/actquests.json";
import type {
	ActId,
	DifficultyId,
	EditorSave,
	ExpansionTypeLabel,
	QuestId,
} from "../types/editor";

export type NewCharacterTemplateId = "blank" | "level99AllProgress";
export type NewCharacterTemplateOption = {
	id: NewCharacterTemplateId;
	label: string;
	description: string;
};

type ActQuestDefinition = {
	id: string;
	quests: Array<{ id: string }>;
};

const DIFFICULTY_IDS: readonly DifficultyId[] = ["normal", "nightmare", "hell"];

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
	expansionMode: ExpansionTypeLabel,
): void {
	for (const difficultyId of DIFFICULTY_IDS) {
		for (const act of actQuests as ActQuestDefinition[]) {
			const actId = act.id as ActId;
			for (const quest of act.quests) {
				const questId = quest.id as QuestId;
				saveData.quests[difficultyId][actId][questId].state = ["RewardGranted"];
			}
		}
	}
	saveData.character.difficulty = "Hell";
	saveData.character.act = "Act5";
	saveData.character.progression = (expansionMode === "Classic" ? 4 : 5) * 3;
}

export function applyAllWaypointsTemplate(saveData: EditorSave): void {
	for (const difficultyId of DIFFICULTY_IDS) {
		const waypointsByAct = saveData.waypoints[difficultyId];
		for (const actId of Object.keys(waypointsByAct) as ActId[]) {
			for (const waypoint of waypointsByAct[actId].waypoints) {
				waypoint.acquired = true;
			}
		}
	}
}
