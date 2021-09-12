/**
 * Copyright (c) 2021 PROPHESSOR
 * 
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

const readBits = (packed, size, offset = 0) =>
    (packed & (((1 << size) - 1) << offset)) >> offset;

const lookupEventVar = arg2 => {
    let ii = ((((arg2 & 0xFFFF0000) >> 16)) & 0xFFFF);
    if (ii === 0) return 0;
    let i = 0;
    while ((1 << (i++)) !== ii && i < 31);
    return i;
}

const ITEMS = {
    0: 'Health Potion',
    4: 'Coins',
    256: 'Lg Health Potion',
    512: 'Strength Potion',
    768: 'Accuracy Potion',
    2560: 'Armor Kit',
};

function getThingName(thingId) {
    // TODO:
    return String(thingId);
}

exports.getIR = (opcode, arg, cond) => {
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

exports.getACS = (opcode, arg, cond, things) => {
    switch (opcode) {
        case 1: // Teleport
            return "ACS_Execute(3011, 0, getMediumX(" + (arg & 0xFF) + "), getMediumY(" + ((arg >> 8) & 0xFF) + "), " + ((arg >> 20) & 0x3FF) + ");";
        case 26:
        case 8:
            return "ACS_NamedExecuteWait(\"window\", 0, getString(" + readBits(arg, 8) + "));";
        case 9:
            return "GiveInventory(\"MapRevealer\", 1);";
        case 22:
        case 21:
        case 23:
            {
                let statType = "ERROR";
                switch (arg & 0xFF) {
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
                        return (opcode == 22 ? "Take" : "Give") + "Inventory(\"" + statType + "\", " + ((arg >> 8) & 0xFF) + ");";
                    case 23:
                        return "if(CheckInventory(\"" + statType + "\") < " + ((arg >> 8) & 0xFF) + ") { ACS_NamedExecuteWait(\"window\", 0, getString(" + (((arg >> 16) & 0xFFFF)) + ")); terminate; }";
                }
            }
        // TODO:
        // case 19:
        //     return "ScriptCall(\"ConversationController\", \"SetArgument\", sgenid" + (clist.getPos((arg & 0xFF), (arg >> 8 & 0xFF))) + ", arg2 + 1);";
        // case 11:
        //     return "ScriptCall(\"ConversationController\", \"SetArgument\", sgenid" + (clist.getPos((arg & 0xFF), (arg >> 8 & 0xFF))) + ", " + ((arg >> 16) & 0xFFFF) + ");";
        case 37:
            return "Delay(" + arg * 35 / 1000 + ");";
        case 18:
            return "Thing_Remove(" + ((arg & 0xFF) << 5 | ((arg >> 8) & 0xFF)) + ");";
        case 7:
            {
                const thing = things[(arg & 0xFF)];
                return "SpawnForced(\"" + getThingName(thing.type, ((arg >> 8) & 0xFF)) + "\", getMediumX(" + thing.x + "), getMediumY(" + thing.y + "), 0);";
            }
        case 25: // Explode
            {
                const thing = things[(arg & 0xFF)];
                return "SpawnForced(\"Explosion\", getMediumX(" + thing.x + "), getMediumY(" + thing.y + "), 0);";
            }
        case 29: // Earth quake
            return "ACS_Execute(3008, 0, " + (arg & 0xFFFFFF) + ", " + ((arg >> 24) & 0xFF) + ");";
        case 40:
            return "ScriptCall(\"NotebookAPI\", \"AddNotebookEntry\", getString(" + (arg) + "));";
        // case 10:
        //     return "ACS_NamedExecuteWait(\"lockwindow\", 0, getString(" + (((arg >> 8) & 0xFF)) + "), getString(" + (arg & 0xFF) + "), " + scriptNum + ");";
    }

    return null;
}

const ACS = {
    1: arg => {
        const x = readBits(arg, 8);
        const y = readBits(arg, 8, 8);

        // return `// Teleport to (${x};${y}) ${readBits(arg, 1, 31) ? 'Complete' : 'Incomplete'} (${arg}, ${arg1})`
        return `ACS_Execute(3011, 0, getMediumX(${x}), getMediumY(${y}), ${((arg >> 20) & 0x3FF)});`;
    },
    2: arg => [`// Changemap ${readBits(arg, 8)} ${readBits(arg, 1, 31) ? 'Complete' : 'Incomplete'} (${arg}, ${arg1})`],
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
    33: arg => [`// Shop (${arg}, ${arg1})`],
    47: arg => {
        const a = readBits(arg, 8);
        const b = readBits(arg, 8, 8);
        const c = readBits(arg, 8, 16);
        const d = readBits(arg, 8, 24);

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

        return [`// Give item ${ITEMS[item] || item} x${amount} (${arg}, ${arg1})`];
    }
}