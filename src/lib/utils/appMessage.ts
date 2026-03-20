import type { OpenedSessionData } from "$lib/editor/session";

export const Message = {
	CharacterPicked: Symbol("CharacterPicked"),
	CharacterUnpicked: Symbol("CharacterUnpicked"),
	SaveFile: Symbol("SaveFile"),
} as const;

export type AppMessage =
	| {
		id: typeof Message.CharacterPicked;
		data: OpenedSessionData;
	}
	| {
		id: typeof Message.CharacterUnpicked;
		data?: null;
	}
	| {
		id: typeof Message.SaveFile;
		data?: null;
	};

export function buildMessage<T extends AppMessage["id"]>(
	id: T,
	data: Extract<AppMessage, { id: T }>["data"],
): Extract<AppMessage, { id: T }> {
	return { id, data } as Extract<AppMessage, { id: T }>;
}
