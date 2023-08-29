<script context="module">
    import titles from "../tabs/Character/titles.json";
    import { Class, Difficulty, Act } from "./Constants.svelte";

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
        let difficultyBeaten = calcDifficultyBeaten(character);
        let gender = [Class.Amazon, Class.Assassin, Class.Sorceress].includes(character.class)
            ? "Female"
            : "Male";
        let core = character.status.hardcore ? "Hardcore" : "Softcore";
        let expansion = character.status.expansion ? "Expansion" : "Classic";
        return titles[core][expansion][difficultyBeaten][gender];
    }

    export function calcDifficultyBeaten(character) {
        return ["None", "Normal", "Nightmare", "Hell"][
            Math.floor(character.progression / (4 + (character.expansion ? 1 : 0)))
        ];
    }
</script>
