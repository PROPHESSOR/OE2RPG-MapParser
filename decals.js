/**
 * Copyright (c) 2017-2018 DRRP-Team (PROPHESSOR, UsernameAK)
 *
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

"use strict";

module.exports = {
    "0": (decal) => decal.flags1 & 0b1000 ? "WALL11" : "WALL10", // Двари
    "70": "STEX762", // Водосток
    "83": "WALL17",
    "131": "STEX596", // Щит
    "150": "STEX796", // Настенный факел
    "153": "STEX687", // Книжная полка
    "161": "STEX721",
    "166": "STEX739", // Эльфийский заборчик
    "180": "STEX794",
    "181": "STEX796", // Настенный факел
    "194": "STEX851",
    "199": "WALL0", // Деревянное ограждение торговцев
    "200": "STEX876"
};