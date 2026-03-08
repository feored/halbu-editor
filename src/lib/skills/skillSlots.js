const DEFAULT_SKILL_SLOT_COUNT = 30;

function clampSkillPoints(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return 0;
	}
	return Math.max(0, Math.min(255, Math.trunc(parsed)));
}

function normalizeSkillSlot(slot, index) {
	const parsedId = Number(slot?.id);
	return {
		id: Number.isFinite(parsedId) ? parsedId : index,
		points: clampSkillPoints(slot?.points),
	};
}

export function normalizeSkillSlots(skills, slotCount = DEFAULT_SKILL_SLOT_COUNT) {
	const safeSlotCount =
		Number.isInteger(slotCount) && slotCount > 0 ? slotCount : DEFAULT_SKILL_SLOT_COUNT;
	const normalized = Array.from({ length: safeSlotCount }, (_, index) =>
		normalizeSkillSlot(null, index)
	);

	if (Array.isArray(skills)) {
		for (let index = 0; index < safeSlotCount; index++) {
			normalized[index] = normalizeSkillSlot(skills[index], index);
		}
		return normalized;
	}

	if (skills != null && Array.isArray(skills.points)) {
		for (let index = 0; index < safeSlotCount; index++) {
			normalized[index].points = clampSkillPoints(skills.points[index]);
		}
	}

	return normalized;
}

export function skillsEquivalent(left, right) {
	if (!Array.isArray(left) || !Array.isArray(right)) {
		return false;
	}
	if (left.length !== right.length) {
		return false;
	}
	for (let index = 0; index < left.length; index++) {
		if (Number(left[index]?.id) !== Number(right[index]?.id)) {
			return false;
		}
		if (clampSkillPoints(left[index]?.points) !== clampSkillPoints(right[index]?.points)) {
			return false;
		}
	}
	return true;
}

export function getSkillPoints(skills, slotIndex) {
	if (!Array.isArray(skills) || slotIndex < 0 || slotIndex >= skills.length) {
		return 0;
	}
	return clampSkillPoints(skills[slotIndex]?.points);
}

export function setSkillPoints(skills, slotIndex, nextPoints) {
	if (!Array.isArray(skills) || slotIndex < 0 || slotIndex >= skills.length) {
		return false;
	}
	const slot = normalizeSkillSlot(skills[slotIndex], slotIndex);
	slot.points = clampSkillPoints(nextPoints);
	skills[slotIndex] = slot;
	return true;
}

export function addSkillPoints(skills, slotIndex, delta) {
	const current = getSkillPoints(skills, slotIndex);
	return setSkillPoints(skills, slotIndex, current + Number(delta || 0));
}

export function refundAllSkillPoints(skills) {
	if (!Array.isArray(skills)) {
		return 0;
	}
	let refundedPoints = 0;
	for (let index = 0; index < skills.length; index++) {
		refundedPoints += getSkillPoints(skills, index);
		setSkillPoints(skills, index, 0);
	}
	return refundedPoints;
}
