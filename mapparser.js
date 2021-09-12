/**
 * Copyright (c) 2021 OE2RP-Team (PROPHESSOR)
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

"use strict";

const fs = require("fs");
const ByteTools = require("./ByteTools");

const THINGS = require("./things");
const DECALS = require("./decals");
const OPCODES = require("./opcodes");

const Config = {
    "width": 768,
    "height": 768
};
const mh = [];

const GENERATE_LINES = true;
const GENERATE_THINGS = true;
const GENERATE_THINGS_FOR_KNOWN_DECALS = false;
const GENERATE_DECALS = true;
const GENERATE_SAFE_DECALS = true;
const GENERATE_DOORS = true;
const GENERATE_UPPER_WALLS = true;
const GENERATE_SAFE_UPPER_WALLS = true;

const OFFSET_DECAL = 0.5; // Distance between decals
const OFFSET_UPPER = 0.2; // Distance between wall and upper texture decal

const SHRINK_UPPER_WALL = 0.3; // for GENERATE_SAFE_UPPER_WALLS

// Generate doors for lines with these lower texture ids
const DOOR_IDS = [16, 18, 19, 23, 25, 27, 28, 29];

const THINGS_PROPS = {
    spawnLater: 1 << 0,
    turnSouth: 1 << 3,
    turnNorth: 1 << 4, // ^
    turnEast: 1 << 5, // >
    turnWest: 1 << 6, // <
    isUpper: 1 << 7, // ?
    isDecal: 1 << 10,
    flag0: 1 << 0,
    flag1: 1 << 1,
    flag2: 1 << 2,
    flag3: 1 << 3,
    flag4: 1 << 4,
    flag5: 1 << 5,
    flag6: 1 << 6,
    flag7: 1 << 7,
    flag8: 1 << 8,
    flag9: 1 << 9,
    flag10: 1 << 10,
    flag11: 1 << 11, // not blocking?
    flag12: 1 << 12,
    flag13: 1 << 13,
    flag14: 1 << 14,
    flag15: 1 << 15,
    upperOnly: 1 << 10,
    isNotFence: (1 << 1) | (1 << 11),
}

class Parser {
    constructor(from, to) {
        this.from = from;
        this.to = to;
    }

    parse() {
        const texmap = this.getMappings();

        const map = this.parseMap(this.from);

        const postprocessFilename = `${this.from.slice(0, -3)}postprocess.json`;
        let preprocess = null;

        if (fs.existsSync(postprocessFilename)) {
            console.log(`Using ${postprocessFilename}`);
            preprocess = require('./' + postprocessFilename);
        }

        fs.writeFileSync(this.to, this.generate(map.lines, texmap, map.things, map.decals, map.bspheader, map.scripts, preprocess));

        fs.writeFileSync(this.to + '.ACS', this.generateScripts(map.scripts, map.bytecode));

        this.display(map.lines, map.count, map.things, map.decals);
    }

    getMappings() {
        return require('./mappings.js');
    }

    parseMap(from) {
        this.buffer = fs.readFileSync(from);
        const file = new ByteTools(this.buffer);

        const bspheader = {
            "version": file.readUInt8(),
            "date": new Date(file.readUInt32LE() + 1000),
            "unknown1": file.readUInt16LE(),
            "floorcolor": {
                "b": file.readUInt8(),
                "g": file.readUInt8(),
                "r": file.readUInt8()
            },
            "ceilingcolor": {
                "b": file.readUInt8(),
                "g": file.readUInt8(),
                "r": file.readUInt8()
            },
            "loadingcolor": {
                "b": file.readUInt8(),
                "g": file.readUInt8(),
                "r": file.readUInt8()
            },
            "levelid": file.readUInt8(),
            "playerstart": file.readUInt16LE(),
            "playerrotation": file.readUInt8(),
            "unknown2": file.readInt32LE(),
            "unknown3": file.readUInt8()
        };

        let count = file.readUInt16LE();

        console.log("Skiping", count, "bsp nodes");

        file.seek(count * 10, "CUR");
        count = file.readUInt16LE();

        console.log("Line segments", count, "at", file.tell());

        const lines = [];
        for (let i = 0; i < count; i++) {
            const line = {
                "id": i,
                "x0": file.readUInt8(),
                "y0": file.readUInt8(),
                "x1": file.readUInt8(),
                "y1": file.readUInt8(),
                "textureLower": file.readUInt8(),
                "textureUpper": file.readUInt8(),
                "flags": file.readUInt32LE()
            };
            lines.push(line);
        }

        const things = this.parseThings(file);

        const decals = this.parseDecals(things);

        const scripts = this.parseScripts(file);

        const bytecode = this.parseBytecode(file);

        return {
            lines,
            count,
            things,
            decals,
            scripts,
            bytecode,
            bspheader
        };
    }

    parseThings(file = new ByteTools()) {
        const thingsCount = file.readUInt16LE();
        const extraCount = file.readUInt16LE();

        let tid = 0;

        const things = [];
        for (let i = 0; i < thingsCount; i++) {
            const thing = {
                "tid": tid++,
                "floating": false,
                "x": file.readUInt8(),
                "y": file.readUInt8(),
                "id": file.readUInt8(),
                "flags": file.readUInt16LE()
            };

            things.push(thing);
        }

        for (let i = 0; i < extraCount; i++) {
            const thing = {
                "tid": tid++,
                "floating": true,
                "x": file.readUInt8(),
                "y": file.readUInt8(),
                "z": file.readUInt8(),
                "id": file.readUInt8(),
                "flags2": file.readUInt8(),
                "flags": file.readUInt16LE()
            };

            things.push(thing);
        }

        return things;
    }

    parseDecals(things) {
        const decals = [];

        const overlapCheck = {};

        for (const thing of things) {
            if (!DECALS[thing.id.toString()]) continue;

            const isNotFence = (thing.flags & THINGS_PROPS.isNotFence) ? 0 : OFFSET_DECAL;

            const overlapCode = `${thing.x}|${thing.y}`;

            const overlap = overlapCheck[overlapCode];

            const decalRadius = GENERATE_SAFE_DECALS ? 30 : 32;

            let x0, y0, x1, y1;
            if (thing.flags & 32) { // east | (->)
                x0 = (thing.x * 8 + isNotFence);
                y0 = (thing.y * 8 + decalRadius);
                x1 = (thing.x * 8 + isNotFence);
                y1 = (thing.y * 8 - decalRadius);
            } else if (thing.flags & 64) { // west | (<-)
                x0 = (thing.x * 8 - isNotFence);
                y0 = (thing.y * 8 - decalRadius);
                x1 = (thing.x * 8 - isNotFence);
                y1 = (thing.y * 8 + decalRadius);
            } else if (thing.flags & 16) { // south - (^)
                x0 = (thing.x * 8 - decalRadius);
                y0 = (thing.y * 8 + isNotFence);
                x1 = (thing.x * 8 + decalRadius);
                y1 = (thing.y * 8 + isNotFence);
            } else if (thing.flags & 8) { // north -
                x0 = (thing.x * 8 + decalRadius);
                y0 = (thing.y * 8 - isNotFence);
                x1 = (thing.x * 8 - decalRadius);
                y1 = (thing.y * 8 - isNotFence);
            }

            if (overlap) {
                if (overlap.flags & 32) { // | (->)
                    x0 = overlap.x0 + OFFSET_DECAL;
                    x1 = overlap.x1 + OFFSET_DECAL;
                    if (y0 < y1) {
                        x0 -= 0.5;
                        x1 -= 0.5;
                        [y0, y1] = [y1, y0];
                    }
                } else if (overlap.flags & 64) { // | (<-)
                    x0 = overlap.x0 - OFFSET_DECAL;
                    x1 = overlap.x1 - OFFSET_DECAL;
                    if (y0 > y1) {
                        x0 += 0.5;
                        x1 += 0.5;
                        [y0, y1] = [y1, y0];
                    }
                } else if (overlap.flags & 16) { // - (^)
                    y0 = overlap.y0 + OFFSET_DECAL;
                    y1 = overlap.y1 + OFFSET_DECAL;
                    if (x0 > x1) {
                        y0 -= 0.5;
                        y1 -= 0.5;
                        [x0, x1] = [x1, x0];
                    }
                } else if (overlap.flags & 8) { // -
                    y0 = overlap.y0 - OFFSET_DECAL;
                    y1 = overlap.y1 - OFFSET_DECAL;
                    if (x0 < x1) {
                        y0 += 0.5;
                        y1 += 0.5;
                        [x0, x1] = [x1, x0];
                    }
                }
            }

            overlapCheck[overlapCode] = {
                ...thing,
                x0, y0, x1, y1
            };

            const decal = {
                "id": thing.id,
                "tid": thing.tid,
                z: thing.z || 0,
                x0,
                y0,
                x1,
                y1,
                flags: thing.flags || 0,
                flags2: thing.flags2 || 0,
                isUpper: Boolean(thing.flags && (1 << 7)),
                isDoor: Boolean(thing.flags & THINGS_PROPS.flag14 && thing.flags & THINGS_PROPS.flag11),
                isNotFence: Boolean(thing.flags & THINGS_PROPS.isNotFence && !(thing.flags & THINGS_PROPS.flag10)),
                isBanner: Boolean((thing.flags & THINGS_PROPS.flag15) && (thing.flags & THINGS_PROPS.flag11) && (thing.flags & THINGS_PROPS.flag10) && !(thing.flags & THINGS_PROPS.flag2) && thing.id !== 199) // FIXME:
            };

            decal.texture = typeof DECALS[thing.id] === 'function' ? DECALS[thing.id](decal) : DECALS[thing.id],

            decals.push(decal);
        }

        return decals;
    }

    parseScripts(file = new ByteTools()) {
        const scriptsCount = file.readUInt16LE();
        console.log(`Found ${scriptsCount} scripts`);

        const getX = x => (x * 64) + 32;
        const getY = y => (32 * 64) - (y * 64) - 32;

        const readBits = (packed, size, offset = 0) =>
            (packed & (((1 << size) - 1) << offset)) >> offset;

        const scripts = [];

        for (let i = 0; i < scriptsCount; i++) {
            const packedInt = file.readUInt16LE();

            const x = readBits(packedInt, 5);
            const y = readBits(packedInt, 5, 5);

            scripts.push({
                x,
                y,
                mapX: getX(x),
                mapY: getY(y),
                id: i,
                linked: false
            });
        }

        for (let i = 0; i < scriptsCount; i++) {
            const packedInt = file.readUInt32LE();

            scripts[i].scriptId = readBits(packedInt, 9);
            scripts[i].bytecodeOffset = readBits(packedInt, 11, 9);
            scripts[i].bytecodeLength = readBits(packedInt, 10, 9 + 11);
            scripts[i].flags = readBits(packedInt, 2, 9 + 11 + 10);
        }

        return scripts;
    }

    parseBytecode(file = new ByteTools()) {
        const bytecodeCount = file.readUInt16LE();

        const bytecode = [];

        for (let i = 0; i < bytecodeCount; i++) {
            bytecode.push({
                opcode: file.readUInt8(),
                arg0: file.readUInt32LE(),
                arg1: file.readUInt32LE()
            });
        }

        return bytecode;
    }

    generate(lines, texmap, things, decals, bspheader, scripts, postprocess) {
        const pp = postprocess;

        const header = "// Generated by OE2RPG: MapParser by PROPHESSOR (DRRP: MapParser by PROPHESSOR and UsernameAK);\n\nnamespace = \"zdoom\";\n\n";

        const deftex = pp && pp.defaultTextures || {};

        let ss = "";
        ss += "sector {\n";
        ss += "\theightceiling = 64;\n";
        ss += `\ttexturefloor = "${deftex.floor || 'floor'}";\n`;
        ss += `\ttextureceiling = "${deftex.ceilLow || 'ceiling'}";\n`;
        ss += "}\n\n";
        ss += "sector {\n";
        ss += "\theightceiling = 128;\n";
        ss += `\ttexturefloor = "${deftex.floorHigh || deftex.floor || 'floor'}";\n`;
        ss += `\ttextureceiling = "${deftex.ceilHigh || 'ceiling'}";\n`;
        ss += "}\n\n";

        ss += "thing { // Player Start\n";
        ss += `x=${((bspheader.playerstart % 32) * 64) + 32}.000;`;
        ss += `y=${((32 - Math.floor(bspheader.playerstart / 32)) * 64) - 32}.000;`;
        ss += "type=1;";
        ss += `angle=${90 * ((bspheader.playerrotation + 3) % 4)};`;
        ss += "coop=true;";
        ss += "dm=true;";
        ss += "single=true;";
        ss += "skill1=true;";
        ss += "skill2=true;";
        ss += "skill3=true;";
        ss += "skill4=true;";
        ss += "skill5=true;";
        ss += "}";

        let sideid = 0;
        let sectorid = 1;
        const vertices = [];

        function findVertex(x, y, comment=null) {
            for (let i = 0; i < vertices.length; i++) {
                if (vertices[i][0] === x && vertices[i][1] === y) return i;
            }
            vertices.push([x, y, comment]);
            return vertices.length - 1;
        }

        const isVertical = (x1, x2) => x1 === x2;

        const getTexture = id => texmap[id] !== undefined ? `WALL${texmap[id]}` : `UID${id}`;

        // Check is it more single or double-height sectors
        // Used to offset decals (we don't have information about decal's sector height)
        const doubleHeightStats = {
            single: 0,
            double: 0
        }

        // lines
        if (GENERATE_LINES)
        for (const line of lines) {
            if (DOOR_IDS.includes(line.textureLower)) continue;
            if (pp && pp.deleteLines && pp.deleteLines.includes(line.id))
                continue;
            
            let { x0, y0, x1, y1 } = line;

            x0 *= 8;
            x1 *= 8;
            y0 = (256 - y0) * 8;
            y1 = (256 - y1) * 8;

            if (pp && pp.changeLines && pp.changeLines[String(line.id)]) {
                const change = pp.changeLines[String(line.id)];
                x0 = change.x1 || x0;
                y0 = change.y1 || y0;
                x1 = change.x0 || x1;
                y1 = change.y0 || y1;
            }

            // Will be overriden later
            let v0 = findVertex(x1, y1);
            let v1 = findVertex(x0, y0);

            const isDoubleHeight = Boolean(line.flags & 0b10000000000000000);
            const isTopOnly = Boolean(line.flags & 0b101); // top only and not impassable

            if (isDoubleHeight) doubleHeightStats.double++;
            else doubleHeightStats.single++;

            const comment = {
                id: line.id,
                double: isDoubleHeight,
                flags: line.flags,
                x0: line.x0,
                y0: line.y0,
                x1: line.x1,
                y1: line.y1,
                tl: getTexture(line.textureLower),
                tu: getTexture(line.textureUpper),
                tlid: line.textureLower,
                tuid: line.textureUpper,
            }

            ss += `sidedef { // ${sideid}\n`;
            ss += `comment = "isDoubleHeight ${isDoubleHeight}";\n`;
            ss += `\tsector = ${isDoubleHeight ? 1 : 0};\n`;
            if (isDoubleHeight && !isTopOnly) {
                ss += `\ttexturetop = "${getTexture(line.textureUpper)}";\n`;
            }
            if (!isTopOnly) { // ??? Is it a decal?
                ss += `\ttexturemiddle = "${getTexture(line.textureLower)}";\n`;
            } else {
                ss += `\ttexturemiddle = "${getTexture(line.textureUpper)}";\n`;
            }
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
            ss += "}\n\n";

            ss += "linedef {\n";
            ss += `\tv2 = ${v0};\n`;
            ss += `\tv1 = ${v1};\n`;
            ss += `\tsidefront = ${sideid++};\n`;
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
            ss += "}\n\n";

            // Generate decals for upper wall texture
            if (GENERATE_UPPER_WALLS && isDoubleHeight && line.textureLower !== line.textureUpper) {
                // Vertical/Horizontal/Diagonal
                const isVertical = x0 === x1;
                const isHorizontal = y0 === y1;
                const isDiagonal = Math.max(x0, x1) - Math.min(x0, x1) === Math.max(y0, y1) - Math.min(y0, y1);
                const isConflicted = Boolean(pp && pp.conflictedUpperTextures && pp.conflictedUpperTextures.includes(line.id));

                if (Boolean(pp && pp.deleteUpperTextures && pp.deleteUpperTextures.includes(line.id)))
                    continue;

                const vertexComment = isConflicted
                    ? `Conflicted upper texture "${getTexture(line.textureUpper)}" for line ${line.id}`
                    : null;

                if (isVertical) {
                    const direction = y0 < y1 ? 1 : -1;
                    if (GENERATE_SAFE_UPPER_WALLS) {
                        if (direction === -1) {
                            y0 -= SHRINK_UPPER_WALL;
                            y1 += SHRINK_UPPER_WALL;
                        } else {
                            y0 += SHRINK_UPPER_WALL;
                            y1 -= SHRINK_UPPER_WALL;
                        }
                    }
                    v0 = findVertex(x1 + (OFFSET_UPPER * direction), y1, vertexComment);
                    v1 = findVertex(x0 + (OFFSET_UPPER * direction), y0, vertexComment);
                } else if (isHorizontal) {
                    const direction = x0 > x1 ? 1 : -1;
                    if (GENERATE_SAFE_UPPER_WALLS) {
                        if (direction === -1) {
                            x0 += SHRINK_UPPER_WALL;
                            x1 -= SHRINK_UPPER_WALL;
                        } else {
                            x0 -= SHRINK_UPPER_WALL;
                            x1 += SHRINK_UPPER_WALL;
                        }
                    }
                    v0 = findVertex(x1, y1 + (OFFSET_UPPER * direction), vertexComment);
                    v1 = findVertex(x0, y0 + (OFFSET_UPPER * direction), vertexComment);
                } else if (isDiagonal) {
                    if (x0 > x1 && y0 > y1) { // -/ 0/1
                        // Shrink
                        x0 -= SHRINK_UPPER_WALL;
                        y0 -= SHRINK_UPPER_WALL;
                        x1 += SHRINK_UPPER_WALL;
                        y1 += SHRINK_UPPER_WALL;
                        // Offset
                        x0 -= OFFSET_UPPER;
                        x1 -= OFFSET_UPPER;
                    } else if (x0 > x1 && y0 < y1) { // \- 0\1
                        // Shrink
                        x0 -= SHRINK_UPPER_WALL;
                        y0 += SHRINK_UPPER_WALL;
                        x1 += SHRINK_UPPER_WALL;
                        y1 -= SHRINK_UPPER_WALL;
                        // Offset
                        x0 += OFFSET_UPPER;
                        x1 += OFFSET_UPPER;
                    } else if (x0 < x1 && y0 > y1) { // -\ 1\0
                        // Shrink
                        x0 += SHRINK_UPPER_WALL;
                        y0 -= SHRINK_UPPER_WALL;
                        x1 -= SHRINK_UPPER_WALL;
                        y1 += SHRINK_UPPER_WALL;
                        // Offset
                        x0 -= OFFSET_UPPER;
                        x1 -= OFFSET_UPPER;
                    } else if (x0 < x1 && y0 < y1) { // /- 1/0
                        // Shrink
                        x0 += SHRINK_UPPER_WALL;
                        y0 += SHRINK_UPPER_WALL;
                        x1 -= SHRINK_UPPER_WALL;
                        y1 -= SHRINK_UPPER_WALL;
                        // Offset
                        x0 += OFFSET_UPPER;
                        x1 += OFFSET_UPPER;
                    }
                    v0 = findVertex(x1, y1, vertexComment);
                    v1 = findVertex(x0, y0, vertexComment);
                } else {
                    continue;
                }

                if (isConflicted) continue; // Generate vertices only

                ss += `sidedef {\n`;
                ss += `comment = "doubleHeight decal for line ${line.id}";\n`;
                ss += `\tsector = 1;\n`;
                ss += `\ttexturemiddle = "${getTexture(line.textureUpper)}";\n`;
                ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
                ss += "}\n\n";

                ss += `sidedef {\n`;
                ss += `comment = "doubleHeight decal for line ${line.id}";\n`;
                ss += `\tsector = 1;\n`;
                ss += `\ttexturemiddle = "${getTexture(line.textureUpper)}";\n`;
                ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
                ss += "}\n\n";

                ss += "linedef {\n";
                ss += `\tv1 = ${v0};\n`;
                ss += `\tv2 = ${v1};\n`;
                ss += "\ttwosided = true;\n";
                ss += `\tsidefront = ${sideid++};\n`;
                ss += `\tsideback = ${sideid++};\n`;
                ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
                ss += "}\n\n";
            }
        }

        // things
        if (GENERATE_THINGS)
        for (const thing of things) {
            const isDecal = Boolean(thing.flags & THINGS_PROPS.isDecal);

            // Skip if it is a decal
            if (isDecal && !GENERATE_THINGS_FOR_KNOWN_DECALS && Object.keys(DECALS).includes(String(thing.id)))
                continue;
            
            if (THINGS[thing.id.toString()] === 'DECAL' && !GENERATE_THINGS_FOR_KNOWN_DECALS)
                continue;

            const x = thing.x * 8;
            const y = (256 - thing.y) * 8;
            const z = thing.z ? thing.z - 64 : 0;
            
            if (thing.flags & 1) { // Will spawn
                ss += "thing {\n";
                ss += `\ttype = ${THINGS.mapspot};\n`;
                ss += `\tx = ${x};\n`;
                ss += `\ty = ${y};\n`;
                ss += `\theight = ${z};\n`;
                ss += `\tid = ${(thing.x << 5) | thing.y};\n`;
                ss += `\tcomment = "Will spawn ${thing.id}";\n`;
            } else if (THINGS[thing.id.toString()] && !isDecal) {
                ss += "thing {\n";
                ss += `\ttype = ${THINGS[thing.id.toString()]};\n`;
                ss += `\tx = ${x};\n`;
                ss += `\ty = ${y};\n`;
                ss += `\theight = ${z};\n`;
                ss += `\tcomment = "${thing.id}";\n`;
            } else {
                ss += "thing {\n";
                ss += `\ttype = ${THINGS.notifier};\n`;
                ss += `\tx = ${x};\n`;
                ss += `\ty = ${y};\n`;
                ss += `\theight = ${z};\n`;
                ss += `\tcomment = "Unknown ${thing.flags & THINGS_PROPS.isDecal ? 'decal' : 'thing'} ${thing.id} ${(thing.flags1 || thing.flags || 0).toString(2)} ${(thing.flags2 || 0).toString(2)} at ${thing.z || '?'}";\n`;
            }

            const [script] = scripts.filter(script => script.mapX === x && script.mapY === y);

            if (script) {
                ss += `\tspecial = 80;\n`;
                ss += `\targ0 = ${script.id};\n`;
                script.linked = true;
            }

            ss += "\tskill1 = true;\n";
            ss += "\tskill2 = true;\n";
            ss += "\tskill3 = true;\n";
            ss += "\tskill4 = true;\n";
            ss += "\tskill5 = true;\n";
            ss += "\tskill6 = true;\n";
            ss += "\tskill7 = true;\n";
            ss += "\tskill8 = true;\n";
            ss += "\tsingle = true;\n";
            ss += "\tcoop = true;\n";
            ss += "\tdm = true;\n";
            ss += "\tclass1 = true;\n";
            ss += "\tclass2 = true;\n";
            ss += "\tclass3 = true;\n";
            ss += "\tclass4 = true;\n";
            ss += "\tclass5 = true;\n";

            ss += "}\n\n";
        }

        // Generate decals
        if (GENERATE_DECALS)
        for (const decal of decals) {
            // Doors will be generated later
            // if (DOOR_IDS.includes(decal.id)) continue;
            if (pp && pp.deleteDecals && pp.deleteDecals.includes(decal.tid))
                continue;
            
            if (decal.id === 162) continue; // Ignore door sides

            const v0 = findVertex(decal.x0, (2048 - decal.y0));
            const v1 = findVertex(decal.x1, (2048 - decal.y1));

            const isDoubleHeight = doubleHeightStats.double > doubleHeightStats.single;
            
            const offsetBase = decal.texture[0] === 'W' ? 117 : 64;

            let offsetY = 0;

            const map = (value, [fromMin, fromMax], [toMin, toMax]) => (((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin)) + toMin;

            if (decal.z) {
                offsetY = map(decal.z, [0, 128], [offsetBase * 2, 0]);
            } else if (!decal.isDoor
                && isDoubleHeight
                && (decal.z === 0
                    || decal.z === 64
                    || !decal.isNotFence
                )) {
                offsetY = offsetBase;
            }

            ss += "sidedef {\n";
            ss += `\tsector = ${isDoubleHeight ? 1 : 0};\n`;
            ss += `\ttexturemiddle = "${decal.texture}";\n`;
            if (offsetY)
                ss += `\toffsety = -${offsetY};\n`;
            ss += "}\n\n";

            ss += "sidedef {\n";
            ss += `\tsector = ${isDoubleHeight ? 1 : 0};\n`;
            ss += `\ttexturemiddle = "${decal.texture}";\n`;
            // ss += `\tscalex_mid = -1.0;\n`; // Have some bugs with pre-scaled decals
            if (offsetY)
                ss += `\toffsety = -${offsetY};\n`;
            ss += "}\n\n";

            ss += "linedef {\n";
            ss += `\tv1 = ${v0};\n`;
            ss += `\tv2 = ${v1};\n`;
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(decal))};\n`
            // ss += `\tcomment = ${JSON.stringify(JSON.stringify([decal.flags1.toString(2), decal.flags2.toString(2)]))};\n`
            ss += `\tsidefront = ${sideid++};\n`;
            ss += `\tsideback = ${sideid++};\n`;
            ss += "\ttwosided = true;\n";
            // ss += "\tblocking = true;\n";
            // ss += "\timpassable = true;\n";
            ss += "}\n\n";
        }


        // Generate doors
        if (GENERATE_DOORS)
        for (const line of lines) {
            if (!DOOR_IDS.includes(line.textureLower)) continue;

            const isDoubleHeight = Boolean(line.flags & 0b10000000000000000);

            const doorSector = sectorid;
            ss += `sector { // ${sectorid++}\n`;
            ss += `\theightceiling = ${isDoubleHeight ? 128 : 64};\n`;
            ss += "\theightfloor = 64;\n";
            ss += "\ttexturefloor = \"WALL0\";\n";
            ss += "\ttextureceiling = \"WALL0\";\n";
            ss += "\tcomment = \"doorsector\";\n";
            ss += "}\n\n";

            let v0, v1, v2, v3;

            if (isVertical(line.x0, line.x1)) {
                v0 = findVertex((line.x1 * 8) - 8, (256 - line.y1) * 8);
                v1 = findVertex((line.x0 * 8) - 8, (256 - line.y0) * 8);
                v2 = findVertex((line.x0 * 8) + 8, (256 - line.y0) * 8);
                v3 = findVertex((line.x1 * 8) + 8, (256 - line.y1) * 8);
            } else {
                v0 = findVertex(line.x1 * 8, ((256 - line.y1) * 8) - 8);
                v1 = findVertex(line.x0 * 8, ((256 - line.y0) * 8) - 8);
                v2 = findVertex(line.x0 * 8, ((256 - line.y0) * 8) + 8);
                v3 = findVertex(line.x1 * 8, ((256 - line.y1) * 8) + 8);
            }

            const comment = {
                double: isDoubleHeight,
                flags: line.flags,
                x0: line.x0,
                y0: line.y0,
                x1: line.x1,
                y1: line.y1,
                tl: getTexture(line.textureLower),
                tu: getTexture(line.textureUpper),
                tlid: line.textureLower,
                tuid: line.textureUpper,
            }

            ss += `sidedef { // ${sideid}\n`;
            ss += `comment = "isDoor, isDoubleHeight ${isDoubleHeight}";\n`;
            ss += `\tsector = ${isDoubleHeight ? 1 : 0};\n`;
            if (isDoubleHeight) {
                ss += `\ttexturetop = "${getTexture(line.textureUpper)}";\n`;
            }
            ss += `\ttexturebottom = "${getTexture(line.textureLower)}";\n`;
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
            ss += "}\n\n";

            ss += "linedef {\n";
            ss += `\tv2 = ${v0};\n`;
            ss += `\tv1 = ${v1};\n`;
            ss += `\tsidefront = ${sideid++};\n`;
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
            ss += "\tplayeruse = true;\n";
            ss += "\trepeatspecial = true;\n";
            ss += "\tspecial = 80;\n";
            ss += "\targ0 = 3002;\n";
            ss += "}\n\n";

            ss += `sidedef { // ${sideid}\n`;
            ss += `comment = "isDoor, isDoubleHeight ${isDoubleHeight}";\n`;
            ss += `\tsector = ${isDoubleHeight ? 1 : 0};\n`;
            if (isDoubleHeight) {
                ss += `\ttexturetop = "${getTexture(line.textureUpper)}";\n`;
            }
            ss += `\ttexturebottom = "${getTexture(line.textureLower)}";\n`;
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
            ss += "}\n\n";

            ss += "linedef {\n";
            ss += `\tv2 = ${v2};\n`;
            ss += `\tv1 = ${v3};\n`;
            ss += `\tsidefront = ${sideid++};\n`;
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
            ss += "\tplayeruse = true;\n";
            ss += "\trepeatspecial = true;\n";
            ss += "\tspecial = 80;\n";
            ss += "\targ0 = 3002;\n";
            ss += "}\n\n";

            // Sides

            ss += `sidedef { // ${sideid}\n`;
            ss += `comment = "isDoor, isDoubleHeight ${isDoubleHeight}";\n`;
            ss += `\tsector = ${doorSector};\n`;
            if (isDoubleHeight) {
                ss += `\ttexturetop = "${getTexture(line.textureUpper)}";\n`;
            }
            ss += `\ttexturebottom = "STEX721";\n`;
            ss += `\toffsetx = 29;\n`;
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
            ss += "}\n\n";

            ss += "linedef {\n";
            ss += `\tv2 = ${v0};\n`;
            ss += `\tv1 = ${v3};\n`;
            ss += `\tsidefront = ${sideid++};\n`;
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
            ss += "}\n\n";

            ss += `sidedef { // ${sideid}\n`;
            ss += `comment = "isDoor, isDoubleHeight ${isDoubleHeight}";\n`;
            ss += `\tsector = ${doorSector};\n`;
            if (isDoubleHeight) {
                ss += `\ttexturetop = "${getTexture(line.textureUpper)}";\n`;
            }
            ss += `\ttexturebottom = "STEX721";\n`;
            ss += `\toffsetx = 29;\n`;
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
            ss += "}\n\n";

            ss += "linedef {\n";
            ss += `\tv2 = ${v2};\n`;
            ss += `\tv1 = ${v1};\n`;
            ss += `\tsidefront = ${sideid++};\n`;
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(comment))};\n`;
            ss += "}\n\n";
        }

        const lineValidator = [["x0", "number"], ["y0", "number"], ["x1", "number"], ["y1", "number"], ["frontsector", "number"], ["backsector", "number"]]; // [propertyName, type]

        // Additional lines by postprocess
        if (pp && Array.isArray(pp.addLines)) {
            for (const line of pp.addLines) {
                if (!lineValidator.every(([prop, type]) => typeof line[prop] === type)) {
                    console.warn('Skip invalid additinal line', line);
                    continue;
                }

                const v0 = findVertex(line.x0, line.y0);
                const v1 = findVertex(line.x1, line.y1);

                ss += "sidedef {\n";
                ss += `\tsector = ${line.frontsector};\n`;
                ss += `\ttexturemiddle = "${line.texture || '-'}";\n`;
                ss += "}\n\n";

                ss += "sidedef {\n";
                ss += `\tsector = ${line.backsector};\n`;
                ss += `\ttexturemiddle = "${line.texture || '-'}";\n`;
                ss += "}\n\n";

                ss += "linedef {\n";
                ss += `\tv1 = ${v0};\n`;
                ss += `\tv2 = ${v1};\n`;
                ss += `\tcomment = ${JSON.stringify(JSON.stringify(line))};\n`
                ss += `\tsidefront = ${sideid++};\n`;
                ss += `\tsideback = ${sideid++};\n`;
                ss += "\ttwosided = true;\n";
                ss += "}\n\n";
            }
        }

        let vs = "";
        for (const vertex of vertices) {
            // if (!(Number.isSafeInteger(vertex[0]) && Number.isSafeInteger(vertex[0]))) {
            //     vs += "vertex {}\n\n";
            //     continue;
            // };
            vs += "vertex {\n";
            vs += `\tx = ${vertex[0] || 0};\n`;
            vs += `\ty = ${vertex[1] || 0};\n`;
            if (vertex[3]) vs += `\tcomment = ${JSON.stringify(JSON.stringify(vertex[3]))};\n`;
            vs += "}\n\n";
        }

        // Generate script triggers
        for (const script of scripts) {
            if (script.linked) continue;

            ss += `thing { // Script trigger ${script.id}\n`;
            ss += `\ttype = ${THINGS.trigger};\n`;
            ss += `\tx = ${script.mapX};\n`;
            ss += `\ty = ${script.mapY};\n`;
            ss += `\tspecial = 80;\n`;
            ss += `\targ0 = ${script.id};\n`;
            ss += `\tcomment = ${JSON.stringify(JSON.stringify(script))};\n`;
            ss += "\tskill1 = true;\n";
            ss += "\tskill2 = true;\n";
            ss += "\tskill3 = true;\n";
            ss += "\tskill4 = true;\n";
            ss += "\tskill5 = true;\n";
            ss += "\tskill6 = true;\n";
            ss += "\tskill7 = true;\n";
            ss += "\tskill8 = true;\n";
            ss += "\tsingle = true;\n";
            ss += "\tcoop = true;\n";
            ss += "\tdm = true;\n";
            ss += "\tclass1 = true;\n";
            ss += "\tclass2 = true;\n";
            ss += "\tclass3 = true;\n";
            ss += "\tclass4 = true;\n";
            ss += "\tclass5 = true;\n";

            ss += "}\n\n";
        }

        return header + vs + ss;
    }

    generateScripts(scripts, bytecode) {
        const outScripts = [];

        for (const script of scripts) {
            const lines = [];

            lines.push(`Script ${script.scriptId} (void) {`);
            
            const slice = bytecode.slice(script.bytecodeOffset, script.bytecodeOffset + script.bytecodeLength);

            const body = [];

            for (const code of slice) {
                if (OPCODES[code.opcode]) {
                    body.push(...OPCODES[code.opcode](code.arg0, code.arg1));
                } else {
                    body.push(`// OPCODE ${code.opcode} (${code.arg0}, ${code.arg1})`);
                }
            }

            lines.push(...body.map(x => '    ' + x));

            lines.push(`}`);

            outScripts.push(lines.join('\n'));
        }
            
        return outScripts.join('\n\n');
    }

    display(lines, count, things, decals) {
        if (!a) return;
        const ctx = document.getElementsByTagName("canvas")[0].getContext("2d");

        function setColor(color) {
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        function drawLine(x, y, x1, y1) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x1, y1);
            ctx.stroke();
            ctx.closePath();
        }

        function drawCircle(x, y, id) {
            setColor("darkgreen");
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.closePath();
            setColor("pink");
            ctx.fillText(id, x, y);
        }

        ctx.font = "8px sans-serif";

        setColor("black");

        ctx.fillRect(0, 0, innerWidth, innerHeight);

        setColor("red");

        for (let i = 0; i < count; i++) {
            drawLine(lines[i].x0 * 3, lines[i].y0 * 3, lines[i].x1 * 3, lines[i].y1 * 3);
        }

        // setColor("green");

        for (let i = 0; i < things.length; i++) {
            drawCircle(things[i].x * 3, things[i].y * 3, things[i].id);
            drawCircle(things[i].x * 3, things[i].y * 3, things[i].id);
        }

        setColor("cyan");
        for (const decal of decals) {
            drawLine(decal.x0 / (2048 / Config.width), decal.y0 / (2048 / Config.height), decal.x1 / (2048 / Config.width), decal.y1 / (2048 / Config.height));
            // drawCircle(decal.x0*3,768-decal.y0*3,"X");
            // drawCircle(decal.x1*3,768-decal.y1*3,"X");
        }
    }
}

function main(from, to) {
    const parser = new Parser(from, to);

    parser.parse();
}

let a = null;

try {
    a = require("nw.gui").Window.get();
    a.width = Config.width;
    a.height = Config.height;

    // main(process.argv[2] || "level03.bsp", process.argv[3] || "out.tm");
    {
        const from = prompt("Введите полное имя .bsp файла");
        if (from) main(from, `${from}.ts`);
    }
    document.addEventListener("click", () => {
        const from = prompt("Введите полное имя .bsp файла");
        if (from) main(from, `${from}.ts`);
    });
} catch (e) {
    console.log("# === OE2RP: MapParser === #");

    const args = process.argv;

    if (args.length != 3) {
        console.info("Usage: <path/to/file.bsp>");
        return 1;
    }

    main(args[2], `${args[2]}.TEXTMAP`);
}
