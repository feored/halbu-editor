import type { SkillData } from "./skillTypes";

const ROW_LEVEL_REQUIREMENTS: Record<number, number> = {
	1: 1,
	2: 6,
	3: 12,
	4: 18,
	5: 24,
	6: 30,
};

const LAYOUT_METRICS = {
	surfacePaddingX: 10,
	surfacePaddingY: 10,
	labelColumnWidth: 44,
	labelToTreeGap: 24,
	nodeWidth: 126,
	nodeHeight: 64,
	rowGap: 80,
	columnGap: 156,
	tierGuideOffset: 8,
	tierLabelOffsetY: 3,
	firstTierGuideOffset: 2,
} as const;

type Point = {
	x: number;
	y: number;
};

type NodeRect = {
	id: number;
	skill: SkillData;
	x: number;
	y: number;
	width: number;
	height: number;
	topPort: Point;
	bottomPort: Point;
	leftPort: Point;
	rightPort: Point;
};

type Connector = {
	key: string;
	path: string;
	leadingToSelected: boolean;
};

type TierGuide = {
	row: number;
	level: number;
	lineY: number;
	labelX: number;
	labelY: number;
	lineX1: number;
	lineX2: number;
};

export type TreeLayout = {
	canvasWidth: number;
	canvasHeight: number;
	tierGuides: TierGuide[];
	connectors: Connector[];
	nodeRects: NodeRect[];
	metrics: typeof LAYOUT_METRICS;
};

function levelRequirementForRow(row: number): number {
	const level = ROW_LEVEL_REQUIREMENTS[row];
	if (level == null) {
		throw new Error(`Unsupported skill row ${row}`);
	}
	return level;
}

function buildConnectorPath(parentNodeRect: NodeRect, childNodeRect: NodeRect): string {
	const sameRow = parentNodeRect.skill.row === childNodeRect.skill.row;
	if (sameRow) {
		const parentPort =
			parentNodeRect.x <= childNodeRect.x
				? parentNodeRect.rightPort
				: parentNodeRect.leftPort;
		const childPort =
			parentNodeRect.x <= childNodeRect.x
				? childNodeRect.leftPort
				: childNodeRect.rightPort;
		return `M ${parentPort.x} ${parentPort.y} H ${childPort.x}`;
	}

	const parentBottomPort = parentNodeRect.bottomPort;
	const childTopPort = childNodeRect.topPort;
	const midpointY = (parentBottomPort.y + childTopPort.y) / 2;
	return `M ${parentBottomPort.x} ${parentBottomPort.y} V ${midpointY} H ${childTopPort.x} V ${childTopPort.y}`;
}

function nodeRectangleForSkill(skill: SkillData): NodeRect {
	const row = skill.row;
	const column = skill.column;
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
		id: skill.id,
		skill,
		x,
		y,
		width,
		height,
		topPort: {
			x: x + width / 2,
			y,
		},
		bottomPort: {
			x: x + width / 2,
			y: y + height,
		},
		leftPort: {
			x,
			y: y + height / 2,
		},
		rightPort: {
			x: x + width,
			y: y + height / 2,
		},
	};
}

export function buildTreeLayout({
	skills,
	selectedSkillId,
}: {
	skills: readonly SkillData[];
	selectedSkillId: number | null;
}): TreeLayout {
	const nodeRects = skills.map(nodeRectangleForSkill);
	const rectBySkillId = new Map(nodeRects.map((nodeRect) => [nodeRect.id, nodeRect]));
	const maxRow = Math.max(...skills.map((skill) => skill.row));
	const maxColumn = Math.max(...skills.map((skill) => skill.column));

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

	const connectors: Connector[] = [];
	for (const skill of skills) {
		const childNodeRect = rectBySkillId.get(skill.id);
		if (childNodeRect == null) {
			throw new Error(`Missing node rectangle for skill ${skill.id}`);
		}
		for (const prerequisiteId of skill.reqskills) {
			const parentNodeRect = rectBySkillId.get(prerequisiteId);
			if (parentNodeRect == null) {
				throw new Error(
					`Missing prerequisite node ${prerequisiteId} for skill ${skill.id} in rendered tree`,
				);
			}
			connectors.push({
				key: `${prerequisiteId}-${skill.id}`,
				path: buildConnectorPath(parentNodeRect, childNodeRect),
				leadingToSelected: skill.id === selectedSkillId,
			});
		}
	}

	const treeStartX = LAYOUT_METRICS.labelColumnWidth + LAYOUT_METRICS.labelToTreeGap;
	const tierGuides: TierGuide[] = [];
	for (let row = 1; row <= maxRow; row += 1) {
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
