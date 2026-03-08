import csv
import json
from pathlib import Path

STATIC_FOLDER = Path(__file__).resolve().parents[2]
RAW_VERSIONS_FOLDER = STATIC_FOLDER / "data" / "raw" / "versions"
GENERATED_SKILLS_FOLDER = STATIC_FOLDER / "data" / "generated" / "skills"
DEFAULT_DATA_VERSION = "v99"
SUPPORTED_DATA_VERSIONS = {"v99", "v105"}
CURRENT_DATA_VERSION = DEFAULT_DATA_VERSION
SKILLS_CSV = "skills.txt"
SKILLDESC_CSV = "skilldesc.txt"
MISSILES_CSV = "missiles.txt"
STRINGS = ["skills.json", "item-modifiers.json"]

CLASS_OFFSET = {
    "Amazon": 6,
    "Sorceress": 36,
    "Necromancer": 66,
    "Paladin": 96,
    "Barbarian": 126,
    "Druid": 221,
    "Assassin": 251,
    "Warlock": 373,
}

# D2R has .tbl files but doesn't use them,
# instead the strings are located in
# Data\data\data\local\lng\strings

skills = []
skilldesc = []
missiles = []
strings = {}

typos = {
    "skills":{
        "columnId": "skill",
        "Fire Wall":
        {
            "EDmgSymPerCalc": "(skill('Warmth'.blvl)*par8+skill('Inferno'.blvl)*par7)"
        },
        "Blade Sentinel":
        {
            "passivecalc6": "stat('item_pierce_cold_immunity'.accr)"
        },
        "Summon Goatman":
        {
            "passivecalc3": "(ln56 + (skill('Demonic Mastery'.ln21)))"
        },
        "Summon Tainted":
        {
            "passivecalc2": "(ln91 + (skill('Demonic Mastery'.ln21)))"
        },
        "Summon Defiler":
        {
            "passivecalc2": "par2*((lvl - 1) + (skill('Demonic Mastery'.blvl)))"
        },
        "Health Link":
        {
            "calc2": "((110 *skill('Summon Defiler'.lvl) * (par4 - par3)) / (100 * (skill('Summon Defiler'.lvl) + 6)) + par3)"
        }
    },
    "skilldesc":{
        "columnId": "skilldesc",
        "inferno sentry": { # 211
            "dsc2calca2" : "ln34/2 + skill('Wake of Fire Sentry'.blvl)"
        },
        "demonic mastery": {
            "desccalca3": "min(ln12,25)"
        },
        "summon defiler": {
            "desccalca4": "((110 *sklvl('Summon Defiler'.lvl.lvl) * (sklvl('Health Link'.lvl.par2) - sklvl('Health Link'.lvl.par1))) / (100 * (sklvl('Summon Defiler'.lvl.lvl) + 6)) + sklvl('Health Link'.lvl.par1))",
            "desccalca5": "((110 *sklvl('Summon Defiler'.lvl.lvl) * (sklvl('Health Link'.lvl.par4) - sklvl('Health Link'.lvl.par3))) / (100 * (sklvl('Summon Defiler'.lvl.lvl) + 6)) + sklvl('Health Link'.lvl.par3))"
        },
        "royal strike": { # 219, not typos but use custom EDXS value instead
            "desccalca3": "miss('royalstrikemeteorfire'.EDNS)*3*25*(mael+100)/100/256",
            "desccalcb3": "miss('royalstrikemeteorfire'.EDXS)*3*25*(mael+100)/100/256"
        }
    }
}

def fixTypos(file, data):
    columnId = typos[file]["columnId"]
    for row in data:
        if row[columnId] in typos[file]:
            for key in typos[file][row[columnId]].keys():
                row[key] = typos[file][row[columnId]][key]
    return data

def normalizeDataVersion(dataVersion):
    if dataVersion in SUPPORTED_DATA_VERSIONS:
        return dataVersion
    raise ValueError(
        f"Unsupported data version '{dataVersion}'. Supported versions: {sorted(SUPPORTED_DATA_VERSIONS)}"
    )

def getDataFolder(dataVersion):
    return RAW_VERSIONS_FOLDER / dataVersion

def resolveDataPath(dataFolder, filename):
    # Allow partial version folders: try requested version, then default version, then legacy /static.
    versionPath = dataFolder / filename
    if versionPath.is_file():
        return versionPath
    defaultVersionPath = RAW_VERSIONS_FOLDER / DEFAULT_DATA_VERSION / filename
    if defaultVersionPath.is_file():
        return defaultVersionPath
    return STATIC_FOLDER / filename

def setupData(dataVersion=DEFAULT_DATA_VERSION):
    """Load all csvs/json files from the game into global variables for easy access"""
    global skills, skilldesc, missiles, strings, CURRENT_DATA_VERSION
    dataVersion = normalizeDataVersion(dataVersion)
    CURRENT_DATA_VERSION = dataVersion
    dataFolder = getDataFolder(dataVersion)
    skills.clear()
    skilldesc.clear()
    missiles.clear()
    strings.clear()

    def loadData(receiver, filename, csvdelimiter):
        with open(resolveDataPath(dataFolder, filename), encoding="utf-8-sig") as csvfile:
            reader = csv.DictReader(csvfile, delimiter=csvdelimiter)
            for row in reader:
                receiver.append(row)

    loadData(skills, SKILLS_CSV, "\t")
    skills = fixTypos("skills", skills)
    loadData(skilldesc, SKILLDESC_CSV, "\t")
    skilldesc = fixTypos("skilldesc", skilldesc)
    loadData(missiles, MISSILES_CSV, "\t")
    for filename in STRINGS:
        with open(resolveDataPath(dataFolder, filename), encoding='utf-8-sig') as jsonFile:
            for row in json.load(jsonFile):
                strings[row["Key"]] = row["enUS"]

def saveData(name, data, dataVersion=DEFAULT_DATA_VERSION):
    dataVersion = normalizeDataVersion(dataVersion)
    format_json = json.dumps(data, indent=4)
    outputFolder = GENERATED_SKILLS_FOLDER / dataVersion
    outputFolder.mkdir(parents=True, exist_ok=True)
    with open(outputFolder / f"{name}.json", "w", encoding="utf-8") as f:
        f.write(format_json)

def getCurrentDataVersion():
    return CURRENT_DATA_VERSION
