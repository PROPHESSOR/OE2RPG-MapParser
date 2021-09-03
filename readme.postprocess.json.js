module.exports = {
    "deleteLines": [0, 1, 2], // Do not generate lines with these ids
    "conflictedUpperWalls": [0, 1, 2], // Do not generate upper walls decals for lines with these ids. Only vertices with comments will be generated, so you can create these lines manually
    "changeLines": { // Change lines with these ids
        "0": { // Line id
            "x0": 1423, // Change xy01 value of a line after scaling (in UDMF map units) [optional]
            "y0": 3213, // Change xy01 value of a line after scaling (in UDMF map units) [optional]
            "x1": 3213, // Change xy01 value of a line after scaling (in UDMF map units) [optional]
            "y1": 2132  // Change xy01 value of a line after scaling (in UDMF map units) [optional]
        }
    },
    "deleteDecals": [0, 1, 2], // Do not generate decals with these ids (thing ids)
    "defaultTextures": { // Change default floor/ceiling textures (instead of "floor" and "ceiling" by default)
        "floor": "FLAT017",
        "ceilLow": "FLAT016", // Default ceiling for sectors with height 64
        "ceilHigh": "F_SKY1"  // Default ceiling for sectors with height 128
    }
};