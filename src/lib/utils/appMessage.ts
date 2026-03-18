import type { OpenedSessionData } from "$lib/editor/editorSession";

const characterPicked = Symbol("Character Picked");
const characterUnpicked = Symbol("Character Unpicked");
const saveFile = Symbol("Save File");

export const Message = {
	CharacterPicked: characterPicked,
	CharacterUnpicked: characterUnpicked,
	SaveFile: saveFile,
} as const;

export type AppMessage =
	| {
		id: typeof characterPicked;
		data: OpenedSessionData;
	}
	| {
		id: typeof characterUnpicked;
		data?: null;
	}
	| {
		id: typeof saveFile;
		data?: null;
	};

export function buildMessage<T extends AppMessage["id"]>(
	id: T,
	data: Extract<AppMessage, { id: T }>["data"],
): Extract<AppMessage, { id: T }> {
	return {
		id,
		data,
	} as Extract<AppMessage, { id: T }>;
}
