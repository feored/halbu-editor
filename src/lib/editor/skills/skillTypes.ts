export type SkillDescriptionLine = {
	id: number;
	texta: string;
	calca?: string;
	calcb?: string;
	textb?: string;
};

export type SkillData = {
	id: number;
	skilldesc: string;
	class: string;
	reqlevel: number;
	reqskills: number[];
	saveId: number;
	name: string;
	description: string;
	desclines: SkillDescriptionLine[];
	dsc2lines: SkillDescriptionLine[];
	dsc3lines: SkillDescriptionLine[];
	column: number;
	row: number;
	page: number;
};
