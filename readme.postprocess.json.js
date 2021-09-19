module.exports = {
    "deleteLines": [0, 1, 2], // Do not generate lines with these ids [optional]
    "conflictedUpperTextures": [0, 1, 2], // Do not generate upper walls decals for lines with these ids. Only vertices with comments will be generated, so you can create these lines manually. Use it for doors and perpendicular lines [optional]
    "deleteUpperTextures": [0, 1, 2], // Do not generate upper walls decals for lines with these ids. Even vertices will not be generated [optional]
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
        "ceilHigh": "F_SKY1",  // Default ceiling for sectors with height 128 [optional]
        "floorHigh": "FLAT018" // Default floor texture for sectors with height 128. If not specified, used floor textures specified above [optional]
    },
    "addLines": [{ // Add lines. Can be used to separate sectors with different heights [optional]
        "x0": 123, // [required]
        "y0": 123, // [required]
        "x1": 123, // [required]
        "y1": 123, // [required]
        "frontsector": 0 | 1, // [required]
        "backsector": 0 | 1, // [required]
        "texture": "WALL0", // [optional]
    }],
    "scripts": { // ACS configuration [optional]
        "mapId": "CAVERNS" // MAPINFO map id [optional]
    },
    "deleteTriggers": [123], // Delete trigger things with specified script ids [optional]
    "disableTriggers": [123], // Disable trigger things with specified script ids [optional]
};