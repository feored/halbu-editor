import csv
import json
import os
from pathlib import Path

BASE_FOLDER = Path(__file__).parent.parent
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
    "Assassin": 251
}

# D2R has .tbl files but doesn't use them,
# instead the strings are located in
# Data\data\data\local\lng\strings

skills = []
skilldesc = []
missiles = []
strings = {}



def setupData():
    """Load all csvs/json files from the game into global variables for easy access"""
    def loadData(receiver, filename, csvdelimiter):
        with open(BASE_FOLDER / filename) as csvfile:
            reader = csv.DictReader(csvfile, delimiter=csvdelimiter)
            for row in reader:
                receiver.append(row)

    loadData(skills, SKILLS_CSV, "\t")
    loadData(skilldesc, SKILLDESC_CSV, "\t")
    loadData(missiles, MISSILES_CSV, "\t")
    for filename in STRINGS:
        with open(BASE_FOLDER / filename, encoding='utf-8-sig') as jsonFile:
            for row in json.load(jsonFile):
                strings[row["Key"]] = row["enUS"]

def saveData(name, data):
    format_json = json.dumps(data, indent=4)
    with open(BASE_FOLDER / f"{name}.json", "w") as f:
        f.write(format_json)