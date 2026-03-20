import { ACT_NAMES, DIFFICULTY_NAMES, type Act, type Difficulty, type WaypointMap } from "$lib/types/editor";

export const ROGUE_ENCAMPMENT_ID = "RogueEncampment";

export const WAYPOINT_NAMES: Record<string, string> = {
	RogueEncampment: "Rogue Encampment",
	ColdPlains: "Cold Plains",
	StonyField: "Stony Field",
	DarkWood: "Dark Wood",
	BlackMarsh: "Black Marsh",
	OuterCloister: "Outer Cloister",
	Jail: "Jail",
	InnerCloister: "Inner Cloister",
	Catacombs: "Catacombs",
	LutGholein: "Lut Gholein",
	Sewers: "Sewers",
	DryHills: "Dry Hills",
	HallsOfTheDead: "Halls of the Dead",
	FarOasis: "Far Oasis",
	LostCity: "Lost City",
	PalaceCellar: "Palace Cellar",
	ArcaneSanctuary: "Arcane Sanctuary",
	CanyonOfTheMagi: "Canyon of the Magi",
	KurastDocks: "Kurast Docks",
	SpiderForest: "Spider Forest",
	GreatMarsh: "Great Marsh",
	FlayerJungle: "Flayer Jungle",
	LowerKurast: "Lower Kurast",
	KurastBazaar: "Kurast Bazaar",
	UpperKurast: "Upper Kurast",
	Travincal: "Travincal",
	DuranceOfHate: "Durance of Hate",
	PandemoniumFortress: "Pandemonium Fortress",
	CityOfTheDamned: "City of the Damned",
	RiverOfFlames: "River of Flames",
	Harrogath: "Harrogath",
	FrigidHighlands: "Frigid Highlands",
	ArreatPlateau: "Arreat Plateau",
	CrystallinePassage: "Crystalline Passage",
	HallsOfPain: "Halls of Pain",
	GlacialTrail: "Glacial Trail",
	FrozenTundra: "Frozen Tundra",
	TheAncientsWay: "The Ancients' Way",
	WorldstoneKeep: "Worldstone Keep",
};

export type WaypointProgress = {
	acquired: number;
	total: number;
	percent: number;
};

export function isDefaultWaypoint(waypointId: string): boolean {
	return waypointId === ROGUE_ENCAMPMENT_ID;
}

export function countActWaypoints(
	waypoints: WaypointMap,
	difficulty: Difficulty,
	act: Act,
): WaypointProgress {
	let acquired = 0;
	let total = 0;

	for (const waypoint of waypoints[difficulty][act].waypoints) {
		total += 1;
		if (waypoint.acquired) {
			acquired += 1;
		}
	}

	return {
		acquired,
		total,
		percent: total > 0 ? Math.round((acquired / total) * 100) : 0,
	};
}

export function countAllWaypoints(waypoints: WaypointMap): WaypointProgress {
	let acquired = 0;
	let total = 0;

	for (const difficulty of DIFFICULTY_NAMES) {
		for (const act of ACT_NAMES) {
			const progress = countActWaypoints(waypoints, difficulty, act);
			acquired += progress.acquired;
			total += progress.total;
		}
	}

	return {
		acquired,
		total,
		percent: total > 0 ? Math.round((acquired / total) * 100) : 0,
	};
}

export function setActWaypoints(
	waypoints: WaypointMap,
	difficulty: Difficulty,
	act: Act,
	acquired: boolean,
): void {
	for (const waypoint of waypoints[difficulty][act].waypoints) {
		if (isDefaultWaypoint(waypoint.id)) {
			continue;
		}
		waypoint.acquired = acquired;
	}
}