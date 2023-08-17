FRAMES_PER_SECOND = 25
MISSILE_PREFIX = "_MISSILE_"
MISSILE_SUFFIX = "_ENDMISSILE_"
M1_PREFIX = f"{MISSILE_PREFIX}1_"
M2_PREFIX = f"{MISSILE_PREFIX}2_"
M3_PREFIX = f"{MISSILE_PREFIX}3_"

MISSILES_LOOKUP_VALUES = [
    "HitShift",
    "MinDamage",
    "MinLevDam1"
    "MinLevDam2"
    "MinLevDam3"
    "MinLevDam4"
    "MinLevDam5"
    "MaxDamage",
    "MaxLevDam1",
    "MaxLevDam2",
    "MaxLevDam3",
    "MaxLevDam4",
    "MaxLevDam5",
    "EDmgSymPerCalc",
    "DmgSymPerCalc",
    "EMin",
    "MinELev1",
    "MinELev2",
    "MinELev3",
    "MinELev4",
    "MinELev5",
    "EMax",
    "MaxELev1",
    "MaxELev2",
    "MaxELev3",
    "MaxELev4",
    "MaxELev5" ,
    "ELen",
    "ELevLen1",
    "ELevLen2",
    "ELevLen3"
]

## mana always after lvlmana, so as not to replace lvlmana into lvl34 if skillsrow["mana"] == 34
SKILLS_LOOKUP_VALUES = [
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
    "HitShift",
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
    "ELenSymPerCalc",
    "ELen",
    "startmana",
    "minmana",
    "manashift",
    "lvlmana",
    "mana",
    "calc1",
    "calc2",
    "calc3",
    "calc4",
    "calc5",
    "calc6"
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
    minLevDam2 = "MinLevDam2 * (max(min(lvl, 16) - 8, 0))"
    minLevDam3 = "MinLevDam3 * (max(min(lvl, 22) - 16, 0))"
    minLevDam4 = "MinLevDam4 * (max(min(lvl, 28) - 22, 0))"
    minLevDam5 = "MinLevDam5 * (max(lvl - 28, 0))"

    baseDamage = f"MinDam + ({minLevDam1}) + ({minLevDam2}) + ({minLevDam3}) + ({minLevDam4}) + ({minLevDam5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + DmgSymPerCalc)/100"
    return skillDamage


def calcPhysDmgMax(skillsRow):
    maxLevDam1 = "MaxLevDam1 * (min(lvl, 8) - 1)"
    maxLevDam2 = "MaxLevDam2 * (max(min(lvl, 16) - 8, 0))"
    maxLevDam3 = "MaxLevDam3 * (max(min(lvl, 22) - 16, 0))"
    maxLevDam4 = "MaxLevDam4 * (max(min(lvl, 28) - 22, 0))"
    maxLevDam5 = "MaxLevDam5 * (max(lvl - 28, 0))"

    baseDamage = f"MaxDam + ({maxLevDam1}) + ({maxLevDam2}) + ({maxLevDam3}) + ({maxLevDam4}) + ({maxLevDam5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + DmgSymPerCalc)/100"
    return skillDamage


def calcEDmgMin(skillsRow):
    eMinLev1 = "EMinLev1 * (min(lvl, 8) - 1)"
    eMinLev2 = "EMinLev2 * (max(min(lvl, 16) - 8, 0))"
    eMinLev3 = "EMinLev3 * (max(min(lvl, 22) - 16, 0))"
    eMinLev4 = "EMinLev4 * (max(min(lvl, 28) - 22, 0))"
    eMinLev5 = "EMinLev5 * (max(lvl - 28, 0))"

    baseDamage = f"EMin + ({eMinLev1}) + ({eMinLev2}) + ({eMinLev3}) + ({eMinLev4}) + ({eMinLev5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + EDmgSymPerCalc)/100"
    return skillDamage


def calcEDmgMax(skillsRow):
    eMaxLev1 = "EMaxLev1 * (min(lvl, 8) - 1)"
    eMaxLev2 = "EMaxLev2 * (max(min(lvl, 16) - 8, 0))"
    eMaxLev3 = "EMaxLev3 * (max(min(lvl, 22) - 16, 0))"
    eMaxLev4 = "EMaxLev4 * (max(min(lvl, 28) - 22, 0))"
    eMaxLev5 = "EMaxLev5 * (max(lvl - 28, 0))"

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
    eLevLen3 = "ELevLen3 * (max(lvl - 16, 0))"

    baseLen = f"ELen + ({eLevLen1}) + ({eLevLen2}) + ({eLevLen3})"
    skillLen = f"({baseLen}) * (2 ** (HitShift - 8)) * (100 + ELenSymPerCalc)/100"
    return skillLen

def calcMissileEMin(skillsRow, descmissile):
    missilePrefix = M1_PREFIX if descmissile == 1 else M2_PREFIX if descmissile == 2 else M3_PREFIX
    minELev1 = f"MinELev1 * (min(lvl, 8) - 1)"
    minELev2 = f"MinELev2 * (max(min(lvl, 16) - 8, 0))"
    minELev3 = f"MinELev3 * (max(min(lvl, 22) - 16, 0))"
    minELev4 = f"MinELev4 * (max(min(lvl, 28) - 22, 0))"
    minELev5 = f"MinELev5 * (max(lvl - 28, 0))"

    baseDamage = f"EMin + ({minELev1}) + ({minELev2}) + ({minELev3}) + ({minELev4}) + ({minELev5})"
    skillDamage = f"{missilePrefix}({baseDamage}) * (2 ** (HitShift - 8)) * (100 + EDmgSymPerCalc)/100{MISSILE_SUFFIX}"
    return skillDamage

def calcMissileEMax(skillsRow, descmissile):
    missilePrefix = M1_PREFIX if descmissile == 1 else M2_PREFIX if descmissile == 2 else M3_PREFIX
    maxELev1 = f"MaxELev1 * (min(lvl, 8) - 1)"
    maxELev2 = f"MaxELev2 * (max(min(lvl, 16) - 8, 0))"
    maxELev3 = f"MaxELev3 * (max(min(lvl, 22) - 16, 0))"
    maxELev4 = f"MaxELev4 * (max(min(lvl, 28) - 22, 0))"
    maxELev5 = f"MaxELev5 * (max(lvl - 28, 0))"

    baseDamage = f"EMax + ({maxELev1}) + ({maxELev2}) + ({maxELev3}) + ({maxELev4}) + ({maxELev5})"
    skillDamage = f"{missilePrefix}({baseDamage}) * (2 ** (HitShift - 8)) * (100 + EDmgSymPerCalc)/100{MISSILE_SUFFIX}"
    return skillDamage


### Left to add
## mps, macr, madm, math, manc, mapi, m3en, m3ex, m2en, m2ex, m1en, m1ex

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
    "clc1": {
        "static": True,
        "value": "calc1"
    },
    "clc2": {
        "static": True,
        "value": "calc2"
    },
    "clc3": {
        "static": True,
        "value": "calc3"
    },
    "clc4": {
        "static": True,
        "value": "calc4"
    },
    "clc5": {
        "static": True,
        "value": "calc5"
    },
    "clc6": {
        "static": True,
        "value": "calc6"
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
    "dm34": {
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
    ## Use umps as mana per frame and average it over a second
    "mps": {
        "static": True,
        "value": f"(mana + lvlmana * (lvl - 1)) * (2 ** (manashift - 8)) * {FRAMES_PER_SECOND}/2"
    },
    "m1en":{
        "static": False,
        "value": calcMissileEMin,
        "arg" : 1
    },
    "m1ex": {
        "static": False,
        "value": calcMissileEMax,
        "arg" : 1
    },
    "m2en":{
        "static": False,
        "value": calcMissileEMin,
        "arg" : 2
    },
    "m2ex": {
        "static": False,
        "value": calcMissileEMax,
        "arg" : 2
    },
    "m3en":{
        "static": False,
        "value": calcMissileEMin,
        "arg" : 3
    },
    "m3ex": {
        "static": False,
        "value": calcMissileEMax,
        "arg" : 3
    },
    
}

expandKeys = expandDict.keys()

def expandExpression(expression, skillsRow):
    canExpand = True
    while canExpand:
        canExpand = False
        for key in expandKeys:
            if key in expression:
                if expandDict[key]["static"]:
                     expression = expression.replace(key, parenthesize(expandDict[key]["value"]))
                else:
                    if "arg" in expandDict[key]:   
                        expression = expression.replace(key, parenthesize(expandDict[key]["value"](skillsRow, expandDict[key]["arg"])))
                    else:
                        expression = expression.replace(key, parenthesize(expandDict[key]["value"](skillsRow)))
                canExpand = True
    return expression


def getMissilesRow(missiles, name):
    return [row for row in missiles if row["Missile"] == name][0]

def replaceLookupExpression(expression, lookupValues, fromRow):
    for lookupExp in lookupValues:
        if lookupExp in expression:
            expression = expression.replace(lookupExp, fromRow[lookupExp])
    return expression

def replaceLookupMissile(expression, skilldescRow, missiles):
    missilesRow = {}
    if M3_PREFIX in expression:
        missilesRow = getMissilesRow(missiles, skilldescRow["descmissile3"])
        expression = expression.replace(M3_PREFIX, "")
    elif M2_PREFIX in expression:
        missilesRow = getMissilesRow(missiles, skilldescRow["descmissile2"])
        expression = expression.replace(M2_PREFIX, "")
    else:
        missilesRow = getMissilesRow(missiles, skilldescRow["descmissile1"])
        expression = expression.replace(M1_PREFIX, "")
    expression = replaceLookupExpression(expression, MISSILES_LOOKUP_VALUES, missilesRow)
    expression = expression.replace(MISSILE_SUFFIX, "")
    return expression

def replaceLookup(expression, skillsRow, skilldescRow, missiles):
    ## Replace missile expressions first
    while MISSILE_PREFIX in expression:
        startMissileIndex = expression.index(MISSILE_PREFIX)
        endMissileIndex = expression.index(MISSILE_SUFFIX) + len(MISSILE_SUFFIX)
        expression = expression[0:startMissileIndex] + replaceLookupMissile(expression[startMissileIndex:endMissileIndex], skilldescRow, missiles) + expression[endMissileIndex::]
        
    replaceLookupExpression(expression, SKILLS_LOOKUP_VALUES, skillsRow)
    
    if len(expression) < 5 and not expression.isnumeric() and not expression[0] == "(":
        print(expression)
    return expression


