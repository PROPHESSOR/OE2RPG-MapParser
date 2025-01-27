/**
 * Copyright (c) 2021 PROPHESSOR
 * 
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

const readBits = (packed, size, offset = 0) =>
    (packed & (((1 << size) - 1) << offset)) >> offset;

const ITEMS = {
    0: 'OE2HealthPotion',
    4: 'OE2PileOfCoins',
    256: 'OE2LargeHealthPotion',
    258: 'OE2StrengthRing',
    512: 'OE2StrengthPotion',
    515: 'OE2CrossbowBolt',
    768: 'OE2AccuracyPotion',
    770: 'OE2DefenseRing',
    1024: 'OE2DefensePotion',
    1280: 'OE2HastePotion',
    1283: 'OE2ShrinkOrb',
    1536: 'OE2RemedyPotion',
    1792: 'OE2TrollsBlood',
    2048: 'OE2ChampionBrew',
    2304: 'OE2AvoidancePotion',
    2560: 'OE2ArmorKit',
};

function getThingName(thingId) {
    // TODO:
    return String(thingId);
}

module.exports = {
    getACS(opcode, arg, cond, things, script, getScriptVar) {
        const arg0 = readBits(arg, 8);
        const arg1 = readBits(arg, 8, 8);

        switch (opcode) {
            case 1: // Teleport
                return `ACS_Execute(3011, 0, getMediumX(${arg0}), getMediumY(${arg1}), ${(arg >> 20) & 0x3FF});`;
            case 26:
            case 8:
                return "ACS_NamedExecuteWait(\"window\", 0, getString(" + readBits(arg, 16) + "));";
            case 9:
                return "GiveInventory(\"MapRevealer\", 1);";
            case 22:
            case 21:
            case 23:
                {
                    let statType = "ERROR";
                    switch (arg0) {
                        case 0:
                            statType = "Health";
                            break;
                        case 1:
                            statType = "Armor";
                            break;
                        case 2:
                            statType = "Credit";
                            break;
                    }
                    switch (opcode) {
                        case 22:
                        case 21:
                            return (opcode == 22 ? "Take" : "Give") + "Inventory(\"" + statType + "\", " + (arg1) + ");";
                        case 23:
                            return "if(CheckInventory(\"" + statType + "\") < " + (arg1) + ") { ACS_NamedExecuteWait(\"window\", 0, getString(" + (((arg >> 16) & 0xFFFF)) + ")); terminate; }";
                    }
                }
            case 11:
                return "ScriptCall(\"ConversationController\", \"SetArgument\", container" + (getScriptVar((arg0), (arg >> 8 & 0xFF))) + ", " + ((arg >> 16) & 0xFFFF) + ");";
            case 15:
                return `Thing_Remove(ActivatorTID());`;
            case 18:
                return "Thing_Remove(" + ((arg0) << 5 | (arg1)) + ");";
            case 19:
                return "ScriptCall(\"ConversationController\", \"SetArgument\", container" + (getScriptVar((arg0), (arg >> 8 & 0xFF))) + ", arg2 + 1);";
            case 33:
                return "Delay(0); /* SHOP */";
            case 37:
                return "Delay(" + arg * 35 / 1000 + ");";
            case 7:
                {
                    const thing = things[(arg0)];
                    return "SpawnForced(\"" + getThingName(thing.type, (arg1)) + "\", getMediumX(" + thing.x + "), getMediumY(" + thing.y + "), 0);";
                }
            case 25: // Explode
                {
                    const thing = things[(arg0)];
                    return "SpawnForced(\"Explosion\", getMediumX(" + thing.x + "), getMediumY(" + thing.y + "), 0);";
                }
            case 29: // Earth quake
                return "ACS_Execute(3008, 0, " + (arg0) + ", " + ((arg >> 24) & 0xFF) + ");";
            case 40:
                return "ScriptCall(\"NotebookAPI\", \"AddNotebookEntry\", getString(" + (arg) + "));";
            case 10:
                return "ACS_NamedExecuteWait(\"lockwindow\", 0, getString(" + arg1 + "), getString(" + arg0 + "), " + script.id + ");";

            case 47: {
                const a = readBits(arg, 8);
                const b = readBits(arg, 8, 8);
                const c = readBits(arg, 8, 16);
                // const d = readBits(arg, 8, 24);

                let item = null;
                let amount = null;

                if (c) {
                    item = readBits(arg, 16);
                    amount = c;
                } else {
                    item = a;
                    amount = b;
                }

                if (item === 255) {
                    item = readBits(arg, 16, 16);
                    amount = 1;
                }

                return ITEMS[item]
                    ? `GiveInventory("${ITEMS[item]}", ${amount});`
                    : `Print(s:"Give item ${ITEMS[item] || item} x${amount}");`;
            }
        }

        return null;
    },

    getIR(opcode, arg, cond) {
        let cmdname = "UNKNOWN_" + opcode;
        let cmdparams = "ARG1=" + arg;
        let cmdopts = "( ";
        if ((cond & 0x100) != 0) {
            cmdopts += "USE ";
        }
        if ((cond & 0xF) != 0) {
            cmdopts += "ENTER_FROM( ";
            if ((cond & 0x8) != 0) {
                cmdopts += "WEST ";
            }
            if ((cond & 0x4) != 0) {
                cmdopts += "SOUTH ";
            }
            if ((cond & 0x2) != 0) {
                cmdopts += "EAST ";
            }
            if ((cond & 0x1) != 0) {
                cmdopts += "NORTH ";
            }
            cmdopts += ") ";
        }
        if ((cond & 0xF0) != 0) {
            cmdopts += "LEAVE_TO( ";
            if ((cond & 0x80) != 0) {
                cmdopts += "EAST ";
            }
            if ((cond & 0x40) != 0) {
                cmdopts += "NORTH ";
            }
            if ((cond & 0x20) != 0) {
                cmdopts += "WEST ";
            }
            if ((cond & 0x10) != 0) {
                cmdopts += "SOUTH ";
            }
            cmdopts += ") ";
        }
        if ((cond & 0x200) != 0) {
            cmdopts += "MODIFYWORLD ";
        }
        cmdopts += "IF_VAR( " + ((cond & 0xFFFF0000) >> 16) + " ) ";
        cmdopts += ")";

        switch (opcode) {
            case 1:
                cmdname = "TELEPORT";
                cmdparams = "X=" + (arg & 0xFF) + " Y=" + ((arg >> 8) & 0xFF) + " DIR=" + ((arg >> 20) & 0x3FF);
                break;
            case 2:
                cmdname = "CH_LEVEL";
                cmdparams = "LEVEL_NAME=" + (arg & 0xFF) + " UNKN=" + ((arg & 2147483647) >> 8) + " COMPLETE=" + Boolean(readBits(arg, 1, 31));
                break;
            case 3:
                cmdname = "RUNPOS";
                cmdparams = "X=" + (arg & 0xFF) + " Y=" + ((arg >> 8) & 0xFF) + " VAL=" + ((arg >> 16) & 0xFFFF);
                break;
            case 4:
                cmdname = "STBARMSG";
                cmdparams = "STR=" + arg;
                break;
            case 5:
                cmdname = "PLAYER_DAMAGE";
                cmdparams = "DMG=" + arg;
                break;
            case 7:
                cmdname = "SHOW_THING";
                cmdparams = "ID=" + (arg & 0xFF) + " STATE=" + ((arg >> 8) & 0xFF);
                break;
            case 8:
                cmdname = "SHOW_MONOLOG";
                cmdparams = "STR=" + (arg);
                break;
            case 9:
                cmdname = "AUTOMAP";
                cmdparams = "";
                break;
            case 10:
                cmdname = "PASSCODE_OR_HALT";
                cmdparams = "PASS=" + (((arg) & 0xFF)) + " MSG=" + (((arg >> 8) & 0xFF));
                break;
            case 11:
                cmdname = "SET_VAR";
                cmdparams = "X=" + (arg & 0xFF) + " Y=" + ((arg >> 8) & 0xFF) + " VAL=" + ((arg >> 16) & 0xFFFF);
                break;
            case 12:
                cmdname = "DOOR_LOCK";
                cmdparams = "LINE=" + arg;
                break;
            case 13:
                cmdname = "DOOR_UNLOCK";
                cmdparams = "LINE=" + arg;
                break;
            case 15:
                cmdname = "DOOR_OPEN";
                cmdparams = "LINE=" + arg;
                break;
            case 16:
                cmdname = "DOOR_CLOSE";
                cmdparams = "LINE=" + arg;
                break;
            case 18:
                cmdname = "HIDE_THINGS_AT";
                cmdparams = "X=" + (arg & 0xFF) + " Y=" + ((arg >> 8) & 0xFF);
                break;
            case 19:
                cmdname = "INC_VAR";
                cmdparams = "X=" + (arg & 0xFF) + " Y=" + ((arg >> 8) & 0xFF);
                break;
            case 20:
                cmdname = "DEC_VAR";
                cmdparams = "X=" + (arg & 0xFF) + " Y=" + ((arg >> 8) & 0xFF);
                break;
            case 21:
                cmdname = "INC_STAT";
                cmdparams = "AMOUNT=" + ((arg >> 8) & 0xFF) + " STAT=" + ((arg) & 0xFF);
                break;
            case 22:
                cmdname = "DEC_STAT";
                cmdparams = "AMOUNT=" + ((arg >> 8) & 0xFF) + " STAT=" + ((arg) & 0xFF);
                break;
            case 23:
                cmdname = "CHECK_STAT_OR_SHOW_MONOLOG";
                cmdparams = "STR=" + ((arg >> 16) & 0xFFFF) + " AMOUNT=" + ((arg >> 8) & 0xFF) + " STAT=" + ((arg) & 0xFF);
                break;
            case 24:
                cmdname = "STBARMSG_ALT";
                cmdparams = "STR=" + arg;
                break;
            case 25:
                cmdname = "EXPLODE";
                cmdparams = "X=" + (arg & 0xFF) + " Y=" + ((arg >> 8) & 0xFF) + " TYPE=" + ((arg >> 24) & 0xFF);
                break;
            case 26:
                cmdname = "SHOW_MONOLOG_WITH_SOUND";
                cmdparams = "STR=" + arg;
                break;
            case 27:
                cmdname = "NEXT_LEVEL_START_POS";
                cmdparams = "ARG1=" + arg + " X=" + ((arg >> 8) & 0xFF) + " Y=" + ((arg >> 16) & 0xFF);
                break;
            case 29:
                cmdname = "EARTHQUAKE";
                cmdparams = "TIME=" + (arg & 0xFFFFFF) + " INTENSITY=" + ((arg >> 24) & 0xFF);
                break;
            case 30:
                cmdname = "FLOORCOLOR";
                cmdparams = "COLOR=" + (arg & 0xFFFFFF);
                break;
            case 31:
                cmdname = "CEILCOLOR";
                cmdparams = "COLOR=" + (arg & 0xFFFFFF);
                break;
            case 32:
                cmdname = "TAKE_OR_RETURN_WEAPONS";
                cmdparams = "ACTION=" + arg;
                break;
            case 33:
                cmdname = "SHOP";
                cmdparams = "ID=" + arg;
                break;
            case 34:
                cmdname = "SET_THING_STATE";
                cmdparams += " X=" + (arg & 0x1F) + " Y=" + ((arg >> 5) & 0x1F) + " VAL=" + ((arg >> 16) & 0xFF);
                break;
            case 35:
                cmdname = "PARTICLE";
                cmdparams = "COLOR=" + (arg & 0xFFFFFF) + " EFFECT=" + ((arg >> 24) & 0xFF);
                break;
            case 36:
                cmdname = "FRAME";
                break;
            case 37:
                cmdname = "SLEEP";
                cmdparams = "MSEC=" + arg;
                break;
            case 38:
                cmdname = "UNKNOWN_REACTOR_LIFT";
                break;
            case 39:
                cmdname = "SHOW_MONOLOG_IF_LEVEL_UNFINISHED";
                cmdparams = "STR=" + (arg & 0xFFFF) + " LEVEL_ID=" + ((arg >> 8) & 0xFFFF);
                break;
            case 40:
                cmdname = "NOTEBOOK_ADD";
                cmdparams = "STR=" + arg;
                break;
            case 41:
                cmdname = "REQUIRE_KEYCARD";
                cmdparams = "KEY=" + arg;
                break;

            default:
                break;
        }
        return cmdopts + " " + cmdname + " " + cmdparams;
    }
}

/* const ACS = {
    3: arg => {
        if (arg === 7967) return [`// Steal (${arg}, ${arg1})`];
        if (arg === 2304) return [`// Return weapons (${arg}, ${arg1})`];
        if (arg === 7950) return [`// Climb up cutscene? (${arg}, ${arg1})`];
        if (arg === 7949) return [`// Climb down cutscene? (${arg}, ${arg1})`];
        if (arg === 7944) return [`// Start cutscene (${arg}, ${arg1})`];

        const x = readBits(arg, 8);
        const y = readBits(arg, 8, 8);
        
        return [`// Run event script at (${x};${y}) (${arg}, ${arg1})`];
    },
    7: arg => [`// Show thing (${arg}, ${arg1})`],
    8: arg => [`// Show message $OE2RP_{MAP}_${readBits(arg, 16)} (${arg}, ${arg1})`],
    10: arg => [`// Lockpicks password "$OE2RP_{MAP}_${arg}" (${arg}, ${arg1})`],
} */