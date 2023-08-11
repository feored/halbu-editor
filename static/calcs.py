# SLVL_STEPS = [2, 9, 17, 23, 28]
# SLVL_RANGE = [7, 8, 6, 5, 227]

def isEmptyCell(cell):
    return len(cell) == 0

def parenthesize(formula):
    return "(" + formula + ")"

def calcToHit(skillsRow):
    if len(skillsRow["ToHitCalc"]) > 0:
        return "ToHitCalc"
    else:
        return "ToHit + (lvl - 1) * LevToHit"

def calcPhysDmgMin(skillsRow):
    ## actually static
    minLevDam1 = "MinLevDam1 * (min(lvl, 8) - 1)"
    minLevDam2 = "MinLevDam2 * (max(min(lvl, 16) - 8), 0)"
    minLevDam3 = "MinLevDam3 * (max(min(lvl, 22) - 16), 0)"
    minLevDam4 = "MinLevDam4 * (max(min(lvl, 28) - 22), 0)"
    minLevDam5 = "MinLevDam5 * (max(lvl - 28), 0)"
    
    baseDamage = f"MinDam + ({minLevDam1}) + ({minLevDam2}) + ({minLevDam3}) + ({minLevDam4}) + ({minLevDam5}"
    "DmgSymPerCalc"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + DmgSymPerCalc)/100"
    return skillDamage
    
def calcPhysDmgMax(skillsRow):
    maxLevDam1 = "MaxLevDam1 * (min(lvl, 8) - 1)"
    maxLevDam2 = "MaxLevDam2 * (max(min(lvl, 16) - 8), 0)"
    maxLevDam3 = "MaxLevDam3 * (max(min(lvl, 22) - 16), 0)"
    maxLevDam4 = "MaxLevDam4 * (max(min(lvl, 28) - 22), 0)"
    maxLevDam5 = "MaxLevDam5 * (max(lvl - 28), 0)"
    
    baseDamage = f"MaxDam + ({maxLevDam1}) + ({maxLevDam2}) + ({maxLevDam3}) + ({maxLevDam4}) + ({maxLevDam5}"
    "DmgSymPerCalc"
    skillDamage = f"({baseDamage}) * (2 ** (HitShift - 8)) * (100 + DmgSymPerCalc)/100"
    return skillDamage

def calcEDmgMin(skillsRow):
    return ""

def calcEDmgMax(skillsRow):
    return ""
    

expandDict = {
    "ln12" : {
        "static": True,
        "value": "par1 + (lvl - 1) * par2"
    },
    "dm12" : {
        "static": True,
        "value": "((110 * lvl) * (par2 - par1)) / (100 * (lvl + 6)) + par1"
    },
    "ln34" : {
        "static": True,
        "value": "par3 + (lvl - 1) * par4"
    },
    "dm32" : {
        "static": True,
        "value": "((110 * lvl) * (par4 - par3)) / (100 * (lvl + 6)) + par3"
    },
    "ln56" : {
        "static": True,
        "value": "par5 + (lvl - 1) * par6"
    },
    "dm56" : {
        "static": True,
        "value": "((110 * lvl) * (par6 - par5)) / (100 * (lvl + 6)) + par5"
    },
    "ln78" : {
        "static": True,
        "value": "par7 + (lvl - 1) * par8"
    },
    "dm78" : {
        "static": True,
        "value": "((110 * lvl) * (par8 - par7)) / (100 * (lvl + 6)) + par7"
    },
    "usmc" : {
        "static": True,
        "value": "max((mana + lvlmana * (lvl - 1)) * (2 ** (manashift - 8)), minmana)"
    },
    "toht": {
        "static": False,
        "value" : calcToHit
    },
    "pnma": {
        "static": False,
        "value" : calcPhysDmgMin
    },
    "pxma": {
        "static": False,
        "value" : calcPhysDmgMax
    },
    "edmn": {
        "static": 
    }
}

expandKeys = expandDict.keys()

def expandExpression(expression, skillsRow):
    canExpand = True
    while canExpand:
        canExpand = False
        for key in expandKeys:
            if key in expression:
                expression = expression.replace(key, parenthesize(expandDict[key]["value"]) if expandDict[key]["static"] else parenthesize(expandDict[key]["value"](skillsRow)))
                canExpand = True
    return expression