import re

from data import skills, skilldesc, missiles

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
    "ELevLen3",
    "LevRange",
    "Range"
]

## mana always after lvlmana, so as not to replace lvlmana into lvl34 if skillsrow["mana"] == 34
SKILLS_LOOKUP_VALUES = [
    "Param10",
    "Param11",
    "Param12",
    "Param1",
    "Param2",
    "Param3",
    "Param4",
    "Param5",
    "Param6",
    "Param7",
    "Param8",
    "Param9",
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
    "calc6",
    "auralencalc"
]


def getRow(name, table, tableNameCol):
    for row in table:
        if row[tableNameCol] == name:
            return row
    return None

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
    return parenthesize(skillDamage)


def calcPhysDmgMax(skillsRow):
    maxLevDam1 = "MaxLevDam1 * (min(lvl, 8) - 1)"
    maxLevDam2 = "MaxLevDam2 * (max(min(lvl, 16) - 8, 0))"
    maxLevDam3 = "MaxLevDam3 * (max(min(lvl, 22) - 16, 0))"
    maxLevDam4 = "MaxLevDam4 * (max(min(lvl, 28) - 22, 0))"
    maxLevDam5 = "MaxLevDam5 * (max(lvl - 28, 0))"

    baseDamage = f"MaxDam + ({maxLevDam1}) + ({maxLevDam2}) + ({maxLevDam3}) + ({maxLevDam4}) + ({maxLevDam5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + DmgSymPerCalc)/100"
    return parenthesize(skillDamage)


def calcEDmgMin(skillsRow):
    eMinLev1 = "EMinLev1 * (min(lvl, 8) - 1)"
    eMinLev2 = "EMinLev2 * (max(min(lvl, 16) - 8, 0))"
    eMinLev3 = "EMinLev3 * (max(min(lvl, 22) - 16, 0))"
    eMinLev4 = "EMinLev4 * (max(min(lvl, 28) - 22, 0))"
    eMinLev5 = "EMinLev5 * (max(lvl - 28, 0))"

    baseDamage = f"EMin + ({eMinLev1}) + ({eMinLev2}) + ({eMinLev3}) + ({eMinLev4}) + ({eMinLev5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + EDmgSymPerCalc)/100"
    return parenthesize(skillDamage)


def calcEDmgMax(skillsRow):
    eMaxLev1 = "EMaxLev1 * (min(lvl, 8) - 1)"
    eMaxLev2 = "EMaxLev2 * (max(min(lvl, 16) - 8, 0))"
    eMaxLev3 = "EMaxLev3 * (max(min(lvl, 22) - 16, 0))"
    eMaxLev4 = "EMaxLev4 * (max(min(lvl, 28) - 22, 0))"
    eMaxLev5 = "EMaxLev5 * (max(lvl - 28, 0))"

    baseDamage = f"EMax + ({eMaxLev1}) + ({eMaxLev2}) + ({eMaxLev3}) + ({eMaxLev4}) + ({eMaxLev5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + EDmgSymPerCalc)/100"
    return parenthesize(skillDamage)

def getMastery(etype):
    if etype.lower() == "fire":
        return "firemastery"
    elif etype.lower() == "ltng":
        return "lightningmastery"
    else:
        return None

def calcEDmgMinMastery(skillsRow):
    dmgBeforeMastery = calcEDmgMin(skillsRow)
    mastery = getMastery(skillsRow["EType"])
    if not mastery:
        return dmgBeforeMastery
    return parenthesize(dmgBeforeMastery + f" * ((100 + {mastery})/100)")


def calcEDmgMaxMastery(skillsRow):
    dmgBeforeMastery = calcEDmgMax(skillsRow)
    mastery = getMastery(skillsRow["EType"])
    if not mastery:
        return dmgBeforeMastery
    return parenthesize(dmgBeforeMastery + f" * ((100 + {mastery})/100)")

def calcEDmgMinGen(skillsRow, expression):
    if "miss(" in expression:
        ## it's a missile
        return calcMissileEMin(skillsRow)
    else:
        return calcEDmgMin(skillsRow)

def calcEDmgLen(skillsRow):
    eLevLen1 = "ELevLen1 * (min(lvl, 8) - 1)"
    eLevLen2 = "ELevLen2 * (max(min(lvl, 16) - 8), 0)"
    eLevLen3 = "ELevLen3 * (max(lvl - 16, 0))"

    baseLen = f"ELen + ({eLevLen1}) + ({eLevLen2}) + ({eLevLen3})"
    skillLen = f"({baseLen}) * (2 ** (HitShift - 8)) * (100 + ELenSymPerCalc)/100"
    return parenthesize(skillLen)

def calcMissileEMin(skillsRow):
    minELev1 = f"MinELev1 * (min(lvl, 8) - 1)"
    minELev2 = f"MinELev2 * (max(min(lvl, 16) - 8, 0))"
    minELev3 = f"MinELev3 * (max(min(lvl, 22) - 16, 0))"
    minELev4 = f"MinELev4 * (max(min(lvl, 28) - 22, 0))"
    minELev5 = f"MinELev5 * (max(lvl - 28, 0))"

    baseDamage = f"EMin + ({minELev1}) + ({minELev2}) + ({minELev3}) + ({minELev4}) + ({minELev5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + EDmgSymPerCalc)/100"
    return parenthesize(skillDamage)

def calcMissileEMax(skillsRow):
    maxELev1 = f"MaxELev1 * (min(lvl, 8) - 1)"
    maxELev2 = f"MaxELev2 * (max(min(lvl, 16) - 8, 0))"
    maxELev3 = f"MaxELev3 * (max(min(lvl, 22) - 16, 0))"
    maxELev4 = f"MaxELev4 * (max(min(lvl, 28) - 22, 0))"
    maxELev5 = f"MaxELev5 * (max(lvl - 28, 0))"

    baseDamage = f"EMax + ({maxELev1}) + ({maxELev2}) + ({maxELev3}) + ({maxELev4}) + ({maxELev5})"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + EDmgSymPerCalc)/100"
    return parenthesize(skillDamage)

def calcDescMissileEMin(skillsRow, descmissile):
    missilePrefix = M1_PREFIX if descmissile == 1 else M2_PREFIX if descmissile == 2 else M3_PREFIX
    damage = calcMissileEMin(skillsRow)
    return parenthesize(f"{missilePrefix}{damage}{MISSILE_SUFFIX}")

def calcDescMissileEMax(skillsRow, descmissile):
    missilePrefix = M1_PREFIX if descmissile == 1 else M2_PREFIX if descmissile == 2 else M3_PREFIX
    damage = calcMissileEMax(skillsRow)
    return parenthesize(f"{missilePrefix}{damage}{MISSILE_SUFFIX}")

def calcEDNS(skillsRow):
    return parenthesize(calcMissileEMin(skillsRow) + " * 256")

def calcEDXS(skillsRow):
    return parenthesize(calcMissileEMax(skillsRow) + " * 256")

def linear(skillsRow, whichLn):
    a, b = "", ""
    match whichLn:
        case 12:
            a = "par1"
            b = "par2"
        case 34:
            a = "par3"
            b = "par4"
        case 56:
            a = "par5"
            b = "par6"
        case 78:
            a = "par7"
            b = "par8"
        case 91:
            a = "par9"
            b = "par10"
    return f"({a} + (lvl - 1) * {b})"

def diminishing(skillsRow, whichDm):
    a, b = "", ""
    match whichDm:
        case 12:
            a = "par1"
            b = "par2"
        case 34:
            a = "par3"
            b = "par4"
        case 56:
            a = "par5"
            b = "par6"
        case 78:
            a = "par7"
            b = "par8"
        case 91:
            a = "par9"
            b = "par10"
    return parenthesize(f"floor(floor((110 * lvl) / (lvl + 6)) * (({b} - {a}) / 100)) + {a}")

expandDict = {
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
        "static": False,
        "value": linear,
        "arg": 12
    },
    "dm12": {
        "static": False,
        "value": diminishing,
        "arg": 12
    },
    "ln34": {
        "static": False,
        "value": linear,
        "arg": 34
    },
    "dm34": {
        "static": False,
        "value": diminishing,
        "arg": 34
    },
    "ln56": {
        "static": False,
        "value": linear,
        "arg": 56
    },
    "dm56": {
        "static": False,
        "value": diminishing,
        "arg": 56
    },
    "ln78": {
        "static": False,
        "value": linear,
        "arg": 78
    },
    "dm78": {
        "static": False,
        "value": diminishing,
        "arg": 78
    },
    "dm91": {
        "static": False,
        "value": diminishing,
        "arg": 91
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
        "value": calcDescMissileEMin,
        "arg" : 1
    },
    "m1ex": {
        "static": False,
        "value": calcDescMissileEMax,
        "arg" : 1
    },
    "m2en":{
        "static": False,
        "value": calcDescMissileEMin,
        "arg" : 2
    },
    "m2ex": {
        "static": False,
        "value": calcDescMissileEMax,
        "arg" : 2
    },
    "m3en":{
        "static": False,
        "value": calcDescMissileEMin,
        "arg" : 3
    },
    "m3ex": {
        "static": False,
        "value": calcDescMissileEMax,
        "arg" : 3
    },
    ## Use @ symbol to avoid looping over len -> auralencalc -> auraauralencalccalc -> ...
    "len": {
        "static": True,
        "value": "aurale@ncalc"
    },
    "macr": {
        "static": True,
        "value": "dm56"
    },
    "madm": {
        "static": True,
        "value": "ln34"
    },
    "math": {
        "static": True,
        "value": "ln12"
    },
    "manc": {
        "static": True,
        "value": "dm91"
    },
    "mapi": {
        "static": True,
        "value":"dm78"
    },
    "edns":  {
        "static": True,
        "value": "(edmn * 256)"
    },
    "edxs": {
        "static": True,
        "value": "(edmx * 256)"
    },
    "rang": {
        "static": True,
        "value": f"((Range + lvl * LevRange) / {FRAMES_PER_SECOND})"
    },
    "mael": {
        "static": True,
        ## Avoid infinte loop of mael replacement
        "value": f"{M1_PREFIX}ma@el{MISSILE_SUFFIX}"
    },
    "m1rn": {
        "static": True,
        "value": f"{M1_PREFIX}rang{MISSILE_SUFFIX}"
    },
    "m2rn": {
        "static": True,
        "value": f"{M2_PREFIX}rang{MISSILE_SUFFIX}"
    },
    "m3rn": {
        "static": True,
        "value": f"{M3_PREFIX}rang{MISSILE_SUFFIX}"
    },
    "m1eo": {
        "static": True,
        "value": "(m1en * 256)"
    },
    "m1ey": {
        "static": True,
        "value": "(m1ex * 256)"
    },
    "m2eo": {
        "static": True,
        "value": "(m2en * 256)"
    },
    "m2ey": {
        "static": True,
        "value": "(m2ex * 256)"
    },
    "m3eo": { ## is actually described as me3o in skillcalc but no examples to go off so probably a typo
        "static": True,
        "value": "(m3en * 256)"
    },
    "m3ey": { ## same as above
        "static": True,
        "value": "(m3ex * 256)"
    },
    "enms" : {
        "static": True,
        "value": "(enma * 256)"
    },
    "exms": {
        "static": True,
        "value": "(exma * 256)"
    },
    ## custom values
    "EDNS": {
        "static": False,
        "value": calcEDNS
    },
    "EDXS":{
        "static": False,
        "value": calcEDXS
    },    
    "eruption center": {
        "static": True,
        "value": "erruption center" ## typo in game files...
    }
}

expandKeys = expandDict.keys()


def expandExpressionMax(expression, skillsRow):
    oldExpression = expression
    canExpand = True
    while canExpand:
        expression = expandExpressionOnce(expression, skillsRow)
        if expression == oldExpression:
            canExpand = False
        else:
            oldExpression = expression
    return expression

def expandExpressionOnce(expression, skillsRow):
    for key in expandKeys:
        if key in expression:
            if expandDict[key]["static"]:
                    expression = expression.replace(key, expandDict[key]["value"])
            else:
                if "arg" in expandDict[key]:   
                    expression = expression.replace(key, expandDict[key]["value"](skillsRow, expandDict[key]["arg"]))
                else:
                    expression = expression.replace(key, expandDict[key]["value"](skillsRow))
    return expression

    
def expand(expression, skillsRow, skilldescRow):
    oldExpression = expression
    canExpand = True
    while canExpand:
        expression = expandExpressionOnce(expression, skillsRow)
        expression = replaceLookupSpecificMissile(expression, skillsRow)
        expression = replaceLookupSynergies(expression, skillsRow)
        expression = replaceLookup(expression, skillsRow, skilldescRow)
        if expression == oldExpression:
            canExpand = False
        else:
            oldExpression = expression
    expression = expression.replace("@", "")
    return expression


def skillIdFromName(skillName):
    skillName = skillName.lower()
    for row in skills:
        if row["skill"].lower() == skillName:
            return int(row["*Id"]) 
    return -1


def findParenthesesMatchedExpressions(expression, starterPattern):
    currentIndex = 0
    extractedExpressions = []
    while starterPattern in expression[currentIndex:]:
        patternIndex = currentIndex + expression[currentIndex:].index(starterPattern)
        openPar, closedPar = 0, 0
        for i in range(len(expression[patternIndex:])):
            if expression[patternIndex:][i] == "(":
                openPar += 1
            elif expression[patternIndex:][i] == ")":
                closedPar += 1
                if openPar > 0 and openPar == closedPar:
                    break
        currentIndex = patternIndex+i+1
        extractedExpressions.append(expression[patternIndex:currentIndex])
    return extractedExpressions
        
def replaceLookupSynergies(expression, skillsRow):
    def replaceLevel(syn, skillId):
        ## Replace lvl with slvl(x) and blvl with blvl(x)
        extractedLevels = re.findall(r"(^lvl)", syn)
        for x in extractedLevels:
            syn = syn.replace(x, f"slvl({skillId})")
        extractedLevels = re.findall(r"([^bs])(lvl)", syn)
        for x in extractedLevels:
            syn = syn.replace(x[0] + x[1], x[0] + f"slvl({skillId})")
        extractedBaseLevels = re.findall(r"(blvl)", syn)
        for x in extractedBaseLevels:
            syn = syn.replace(x, f"blvl({skillId})")
        return syn
    extractedSynergies = findParenthesesMatchedExpressions(expression, "skill(")
                    
    for synergy in extractedSynergies:
        nameStartIndex = synergy.index("'") + 1
        nameEndIndex = nameStartIndex + synergy[nameStartIndex:].index("'")
        synergyName = synergy[nameStartIndex:nameEndIndex]
        synergyId = skillIdFromName(synergyName)
        replacedSynergy = synergy[nameEndIndex+2:-1] ## turn skill('Golem Mastery'.ln56) into ln56
        replacedSynergy = expandExpressionMax(replacedSynergy, skillsRow)
        replacedSynergy = replaceLookupExpression(replacedSynergy, SKILLS_LOOKUP_VALUES, skills[synergyId])
        replacedSynergy = replaceLevel(replacedSynergy, synergyId)
        finalSynergy = f"synergy('{replacedSynergy}')"
        expression = expression.replace(synergy, finalSynergy)
    ## Ex Edmgsympercalc = (skill('Lightning Strike'.blvl)+skill('Lightning Bolt'.blvl)+skill('Charged Strike'.blvl)) * par8
    return expression

def replaceLookupSpecificMissile(expression, skillsRow):
    """ Replace expressions of type miss('skill'.rang) with values from missiles.txt"""
    # extractedMissiles = re.findall(r"miss\('.*?'\..*?\)", expression)
    # don't use regex, we need to match parentheses to match miss('blabla'.(par8 + par7))
    extractedMissiles = findParenthesesMatchedExpressions(expression, "miss(")
    for missile in extractedMissiles:
        nameStartIndex = missile.index("'") + 1
        nameEndIndex = nameStartIndex + missile[nameStartIndex:].index("'")
        missileName = missile[nameStartIndex:nameEndIndex]
        replacedMissile = missile[nameEndIndex+2:-1]
        replacedMissile = replaceLookupExpression(replacedMissile, MISSILES_LOOKUP_VALUES, getRow(missileName, missiles, "Missile"))
        expression = expression.replace(missile, replacedMissile)
    return expression
        

def replaceLookupExpression(expression, lookupValues, fromRow):
    for lookupExp in lookupValues:
        if lookupExp in expression:
            toReplace = fromRow[lookupExp]
            expression = expression.replace(lookupExp, "0" if toReplace == "" else toReplace)
    return expression

def replaceLookupMissile(expression, skilldescRow):
    """ Replace missiles from descmissile1/2/3 """
    missilesRow = {}
    if M3_PREFIX in expression:
        missilesRow = getRow(skilldescRow["descmissile3"], missiles, "Missile")
        expression = expression.replace(M3_PREFIX, "")
    elif M2_PREFIX in expression:
        missilesRow = getRow(skilldescRow["descmissile2"], missiles, "Missile")
        expression = expression.replace(M2_PREFIX, "")
    else:
        missilesRow = getRow(skilldescRow["descmissile1"], missiles, "Missile")
        expression = expression.replace(M1_PREFIX, "")
    expression = replaceLookupExpression(expression, MISSILES_LOOKUP_VALUES, missilesRow)
    if "ma@el" in expression:
        expression = expression.replace("ma@el", getMastery(missilesRow["EType"]))
    expression = expression.replace(MISSILE_SUFFIX, "")
    return expression

def replaceLookup(expression, skillsRow, skilldescRow):
    ## Replace descmissile missiles
    while MISSILE_PREFIX in expression:
        startMissileIndex = expression.index(MISSILE_PREFIX)
        endMissileIndex = expression.index(MISSILE_SUFFIX) + len(MISSILE_SUFFIX)
        expression = expression[0:startMissileIndex] + replaceLookupMissile(expression[startMissileIndex:endMissileIndex], skilldescRow) + expression[endMissileIndex::]
        
    expression = replaceLookupExpression(expression, SKILLS_LOOKUP_VALUES, skillsRow)
    return expression


