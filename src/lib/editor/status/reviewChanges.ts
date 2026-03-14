import type { EditorSave } from "../../types/editor";

type DiffPathSegment = string | number;
type DiffPath = DiffPathSegment[];

type DiffEntry = {
	path: DiffPath;
	before: string;
	after: string;
};

export type ChangeReviewEntry = {
	label: string;
	before: string;
	after: string;
};

export type ChangeReviewGroup = {
	section: string;
	changes: ChangeReviewEntry[];
};

export type ChangeReview = {
	totalChanges: number;
	groups: ChangeReviewGroup[];
};

type UnknownRecord = Record<string, unknown>;

function prettifyKey(value: string): string {
	if (value.length === 0) {
		return "Value";
	}
	return value
		.replace(/_/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatPathSegment(segment: DiffPathSegment): string {
	if (typeof segment === "number") {
		return `#${segment + 1}`;
	}
	return prettifyKey(segment);
}

function formatValue(value: unknown): string {
	if (value === undefined) {
		return "∅";
	}
	if (value === null) {
		return "null";
	}
	if (typeof value === "string") {
		return value.length === 0 ? '""' : value;
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	try {
		const serialized = JSON.stringify(value);
		if (serialized == null) {
			return String(value);
		}
		return serialized.length > 140 ? `${serialized.slice(0, 137)}...` : serialized;
	} catch {
		return String(value);
	}
}

function sectionLabelFromPath(path: DiffPath): string {
	const root = path[0];
	if (typeof root !== "string") {
		return "General";
	}

	const mappedSections: Record<string, string> = {
		character: "Character",
		attributes: "Attributes",
		skills: "Skills",
		quests: "Quests",
		waypoints: "Waypoints",
		mercenary: "Mercenary",
		inventory: "Inventory",
		stash: "Stash",
		meta: "Meta",
	};
	return mappedSections[root] ?? prettifyKey(root);
}

function labelFromPath(path: DiffPath): string {
	if (path.length <= 1) {
		return "Value";
	}
	return path
		.slice(1)
		.map((segment) => formatPathSegment(segment))
		.join(" > ");
}

function isPlainObject(value: unknown): value is UnknownRecord {
	return value != null && typeof value === "object" && !Array.isArray(value);
}

function collectDiffs(
	originalValue: unknown,
	currentValue: unknown,
	path: DiffPath,
	diffs: DiffEntry[],
): void {
	if (Object.is(originalValue, currentValue)) {
		return;
	}

	const originalIsArray = Array.isArray(originalValue);
	const currentIsArray = Array.isArray(currentValue);
	if (originalIsArray || currentIsArray) {
		const left = originalIsArray ? originalValue : [];
		const right = currentIsArray ? currentValue : [];
		const maxLength = Math.max(left.length, right.length);
		for (let index = 0; index < maxLength; index += 1) {
			collectDiffs(left[index], right[index], [...path, index], diffs);
		}
		return;
	}

	const originalIsObject = isPlainObject(originalValue);
	const currentIsObject = isPlainObject(currentValue);
	if (originalIsObject || currentIsObject) {
		const left = originalIsObject ? originalValue : {};
		const right = currentIsObject ? currentValue : {};
		const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
		const orderedKeys = Array.from(keys).sort();
		for (const key of orderedKeys) {
			collectDiffs(left[key], right[key], [...path, key], diffs);
		}
		return;
	}

	diffs.push({
		path,
		before: formatValue(originalValue),
		after: formatValue(currentValue),
	});
}

export function buildChangeReview(
	originalSave: EditorSave | null,
	currentSave: EditorSave | null,
): ChangeReview {
	if (originalSave == null || currentSave == null) {
		return { totalChanges: 0, groups: [] };
	}

	const diffs: DiffEntry[] = [];
	collectDiffs(originalSave, currentSave, [], diffs);

	const groupsMap = new Map<string, ChangeReviewEntry[]>();
	for (const diff of diffs) {
		const section = sectionLabelFromPath(diff.path);
		if (!groupsMap.has(section)) {
			groupsMap.set(section, []);
		}
		const sectionChanges = groupsMap.get(section);
		if (sectionChanges == null) {
			throw new Error(`Missing change group for section "${section}".`);
		}
		sectionChanges.push({
			label: labelFromPath(diff.path),
			before: diff.before,
			after: diff.after,
		});
	}

	const groups = Array.from(groupsMap.entries()).map(([section, changes]) => ({
		section,
		changes,
	}));

	return {
		totalChanges: diffs.length,
		groups,
	};
}
