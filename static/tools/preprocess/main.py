#!/usr/bin/env python3

import argparse
import shutil
from pathlib import Path

from data import (
    CLASS_OFFSET,
    DEFAULT_DATA_VERSION,
    SUPPORTED_DATA_VERSIONS,
    getCurrentDataVersion,
    skills,
    skilldesc,
    strings,
    setupData,
    saveData,
)
from calcs import skillIdFromName, expand
from versions import get_version_adapter

DEBUG = False

def getVersionAdapter():
    return get_version_adapter(getCurrentDataVersion())

def getStringValue(stringKey):
    if stringKey is None or len(stringKey) == 0:
        return ""
    if stringKey in strings:
        return strings[stringKey]
    fallbackValue = getVersionAdapter().missing_string_value(stringKey)
    if fallbackValue is not None:
        return fallbackValue
    raise KeyError(f"Missing string key '{stringKey}' for data version '{getCurrentDataVersion()}'.")

def cleanupIntermediateFolders():
    preprocessFolder = Path(__file__).parent
    for cacheFolder in preprocessFolder.rglob("__pycache__"):
        if cacheFolder.is_dir():
            shutil.rmtree(cacheFolder)


def isUsableRow(skillsRow):
    """Only keep skills used by playable/handled characters"""
    return len(skillsRow["charclass"]) > 0 and getClassName(skillsRow["charclass"]) is not None


def getClassName(classString):
    classMap = {
        "ama": "Amazon",
        "sor": "Sorceress",
        "nec": "Necromancer",
        "pal": "Paladin",
        "bar": "Barbarian",
        "dru": "Druid",
        "ass": "Assassin",
        "war": "Warlock",
    }
    return classMap.get(classString)


def getStringInformation(id, charClass, skillsRow, skilldescRow):
    """Get name/description from skills.json (formerly tbl files)"""
    # Special cases in original data
    if id == 222:
        return ("Poison Creeper", "disease to all it contacts\nsummon a vine that spreads")
    if id == 223:
        return ("Werewolf", "transform into a werewolf")
    nameKey, descKey = getVersionAdapter().name_desc_keys(id, charClass, skillsRow, skilldescRow)
    return (getStringValue(nameKey), getStringValue(descKey))


def fillBasicInfo(skillsRow, finalRow):
    finalRow["skilldesc"] = skillsRow["skilldesc"]
    finalRow["class"] = getClassName(skillsRow["charclass"])
    finalRow["reqlevel"] = int(skillsRow["reqlevel"])
    finalRow["reqskills"] = []
    for i in range(1, 4):
        prereq = skillsRow["reqskill" + str(i)]
        if len(prereq) > 0:
            finalRow["reqskills"].append(skillIdFromName(prereq))

def fillDescLines(skilldescRow, skillsRow, finalRow):
    headers = ["desc", "dsc2", "dsc3"]
    maxLines = [7, 6, 8]
    for linenum in range(len(headers)):
        desc_name = headers[linenum] + "lines"
        finalRow[desc_name] = []
        for i in range(1, maxLines[linenum]):
            descLineText = headers[linenum] + "line" + str(i)
            if len(skilldescRow[descLineText]) > 0:
                descline = {}
                descline["id"] = int(skilldescRow[descLineText])
                textA = headers[linenum] + "texta" + str(i)
                if len(skilldescRow[textA]) > 0:
                    descline["texta"] = getStringValue(skilldescRow[textA])
                textB = headers[linenum] + "textb" + str(i)
                if len(skilldescRow[textB]) > 0:
                    descline["textb"] = getStringValue(skilldescRow[textB])
                calcA = headers[linenum] + "calca" + str(i)
                if len(skilldescRow[calcA]) > 0:
                    baseCalcA = skilldescRow[calcA]
                    descline["calca"]= expand(
                        baseCalcA, skillsRow, skilldescRow)
                    if DEBUG:
                        descline["base_calca"]=skilldescRow[calcA]
                calcB=headers[linenum] + "calcb" + str(i)
                if len(skilldescRow[calcB]) > 0:
                    baseCalcB=skilldescRow[calcB]
                    descline["calcb"]=expand(
                        baseCalcB, skillsRow, skilldescRow)
                    if DEBUG:
                        descline["base_calcb"]=skilldescRow[calcB]
                finalRow[desc_name].append(descline)


def makeRow(skillsRow):
    finalRow={}
    id=int(skillsRow["*Id"])
    finalRow["id"]=id
    fillBasicInfo(skillsRow, finalRow)
    finalRow["saveId"]=id - CLASS_OFFSET[finalRow["class"]]

    # strings
    # skilldesc
    skilldescRow = getVersionAdapter().skilldesc_row(id, skillsRow, skilldesc)

    # strings
    (finalRow["name"], finalRow["description"]
     ) = getStringInformation(id, finalRow["class"], skillsRow, skilldescRow)

    fillDescLines(skilldescRow, skillsRow, finalRow)

    finalRow["column"] = int(skilldescRow["SkillColumn"])
    finalRow["row"] = int(skilldescRow["SkillRow"])
    finalRow["page"] = int(skilldescRow["SkillPage"])

    # data necessary from skills.txt for damage calculation

    return finalRow


def main():
    global DEBUG
    parser = argparse.ArgumentParser()
    parser.add_argument("-d", "--debug", action="store_true")
    parser.add_argument(
        "-v",
        "--version",
        default=DEFAULT_DATA_VERSION,
        choices=sorted(SUPPORTED_DATA_VERSIONS),
        help="Game data version to preprocess.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Generate output for all supported versions.",
    )
    args = parser.parse_args()
    DEBUG = args.debug

    try:
        versions = sorted(SUPPORTED_DATA_VERSIONS) if args.all else [args.version]
        for version in versions:
            setupData(version)
            final_json = []
            for row in skills:
                if isUsableRow(row):
                    final_json.append(makeRow(row))
            saveData("skills_complete", final_json, version)
            print(f"Generated skills_complete for {version}.")
    finally:
        cleanupIntermediateFolders()


if __name__ == "__main__":
    main()
