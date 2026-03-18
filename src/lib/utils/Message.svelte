<script module lang="ts">
	import type { OpenedSessionData } from "$lib/editor/editorSession";

	const CharacterPicked = Symbol("Character Picked");
	const CharacterUnpicked = Symbol("Character Unpicked");
	const SaveFile = Symbol("Save File");

	export const Message = {
		CharacterPicked,
		CharacterUnpicked,
		SaveFile,
	} as const;

	export type AppMessage =
		| {
				id: typeof CharacterPicked;
				data: OpenedSessionData;
		  }
		| {
				id: typeof CharacterUnpicked;
				data?: null;
		  }
		| {
				id: typeof SaveFile;
				data?: null;
		  };

	export function buildMessage<T extends AppMessage["id"]>(
		messageType: T,
		messageContents: Extract<AppMessage, { id: T }>["data"],
	): Extract<AppMessage, { id: T }> {
		return {
			id: messageType,
			data: messageContents,
		} as Extract<AppMessage, { id: T }>;
	}
</script>
