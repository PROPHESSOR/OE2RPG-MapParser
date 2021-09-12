/**
 * Copyright (c) 2021 PROPHESSOR
 * 
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 */

const readBits = (packed, size, offset = 0) =>
    (packed & (((1 << size) - 1) << offset)) >> offset;

const ITEMS = {
    0: 'Health Potion',
    4: 'Coins',
    256: 'Lg Health Potion',
    512: 'Strength Potion',
    768: 'Accuracy Potion',
    2560: 'Armor Kit',
};

module.exports = {
    3: (arg0, arg1) => [`// Steal or return weapons (${arg0}, ${arg1})`],
    8: (arg0, arg1) => [`// Display dialog (${arg0}, ${arg1})`],
    10: (arg0, arg1) => [`// Lockpicks password "$OE2RP_{MAP}_${arg0}" (${arg0}, ${arg1})`],
    33: (arg0, arg1) => [`// Shop (${arg0}, ${arg1})`],
    47: (arg0, arg1) => {
        const a = readBits(arg0, 8);
        const b = readBits(arg0, 8, 8);
        const c = readBits(arg0, 8, 16);
        const d = readBits(arg0, 8, 24);

        let item = null;
        let amount = null;

        if (c) {
            item = readBits(arg0, 16);
            amount = c;
        } else {
            item = a;
            amount = b;
        }

        return [`// Give item ${ITEMS[item] || item} x${amount} (${arg0}, ${arg1})`];
    }
}