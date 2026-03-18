<script lang="ts">
	import Status from "$lib/editor/status/Status.svelte";
	import Character from "$lib/editor/character/Character.svelte";
	import SkillsEditor from "$lib/editor/skills/SkillsEditor.svelte";
	import Waypoints from "$lib/editor/waypoints/Waypoints.svelte";
	import Quests from "$lib/editor/quests/Quests.svelte";
	import Mercenary from "$lib/editor/mercenary/Mercenary.svelte";
	import Save from "$lib/editor/save/Save.svelte";

	type EditorSection =
		| "status"
		| "save"
		| "character"
		| "skills"
		| "waypoints"
		| "quests"
		| "mercenary";

	let { currentSection }: { currentSection: EditorSection } = $props();
</script>

{#if currentSection === "status"}
	<Status />
{:else if currentSection === "save"}
	<Save />
{:else if currentSection === "character"}
	<Character />
{:else if currentSection === "skills"}
	<SkillsEditor />
{:else if currentSection === "waypoints"}
	<Waypoints />
{:else if currentSection === "quests"}
	<Quests />
{:else if currentSection === "mercenary"}
	<Mercenary />
{/if}
