#!/usr/bin/env python3

import csv
import json

SKILLS_CSV = "./skills.txt"
SKILLDESC_CSV = "./skilldesc.txt"
SKILLCALC = "./skillcalc.txt"
STRINGS = ["./skills.json", "./item-modifiers.json"]
## D2R has .tbl files but doesn't use them,
## instead the strings are located in
## Data\data\data\local\lng\strings

skills = []
skilldesc = []
skillcalc = []
strings = {}

expandDict = {
    "ln12" : "par1 + (lvl - 1) * par2",
    "dm12" : "((110 * lvl) * (par2 - par1)) / (100 * (lvl + 6)) + par1",
    "ln34" : "par3 + (lvl - 1) * par4",
    "dm32" : "((110 * lvl) * (par4 - par3)) / (100 * (lvl + 6)) + par3",
    "ln56" : "par5 + (lvl - 1) * par6",
    "dm56" : "((110 * lvl) * (par6 - par5)) / (100 * (lvl + 6)) + par5",
    "ln78" : "par7 + (lvl - 1) * par8",
    "dm78" : "((110 * lvl) * (par8 - par7)) / (100 * (lvl + 6)) + par7",
}

expandKeys = expandDict.keys()

def expandExpression(expression):
    canExpand = True
    while canExpand:
        canExpand = False
        for key in expandKeys:
            if key in expression:
                expression = expression.replace(key, expandDict[key])
                canExpand = True
    return expression
        

def setupData():
    """Load all csvs/json files from the game into global variables for easy access"""
    def loadData(receiver, filename, csvdelimiter):
         with open(filename) as csvfile:
            reader = csv.DictReader(csvfile, delimiter=csvdelimiter)
            for row in reader:
                receiver.append(row)
                
    loadData(skills, SKILLS_CSV, "\t")
    loadData(skilldesc, SKILLDESC_CSV, "\t")
    ## loadData(skillcalc, SKILLCALC_CSV, "\t")
    for filename in STRINGS:
        with open(filename, encoding='utf-8-sig') as jsonFile:
            for row in json.load(jsonFile):
                strings[row["Key"]] = row["enUS"]
    
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
        
def toSkillsParName(descPar):
    """From shorthand parameter name to skills.txt column name"""
    ## example: par8 from skilldesc.txt becomes Param8 in skill.txt col
    return "Param" + descPar[3:]

def getStringInformation(id, charClass):
    """Get name/description from skills.json (formerly tbl files)"""
    ### Special cases (typos and mistakes in strings file)
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
            finalRow["reqskills"].append(prereq)
            
def fillDescLines(skilldescRow, finalRow):
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
                    descline["base_calca"] = skilldescRow[calcA]
                    descline["calca"] = expandExpression(skilldescRow[calcA])
                calcB = headers[linenum] + "calcb" + str(i)
                if len(skilldescRow[calcB]) > 0:
                    descline["base_calcb"] = skilldescRow[calcB]
                    descline["calcb"] = expandExpression(skilldescRow[calcB])
                finalRow[desc_name].append(descline)

def makeRow(skillsRow):
    finalRow = {}
    id = int(skillsRow["*Id"])
    finalRow["id"] = id
    fillBasicInfo(skillsRow, finalRow)
            
    ## strings
    (finalRow["name"], finalRow["description"]) = getStringInformation(id, finalRow["class"])
    
    
    ##skilldesc
    skilldescRow = skilldesc[idToSkilldescId(id)]
    fillDescLines(skilldescRow, finalRow)
    
    finalRow["column"]  = skilldescRow["SkillColumn"]
    finalRow["row"]  = skilldescRow["SkillRow"]
    finalRow["page"]  = skilldescRow["SkillPage"]
    
    ## data necessary from skills.txt for damage calculation
    
            
    return finalRow

def main():
    setupData()
    final_json = []
    for row in skills:
        if isUsableRow(row):
            final_json.append(makeRow(row))
    format_json = json.dumps(final_json, indent=4)
    with open("skills_complete.json", "w") as f:
        f.write(format_json)
    print(format_json)

if __name__ == "__main__":
    main()