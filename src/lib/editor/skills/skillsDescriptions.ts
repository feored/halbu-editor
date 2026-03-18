import { skillIdToSaveId } from "$lib/utils/gameData";
import type { SkillPrerequisite, SkillState } from "$lib/editor/skills/skillsState";
import type { Character, SkillSlot } from "$lib/types/editor";
import type { SkillData, SkillDescriptionLine } from "$lib/editor/skills/skillsTypes";

export type SkillSynergyEntry = {
	line: string;
	acquired: boolean | null;
};

export type SkillDetails = {
	id: number;
	name: string;
	description: string;
	currentPoints: number;
	totalLevel: number;
	reqLevel: number;
	levelRequirementMet: boolean;
	prerequisites: SkillPrerequisite[];
	prerequisitesMet: boolean;
	available: boolean;
	lockReasons: string[];
	synergyLines: string[];
	synergyEntries: SkillSynergyEntry[];
	currentLines: string[];
	nextLevelLines: string[];
	extraLines: string[];
};

type BuildSkillDetailsOptions = {
	skillData: SkillData;
	skillsData: readonly SkillData[];
	skills: readonly SkillSlot[];
	character: Pick<Character, "className" | "level">;
	version: number;
	skillState?: SkillState | null;
};

type ExpressionFunction = (...args: any[]) => unknown;

type BuildLinesOptions = {
	next?: boolean;
	reverse?: boolean;
};


function buildSkillPrerequisites(
	requiredSkillIds: readonly number[],
	skillsData: readonly SkillData[],
	skills: readonly SkillSlot[],
	version: number,
	className: string,
): SkillPrerequisite[] {
	return requiredSkillIds.map((requiredSkillId) => {
		const prerequisite = skillsData.find((entry) => entry.id === requiredSkillId);
		const saveId =
			prerequisite == null
				? skillIdToSaveId(version, className, requiredSkillId)
				: prerequisite.saveId;
		return {
			id: requiredSkillId,
			name: prerequisite?.name ?? `Skill ${requiredSkillId}`,
			met: skills[saveId].points > 0,
		};
	});
}

function normalizeEvaluatedNumber(value: unknown): number {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function countOccurrences(text: string, token: string): number {
	if (token.length === 0) {
		return 0;
	}
	return text.split(token).length - 1;
}

function replaceFirstNumber(line: string, number: number): string {
	const signedIndex = line.indexOf("%+d");
	const generalIndex = line.indexOf("%d");
	const value = number.toString();

	if (signedIndex !== -1 && (generalIndex === -1 || signedIndex < generalIndex)) {
		return line.replace("%+d", `${number > 0 ? "+" : ""}${value}`);
	}
	return line.replace("%d", value);
}

function sanitizeLineText(text: string): string {
	return text.replaceAll("%%", "%").trim();
}

function scopedEval(
	script: string,
	scope: Record<string, unknown>,
	functions: Record<string, ExpressionFunction>,
): unknown {
	const scopeEntries = Object.entries(scope);
	const functionEntries = Object.entries(functions);
	const argNames = [
		...scopeEntries.map(([name]) => name),
		...functionEntries.map(([name]) => name),
	];
	const argValues = [
		...scopeEntries.map(([, value]) => value),
		...functionEntries.map(([, value]) => value),
	];

	return Function(...argNames, `"use strict"; return (${script})`)(...argValues);
}

function createCalculator({
	version,
	character,
	skills,
	skillData,
}: BuildSkillDetailsOptions): (expression: string, next?: boolean) => number {
	const currentId = skillData.saveId;

	function points(slotIndex: number): number {
		return skills[slotIndex].points;
	}

	function slvl(skillId: number): number {
		const saveSkillId = skillIdToSaveId(version, character.className, skillId);
		return saveSkillId >= 0 ? points(saveSkillId) : 0;
	}

	function blvl(skillId: number): number {
		return slvl(skillId);
	}

	function evalMastery(mastery: "ltng" | "fire"): number {
		if (character.className !== "Sorceress") {
			return 0;
		}
		if (mastery === "ltng") {
			return 50 + (points(27) - 1) * 12;
		}
		if (mastery === "fire") {
			return 30 + (points(25) - 1) * 7;
		}
		return 0;
	}

	function evaluateExpression(expression: string, next = false): number {
		const levelBase = points(currentId) === 0 ? 1 : points(currentId);
		const level = next ? levelBase + 1 : levelBase;
		const evalScope = {
			lvl: level,
			skills,
			character,
		};
		const fns = {
			slvl,
			blvl,
			synergy,
			evalMastery,
		};
		let normalized = expression;
		normalized = normalized.replaceAll("lightningmastery", "evalMastery('ltng')");
		normalized = normalized.replaceAll("firemastery", "evalMastery('fire')");
		normalized = normalized.replace(/(?<![.\w])max\s*\(/g, "Math.max(");
		normalized = normalized.replace(/(?<![.\w])min\s*\(/g, "Math.min(");
		normalized = normalized.replace(/(?<![.\w])floor\s*\(/g, "Math.floor(");
		normalized = normalized.replace(/(?<![.\w])ceil\s*\(/g, "Math.ceil(");
		normalized = normalized.replace(/(?<![.\w])round\s*\(/g, "Math.round(");
		normalized = normalized.replace(/(?<![.\w])abs\s*\(/g, "Math.abs(");

		try {
			return normalizeEvaluatedNumber(scopedEval(normalized, evalScope, fns));
		} catch (error) {
			console.warn("Failed to evaluate skill expression", {
				expression,
				normalized,
				error,
			});
			return 0;
		}
	}

	function synergy(calc: string): number {
		const expression = calc;
		const foundSlvl = expression.match(/slvl\([^\)]*\)/g);
		if (
			foundSlvl != null &&
			slvl(normalizeEvaluatedNumber(foundSlvl[0].slice(5, -1))) === 0
		) {
			return 0;
		}

		const foundBlvl = expression.match(/blvl\([^\)]*\)/g);
		if (
			foundBlvl != null &&
			blvl(normalizeEvaluatedNumber(foundBlvl[0].slice(5, -1))) === 0
		) {
			return 0;
		}
		return evaluateExpression(expression);
	}

	return evaluateExpression;
}

function descLineGeneral(
	descLine: SkillDescriptionLine,
	evaluateExpression: (expression: string, next?: boolean) => number,
	next = false,
): string {
	let line = sanitizeLineText(descLine.texta);
	const calculations = countOccurrences(line, "%d") + countOccurrences(line, "%+d");

	if (calculations > 0) {
		const calcA = evaluateExpression(descLine.calca ?? "", next);
		line = replaceFirstNumber(line, calcA);
	}
	if (calculations > 1) {
		const calcB = evaluateExpression(descLine.calcb ?? "", next);
		line = replaceFirstNumber(line, calcB);
	}
	if (countOccurrences(line, "%s") > 0) {
		line = line.replace("%s", descLine.textb ?? "");
	}

	return sanitizeLineText(line);
}

function renderDescriptionLine(
	descLine: SkillDescriptionLine,
	evaluateExpression: (expression: string, next?: boolean) => number,
	next = false,
): string {
	switch (descLine.id) {
		case 34:
		case 39:
		case 41:
		case 18:
			return sanitizeLineText(descLine.texta);
		case 31:
		case 36: {
			const left = evaluateExpression(descLine.calca ?? "", next);
			const right =
				descLine.calcb == null ? null : evaluateExpression(descLine.calcb, next);
			const value = right == null ? left : left / right;
			if (descLine.textb != null && value !== 1) {
				return sanitizeLineText(replaceFirstNumber(descLine.textb, value));
			}
			return sanitizeLineText(replaceFirstNumber(descLine.texta, value));
		}
		default:
			return descLineGeneral(descLine, evaluateExpression, next);
	}
}

function buildLines(
	lines: readonly SkillDescriptionLine[],
	evaluateExpression: (expression: string, next?: boolean) => number,
	{ next = false, reverse = false }: BuildLinesOptions = {},
): string[] {
	if (lines.length === 0) {
		return [];
	}

	const source = reverse ? [...lines].reverse() : lines;
	const result: string[] = [];

	for (const line of source) {
		const rendered = renderDescriptionLine(line, evaluateExpression, next);
		if (rendered.length > 0) {
			result.push(rendered);
		}
	}
	return result;
}

function normalizeDescription(description: string): string {
	const text = description.trim();
	if (text.length === 0) {
		return "";
	}
	const upper = text.charAt(0).toUpperCase() + text.slice(1);
	return upper.endsWith(".") ? upper : `${upper}.`;
}

function getSkillLockReasons(levelRequirementMet: boolean, reqLevel: number): string[] {
	const reasons: string[] = [];
	if (!levelRequirementMet) {
		reasons.push(`Requires Level ${reqLevel}`);
	}
	return reasons;
}

function buildSynergyEntries(
	synergyLines: readonly string[],
	skillsData: readonly SkillData[],
	skills: readonly SkillSlot[],
): SkillSynergyEntry[] {
	return synergyLines.map((line) => {
		const delimiterIndex = line.indexOf(":");
		if (delimiterIndex <= 0) {
			return {
				line,
				acquired: null,
			};
		}

		const skillName = line.slice(0, delimiterIndex).trim();
		const synergySkill = skillsData.find((entry) => entry.name.trim() === skillName);
		if (synergySkill == null) {
			return {
				line,
				acquired: null,
			};
		}

		return {
			line,
			acquired: skills[synergySkill.saveId].points > 0,
		};
	});
}

export function buildSkillDetails({
	skillData,
	skillsData,
	skills,
	character,
	version,
	skillState,
}: BuildSkillDetailsOptions): SkillDetails {
	const currentPoints = skills[skillData.saveId].points;
	const calculator = createCalculator({ version, character, skills, skillData, skillsData });
	const reqLevel = skillData.reqlevel;
	const characterLevel = character.level;
	const prerequisites = buildSkillPrerequisites(
		skillData.reqskills,
		skillsData,
		skills,
		version,
		character.className,
	);

	const currentLines = buildLines(skillData.desclines, calculator, { reverse: true });
	const synergyLines = buildLines(skillData.dsc3lines, calculator);
	const synergyEntries = buildSynergyEntries(synergyLines, skillsData, skills);
	const extraLines = buildLines(skillData.dsc2lines, calculator, { reverse: true });
	const nextLevelLines =
		currentPoints > 0
			? buildLines(skillData.desclines, calculator, { next: true, reverse: true })
			: [];

	const levelRequirementMet =
		skillState == null ? characterLevel >= reqLevel : skillState.levelRequirementMet;
	const prerequisitesMet =
		skillState == null
			? prerequisites.every((required) => required.met)
			: skillState.prerequisitesMet;
	const lockReasons = getSkillLockReasons(levelRequirementMet, reqLevel);

	return {
		id: skillData.id,
		name: skillData.name,
		description: normalizeDescription(skillData.description),
		currentPoints,
		totalLevel: currentPoints,
		reqLevel,
		levelRequirementMet,
		prerequisites,
		prerequisitesMet,
		available: skillState == null ? levelRequirementMet && prerequisitesMet : skillState.available,
		lockReasons,
		synergyLines,
		synergyEntries,
		currentLines,
		nextLevelLines,
		extraLines,
	};
}
