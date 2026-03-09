<script module>
    import titles from "../editor/character/titles.json";
    import { isFemaleClass } from "./GameSupport";

    export function countOccurrences(string, word) {
        return string.split(word).length - 1;
    }

    export function calcTitle(character) {
        const difficultyBeaten = calcDifficultyBeaten(character);
        const gender = isFemaleClass(character?.class) ? "Female" : "Male";
        const core = character?.status?.hardcore ? "Hardcore" : "Softcore";
        const expansion = character?.status?.expansion ? "Expansion" : "Classic";

        return titles?.[core]?.[expansion]?.[difficultyBeaten]?.[gender] ?? "";
    }

    export function calcDifficultyBeaten(character) {
        const progression = Number(character?.progression ?? 0);
        const isExpansion = Boolean(character?.status?.expansion);
        const rawIndex = Math.floor(progression / (4 + (isExpansion ? 1 : 0)));
        const index = Math.max(0, Math.min(rawIndex, 3));

        return ["None", "Normal", "Nightmare", "Hell"][index];
    }
</script>
