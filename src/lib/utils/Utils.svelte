<script module>
	import titles from "../editor/character/titles.json";
	import { isFemaleClass, normalizeExpansionType } from "./GameSupport";

	function resolveExpansionType(character, expansionType) {
		const normalized = normalizeExpansionType(expansionType);
		if (normalized != null) {
			return normalized;
		}
		return character?.status?.expansion ? "Expansion" : "Classic";
	}

	export function calcTitle(character, expansionType) {
		const difficultyBeaten = calcDifficultyBeaten(character, expansionType);
		const gender = isFemaleClass(character?.class) ? "Female" : "Male";
		const core = character?.status?.hardcore ? "Hardcore" : "Softcore";
		const normalizedExpansionType = resolveExpansionType(character, expansionType);
		const expansion = normalizedExpansionType === "Classic" ? "Classic" : "Expansion";

		return titles?.[core]?.[expansion]?.[difficultyBeaten]?.[gender] ?? "";
	}

	export function calcDifficultyBeaten(character, expansionType) {
		const progression = Number(character?.progression ?? 0);
		const normalizedExpansionType = resolveExpansionType(character, expansionType);
		const isExpansion = normalizedExpansionType !== "Classic";
		const rawIndex = Math.floor(progression / (4 + (isExpansion ? 1 : 0)));
		const index = Math.max(0, Math.min(rawIndex, 3));

		return ["None", "Normal", "Nightmare", "Hell"][index];
	}
</script>
