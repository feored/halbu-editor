<script module>
	import titles from "../editor/character/titles.json";
	import { isFemaleClass } from "./GameSupport";

	export function calcTitle(character, expansionType) {
		const difficultyBeaten = calcDifficultyBeaten(character, expansionType);
		const gender = isFemaleClass(character.class) ? "Female" : "Male";
		const core = character.status.hardcore ? "Hardcore" : "Softcore";
		const expansion = expansionType === "Classic" ? "Classic" : "Expansion";

		return titles?.[core]?.[expansion]?.[difficultyBeaten]?.[gender] ?? "";
	}

	export function calcDifficultyBeaten(character, expansionType) {
		const progression = character.progression;
		const isExpansion = expansionType !== "Classic";
		const rawIndex = Math.floor(progression / (4 + (isExpansion ? 1 : 0)));
		const index = Math.max(0, Math.min(rawIndex, 3));

		return ["None", "Normal", "Nightmare", "Hell"][index];
	}
</script>
