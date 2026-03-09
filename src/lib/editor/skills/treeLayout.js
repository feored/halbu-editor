const ROW_LEVEL_REQUIREMENTS = Object.freeze({
	1: 1,
	2: 6,
	3: 12,
	4: 18,
	5: 24,
	6: 30,
});

const LAYOUT_METRICS = Object.freeze({
	surfacePaddingX: 10,
	surfacePaddingY: 10,
	labelColumnWidth: 44,
	labelToTreeGap: 20,
	nodeWidth: 126,
	nodeHeight: 64,
	rowGap: 80,
	columnGap: 142,
	tierGuideOffset: 8,
	tierLabelOffsetY: 3,
	firstTierGuideOffset: 2,
});

function levelRequirementForRow(row) {
	const level = ROW_LEVEL_REQUIREMENTS[row];
	if (level == null) {
		throw new Error(`Unsupported skill row ${row}`);
	}
	return level;
}

function buildConnectorPath(parentNodeRect, childNodeRect) {
	const sameRow = Number(parentNodeRect.skill.row) === Number(childNodeRect.skill.row);
	if (sameRow) {
		const parentPort =
			parentNodeRect.x <= childNodeRect.x ? parentNodeRect.right_port : parentNodeRect.left_port;
		const childPort =
			parentNodeRect.x <= childNodeRect.x ? childNodeRect.left_port : childNodeRect.right_port;
		return `M ${parentPort.x} ${parentPort.y} H ${childPort.x}`;
	}

	const parentBottomPort = parentNodeRect.bottom_port;
	const childTopPort = childNodeRect.top_port;
	const midpointY = (parentBottomPort.y + childTopPort.y) / 2;
	return `M ${parentBottomPort.x} ${parentBottomPort.y} V ${midpointY} H ${childTopPort.x} V ${childTopPort.y}`;
}

function nodeRectangleForSkill(skill) {
	const row = Number(skill.row);
	const column = Number(skill.column);
	if (!Number.isInteger(row) || row < 1) {
		throw new Error(`Invalid skill row ${row}`);
	}
	if (!Number.isInteger(column) || column < 1) {
		throw new Error(`Invalid skill column ${column}`);
	}

	const treeStartX = LAYOUT_METRICS.labelColumnWidth + LAYOUT_METRICS.labelToTreeGap;
	const x = treeStartX + (column - 1) * LAYOUT_METRICS.columnGap;
	const y = LAYOUT_METRICS.surfacePaddingY + (row - 1) * LAYOUT_METRICS.rowGap;
	const width = LAYOUT_METRICS.nodeWidth;
	const height = LAYOUT_METRICS.nodeHeight;

	return {
		id: Number(skill.id),
		skill,
		x,
		y,
		width,
		height,
		top_port: {
			x: x + width / 2,
			y,
		},
		bottom_port: {
			x: x + width / 2,
			y: y + height,
		},
		left_port: {
			x,
			y: y + height / 2,
		},
		right_port: {
			x: x + width,
			y: y + height / 2,
		},
	};
}

export function computeTreeLayout({ skills, selectedSkillId }) {
	if (!Array.isArray(skills) || skills.length === 0) {
		return {
			canvasWidth: 0,
			canvasHeight: 0,
			tierGuides: [],
			connectors: [],
			nodeRects: [],
			metrics: LAYOUT_METRICS,
		};
	}

	const nodeRects = skills.map(nodeRectangleForSkill);
	const rectBySkillId = new Map(nodeRects.map((nodeRect) => [nodeRect.id, nodeRect]));
	const maxRow = Math.max(...skills.map((skill) => Number(skill.row)));
	const maxColumn = Math.max(...skills.map((skill) => Number(skill.column)));

	const canvasWidth =
		LAYOUT_METRICS.labelColumnWidth +
		LAYOUT_METRICS.labelToTreeGap +
		(maxColumn - 1) * LAYOUT_METRICS.columnGap +
		LAYOUT_METRICS.nodeWidth +
		LAYOUT_METRICS.surfacePaddingX;
	const canvasHeight =
		LAYOUT_METRICS.surfacePaddingY +
		(maxRow - 1) * LAYOUT_METRICS.rowGap +
		LAYOUT_METRICS.nodeHeight +
		LAYOUT_METRICS.surfacePaddingY;

	const connectors = [];
	for (const skill of skills) {
		const childNodeRect = rectBySkillId.get(Number(skill.id));
		for (const prerequisiteId of skill.reqskills) {
			const parentNodeRect = rectBySkillId.get(Number(prerequisiteId));
			if (parentNodeRect == null) {
				throw new Error(
					`Missing prerequisite node ${prerequisiteId} for skill ${skill.id} in rendered tree`
				);
			}
			connectors.push({
				key: `${prerequisiteId}-${skill.id}`,
				path: buildConnectorPath(parentNodeRect, childNodeRect),
				leadingToSelected: Number(skill.id) === Number(selectedSkillId),
			});
		}
	}

	const treeStartX = LAYOUT_METRICS.labelColumnWidth + LAYOUT_METRICS.labelToTreeGap;
	const tierGuides = [];
	for (let row = 1; row <= maxRow; row++) {
		const rowY = LAYOUT_METRICS.surfacePaddingY + (row - 1) * LAYOUT_METRICS.rowGap;
		const lineY =
			row === 1
				? rowY - LAYOUT_METRICS.firstTierGuideOffset
				: rowY - LAYOUT_METRICS.tierGuideOffset;
		tierGuides.push({
			row,
			level: levelRequirementForRow(row),
			lineY,
			labelX: LAYOUT_METRICS.labelColumnWidth - 4,
			labelY: lineY + LAYOUT_METRICS.tierLabelOffsetY,
			lineX1: treeStartX,
			lineX2: canvasWidth - LAYOUT_METRICS.surfacePaddingX,
		});
	}

	return {
		canvasWidth,
		canvasHeight,
		tierGuides,
		connectors,
		nodeRects,
		metrics: LAYOUT_METRICS,
	};
}
