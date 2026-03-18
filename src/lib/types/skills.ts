import type { SaveFormatId, ClassName, KnownClassName } from "$lib/types/editor";
export type SkillSlot = {
	id: number;
	points: number;
};

export type SkillsContext = {
	saveVersion: number;
	metaFormat: SaveFormatId;
	className: ClassName;
	skillSlotCount: number;
	classSupportedForVersion: boolean;
	supportedClasses: KnownClassName[];
};
