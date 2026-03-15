import { skillIdToSaveId } from "../../utils/GameSupport";
import type { EditorCharacter, SkillSlot } from "../../types/editor";
import type { SkillData, SkillDescriptionLine } from "./skillTypes";

export type SkillSynergyEntry = {
	line: string;
	acquired: boolean | null;
};

export type SkillPrerequisite = {
	id: number;
	name: string;
	met: boolean;
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
	character: Pick<EditorCharacter, "class" | "level">;
	version: number;
};

type ExpressionFunction = (...args: unknown[]) => unknown;

type BuildLinesOptions = {
	next?: boolean;
	reverse?: boolean;
};

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

function replaceCallableName(script: string, name: string, replacement: string): string {
	const pattern = new RegExp(`(^|[^\\w.])${name}\\s*\\(`, "g");
	return script.replace(pattern, `$1${replacement}(`);
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
		const saveSkillId = skillIdToSaveId(version, character.class, skillId);
		return saveSkillId >= 0 ? points(saveSkillId) : 0;
	}

	function blvl(skillId: number): number {
		return slvl(skillId);
	}

	function evalMastery(mastery: "ltng" | "fire"): number {
		if (character.class !== "Sorceress") {
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
		normalized = replaceCallableName(normalized, "floor", "Math.floor");
		normalized = replaceCallableName(normalized, "min", "Math.min");
		normalized = replaceCallableName(normalized, "max", "Math.max");

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
}: BuildSkillDetailsOptions): SkillDetails {
	const currentPoints = skills[skillData.saveId].points;
	const calculator = createCalculator({ version, character, skills, skillData, skillsData });
	const reqLevel = skillData.reqlevel;
	const characterLevel = character.level;
	const prerequisites = skillData.reqskills.map((requiredSkillId) => {
		const prerequisite = skillsData.find((entry) => entry.id === requiredSkillId);
		const saveId =
			prerequisite == null
				? skillIdToSaveId(version, character.class, requiredSkillId)
				: prerequisite.saveId;
		return {
			id: requiredSkillId,
			name: prerequisite?.name ?? `Skill ${requiredSkillId}`,
			met: skills[saveId].points > 0,
		};
	});

	const currentLines = buildLines(skillData.desclines, calculator, { reverse: true });
	const synergyLines = buildLines(skillData.dsc3lines, calculator);
	const synergyEntries = buildSynergyEntries(synergyLines, skillsData, skills);
	const extraLines = buildLines(skillData.dsc2lines, calculator, { reverse: true });
	const nextLevelLines =
		currentPoints > 0
			? buildLines(skillData.desclines, calculator, { next: true, reverse: true })
			: [];

	const levelRequirementMet = characterLevel >= reqLevel;
	const prerequisitesMet = prerequisites.every((required) => required.met);
	const lockReasons: string[] = [];
	if (!levelRequirementMet) {
		lockReasons.push(`Requires Level ${reqLevel}`);
	}

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
		available: levelRequirementMet && prerequisitesMet,
		lockReasons,
		synergyLines,
		synergyEntries,
		currentLines,
		nextLevelLines,
		extraLines,
	};
}
