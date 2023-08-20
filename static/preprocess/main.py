#!/usr/bin/env python3

import csv
import json
import sys

from data import skills, skilldesc, strings, CLASS_OFFSET, setupData, saveData
from calcs import expandExpression, replaceLookup, skillIdFromName, replaceLookupSynergies

DEBUG = False

def idToSkilldescId(id):
    """From skills.txt row number to skilldesc.txt row number"""
    if id <= 155:
        return id
    else:
        return id-61


def isUsableRow(skillsRow):
    """Only keep skills used by playable characters"""
    return len(skillsRow["charclass"]) > 0


def isExpansion(charClass):
    """Skill added with expansion or in base game"""
    return charClass == "Assassin" or charClass == "Druid"


def getClassName(classString):
    match classString:
        case "ama":
            return "Amazon"
        case "sor":
            return "Sorceress"
        case "nec":
            return "Necromancer"
        case "pal":
            return "Paladin"
        case "bar":
            return "Barbarian"
        case "dru":
            return "Druid"
        case "ass":
            return "Assassin"


def getStringInformation(id, charClass):
    """Get name/description from skills.json (formerly tbl files)"""
    # Special cases (typos and mistakes in strings file)
    if id == 61:
        return (strings["skillsname" + str(id)], strings["skillld" + str(id)])
    elif id == 222:
        return ("Poison Creeper", "disease to all it contacts\nsummon a vine that spreads")
    elif id == 223:
        return ("Werewolf", "transform into a werewolf")
    name_base = "skillname"
    desc_base = "skillld"
    row_id = id
    if isExpansion(charClass):
        row_id += 1
        name_base = name_base.capitalize()
        desc_base = desc_base.capitalize()
    return (strings[name_base + str(row_id)], strings[desc_base + str(row_id)])


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
                descline["id"] = skilldescRow[descLineText]
                textA = headers[linenum] + "texta" + str(i)
                if len(skilldescRow[textA]) > 0:
                    descline["texta"] = strings[skilldescRow[textA]]
                textB = headers[linenum] + "textb" + str(i)
                if len(skilldescRow[textB]) > 0:
                    descline["textb"] = strings[skilldescRow[textB]]
                calcA = headers[linenum] + "calca" + str(i)
                if len(skilldescRow[calcA]) > 0:
                    expandedCalcA = expandExpression(
                        skilldescRow[calcA], skillsRow)
                    descline["calca"] = replaceLookup(
                        expandedCalcA, skillsRow, skilldescRow)
                    if DEBUG:
                        descline["base_calca"] = skilldescRow[calcA]
                        descline["expanded_calca"] = expandedCalcA
                calcB = headers[linenum] + "calcb" + str(i)
                if len(skilldescRow[calcB]) > 0:
                    expandedCalcB = expandExpression(
                        skilldescRow[calcB], skillsRow)
                    descline["calb"] = replaceLookup(
                        expandedCalcB, skillsRow, skilldescRow)
                    if DEBUG:
                        descline["base_calcb"] = skilldescRow[calcB]
                        descline["expanded_calcb"] = expandedCalcB
                finalRow[desc_name].append(descline)


def makeRow(skillsRow):
    finalRow = {}
    id = int(skillsRow["*Id"])
    finalRow["id"] = id
    fillBasicInfo(skillsRow, finalRow)
    finalRow["saveId"] = id - CLASS_OFFSET[finalRow["class"]]

    # strings
    (finalRow["name"], finalRow["description"]
     ) = getStringInformation(id, finalRow["class"])

    # skilldesc
    skilldescRow = skilldesc[idToSkilldescId(id)]
    fillDescLines(skilldescRow, skillsRow, finalRow)

    finalRow["column"] = int(skilldescRow["SkillColumn"])
    finalRow["row"] = int(skilldescRow["SkillRow"])
    finalRow["page"] = int(skilldescRow["SkillPage"])

    # data necessary from skills.txt for damage calculation

    return finalRow


def main():
    global DEBUG
    if len(sys.argv) > 1 and (str(sys.argv[1]).lower() == "--debug" or str(sys.argv[1]).lower() == "-d"):
        DEBUG = True
    setupData()
    final_json = []
    for row in skills:
        if isUsableRow(row):
            final_json.append(makeRow(row))
    saveData("skills_complete", final_json)


if __name__ == "__main__":
    main()
