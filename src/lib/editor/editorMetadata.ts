import {
	type Act,
	type Attribute,
	type Difficulty,
	type ExpansionType,
} from "$lib/types/editor";
import { RESOURCE_Q8_SCALE } from "$lib/utils/resources";

export const ACT_LABELS = {
	Act1: "Act I",
	Act2: "Act II",
	Act3: "Act III",
	Act4: "Act IV",
	Act5: "Act V",
} as const satisfies Record<Act, string>;

export const DIFFICULTY_LABELS = {
	Normal: "Normal",
	Nightmare: "Nightmare",
	Hell: "Hell",
} as const satisfies Record<Difficulty, string>;

export const EXPANSION_TYPE_LABELS = {
	Classic: "Classic",
	Expansion: "Expansion",
	RotW: "Reign of the Warlock",
} as const satisfies Record<ExpansionType, string>;

export type AttributeDisplayMetadata = {
	label: string;
	displayScale: number;
};

export const ATTRIBUTE_DISPLAY_METADATA = {
	statpts: {
		label: "Available Stat Points",
		displayScale: 1,
	},
	newskills: {
		label: "Available Skill Points",
		displayScale: 1,
	},
	experience: {
		label: "Experience",
		displayScale: 1,
	},
	level: {
		label: "Level",
		displayScale: 1,
	},
	gold: {
		label: "Inventory gold",
		displayScale: 1,
	},
	goldbank: {
		label: "Stash gold",
		displayScale: 1,
	},
	strength: {
		label: "Strength",
		displayScale: 1,
	},
	dexterity: {
		label: "Dexterity",
		displayScale: 1,
	},
	vitality: {
		label: "Vitality",
		displayScale: 1,
	},
	energy: {
		label: "Energy",
		displayScale: 1,
	},
	hitpoints: {
		label: "Life (Current)",
		displayScale: RESOURCE_Q8_SCALE,
	},
	maxhp: {
		label: "Life (Base)",
		displayScale: RESOURCE_Q8_SCALE,
	},
	mana: {
		label: "Mana (Current)",
		displayScale: RESOURCE_Q8_SCALE,
	},
	maxmana: {
		label: "Mana (Base)",
		displayScale: RESOURCE_Q8_SCALE,
	},
	stamina: {
		label: "Stamina (Current)",
		displayScale: RESOURCE_Q8_SCALE,
	},
	maxstamina: {
		label: "Stamina (Base)",
		displayScale: RESOURCE_Q8_SCALE,
	},
} as const satisfies Record<Attribute, AttributeDisplayMetadata>;

export function getActLabel(act: Act): string {
	return ACT_LABELS[act];
}

export function getDifficultyLabel(difficulty: Difficulty): string {
	return DIFFICULTY_LABELS[difficulty];
}

export function getExpansionTypeLabel(expansionType: ExpansionType): string {
	return EXPANSION_TYPE_LABELS[expansionType];
}

export function getAttributeLabel(attribute: Attribute): string {
	return ATTRIBUTE_DISPLAY_METADATA[attribute].label;
}

export function getAttributeDisplayScale(attribute: Attribute): number {
	return ATTRIBUTE_DISPLAY_METADATA[attribute].displayScale;
}

export function isScaledAttribute(attribute: Attribute): boolean {
	return getAttributeDisplayScale(attribute) !== 1;
}