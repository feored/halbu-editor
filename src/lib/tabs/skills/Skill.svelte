<script>
    import skillstrings from "./skillstrings.json";
    import { createEventDispatcher } from 'svelte';
    import { Message, buildMessage} from "../../utils/Message.svelte";

    export let skillDesc;
    export let skillData;
    export let availablePoints;

    const dispatch = createEventDispatcher();
    function dispatchMessage(id, data) {
        dispatch('message', buildMessage(id, data));
    }

    var skillRow = skillDesc["SkillRow"];
    var skillCol = skillDesc["SkillColumn"];
    

    function handleClick(event){
        if (event.button == 0 && availablePoints.value > 0){
            skillData.points++;
            dispatchMessage(Message.SkillPointChange, -1);
        } else if (event.button == 2){
            if (skillData.points < 1){
                return
            } else {
                skillData.points--;
                dispatchMessage(Message.SkillPointChange, 1);
            }
        }
    }
</script>

<button on:click={handleClick} on:contextmenu|preventDefault={handleClick} style="grid-row: {skillDesc["SkillRow"]}; grid-column: {skillDesc["SkillColumn"]};">{skillData.name} -- {skillData.points}</button>

<style>
    button {
        height:100px;
        background-color: rgb(70, 70, 70);
    }
</style>