<script context="module">
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
</script>
