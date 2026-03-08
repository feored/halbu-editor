import re

from data import skills, skilldesc, missiles, getCurrentDataVersion
from versions import get_calcs_adapter

FRAMES_PER_SECOND = 25
MISSILE_PREFIX = "_MISSILE_"
MISSILE_SUFFIX = "_ENDMISSILE_"
M1_PREFIX = f"{MISSILE_PREFIX}1_"
M2_PREFIX = f"{MISSILE_PREFIX}2_"
M3_PREFIX = f"{MISSILE_PREFIX}3_"


BASE_MISSILES_LOOKUP_VALUES = [
    "HitShift",
    "MinDamage",
    "MinLevDam1",
    "MinLevDam2",
    "MinLevDam3",
    "MinLevDam4",
    "MinLevDam5",
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
    "Range",
    "Param1",
    "Param2",
    "Param3",
    "Param4",
    "Param5",
    "CltParam1",
    "CltParam2",
    "CltParam3",
    "CltParam4",
    "CltParam5",
    "sHitPar1",
    "sHitPar2",
    "sHitPar3",
    "cHitPar1",
    "cHitPar2",
    "cHitPar3",
    "dParam1",
    "dParam2",
]

## mana always after lvlmana, so as not to replace lvlmana into lvl34 if skillsrow["mana"] == 34
BASE_SKILLS_LOOKUP_VALUES = [
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

def replaceToken(expression, token, replacement):
    replacement = str(replacement)
    if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", token):
        pattern = rf"(?<![A-Za-z0-9_]){re.escape(token)}(?![A-Za-z0-9_])"
        return re.sub(pattern, lambda _: replacement, expression)
    return expression.replace(token, replacement)

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

def calcMissileDmgMin(skillsRow):
    minLevDam1 = "MinLevDam1 * (min(lvl, 8) - 1)"
    minLevDam2 = "MinLevDam2 * (max(min(lvl, 16) - 8, 0))"
    minLevDam3 = "MinLevDam3 * (max(min(lvl, 22) - 16, 0))"
    minLevDam4 = "MinLevDam4 * (max(min(lvl, 28) - 22, 0))"
    minLevDam5 = "MinLevDam5 * (max(lvl - 28, 0))"

    baseDamage = f"MinDamage + ({minLevDam1}) + ({minLevDam2}) + ({minLevDam3}) + ({minLevDam4}) + ({minLevDam5})"
    return parenthesize(f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + DmgSymPerCalc)/100")

def calcMissileDmgMax(skillsRow):
    maxLevDam1 = "MaxLevDam1 * (min(lvl, 8) - 1)"
    maxLevDam2 = "MaxLevDam2 * (max(min(lvl, 16) - 8, 0))"
    maxLevDam3 = "MaxLevDam3 * (max(min(lvl, 22) - 16, 0))"
    maxLevDam4 = "MaxLevDam4 * (max(min(lvl, 28) - 22, 0))"
    maxLevDam5 = "MaxLevDam5 * (max(lvl - 28, 0))"

    baseDamage = f"MaxDamage + ({maxLevDam1}) + ({maxLevDam2}) + ({maxLevDam3}) + ({maxLevDam4}) + ({maxLevDam5})"
    return parenthesize(f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + DmgSymPerCalc)/100")

def linearTerms(_skillsRow, terms):
    a, b = terms
    return f"({a} + (lvl - 1) * {b})"

def diminishingTerms(_skillsRow, terms):
    a, b = terms
    return parenthesize(f"floor(floor((110 * lvl) / (lvl + 6)) * (({b} - {a}) / 100)) + {a}")

def linear(skillsRow, whichLn):
    a, b = "", ""
    match whichLn:
        case 12:
            a = "par1"
            b = "par2"
        case 21:
            a = "par11"
            b = "par12"
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
        case 21:
            a = "par11"
            b = "par12"
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

def resolvePassiveCalc(skillsRow, statNames, fallback):
    if not isinstance(skillsRow, dict):
        return fallback
    expected = {name.lower() for name in statNames}
    for i in range(1, 15):
        stat = str(skillsRow.get(f"passivestat{i}", "")).strip().lower()
        if stat in expected:
            calc = str(skillsRow.get(f"passivecalc{i}", "")).strip()
            if len(calc) > 0:
                return calc
    return fallback

def resolveMasteryToHit(skillsRow):
    if isinstance(skillsRow, dict):
        skilldesc_name = str(skillsRow.get("skilldesc", "")).strip().lower()
        if skilldesc_name == "levitate":
            return "ln56"
    return resolvePassiveCalc(
        skillsRow,
        {"passive_mastery_melee_th", "passive_mastery_throw_th"},
        "ln12",
    )

def resolveMasteryDamage(skillsRow):
    return resolvePassiveCalc(
        skillsRow,
        {"passive_mastery_melee_dmg", "passive_mastery_throw_dmg"},
        "ln34",
    )

def resolveMasteryCrit(skillsRow):
    return resolvePassiveCalc(
        skillsRow,
        {"passive_mastery_melee_crit", "passive_mastery_throw_crit"},
        "dm56",
    )

BASE_EXPAND_DICT = {
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
    "cpa1": {
        "static": True,
        "value": "CltParam1"
    },
    "cpa2": {
        "static": True,
        "value": "CltParam2"
    },
    "cpa3": {
        "static": True,
        "value": "CltParam3"
    },
    "cpa4": {
        "static": True,
        "value": "CltParam4"
    },
    "cpa5": {
        "static": True,
        "value": "CltParam5"
    },
    "hpa1": {
        "static": True,
        "value": "sHitPar1"
    },
    "hpa2": {
        "static": True,
        "value": "sHitPar2"
    },
    "hpa3": {
        "static": True,
        "value": "sHitPar3"
    },
    "chp1": {
        "static": True,
        "value": "cHitPar1"
    },
    "chp2": {
        "static": True,
        "value": "cHitPar2"
    },
    "chp3": {
        "static": True,
        "value": "cHitPar3"
    },
    "dpa1": {
        "static": True,
        "value": "dParam1"
    },
    "dpa2": {
        "static": True,
        "value": "dParam2"
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
    "ln21": {
        "static": False,
        "value": linear,
        "arg": 21
    },
    "dm12": {
        "static": False,
        "value": diminishing,
        "arg": 12
    },
    "dm21": {
        "static": False,
        "value": diminishing,
        "arg": 21
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
    "ln91": {
        "static": False,
        "value": linear,
        "arg": 91
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
    "sl12": {
        "static": False,
        "value": linearTerms,
        "arg": ("par1", "par2")
    },
    "sd12": {
        "static": False,
        "value": diminishingTerms,
        "arg": ("par1", "par2")
    },
    "sl34": {
        "static": False,
        "value": linearTerms,
        "arg": ("par3", "par4")
    },
    "sd34": {
        "static": False,
        "value": diminishingTerms,
        "arg": ("par3", "par4")
    },
    "cl12": {
        "static": False,
        "value": linearTerms,
        "arg": ("cpa1", "cpa2")
    },
    "cd12": {
        "static": False,
        "value": diminishingTerms,
        "arg": ("cpa1", "cpa2")
    },
    "cl34": {
        "static": False,
        "value": linearTerms,
        "arg": ("cpa3", "cpa4")
    },
    "cd34": {
        "static": False,
        "value": diminishingTerms,
        "arg": ("cpa3", "cpa4")
    },
    "shl1": {
        "static": False,
        "value": linearTerms,
        "arg": ("hpa1", "hpa2")
    },
    "shd1": {
        "static": False,
        "value": diminishingTerms,
        "arg": ("hpa1", "hpa2")
    },
    "chl1": {
        "static": False,
        "value": linearTerms,
        "arg": ("chp1", "chp2")
    },
    "chd1": {
        "static": False,
        "value": diminishingTerms,
        "arg": ("chp1", "chp2")
    },
    "dl12": {
        "static": False,
        "value": linearTerms,
        "arg": ("dpa1", "dpa2")
    },
    "dd12": {
        "static": False,
        "value": diminishingTerms,
        "arg": ("dpa1", "dpa2")
    },
    "usmc": {
        "static": True,
        "value": "max((mana + lvlmana * (lvl - 1)) * (2 ** manashift), minmana * 256)"
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
    "len": {
        "static": True,
        "value": "auralencalc"
    },
    "macr": {
        "static": False,
        "value": resolveMasteryCrit
    },
    "madm": {
        "static": False,
        "value": resolveMasteryDamage
    },
    "math": {
        "static": False,
        "value": resolveMasteryToHit
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
    "damn": {
        "static": False,
        "value": calcMissileDmgMin
    },
    "damx": {
        "static": False,
        "value": calcMissileDmgMax
    },
    "dmns": {
        "static": True,
        "value": "(damn * 256)"
    },
    "dmxs": {
        "static": True,
        "value": "(damx * 256)"
    },
    "rang": {
        "static": True,
        "value": "Range"
    },
    "mael": {
        "static": True,
        "value": f"{M1_PREFIX}mael{MISSILE_SUFFIX}"
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

def getCalcsAdapter():
    return get_calcs_adapter(getCurrentDataVersion())

def getMissileLookupValues():
    lookupValues = list(BASE_MISSILES_LOOKUP_VALUES)
    for value in getCalcsAdapter().missile_lookup_values():
        if value not in lookupValues:
            lookupValues.append(value)
    return lookupValues

def getSkillLookupValues():
    lookupValues = list(BASE_SKILLS_LOOKUP_VALUES)
    for value in getCalcsAdapter().skill_lookup_values():
        if value not in lookupValues:
            lookupValues.append(value)
    return lookupValues

def getExpandDict():
    expandDict = dict(BASE_EXPAND_DICT)
    expandDict.update(getCalcsAdapter().expand_overrides())
    return expandDict


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
    expandDict = getExpandDict()
    for key in expandDict.keys():
        if key in expression:
            if expandDict[key]["static"]:
                    expression = replaceToken(expression, key, expandDict[key]["value"])
            else:
                if "arg" in expandDict[key]:   
                    expression = replaceToken(
                        expression, key, expandDict[key]["value"](skillsRow, expandDict[key]["arg"])
                    )
                else:
                    expression = replaceToken(expression, key, expandDict[key]["value"](skillsRow))
    return expression

    
def expand(expression, skillsRow, skilldescRow):
    oldExpression = expression
    canExpand = True
    while canExpand:
        expression = expandExpressionOnce(expression, skillsRow)
        expression = replaceLookupSpecificMissile(expression, skillsRow)
        expression = replaceLookupSksrc(expression)
        expression = replaceLookupSynergies(expression, skillsRow)
        expression = replaceLookupSklvl(expression, skillsRow)
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

def replaceLookupSklvl(expression, skillsRow):
    extractedSklvls = findParenthesesMatchedExpressions(expression, "sklvl(")
    for sklvl in extractedSklvls:
        nameStartIndex = sklvl.index("'") + 1
        nameEndIndex = nameStartIndex + sklvl[nameStartIndex:].index("'")
        sklvlName = sklvl[nameStartIndex:nameEndIndex]
        sklvlId = skillIdFromName(sklvlName)
        replacedSklvl = sklvl[nameEndIndex+2:-1]
        sklvlRow = getRow(sklvlName, skills, "skill")
        parts = replacedSklvl.split(".", 1)
        parts[0] = expandExpressionMax(parts[0], sklvlRow)
        parts[0] = replaceLookupExpression(parts[0], getSkillLookupValues(), skillsRow, "skills")
        parts[1] = expandExpressionMax(parts[1], sklvlRow)
        parts[1] = parts[1].replace("lvl", parenthesize(parts[0]))
        parts[1] = replaceLookupExpression(parts[1], getSkillLookupValues(), sklvlRow, "skills")
        expression = expression.replace(sklvl, parts[1])
    return expression
        
def replaceLookupSksrc(expression):
    extractedSksrc = findParenthesesMatchedExpressions(expression, "sksrc(")
    for sksrc in extractedSksrc:
        expression = expression.replace(sksrc, f"skill{sksrc[5:]}")
    return expression
        
        
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
        replacedSynergy = replaceLookupExpression(replacedSynergy, getSkillLookupValues(), skills[synergyId], "skills")
        replacedSynergy = replaceLevel(replacedSynergy, synergyId)
        finalSynergy = f"synergy('{replacedSynergy}')"
        expression = expression.replace(synergy, finalSynergy)
    ## Ex Edmgsympercalc = (skill('Lightning Strike'.blvl)+skill('Lightning Bolt'.blvl)+skill('Charged Strike'.blvl)) * par8
    return expression

def replaceLookupSpecificMissile(expression, skillsRow):
    """Replace expressions of type miss('skill'.rang/.rad/...) with values from missiles.txt"""
    # extractedMissiles = re.findall(r"miss\('.*?'\..*?\)", expression)
    # don't use regex, we need to match parentheses to match miss('blabla'.(par8 + par7))
    extractedMissiles = findParenthesesMatchedExpressions(expression, "miss(")
    for missile in extractedMissiles:
        nameStartIndex = missile.index("'") + 1
        nameEndIndex = nameStartIndex + missile[nameStartIndex:].index("'")
        missileName = missile[nameStartIndex:nameEndIndex]
        replacedMissile = missile[nameEndIndex+2:-1]
        replacedMissile = expandExpressionMax(replacedMissile, skillsRow)
        oldMissile = replacedMissile
        ## Keep expanding/looking up values as long as possible
        while True:
            replacedMissile = replaceLookupExpression(
                replacedMissile,
                getMissileLookupValues(),
                getRow(missileName, missiles, "Missile"),
                "missiles"
            )
            replacedMissile = expandExpressionOnce(replacedMissile, skillsRow)
            if oldMissile == replacedMissile:
                break
            else:
                oldMissile = replacedMissile
        expression = expression.replace(missile, replacedMissile)
    return expression
        

def replaceLookupExpression(expression, lookupValues, fromRow, tableName):
    adapter = getCalcsAdapter()
    for lookupExp in lookupValues:
        if lookupExp in expression:
            toReplace = None
            if fromRow is not None:
                toReplace = fromRow.get(lookupExp)
            if toReplace is None:
                toReplace = adapter.missing_lookup_value(tableName, lookupExp, fromRow)
            expression = replaceToken(
                expression, lookupExp, "0" if toReplace in ("", None) else str(toReplace)
            )
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
    oldMissile = expression
    ## Keep expanding/looking up values as long as possible
    while True:
        if "mael" in expression:
            expression = expression.replace("mael", getMastery(missilesRow["EType"]))
        expression = replaceLookupExpression(expression, getMissileLookupValues(), missilesRow, "missiles")
        expression = expandExpressionOnce(expression, [])
        if oldMissile == expression:
            break
        else:
            oldMissile = expression
    
    expression = expression.replace(MISSILE_SUFFIX, "")
    return expression

def replaceLookup(expression, skillsRow, skilldescRow):
    ## Replace descmissile missiles
    while MISSILE_PREFIX in expression:
        startMissileIndex = expression.index(MISSILE_PREFIX)
        endMissileIndex = expression.index(MISSILE_SUFFIX) + len(MISSILE_SUFFIX)
        expression = expression[0:startMissileIndex] + replaceLookupMissile(expression[startMissileIndex:endMissileIndex], skilldescRow) + expression[endMissileIndex::]
        
    expression = replaceLookupExpression(expression, getSkillLookupValues(), skillsRow, "skills")
    return expression


