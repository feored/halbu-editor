# SLVL_STEPS = [2, 9, 17, 23, 28]
# SLVL_RANGE = [7, 8, 6, 5, 227]

## mana always after lvlmana, so as not to replace lvlmana into lvl34 if skillsrow["mana"] == 34
LOOKUP_VALUES = [
    "Param1",
    "Param2",
    "Param3",
    "Param4",
    "Param5",
    "Param6",
    "Param7",
    "Param8",
    "Param9",
    "Param10",
    "Param11",
    "Param12",
    "ToHitCalc",
    "LevToHit",
    "ToHit",
    "HitShift"
    "MinDam",
    "MinLevDam1",
    "MinLevDam2",
    "MinLevDam3",
    "MinLevDam4",
    "MinLevDam5",
    "MaxDam",
    "MaxLevDam1",
    "MaxLevDam2",
    "MaxLevDam3",
    "MaxLevDam4",
    "MaxLevDam5",
    "EMinLev1",
    "EMinLev2",
    "EMinLev3",
    "EMinLev4",
    "EMinLev5",
    "EMin",
    "EMaxLev1",
    "EMaxLev2",
    "EMaxLev3",
    "EMaxLev4",
    "EMaxLev5",
    "EMax",
    "EDmgSymPerCalc",
    "DmgSymPerCalc",
    "ELevLen1",
    "ELevLen2",
    "ELevLen3",
    "ELenSymPerCalc"
    "ELen",
    "minmana",
    "manashift",
    "lvlmana",
    "mana",
    
]

def isEmptyCell(cell):
    return len(cell) == 0


def parenthesize(formula):
    return "(" + formula + ")"


def calcToHit(skillsRow):
    if len(skillsRow["ToHitCalc"]) > 0:
        return "ToHitCalc"
    else:
        return "ToHit + (lvl - 1) * LevToHit"

# following calcs may actually be static but easier
# to visualize this way

def calcPhysDmgMin(skillsRow):
    # actually static
    minLevDam1 = "MinLevDam1 * (min(lvl, 8) - 1)"
    minLevDam2 = "MinLevDam2 * (max(min(lvl, 16) - 8), 0)"
    minLevDam3 = "MinLevDam3 * (max(min(lvl, 22) - 16), 0)"
    minLevDam4 = "MinLevDam4 * (max(min(lvl, 28) - 22), 0)"
    minLevDam5 = "MinLevDam5 * (max(lvl - 28), 0)"

    baseDamage = f"MinDam + ({minLevDam1}) + ({minLevDam2}) + ({minLevDam3}) + ({minLevDam4}) + ({minLevDam5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + DmgSymPerCalc)/100"
    return skillDamage


def calcPhysDmgMax(skillsRow):
    maxLevDam1 = "MaxLevDam1 * (min(lvl, 8) - 1)"
    maxLevDam2 = "MaxLevDam2 * (max(min(lvl, 16) - 8), 0)"
    maxLevDam3 = "MaxLevDam3 * (max(min(lvl, 22) - 16), 0)"
    maxLevDam4 = "MaxLevDam4 * (max(min(lvl, 28) - 22), 0)"
    maxLevDam5 = "MaxLevDam5 * (max(lvl - 28), 0)"

    baseDamage = f"MaxDam + ({maxLevDam1}) + ({maxLevDam2}) + ({maxLevDam3}) + ({maxLevDam4}) + ({maxLevDam5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + DmgSymPerCalc)/100"
    return skillDamage


def calcEDmgMin(skillsRow):
    eMinLev1 = "EMinLev1 * (min(lvl, 8) - 1)"
    eMinLev2 = "EMinLev2 * (max(min(lvl, 16) - 8), 0)"
    eMinLev3 = "EMinLev3 * (max(min(lvl, 22) - 16), 0)"
    eMinLev4 = "EMinLev4 * (max(min(lvl, 28) - 22), 0)"
    eMinLev5 = "EMinLev5 * (max(lvl - 28), 0)"

    baseDamage = f"EMin + ({eMinLev1}) + ({eMinLev2}) + ({eMinLev3}) + ({eMinLev4}) + ({eMinLev5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + EDmgSymPerCalc)/100"
    return skillDamage


def calcEDmgMax(skillsRow):
    eMaxLev1 = "EMaxLev1 * (min(lvl, 8) - 1)"
    eMaxLev2 = "EMaxLev2 * (max(min(lvl, 16) - 8), 0)"
    eMaxLev3 = "EMaxLev3 * (max(min(lvl, 22) - 16), 0)"
    eMaxLev4 = "EMaxLev4 * (max(min(lvl, 28) - 22), 0)"
    eMaxLev5 = "EMaxLev5 * (max(lvl - 28), 0)"

    baseDamage = f"EMax + ({eMaxLev1}) + ({eMaxLev2}) + ({eMaxLev3}) + ({eMaxLev4}) + ({eMaxLev5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + EDmgSymPerCalc)/100"
    return skillDamage


def calcEDmgMinMastery(skillsRow):
    dmgBeforeMastery = calcEDmgMin(skillsRow)
    mastery = ""
    if skillsRow["EType"] == "fire":
        mastery = "firemastery"
    elif skillsRow["EType"] == "ltng":
        mastery = "lightningmastery"
    else:
        return dmgBeforeMastery
    return parenthesize(dmgBeforeMastery) + f" * ((100 + {mastery})/100)"


def calcEDmgMaxMastery(skillsRow):
    dmgBeforeMastery = calcEDmgMax(skillsRow)
    mastery = ""
    if skillsRow["EType"] == "fire":
        mastery = "firemastery"
    elif skillsRow["EType"] == "ltng":
        mastery = "lightningmastery"
    else:
        return dmgBeforeMastery
    return parenthesize(dmgBeforeMastery) + f" * ((100 + {mastery})/100)"


def calcEDmgLen(skillsRow):
    eLevLen1 = "ELevLen1 * (min(lvl, 8) - 1)"
    eLevLen2 = "ELevLen2 * (max(min(lvl, 16) - 8), 0)"
    eLevLen3 = "ELevLen3 * (max(lvl, 16), 0)"

    baseLen = f"ELen + ({eLevLen1}) + ({eLevLen2}) + ({eLevLen3})"
    skillLen = f"({baseLen}) * (2 ** (HitShift - 8)) * (100 + ELenSymPerCalc)/100"
    return skillLen


expandDict = {
    "par1": {
        "static": True,
        "value": "Param1"
    },
    "par2": {
        "static": True,
        "value": "Param2"
    },
    "par3": {
        "static": True,
        "value": "Param3"
    },
    "par4": {
        "static": True,
        "value": "Param4"
    },
    "par5": {
        "static": True,
        "value": "Param5"
    },
    "par6": {
        "static": True,
        "value": "Param6"
    },
    "par7": {
        "static": True,
        "value": "Param7"
    },
    "par8": {
        "static": True,
        "value": "Param8"
    },
    "par9": {
        "static": True,
        "value": "Param9"
    },
    "par10": {
        "static": True,
        "value": "Param10"
    },
    "par11": {
        "static": True,
        "value": "Param11"
    },
    "par12": {
        "static": True,
        "value": "Param12"
    },
    "ln12": {
        "static": True,
        "value": "par1 + (lvl - 1) * par2"
    },
    "dm12": {
        "static": True,
        "value": "((110 * lvl) * (par2 - par1)) / (100 * (lvl + 6)) + par1"
    },
    "ln34": {
        "static": True,
        "value": "par3 + (lvl - 1) * par4"
    },
    "dm32": {
        "static": True,
        "value": "((110 * lvl) * (par4 - par3)) / (100 * (lvl + 6)) + par3"
    },
    "ln56": {
        "static": True,
        "value": "par5 + (lvl - 1) * par6"
    },
    "dm56": {
        "static": True,
        "value": "((110 * lvl) * (par6 - par5)) / (100 * (lvl + 6)) + par5"
    },
    "ln78": {
        "static": True,
        "value": "par7 + (lvl - 1) * par8"
    },
    "dm78": {
        "static": True,
        "value": "((110 * lvl) * (par8 - par7)) / (100 * (lvl + 6)) + par7"
    },
    "usmc": {
        "static": True,
        "value": "max((mana + lvlmana * (lvl - 1)) * (2 ** (manashift - 8)), minmana)"
    },
    "toht": {
        "static": False,
        "value": calcToHit
    },
    "pnma": {
        "static": False,
        "value": calcPhysDmgMin
    },
    "pxma": {
        "static": False,
        "value": calcPhysDmgMax
    },
    "edmn": {
        "static": False,
        "value": calcEDmgMin,
    },
    "edmx": {
        "static": False,
        "value": calcEDmgMax,
    },
    "edln": {
        "static": False,
        "value": calcEDmgLen
    },
    "enma": {
        "static": False,
        "value": calcEDmgMinMastery
    },
    "exma": {
        "static": False,
        "value": calcEDmgMaxMastery
    },
}

expandKeys = expandDict.keys()


def expandExpression(expression, skillsRow):
    canExpand = True
    while canExpand:
        canExpand = False
        for key in expandKeys:
            if key in expression:
                expression = expression.replace(key, parenthesize(
                    expandDict[key]["value"]) if expandDict[key]["static"] else parenthesize(expandDict[key]["value"](skillsRow)))
                canExpand = True
    return expression


def replaceLookup(expression, skillsRow):
    for lookupExp in LOOKUP_VALUES:
        if lookupExp in expression:
            expression = expression.replace(lookupExp, skillsRow[lookupExp])
    return expression