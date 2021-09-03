module.exports = {
    "deleteLines": [0, 1, 2], // Do not generate lines with these ids [optional]
    "conflictedUpperWalls": [0, 1, 2], // Do not generate upper walls decals for lines with these ids. Only vertices with comments will be generated, so you can create these lines manually [optional]
    "deleteUpperWalls": [0, 1, 2], // Do not generate upper walls decals for lines with these ids. Even vertices will not be generated [optional]
    "changeLines": { // Change lines with these ids [optional]
        "0": { // Line id
            "x0": 1423, // Change x0 value of a line after scaling (in UDMF map units) [optional]
            "y0": 3213, // Change y0 value of a line after scaling (in UDMF map units) [optional]
            "x1": 3213, // Change x1 value of a line after scaling (in UDMF map units) [optional]
            "y1": 2132  // Change y1 value of a line after scaling (in UDMF map units) [optional]
        }
    },
    "deleteDecals": [0, 1, 2], // Do not generate decals with these ids (thing ids) [optional]
    "defaultTextures": { // Change default floor/ceiling textures (instead of "floor" and "ceiling" by default) [optional]
        "floor": "FLAT017", // Default floor texture [optional]
        "ceilLow": "FLAT016", // Default ceiling for sectors with height 64 [optional]
        "ceilHigh": "F_SKY1"  // Default ceiling for sectors with height 128 [optional]
    }
};