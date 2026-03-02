<script context="module">
    import titles from "../tabs/character/titles.json";
    import { Class } from "./Constants.svelte";

    export function countOccurrences(string, word) {
        return string.split(word).length - 1;
    }

    export const skillOffset = {
        Amazon: 6,
        Sorceress: 36,
        Necromancer: 66,
        Paladin: 96,
        Barbarian: 126,
        Druid: 221,
        Assassin: 251,
    };

    export function skillIdToSaveId(id, charClass) {
        return id - skillOffset[charClass];
    }

    export function calcTitle(character) {
        const difficultyBeaten = calcDifficultyBeaten(character);
        const gender = [Class.Amazon, Class.Assassin, Class.Sorceress].includes(character?.class)
            ? "Female"
            : "Male";
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
