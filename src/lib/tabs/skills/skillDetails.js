import { getSkillPoints } from "../../skills/skillSlots.js";
import { skillIdToSaveId } from "../../utils/GameSupport";

function countOccurrences(text, token) {
	if (typeof text !== "string" || typeof token !== "string" || token.length === 0) {
		return 0;
	}
	return text.split(token).length - 1;
}

function replaceFirstNumber(line, number) {
	const signedIndex = line.indexOf("%+d");
	const generalIndex = line.indexOf("%d");
	const value = Number(number).toString();

	if (signedIndex !== -1 && (generalIndex === -1 || signedIndex < generalIndex)) {
		return line.replace("%+d", `${number > 0 ? "+" : ""}${value}`);
	}
	return line.replace("%d", value);
}

function sanitizeLineText(text) {
	return String(text ?? "").replaceAll("%%", "%").trim();
}

function scopedEval(script, scope, functions) {
	const scopeEntries = Object.entries(scope ?? {});
	const functionEntries = Object.entries(functions ?? {});
	const argNames = [...scopeEntries.map(([name]) => name), ...functionEntries.map(([name]) => name)];
	const argValues = [...scopeEntries.map(([, value]) => value), ...functionEntries.map(([, value]) => value)];

	return Function(...argNames, `"use strict"; return (${script})`)(
		...argValues
	);
}

function createCalculator({ version, character, skills, skillData }) {
	const currentId = Number(skillData?.saveId);

	function points(slotIndex) {
		return getSkillPoints(skills, Number(slotIndex));
	}

	function slvl(skillId) {
		const saveSkillId = skillIdToSaveId(version, character?.class, skillId);
		return saveSkillId >= 0 ? points(saveSkillId) : 0;
	}

	function blvl(skillId) {
		return slvl(skillId);
	}

	function evalMastery(mastery) {
		if (character?.class !== "Sorceress") {
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

	function evaluateExpression(expression, next = false) {
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
		let normalized = String(expression ?? "");
		normalized = normalized.replaceAll("lightningmastery", "evalMastery('ltng')");
		normalized = normalized.replaceAll("firemastery", "evalMastery('fire')");
		normalized = normalized.replaceAll("floor", "Math.floor");
		normalized = normalized.replaceAll("min", "Math.min");
		normalized = normalized.replaceAll("max", "Math.max");

		return scopedEval(normalized, evalScope, fns);
	}

	function synergy(calc) {
		const expression = String(calc ?? "");
		const foundSlvl = expression.match(/slvl\([^\)]*\)/g);
		if (foundSlvl != null && slvl(foundSlvl[0].slice(5, -1)) === 0) {
			return 0;
		}

		const foundBlvl = expression.match(/blvl\([^\)]*\)/g);
		if (foundBlvl != null && blvl(foundBlvl[0].slice(5, -1)) === 0) {
			return 0;
		}
		return evaluateExpression(expression);
	}

	return evaluateExpression;
}

function descLineGeneral(descLine, evaluateExpression, next = false) {
	let line = sanitizeLineText(descLine?.texta);
	const calculations = countOccurrences(line, "%d") + countOccurrences(line, "%+d");

	if (calculations > 0) {
		const calcA = evaluateExpression(descLine?.calca, next);
		line = replaceFirstNumber(line, Number(calcA));
	}
	if (calculations > 1) {
		const calcB = evaluateExpression(descLine?.calcb, next);
		line = replaceFirstNumber(line, Number(calcB));
	}
	if (countOccurrences(line, "%s") > 0) {
		line = line.replace("%s", String(descLine?.textb ?? ""));
	}

	return sanitizeLineText(line);
}

function renderDescriptionLine(descLine, evaluateExpression, next = false) {
	switch (Number(descLine?.id)) {
		case 34:
		case 39:
		case 41:
		case 18:
			return sanitizeLineText(descLine?.texta);
		case 31:
		case 36: {
			const left = evaluateExpression(descLine?.calca, next);
			const right = "calcb" in (descLine ?? {}) ? evaluateExpression(descLine?.calcb, next) : null;
			const value = right == null ? left : Number(left) / Number(right);
			if ("textb" in (descLine ?? {}) && value !== 1) {
				return sanitizeLineText(replaceFirstNumber(String(descLine?.textb ?? ""), Number(value)));
			}
			return sanitizeLineText(replaceFirstNumber(String(descLine?.texta ?? ""), Number(value)));
		}
		default:
			return descLineGeneral(descLine, evaluateExpression, next);
	}
}

function buildLines(lines, evaluateExpression, { next = false, reverse = false } = {}) {
	if (!Array.isArray(lines) || lines.length === 0) {
		return [];
	}

	const source = reverse ? [...lines].reverse() : lines;
	const result = [];

	for (const line of source) {
		const rendered = renderDescriptionLine(line, evaluateExpression, next);
		if (rendered.length > 0) {
			result.push(rendered);
		}
	}
	return result;
}

function normalizeDescription(description) {
	const text = String(description ?? "").trim();
	if (text.length === 0) {
		return "";
	}
	const upper = text.charAt(0).toUpperCase() + text.slice(1);
	return upper.endsWith(".") ? upper : `${upper}.`;
}

function buildSynergyEntries(synergyLines, skillsData, skills) {
	return synergyLines.map((line) => {
		const delimiterIndex = line.indexOf(":");
		if (delimiterIndex <= 0) {
			return {
				line,
				acquired: null,
			};
		}

		const skillName = line.slice(0, delimiterIndex).trim();
		const synergySkill = skillsData.find((entry) => String(entry?.name ?? "").trim() === skillName);
		if (synergySkill == null) {
			return {
				line,
				acquired: null,
			};
		}

		return {
			line,
			acquired: getSkillPoints(skills, Number(synergySkill.saveId)) > 0,
		};
	});
}

export function buildSkillDetails({
	skillData,
	skillsData,
	skills,
	character,
	version,
}) {
	if (skillData == null) {
		return null;
	}

	const currentPoints = getSkillPoints(skills, Number(skillData?.saveId));
	const calculator = createCalculator({ version, character, skills, skillData });
	const reqLevel = Number(skillData?.reqlevel ?? 0);
	const characterLevel = Number(character?.level ?? 0);
	const prerequisites = (skillData?.reqskills ?? []).map((requiredSkillId) => {
		const prerequisite = skillsData.find((entry) => Number(entry.id) === Number(requiredSkillId));
		const saveId =
			prerequisite == null
				? skillIdToSaveId(version, character?.class, requiredSkillId)
				: Number(prerequisite.saveId);
		return {
			id: Number(requiredSkillId),
			name: prerequisite?.name ?? `Skill ${requiredSkillId}`,
			met: getSkillPoints(skills, saveId) > 0,
		};
	});

	const currentLines = buildLines(skillData?.desclines, calculator, { reverse: true });
	const synergyLines = buildLines(skillData?.dsc3lines, calculator, {});
	const synergyEntries = buildSynergyEntries(synergyLines, skillsData, skills);
	const extraLines = buildLines(skillData?.dsc2lines, calculator, { reverse: true });
	const nextLevelLines =
		currentPoints > 0
			? buildLines(skillData?.desclines, calculator, { next: true, reverse: true })
			: [];

	const levelRequirementMet = characterLevel >= reqLevel;
	const prerequisitesMet = prerequisites.every((required) => required.met);
	const lockReasons = [];
	if (!levelRequirementMet) {
		lockReasons.push(`Requires Level ${reqLevel}`);
	}

	return {
		id: Number(skillData?.id),
		name: String(skillData?.name ?? ""),
		description: normalizeDescription(skillData?.description),
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
