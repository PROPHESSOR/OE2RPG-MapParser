/**
 * Copyright (c) 2017-2018 DRRP-Team (PROPHESSOR, UsernameAK)
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

"use strict";

module.exports = {
    "0": (decal) => decal.flags1 & 0b1000 ? "WALL11" : "WALL10", // DOORS
    "83": "WALL17",
    "161": "STEX721",
    "180": "STEX794",
    "194": "STEX851"
};