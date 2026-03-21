#!/usr/bin/env node

/*

MIT License

Copyright (c) 2025-2026 JustDeveloper <https://justdeveloper.is-a.dev/>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.



*/

/*
    __         _______________  __
    \ \    __ / / __/ __/ ___/ / /
     > >  / // /\ \_\ \/ /__  < < 
    /_/   \___/___/___/\___/   \_\

     JavaScript String Compressor 
         https://jssc.js.org/     

    npm i strc

*/

/*! JSSC <https://jssc.js.org/> (c) 2025-2026 JustDeveloper <https://justdeveloper.is-a.dev/> */

import fs from 'fs';
import path from 'path';
import JUSTC from 'justc';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import { Buffer } from 'node:buffer';

var version$2 = "2.1.1-a";
var pkg = {
	version: version$2};

const name__ = 'JSSC';
const prefix = name__+': ';
const format = '.jssc';
const type = name__+'1';

const version$1 = pkg.version;

function stringCodes(str) {
    let output = [];
    let max = 0;
    let maxCharCode = 0;
    let minCharCode = 65535;
    let min = Infinity;
    const string = String(str);
    for (let i = 0; i < string.length; i++) {
        const code = string.charCodeAt(i);
        output.push(code);
        max = Math.max(max, code.toString().length);
        maxCharCode = Math.max(maxCharCode, code);
        min = Math.min(min, code.toString().length);
        minCharCode = Math.min(minCharCode, code);
    }
    return {max, output, maxCharCode, min, minCharCode};
}

function charCode(num) {
    return String.fromCharCode(num + 32);
}
function checkChar(cde) {
    return cde % 65535 === cde
}

function stringChunks$1(str, num) {
    const output = [];
    for (let i = 0; i < str.length; i += num) {
        output.push(str.slice(i, i + num));
    }
    return output
}
function chunkArray(array, num) {
    const result = [];
    for (let i = 0; i < array.length; i += num) {
        result.push(array.slice(i, i + num));
    }
    return result;
}

function decToBin(num, wnum) {
    return num.toString(2).padStart(wnum, '0');
}
function binToDec(str) {
    return parseInt(str, 2);
}

function B64Padding(str) {    
    const padding = str.length % 4;

    if (padding === 2) {
        str += '==';
    } else if (padding === 3) {
        str += '=';
    }

    return str;
}

const freqMap = {
    ESCAPE_BYTE: 0xFF,
    TOP_COUNT: 254,
    SPLITTER: " \u200B",

    compress(text, splitter = this.SPLITTER) {
        const freq = {};
        for (let char of text) {
            freq[char] = (freq[char] || 0) + 1;
        }

        const topChars = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.TOP_COUNT)
            .map(entry => entry[0]);

        const charToIndex = new Map(topChars.map((char, i) => [char, i]));
        
        let header = String.fromCharCode(topChars.length) + topChars.join('');
        
        let bytes = [];
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (charToIndex.has(char)) {
                /* frequent */
                bytes.push(charToIndex.get(char));
            } else {
                /* rare */
                bytes.push(this.ESCAPE_BYTE);
                const code = char.charCodeAt(0);
                bytes.push((code >> 8) & 0xFF);
                bytes.push(code & 0xFF);
            }
        }

        /* to UTF16 */
        const compressedBody = [];
        for (let i = 0; i < bytes.length; i += 2) {
            const b1 = bytes[i];
            const b2 = (i + 1 < bytes.length) ? bytes[i + 1] : 0x00;
            compressedBody.push(String.fromCharCode((b1 << 8) | b2));
        }

        return header + splitter + compressedBody.join('');
    },

    decompress(compressedText, splitter = this.SPLITTER) {
        const parts = compressedText.split(splitter);

        if (parts.length < 2) {
            throw new Error(prefix+'Invalid freqMap data: splitter not found');
        }

        const headerPart = parts[0];
        const bodyPart = parts.slice(1).join(splitter);

        const topCount = headerPart.charCodeAt(0);
        const topChars = headerPart.substring(1, topCount + 1);
        
        let bytes = [];
        for (let i = 0; i < bodyPart.length; i++) {
            const code = bodyPart.charCodeAt(i);
            bytes.push((code >> 8) & 0xFF);
            bytes.push(code & 0xFF);
        }

        const result = [];
        for (let i = 0; i < bytes.length; i++) {
            const b = bytes[i];
            if (b === this.ESCAPE_BYTE) {
                const charCode = (bytes[i + 1] << 8) | bytes[i + 2];
                result.push(String.fromCharCode(charCode));
                i += 2;
            } else if (b < topCount) {
                result.push(topChars[b]);
            }
        }
        return result.join('');
    },

    /**
     * 0 = Fail
     * 1 = Success
     * 2 = Remove last character (Success)
     * @param {string} text
     * @param {string?} splitter
     * @returns {number|[number, number, string, string]}
     */
    test(text, splitter = this.SPLITTER) {
        try {
            if (text.includes(splitter)) return 0;
            const packed = this.compress(text, splitter);
            const unpacked = this.decompress(packed, splitter);
            if (packed.length < text.length) {
                if (unpacked == text) return [1, packed.length, splitter, packed];
                else if (unpacked.slice(0,-1) == text) return [2, packed.length, splitter, packed];
                else return 0;
            }
            return 0;
        } catch (_) {
            return 0;
        }
    }
};

const freqMapSplitters = [
    " \u200B","\u0000",
    "\u001F", "\u0001",
    "\uFFFD", "\u2022",
    "|§|",    "\uFEFF"
];

function splitGraphemes(str) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        return Array.from(segmenter.segment(str), s => s.segment);
    }
    return Array.from(str);
}

function segments(str) {
    if (typeof str !== 'string' || str.length === 0) return [];

    str = splitGraphemes(str);

    const THRESHOLD = 128;
    const segs = [];
    let currentSeg = str[0];

    for (let i = 1; i < str.length; i++) {
        const prevCode = str[i - 1].codePointAt(0);
        const currCode = str[i].codePointAt(0);

        if (Math.abs(currCode - prevCode) > THRESHOLD) {
            segs.push(currentSeg);
            currentSeg = str[i];
        } else {
            currentSeg += str[i];
        }
    }

    if (currentSeg) segs.push(currentSeg);

    return segs;
}

function charsBase() {
    const charsBase = {};
    function addChar(i) {
        charsBase[i] = String.fromCharCode(i);
    }
    for (let i = 0; i < 65; i++)    addChar(i); /* ASCII 00 - 40 */
    for (let i = 91; i < 97; i++)   addChar(i); /* ASCII 5B - 60 */
    for (let i = 123; i < 128; i++) addChar(i); /* ASCII 7B - 7F */
    return charsBase;
}
function charsLatin() {
    const charsLatin = {};
    for (let i = 0; i < 128; i++) {
        charsLatin[i] = String.fromCharCode(i); /* ASCII 00 - 7F */
    }
    return charsLatin;
}

const _JSSC = {};
_JSSC._char = (cde) => String.fromCharCode(cde);
_JSSC._IDs = {
    'BASE':  0,
    'RU':    1,
    'ENRU':  2,
    'ENKK':  3,
    'HI':    4,
    'ENHI':  5,
    'BN':    6,
    'ENBN':  7,
    'HIBN':  8,
    'JA':    9,
    'Telu': 10,
    'MR':   11,
    'B':    12,
    'E':    13,
    'AR':   14
};
_JSSC.BASE = function() { /* Base */
    const chrsBase = charsBase();
    const addCBase = [
        215,  247, 8722, 11800,
        174,  169,  171, 10003,
        182,  9834, 183, 10005,
        177,  181,  8960, 8211, 
        8212, 8228, 8229, 8230, 
        8240, 8241, 8249, 8250, 
        8252, 8253, 8263, 8264, 
        8267, 8270, 8274, 8451, 
        8457, 8470, 8471, 8482,

        402, 1423, 1547, 65020,
        2547, 2553, 2555, 2801, 
        3065, 3647, 6107, 8499, 
        2546,

        8304, 185, 178, 179,
        8585, 8319, 8305,

        8709, 8730, 8734,
    ];
    for (let i = 161; i < 168; i++) {
        addCBase.push(i);
    }
    for (let i = 187; i < 192; i++) {
        addCBase.push(i);
    }
    for (let i = 8308; i < 8317; i++) {
        addCBase.push(i);
    }
    for (let i = 8528; i < 8576; i++) {
        addCBase.push(i);
    }
    for (let i = 8352; i < 8385; i++) {
        addCBase.push(i);
    }
    for (let i = 8320; i < 8333; i++) {
        addCBase.push(i);
    }
    for (let i = 8712; i < 8718; i++) {
        addCBase.push(i);
    }
    let i = 65;
    for (const cde of addCBase) {
        chrsBase[i++] = _JSSC._char(cde);
        if (i === 91) {
            i = 97;
        } else if (i === 123) {
            i = 128;
        }
    }
    return chrsBase
};
_JSSC._BASE = [
    167, 8722, 8451, 169, 8211, 215, 247, 
    8457, 174, 8470, 8482, 8471, 8249, 
    8250, 171, 187, 8242, 8245, 8216, 
    8217, 8218, 8219, 8243, 8246, 8220, 
    8221, 8222, 8223, 8226, 182, 8267, 
    8270, 8240, 8241, 9834, 183, 8228, 
    8229, 8230, 161, 191, 8252, 8264
];
_JSSC._MATH = [
    8544, 8547, 8550, 8553, 8556, 8572, 
    8545, 8548, 8551, 8554, 8557, 8573, 
    8546, 8549, 8552, 8555, 8558, 8574, 
    8560, 8563, 8566, 8569, 8559, 8575, 
    8561, 8564, 8567, 8570, 8562, 8565, 
    8568, 8571, 8712, 8715, 8713, 8716, 
    8730, 8721, 8734, 8804, 8805
];
_JSSC._CURR = [
    165, 3647, 8363, 8361, 1423, 8364, 
    8377, 8362, 8378, 8353, 8358, 163, 
    8381, 8354, 8369, 2547, 8370, 8366, 
    8376, 8382, 8357, 6107, 8360, 8372, 
    8373, 8365, 1547, 2801, 162, 65020, 
    8355, 8383, 8380, 3065, 164, 8384, 
    8379, 402, 8359, 2546, 8371, 8367, 
    8356, 8375, 2553, 8368, 8352, 8499, 
    8374, 2555
];
/*
    ASCII (charsLatin) // English, Spanish, Portuguese, French, German
*/
_JSSC._RU = function(baseOrLatin) {
    const chrsBase = baseOrLatin();
    let maxI = 0;
    for (let i = 1040; i < 1104; i++) {
        const curI = i - 912;
        chrsBase[curI] = _JSSC._char(i);    /* Unicode 0410 - 044F */
        maxI = Math.max(maxI, curI);
    }
    chrsBase[maxI + 1] = _JSSC._char(1025); /*  Unicode 0401 ( Ё ) */
    chrsBase[maxI + 2] = _JSSC._char(1105); /*  Unicode 0451 ( ё ) */
    return chrsBase;
};
_JSSC.RU = function() { /* Russian, Ukrainian, Belarusian, Kazakh */
    const chrsBase = _JSSC._RU(charsBase);
    let i = 65;
    for (const char of _JSSC._BASE.concat(_JSSC._MATH, [
        105, 239, 1028, 1030, 1031, 1108, 1110, 1111,
        1118, 1038,
        1241, 1181, 1171, 1199, 1201, 1179, 1257, 1211, 1240, 1186, 1170, 1198, 1200, 1178, 1256, 1210,
        8381, 8364, 165, 8376, 8372
    ])) {
        chrsBase[i++] = _JSSC._char(char);
        if (i === 91) {
            i = 97;
        } else if (i === 123) {
            i = 193;
        }
    }
    chrsBase[110] = 'i';
    chrsBase[111] = 'I';

    return chrsBase;
};
_JSSC.ENRU = function() { /* English, Russian, Ukrainian, Belarusian */
    const chrsBase = _JSSC._RU(charsLatin);
    let i = 194;
    for (const char of _JSSC._BASE.concat([
        105, 239, 1028, 1030, 1031, 1108, 1110, 1111,
        1118, 1038,
        8381, 8364, 165, 8376, 8372, 163, 8380
    ], [
        215, 247
    ])) {
        chrsBase[i++] = _JSSC._char(char);
    }
    return chrsBase;
};
_JSSC.ENKK = function() { /* English, Russian, Kazakh */
    const chrsBase = _JSSC._RU(charsLatin);
    let i = 194;
    for (const char of _JSSC._BASE.concat([
        1241, 1181, 1171, 1199, 1201, 1179, 1257, 1211, 1240, 1186, 1170, 1198, 1200, 1178, 1256, 1210,
        8381, 163, 8376
    ])) {
        chrsBase[i++] = _JSSC._char(char);
    }
    return chrsBase;
};
_JSSC._HI = function(baseOrLatin) {
    const chrsBase = baseOrLatin();
    for (let i = 2304; i < 2432; i++) {
        chrsBase[i - 2176] = _JSSC._char(i); /* Unicode 0900 - 097F */
    }
    return chrsBase;
};
_JSSC._Ind = [
    8377, 8360, 78, 2547,
    2404, 
    215, 247,
];
_JSSC.HI = function() { /* Hindi */
    const chrsBase = _JSSC._HI(charsBase);
    let i = 65;
    for (const char of _JSSC._BASE.concat(_JSSC._Ind)) {
        chrsBase[i++] = _JSSC._char(char);
        if (i === 91) {
            i = 97;
        }
    }
    return chrsBase
};
_JSSC.ENHI = function() { /* English, Hindi */
    return _JSSC._HI(charsLatin); 
};
_JSSC._BN = function(baseOrLatin) {
    const chrsBase = baseOrLatin();
    for (let i = 2432; i < 2559; i++) {
        chrsBase[i - 2304] = _JSSC._char(i); /* Unicode 0980 - 09FF */
    }
    chrsBase[255] = _JSSC._char(2404);
    return chrsBase;
};
_JSSC.BN = function() { /* Bengali */
    const chrsBase = _JSSC._BN(charsBase);
    let i = 65;
    for (const char of _JSSC._BASE.concat(_JSSC._Ind)) {
        chrsBase[i++] = _JSSC._char(char);
        if (i === 91) {
            i = 97;
        }
    }
    return chrsBase;
};
_JSSC.ENBN = function() { /* English, Bengali */
    return _JSSC._BN(charsLatin);
};
_JSSC.HIBN = function() { /* Hindi, Bengali */
    const chrsBase = {};
    for (let i = 2304; i < 2559; i++) {
        chrsBase[i - 2176 - 128] = _JSSC._char(i);
    }
    chrsBase[255] = ' ';
    chrsBase[229] = chrsBase[0];
    chrsBase[0] = "\x00";
    return chrsBase;
};
_JSSC._JA = [
    [
        65371, 65373,  65288, 65289,  65339, 65341,  12304, 12305,
        12289, 65292,
        12290,
        12349,
        12300, 12301,  12302, 12303,
        12288,
        12316,
        65306,
        65281,
        65311,
        12445, 12541,
        183,
    ],
    [
        8230, 8229, 
        165,
    ]
];
_JSSC.JA = function() { /* English, Hiragana (Japanese), Katakana (Japanese) */
    const chrsBase = charsLatin();
    let i = 128;
    for (const char of _JSSC._JA[0].concat(
        Array.from({ length : 46 }, (v, j) => j + 12352 ), /* Unicode 3040 - 309F */
        Array.from({ length : 46 }, (v, j) => j + 12448 ), /* Unicode 30A0 - 30FF */
        _JSSC._JA[1], [
            19968, 20108, 19977, 
            22235, 20116, 20845, 
            19971, 20843, 20061
        ]
    )) {
        chrsBase[i++] = _JSSC._char(char);
    }
    chrsBase[17] = _JSSC._char(21313);
    chrsBase[18] = _JSSC._char(30334);
    chrsBase[19] = _JSSC._char(21315);
    chrsBase[20] = _JSSC._char(19975);
    return chrsBase;
};
_JSSC.Telu = function() { /* English, Telugu */
    const chrsBase = charsLatin();
    for (let i = 3073; i < 3184; i++) { /* Unicode 0C01 - 0C6F */
        chrsBase[i - 2945] = _JSSC._char(i);
    }
    let i = 239;
    for (const char of _JSSC._Ind.concat([
        8364, 0xA3, 0xA2, 0xA5, 0xA7, 0xA9, 0xAE, 8482, 0x2030, 0x2031
    ])) {
        chrsBase[i++] = _JSSC._char(char);
    }
    return chrsBase;
};
_JSSC.MR = function() { /* English, Marathi */
    const chrsBase = charsLatin();
    for (let i = 0x900; i < 0x980; i++) {
        chrsBase[i - 2176] = _JSSC._char(i);
    }
    return chrsBase;
};
_JSSC.B = function() { /* Baltic */
    const chrsBase = charsLatin();
    for (let i = 0x100; i < 0x17F; i++) {
        chrsBase[i - 128] = _JSSC._char(i);
    }
    chrsBase[255] = _JSSC._char(0x17F); /* U+017F */
    return chrsBase;
};
_JSSC.E = function() { /* European */
    const chrsBase = charsLatin();
    for (let i = 0x80; i < 0xFF; i++) {
        chrsBase[i] = _JSSC._char(i);
    }
    chrsBase[255] = _JSSC._char(0x17F); /* U+017F */
    return chrsBase;
};
_JSSC.AR = function() { /* Arabic */
    const chrsBase = {};
    for (let i = 0x600; i < 0x6FF; i++) {
        chrsBase[i - 1536] = _JSSC._char(i);
    }
    chrsBase[255] = chrsBase[0];
    chrsBase[0] = "\x00";
    return chrsBase;
};
_JSSC.use = class {
    constructor() {
        let output = {};
        for (const [name, func] of Object.entries(_JSSC)) {
            if (typeof func === 'function' && !name.startsWith('_') && name != 'use') {
                output[name__+name] = func;
            }
        }
        Object.freeze(output);
        return output;
    }
};
_JSSC._begin = [
    'https://', 'http://', 'file://', 'mailto:', 'ftp://', 'data:', 'tel:', 'sms:'
];
Object.freeze(_JSSC.use);

const SEQUENCE_MARKER = '\uDBFF'; /* Private Use Area */

function findSequences(str, minLength = 2, minCount = 3) {
    const repeats = [];
    const n = str.length;
    
    for (let i = 0; i < n - minLength * minCount + 1; i++) {
        for (let len = 2; len <= Math.min(30, Math.floor((n - i) / minCount)); len++) {
            const pattern = str.substr(i, len);
            const set = new Set(pattern);
            if (set.has(SEQUENCE_MARKER)) continue;
            
            let count = 1;
            for (let j = i + len; j <= n - len; j += len) {
                if (str.substr(j, len) === pattern) {
                    count++;
                } else {
                    break;
                }
            }
            
            if (count >= minCount) {
                const end = i + len * count;
                let overlaps = false;
                for (const r of repeats) {
                    if (i < r.end && end > r.start) {
                        overlaps = true;
                        break;
                    }
                }
                
                if (!overlaps) {
                    repeats.push({
                        start: i,
                        end: end,
                        length: len,
                        pattern: pattern,
                        count: count,
                        saved: (len * count) - (len + 3)
                    });
                    i = end - 1;
                    break;
                }
            }
        }
    }
    
    return repeats.sort((a, b) => b.saved - a.saved);
}

function compressSequences(str) {
    if (str.length < 20) return {compressed: str, sequences: false};

    const set = new Set(str);
    if (set.has(SEQUENCE_MARKER)) {
        return {compressed: str, sequences: false};
    }
    
    const repeats = findSequences(str, 2, 3);
    if (repeats.length === 0) return {compressed: str, sequences: false};
    
    const selected = [];
    let covered = new Array(str.length).fill(false);
    
    for (const repeat of repeats) {
        let canUse = true;
        for (let i = repeat.start; i < repeat.end; i++) {
            if (covered[i]) {
                canUse = false;
                break;
            }
        }
        
        if (canUse && repeat.saved > 0) {
            selected.push(repeat);
            for (let i = repeat.start; i < repeat.end; i++) {
                covered[i] = true;
            }
        }
    }
    
    if (selected.length === 0) return {compressed: str, sequences: false};

    let result = [];
    let pos = 0;
    
    for (const repeat of selected) {
        if (pos < repeat.start) {
            result.push(str.slice(pos, repeat.start));
        }
        
        /* sequence encoding: [marker][length][count][pattern] */
        const lengthChar = String.fromCharCode(Math.min(repeat.length, 30) + 32);
        const countChar = String.fromCharCode(Math.min(repeat.count, 65535) + 32);
        result.push(SEQUENCE_MARKER + lengthChar + countChar + repeat.pattern);
        
        pos = repeat.end;
    }
    
    if (pos < str.length) {
        result.push(str.slice(pos));
    }

    result = result.join('');
    
    /* check if it's worth it */
    if (result.length < str.length * 0.9) { /* at least 10% */
        return {compressed: result, sequences: true};
    }
    
    return {compressed: str, sequences: false};
}

function decompressSequences(str) {
    const result = [];
    let i = 0;
    
    while (i < str.length) {
        if (str.charCodeAt(i) === 0xDBFF) {
            i++;
            
            if (i + 2 >= str.length) {
                result.push(SEQUENCE_MARKER);
                continue;
            }
            
            const length = str.charCodeAt(i) - 32;
            const count = str.charCodeAt(i + 1) - 32;
            i += 2;
            
            if (i + length > str.length) {
                result.push(
                    SEQUENCE_MARKER + 
                    String.fromCharCode(length + 32) + 
                    String.fromCharCode(count + 32) +
                    str.slice(i)
                );
                break;
            }
            
            const pattern = str.substr(i, length);
            i += length;
            
            for (let j = 0; j < count; j++) {
                result.push(pattern);
            }
        } else {
            result.push(str.charAt(i));
            i++;
        }
    }
    
    return result.join('');
}

const B64$1 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/";
/**
 * This is a modified https://stackoverflow.com/a/55011290 code. https://stackoverflow.com/a/55011290 -
 * by Slavik Meltser (https://stackoverflow.com/users/1291121/slavik-meltser) -
 * a modified https://www.danvk.org/hex2dec.html code.
 * @param {string} str 
 * @param {number} fromBase 
 * @param {number} toBase 
 * @param {string?} DIGITS
 * @returns {string}
 */
function convertBase$1(str, fromBase, toBase, DIGITS = B64$1) {

    const add = (x, y, base) => {
        let z = [];
        const n = Math.max(x.length, y.length);
        let carry = 0;
        let i = 0;
        while (i < n || carry) {
            const xi = i < x.length ? x[i] : 0;
            const yi = i < y.length ? y[i] : 0;
            const zi = carry + xi + yi;
            z.push(zi % base);
            carry = Math.floor(zi / base);
            i++;
        }
        return z;
    };

    const multiplyByNumber = (num, x, base) => {
        if (num < 0) return null;
        if (num == 0) return [];

        let result = [];
        let power = x;
        while (true) {
            num & 1 && (result = add(result, power, base));
            num = num >> 1;
            if (num === 0) break;
            power = add(power, power, base);
        }

        return result;
    };

    const parseToDigitsArray = (str, base) => {
        const digits = str.split('');
        let arr = [];
        for (let i = digits.length - 1; i >= 0; i--) {
            const n = DIGITS.indexOf(digits[i]);
            if (n == -1) return null;
            arr.push(n);
        }
        return arr;
    };

    const digits = parseToDigitsArray(str);
    if (digits === null) return null;

    let outArray = [];
    let power = [1];
    for (let i = 0; i < digits.length; i++) {
        digits[i] && (outArray = add(outArray, multiplyByNumber(digits[i], power, toBase), toBase));
        power = multiplyByNumber(fromBase, power, toBase);
    }

    const out = [];
    for (let i = outArray.length - 1; i >= 0; i--)
        out.push(DIGITS[outArray[i]]);

    if (out.length == 0) out.push('0');

    return out.join('');
}

function packB64(numbers) {
    let bitString = [];

    for (const num of numbers) {
        if (num < 0 || num > 63)
            throw new Error(prefix+"Base-64 Packing: Out of range!");

        bitString.push(decToBin(num, 6));
    }
    bitString = bitString.join('');

    const paddedLength = Math.ceil(bitString.length / 16) * 16;
    bitString = bitString.padEnd(paddedLength, "0");

    return {
        bin: bitString,
        len: numbers.length
    };
}

function unpackB64(bin, len) {
    const totalBits = len * 6;
    const trimmed = bin.slice(0, totalBits);

    const result = [];

    for (let i = 0; i < trimmed.length; i += 6) {
        result.push(binToDec(trimmed.slice(i, i + 6)));
    }

    return result;
}

function compressB64(str) {
    const numbers = [];

    for (const ch of str) {
        const index = B64$1.indexOf(ch);
        if (index === -1)
            throw new Error(prefix+"Invalid Base64 character");
        numbers.push(index);
    }

    const { bin, len } = packB64(numbers);

    const result = [];
    for (const chunk of stringChunks$1(bin, 16)) {
        result.push(String.fromCharCode(binToDec(chunk)));
    }

    return {
        data: result.join(''),
        length: len
    };
}

function decompressB64(data, len) {
    const bitString = [];

    for (const ch of data) {
        bitString.push(decToBin(ch.charCodeAt(0), 16));
    }

    const numbers = unpackB64(bitString.join(""), len);

    return numbers.map(n => B64$1[n]).join("");
}

const B64 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/";
/**
 * This is a modified https://stackoverflow.com/a/55011290 code. https://stackoverflow.com/a/55011290 -
 * by Slavik Meltser (https://stackoverflow.com/users/1291121/slavik-meltser) -
 * a modified https://www.danvk.org/hex2dec.html code.
 * @param {string} str 
 * @param {number} fromBase 
 * @param {number} toBase 
 * @param {string?} DIGITS
 * @returns {string}
 */
function convertBase(str, fromBase, toBase, DIGITS = B64) {

    const add = (x, y, base) => {
        let z = [];
        const n = Math.max(x.length, y.length);
        let carry = 0;
        let i = 0;
        while (i < n || carry) {
            const xi = i < x.length ? x[i] : 0;
            const yi = i < y.length ? y[i] : 0;
            const zi = carry + xi + yi;
            z.push(zi % base);
            carry = Math.floor(zi / base);
            i++;
        }
        return z;
    };

    const multiplyByNumber = (num, x, base) => {
        if (num < 0) return null;
        if (num == 0) return [];

        let result = [];
        let power = x;
        while (true) {
            num & 1 && (result = add(result, power, base));
            num = num >> 1;
            if (num === 0) break;
            power = add(power, power, base);
        }

        return result;
    };

    const parseToDigitsArray = (str, base) => {
        const digits = str.split('');
        let arr = [];
        for (let i = digits.length - 1; i >= 0; i--) {
            const n = DIGITS.indexOf(digits[i]);
            if (n == -1) return null;
            arr.push(n);
        }
        return arr;
    };

    const digits = parseToDigitsArray(str);
    if (digits === null) return null;

    let outArray = [];
    let power = [1];
    for (let i = 0; i < digits.length; i++) {
        digits[i] && (outArray = add(outArray, multiplyByNumber(digits[i], power, toBase), toBase));
        power = multiplyByNumber(fromBase, power, toBase);
    }

    let out = '';
    for (let i = outArray.length - 1; i >= 0; i--)
        out += DIGITS[outArray[i]];

    if (out == '') out = '0';

    return out;
}

var emojiObject = {
	"😀": true,
	"😃": true,
	"😄": true,
	"😁": true,
	"😆": true,
	"😅": true,
	"🤣": true,
	"😂": true,
	"🙂": true,
	"🙃": true,
	"🫠": true,
	"😉": true,
	"😊": true,
	"😇": true,
	"🥰": true,
	"😍": true,
	"🤩": true,
	"😘": true,
	"😗": true,
	"☺️": true,
	"😚": true,
	"😙": true,
	"🥲": true,
	"😋": true,
	"😛": true,
	"😜": true,
	"🤪": true,
	"😝": true,
	"🤑": true,
	"🤗": true,
	"🤭": true,
	"🫢": true,
	"🫣": true,
	"🤫": true,
	"🤔": true,
	"🫡": true,
	"🤐": true,
	"🤨": true,
	"😐": true,
	"😑": true,
	"😶": true,
	"🫥": true,
	"😶‍🌫️": true,
	"😏": true,
	"😒": true,
	"🙄": true,
	"😬": true,
	"😮‍💨": true,
	"🤥": true,
	"🫨": true,
	"🙂‍↔️": true,
	"🙂‍↕️": true,
	"😌": true,
	"😔": true,
	"😪": true,
	"🤤": true,
	"😴": true,
	"🫩": true,
	"😷": true,
	"🤒": true,
	"🤕": true,
	"🤢": true,
	"🤮": true,
	"🤧": true,
	"🥵": true,
	"🥶": true,
	"🥴": true,
	"😵": true,
	"😵‍💫": true,
	"🤯": true,
	"🤠": true,
	"🥳": true,
	"🥸": true,
	"😎": true,
	"🤓": true,
	"🧐": true,
	"😕": true,
	"🫤": true,
	"😟": true,
	"🙁": true,
	"☹️": true,
	"😮": true,
	"😯": true,
	"😲": true,
	"😳": true,
	"🥺": true,
	"🥹": true,
	"😦": true,
	"😧": true,
	"😨": true,
	"😰": true,
	"😥": true,
	"😢": true,
	"😭": true,
	"😱": true,
	"😖": true,
	"😣": true,
	"😞": true,
	"😓": true,
	"😩": true,
	"😫": true,
	"🥱": true,
	"😤": true,
	"😡": true,
	"😠": true,
	"🤬": true,
	"😈": true,
	"👿": true,
	"💀": true,
	"☠️": true,
	"💩": true,
	"🤡": true,
	"👹": true,
	"👺": true,
	"👻": true,
	"👽": true,
	"👾": true,
	"🤖": true,
	"😺": true,
	"😸": true,
	"😹": true,
	"😻": true,
	"😼": true,
	"😽": true,
	"🙀": true,
	"😿": true,
	"😾": true,
	"🙈": true,
	"🙉": true,
	"🙊": true,
	"💌": true,
	"💘": true,
	"💝": true,
	"💖": true,
	"💗": true,
	"💓": true,
	"💞": true,
	"💕": true,
	"💟": true,
	"❣️": true,
	"💔": true,
	"❤️‍🔥": true,
	"❤️‍🩹": true,
	"❤️": true,
	"🩷": true,
	"🧡": true,
	"💛": true,
	"💚": true,
	"💙": true,
	"🩵": true,
	"💜": true,
	"🤎": true,
	"🖤": true,
	"🩶": true,
	"🤍": true,
	"💋": true,
	"💯": true,
	"💢": true,
	"💥": true,
	"💫": true,
	"💦": true,
	"💨": true,
	"🕳️": true,
	"💬": true,
	"👁️‍🗨️": true,
	"🗨️": true,
	"🗯️": true,
	"💭": true,
	"💤": true,
	"👋": true,
	"🤚": true,
	"🖐️": true,
	"✋": true,
	"🖖": true,
	"🫱": true,
	"🫲": true,
	"🫳": true,
	"🫴": true,
	"🫷": true,
	"🫸": true,
	"👌": true,
	"🤌": true,
	"🤏": true,
	"✌️": true,
	"🤞": true,
	"🫰": true,
	"🤟": true,
	"🤘": true,
	"🤙": true,
	"👈": true,
	"👉": true,
	"👆": true,
	"🖕": true,
	"👇": true,
	"☝️": true,
	"🫵": true,
	"👍": true,
	"👎": true,
	"✊": true,
	"👊": true,
	"🤛": true,
	"🤜": true,
	"👏": true,
	"🙌": true,
	"🫶": true,
	"👐": true,
	"🤲": true,
	"🤝": true,
	"🙏": true,
	"✍️": true,
	"💅": true,
	"🤳": true,
	"💪": true,
	"🦾": true,
	"🦿": true,
	"🦵": true,
	"🦶": true,
	"👂": true,
	"🦻": true,
	"👃": true,
	"🧠": true,
	"🫀": true,
	"🫁": true,
	"🦷": true,
	"🦴": true,
	"👀": true,
	"👁️": true,
	"👅": true,
	"👄": true,
	"🫦": true,
	"👶": true,
	"🧒": true,
	"👦": true,
	"👧": true,
	"🧑": true,
	"👱": true,
	"👨": true,
	"🧔": true,
	"🧔‍♂️": true,
	"🧔‍♀️": true,
	"👨‍🦰": true,
	"👨‍🦱": true,
	"👨‍🦳": true,
	"👨‍🦲": true,
	"👩": true,
	"👩‍🦰": true,
	"🧑‍🦰": true,
	"👩‍🦱": true,
	"🧑‍🦱": true,
	"👩‍🦳": true,
	"🧑‍🦳": true,
	"👩‍🦲": true,
	"🧑‍🦲": true,
	"👱‍♀️": true,
	"👱‍♂️": true,
	"🧓": true,
	"👴": true,
	"👵": true,
	"🙍": true,
	"🙍‍♂️": true,
	"🙍‍♀️": true,
	"🙎": true,
	"🙎‍♂️": true,
	"🙎‍♀️": true,
	"🙅": true,
	"🙅‍♂️": true,
	"🙅‍♀️": true,
	"🙆": true,
	"🙆‍♂️": true,
	"🙆‍♀️": true,
	"💁": true,
	"💁‍♂️": true,
	"💁‍♀️": true,
	"🙋": true,
	"🙋‍♂️": true,
	"🙋‍♀️": true,
	"🧏": true,
	"🧏‍♂️": true,
	"🧏‍♀️": true,
	"🙇": true,
	"🙇‍♂️": true,
	"🙇‍♀️": true,
	"🤦": true,
	"🤦‍♂️": true,
	"🤦‍♀️": true,
	"🤷": true,
	"🤷‍♂️": true,
	"🤷‍♀️": true,
	"🧑‍⚕️": true,
	"👨‍⚕️": true,
	"👩‍⚕️": true,
	"🧑‍🎓": true,
	"👨‍🎓": true,
	"👩‍🎓": true,
	"🧑‍🏫": true,
	"👨‍🏫": true,
	"👩‍🏫": true,
	"🧑‍⚖️": true,
	"👨‍⚖️": true,
	"👩‍⚖️": true,
	"🧑‍🌾": true,
	"👨‍🌾": true,
	"👩‍🌾": true,
	"🧑‍🍳": true,
	"👨‍🍳": true,
	"👩‍🍳": true,
	"🧑‍🔧": true,
	"👨‍🔧": true,
	"👩‍🔧": true,
	"🧑‍🏭": true,
	"👨‍🏭": true,
	"👩‍🏭": true,
	"🧑‍💼": true,
	"👨‍💼": true,
	"👩‍💼": true,
	"🧑‍🔬": true,
	"👨‍🔬": true,
	"👩‍🔬": true,
	"🧑‍💻": true,
	"👨‍💻": true,
	"👩‍💻": true,
	"🧑‍🎤": true,
	"👨‍🎤": true,
	"👩‍🎤": true,
	"🧑‍🎨": true,
	"👨‍🎨": true,
	"👩‍🎨": true,
	"🧑‍✈️": true,
	"👨‍✈️": true,
	"👩‍✈️": true,
	"🧑‍🚀": true,
	"👨‍🚀": true,
	"👩‍🚀": true,
	"🧑‍🚒": true,
	"👨‍🚒": true,
	"👩‍🚒": true,
	"👮": true,
	"👮‍♂️": true,
	"👮‍♀️": true,
	"🕵️": true,
	"🕵️‍♂️": true,
	"🕵️‍♀️": true,
	"💂": true,
	"💂‍♂️": true,
	"💂‍♀️": true,
	"🥷": true,
	"👷": true,
	"👷‍♂️": true,
	"👷‍♀️": true,
	"🫅": true,
	"🤴": true,
	"👸": true,
	"👳": true,
	"👳‍♂️": true,
	"👳‍♀️": true,
	"👲": true,
	"🧕": true,
	"🤵": true,
	"🤵‍♂️": true,
	"🤵‍♀️": true,
	"👰": true,
	"👰‍♂️": true,
	"👰‍♀️": true,
	"🤰": true,
	"🫃": true,
	"🫄": true,
	"🤱": true,
	"👩‍🍼": true,
	"👨‍🍼": true,
	"🧑‍🍼": true,
	"👼": true,
	"🎅": true,
	"🤶": true,
	"🧑‍🎄": true,
	"🦸": true,
	"🦸‍♂️": true,
	"🦸‍♀️": true,
	"🦹": true,
	"🦹‍♂️": true,
	"🦹‍♀️": true,
	"🧙": true,
	"🧙‍♂️": true,
	"🧙‍♀️": true,
	"🧚": true,
	"🧚‍♂️": true,
	"🧚‍♀️": true,
	"🧛": true,
	"🧛‍♂️": true,
	"🧛‍♀️": true,
	"🧜": true,
	"🧜‍♂️": true,
	"🧜‍♀️": true,
	"🧝": true,
	"🧝‍♂️": true,
	"🧝‍♀️": true,
	"🧞": true,
	"🧞‍♂️": true,
	"🧞‍♀️": true,
	"🧟": true,
	"🧟‍♂️": true,
	"🧟‍♀️": true,
	"🧌": true,
	"💆": true,
	"💆‍♂️": true,
	"💆‍♀️": true,
	"💇": true,
	"💇‍♂️": true,
	"💇‍♀️": true,
	"🚶": true,
	"🚶‍♂️": true,
	"🚶‍♀️": true,
	"🚶‍➡️": true,
	"🚶‍♀️‍➡️": true,
	"🚶‍♂️‍➡️": true,
	"🧍": true,
	"🧍‍♂️": true,
	"🧍‍♀️": true,
	"🧎": true,
	"🧎‍♂️": true,
	"🧎‍♀️": true,
	"🧎‍➡️": true,
	"🧎‍♀️‍➡️": true,
	"🧎‍♂️‍➡️": true,
	"🧑‍🦯": true,
	"🧑‍🦯‍➡️": true,
	"👨‍🦯": true,
	"👨‍🦯‍➡️": true,
	"👩‍🦯": true,
	"👩‍🦯‍➡️": true,
	"🧑‍🦼": true,
	"🧑‍🦼‍➡️": true,
	"👨‍🦼": true,
	"👨‍🦼‍➡️": true,
	"👩‍🦼": true,
	"👩‍🦼‍➡️": true,
	"🧑‍🦽": true,
	"🧑‍🦽‍➡️": true,
	"👨‍🦽": true,
	"👨‍🦽‍➡️": true,
	"👩‍🦽": true,
	"👩‍🦽‍➡️": true,
	"🏃": true,
	"🏃‍♂️": true,
	"🏃‍♀️": true,
	"🏃‍➡️": true,
	"🏃‍♀️‍➡️": true,
	"🏃‍♂️‍➡️": true,
	"💃": true,
	"🕺": true,
	"🕴️": true,
	"👯": true,
	"👯‍♂️": true,
	"👯‍♀️": true,
	"🧖": true,
	"🧖‍♂️": true,
	"🧖‍♀️": true,
	"🧗": true,
	"🧗‍♂️": true,
	"🧗‍♀️": true,
	"🤺": true,
	"🏇": true,
	"⛷️": true,
	"🏂": true,
	"🏌️": true,
	"🏌️‍♂️": true,
	"🏌️‍♀️": true,
	"🏄": true,
	"🏄‍♂️": true,
	"🏄‍♀️": true,
	"🚣": true,
	"🚣‍♂️": true,
	"🚣‍♀️": true,
	"🏊": true,
	"🏊‍♂️": true,
	"🏊‍♀️": true,
	"⛹️": true,
	"⛹️‍♂️": true,
	"⛹️‍♀️": true,
	"🏋️": true,
	"🏋️‍♂️": true,
	"🏋️‍♀️": true,
	"🚴": true,
	"🚴‍♂️": true,
	"🚴‍♀️": true,
	"🚵": true,
	"🚵‍♂️": true,
	"🚵‍♀️": true,
	"🤸": true,
	"🤸‍♂️": true,
	"🤸‍♀️": true,
	"🤼": true,
	"🤼‍♂️": true,
	"🤼‍♀️": true,
	"🤽": true,
	"🤽‍♂️": true,
	"🤽‍♀️": true,
	"🤾": true,
	"🤾‍♂️": true,
	"🤾‍♀️": true,
	"🤹": true,
	"🤹‍♂️": true,
	"🤹‍♀️": true,
	"🧘": true,
	"🧘‍♂️": true,
	"🧘‍♀️": true,
	"🛀": true,
	"🛌": true,
	"🧑‍🤝‍🧑": true,
	"👭": true,
	"👫": true,
	"👬": true,
	"💏": true,
	"👩‍❤️‍💋‍👨": true,
	"👨‍❤️‍💋‍👨": true,
	"👩‍❤️‍💋‍👩": true,
	"💑": true,
	"👩‍❤️‍👨": true,
	"👨‍❤️‍👨": true,
	"👩‍❤️‍👩": true,
	"👨‍👩‍👦": true,
	"👨‍👩‍👧": true,
	"👨‍👩‍👧‍👦": true,
	"👨‍👩‍👦‍👦": true,
	"👨‍👩‍👧‍👧": true,
	"👨‍👨‍👦": true,
	"👨‍👨‍👧": true,
	"👨‍👨‍👧‍👦": true,
	"👨‍👨‍👦‍👦": true,
	"👨‍👨‍👧‍👧": true,
	"👩‍👩‍👦": true,
	"👩‍👩‍👧": true,
	"👩‍👩‍👧‍👦": true,
	"👩‍👩‍👦‍👦": true,
	"👩‍👩‍👧‍👧": true,
	"👨‍👦": true,
	"👨‍👦‍👦": true,
	"👨‍👧": true,
	"👨‍👧‍👦": true,
	"👨‍👧‍👧": true,
	"👩‍👦": true,
	"👩‍👦‍👦": true,
	"👩‍👧": true,
	"👩‍👧‍👦": true,
	"👩‍👧‍👧": true,
	"🗣️": true,
	"👤": true,
	"👥": true,
	"🫂": true,
	"👪": true,
	"🧑‍🧑‍🧒": true,
	"🧑‍🧑‍🧒‍🧒": true,
	"🧑‍🧒": true,
	"🧑‍🧒‍🧒": true,
	"👣": true,
	"🫆": true,
	"🐵": true,
	"🐒": true,
	"🦍": true,
	"🦧": true,
	"🐶": true,
	"🐕": true,
	"🦮": true,
	"🐕‍🦺": true,
	"🐩": true,
	"🐺": true,
	"🦊": true,
	"🦝": true,
	"🐱": true,
	"🐈": true,
	"🐈‍⬛": true,
	"🦁": true,
	"🐯": true,
	"🐅": true,
	"🐆": true,
	"🐴": true,
	"🫎": true,
	"🫏": true,
	"🐎": true,
	"🦄": true,
	"🦓": true,
	"🦌": true,
	"🦬": true,
	"🐮": true,
	"🐂": true,
	"🐃": true,
	"🐄": true,
	"🐷": true,
	"🐖": true,
	"🐗": true,
	"🐽": true,
	"🐏": true,
	"🐑": true,
	"🐐": true,
	"🐪": true,
	"🐫": true,
	"🦙": true,
	"🦒": true,
	"🐘": true,
	"🦣": true,
	"🦏": true,
	"🦛": true,
	"🐭": true,
	"🐁": true,
	"🐀": true,
	"🐹": true,
	"🐰": true,
	"🐇": true,
	"🐿️": true,
	"🦫": true,
	"🦔": true,
	"🦇": true,
	"🐻": true,
	"🐻‍❄️": true,
	"🐨": true,
	"🐼": true,
	"🦥": true,
	"🦦": true,
	"🦨": true,
	"🦘": true,
	"🦡": true,
	"🐾": true,
	"🦃": true,
	"🐔": true,
	"🐓": true,
	"🐣": true,
	"🐤": true,
	"🐥": true,
	"🐦": true,
	"🐧": true,
	"🕊️": true,
	"🦅": true,
	"🦆": true,
	"🦢": true,
	"🦉": true,
	"🦤": true,
	"🪶": true,
	"🦩": true,
	"🦚": true,
	"🦜": true,
	"🪽": true,
	"🐦‍⬛": true,
	"🪿": true,
	"🐦‍🔥": true,
	"🐸": true,
	"🐊": true,
	"🐢": true,
	"🦎": true,
	"🐍": true,
	"🐲": true,
	"🐉": true,
	"🦕": true,
	"🦖": true,
	"🐳": true,
	"🐋": true,
	"🐬": true,
	"🦭": true,
	"🐟": true,
	"🐠": true,
	"🐡": true,
	"🦈": true,
	"🐙": true,
	"🐚": true,
	"🪸": true,
	"🪼": true,
	"🦀": true,
	"🦞": true,
	"🦐": true,
	"🦑": true,
	"🦪": true,
	"🐌": true,
	"🦋": true,
	"🐛": true,
	"🐜": true,
	"🐝": true,
	"🪲": true,
	"🐞": true,
	"🦗": true,
	"🪳": true,
	"🕷️": true,
	"🕸️": true,
	"🦂": true,
	"🦟": true,
	"🪰": true,
	"🪱": true,
	"🦠": true,
	"💐": true,
	"🌸": true,
	"💮": true,
	"🪷": true,
	"🏵️": true,
	"🌹": true,
	"🥀": true,
	"🌺": true,
	"🌻": true,
	"🌼": true,
	"🌷": true,
	"🪻": true,
	"🌱": true,
	"🪴": true,
	"🌲": true,
	"🌳": true,
	"🌴": true,
	"🌵": true,
	"🌾": true,
	"🌿": true,
	"☘️": true,
	"🍀": true,
	"🍁": true,
	"🍂": true,
	"🍃": true,
	"🪹": true,
	"🪺": true,
	"🍄": true,
	"🪾": true,
	"🍇": true,
	"🍈": true,
	"🍉": true,
	"🍊": true,
	"🍋": true,
	"🍋‍🟩": true,
	"🍌": true,
	"🍍": true,
	"🥭": true,
	"🍎": true,
	"🍏": true,
	"🍐": true,
	"🍑": true,
	"🍒": true,
	"🍓": true,
	"🫐": true,
	"🥝": true,
	"🍅": true,
	"🫒": true,
	"🥥": true,
	"🥑": true,
	"🍆": true,
	"🥔": true,
	"🥕": true,
	"🌽": true,
	"🌶️": true,
	"🫑": true,
	"🥒": true,
	"🥬": true,
	"🥦": true,
	"🧄": true,
	"🧅": true,
	"🥜": true,
	"🫘": true,
	"🌰": true,
	"🫚": true,
	"🫛": true,
	"🍄‍🟫": true,
	"🫜": true,
	"🍞": true,
	"🥐": true,
	"🥖": true,
	"🫓": true,
	"🥨": true,
	"🥯": true,
	"🥞": true,
	"🧇": true,
	"🧀": true,
	"🍖": true,
	"🍗": true,
	"🥩": true,
	"🥓": true,
	"🍔": true,
	"🍟": true,
	"🍕": true,
	"🌭": true,
	"🥪": true,
	"🌮": true,
	"🌯": true,
	"🫔": true,
	"🥙": true,
	"🧆": true,
	"🥚": true,
	"🍳": true,
	"🥘": true,
	"🍲": true,
	"🫕": true,
	"🥣": true,
	"🥗": true,
	"🍿": true,
	"🧈": true,
	"🧂": true,
	"🥫": true,
	"🍱": true,
	"🍘": true,
	"🍙": true,
	"🍚": true,
	"🍛": true,
	"🍜": true,
	"🍝": true,
	"🍠": true,
	"🍢": true,
	"🍣": true,
	"🍤": true,
	"🍥": true,
	"🥮": true,
	"🍡": true,
	"🥟": true,
	"🥠": true,
	"🥡": true,
	"🍦": true,
	"🍧": true,
	"🍨": true,
	"🍩": true,
	"🍪": true,
	"🎂": true,
	"🍰": true,
	"🧁": true,
	"🥧": true,
	"🍫": true,
	"🍬": true,
	"🍭": true,
	"🍮": true,
	"🍯": true,
	"🍼": true,
	"🥛": true,
	"☕": true,
	"🫖": true,
	"🍵": true,
	"🍶": true,
	"🍾": true,
	"🍷": true,
	"🍸": true,
	"🍹": true,
	"🍺": true,
	"🍻": true,
	"🥂": true,
	"🥃": true,
	"🫗": true,
	"🥤": true,
	"🧋": true,
	"🧃": true,
	"🧉": true,
	"🧊": true,
	"🥢": true,
	"🍽️": true,
	"🍴": true,
	"🥄": true,
	"🔪": true,
	"🫙": true,
	"🏺": true,
	"🌍": true,
	"🌎": true,
	"🌏": true,
	"🌐": true,
	"🗺️": true,
	"🗾": true,
	"🧭": true,
	"🏔️": true,
	"⛰️": true,
	"🌋": true,
	"🗻": true,
	"🏕️": true,
	"🏖️": true,
	"🏜️": true,
	"🏝️": true,
	"🏞️": true,
	"🏟️": true,
	"🏛️": true,
	"🏗️": true,
	"🧱": true,
	"🪨": true,
	"🪵": true,
	"🛖": true,
	"🏘️": true,
	"🏚️": true,
	"🏠": true,
	"🏡": true,
	"🏢": true,
	"🏣": true,
	"🏤": true,
	"🏥": true,
	"🏦": true,
	"🏨": true,
	"🏩": true,
	"🏪": true,
	"🏫": true,
	"🏬": true,
	"🏭": true,
	"🏯": true,
	"🏰": true,
	"💒": true,
	"🗼": true,
	"🗽": true,
	"⛪": true,
	"🕌": true,
	"🛕": true,
	"🕍": true,
	"⛩️": true,
	"🕋": true,
	"⛲": true,
	"⛺": true,
	"🌁": true,
	"🌃": true,
	"🏙️": true,
	"🌄": true,
	"🌅": true,
	"🌆": true,
	"🌇": true,
	"🌉": true,
	"♨️": true,
	"🎠": true,
	"🛝": true,
	"🎡": true,
	"🎢": true,
	"💈": true,
	"🎪": true,
	"🚂": true,
	"🚃": true,
	"🚄": true,
	"🚅": true,
	"🚆": true,
	"🚇": true,
	"🚈": true,
	"🚉": true,
	"🚊": true,
	"🚝": true,
	"🚞": true,
	"🚋": true,
	"🚌": true,
	"🚍": true,
	"🚎": true,
	"🚐": true,
	"🚑": true,
	"🚒": true,
	"🚓": true,
	"🚔": true,
	"🚕": true,
	"🚖": true,
	"🚗": true,
	"🚘": true,
	"🚙": true,
	"🛻": true,
	"🚚": true,
	"🚛": true,
	"🚜": true,
	"🏎️": true,
	"🏍️": true,
	"🛵": true,
	"🦽": true,
	"🦼": true,
	"🛺": true,
	"🚲": true,
	"🛴": true,
	"🛹": true,
	"🛼": true,
	"🚏": true,
	"🛣️": true,
	"🛤️": true,
	"🛢️": true,
	"⛽": true,
	"🛞": true,
	"🚨": true,
	"🚥": true,
	"🚦": true,
	"🛑": true,
	"🚧": true,
	"⚓": true,
	"🛟": true,
	"⛵": true,
	"🛶": true,
	"🚤": true,
	"🛳️": true,
	"⛴️": true,
	"🛥️": true,
	"🚢": true,
	"✈️": true,
	"🛩️": true,
	"🛫": true,
	"🛬": true,
	"🪂": true,
	"💺": true,
	"🚁": true,
	"🚟": true,
	"🚠": true,
	"🚡": true,
	"🛰️": true,
	"🚀": true,
	"🛸": true,
	"🛎️": true,
	"🧳": true,
	"⌛": true,
	"⏳": true,
	"⌚": true,
	"⏰": true,
	"⏱️": true,
	"⏲️": true,
	"🕰️": true,
	"🕛": true,
	"🕧": true,
	"🕐": true,
	"🕜": true,
	"🕑": true,
	"🕝": true,
	"🕒": true,
	"🕞": true,
	"🕓": true,
	"🕟": true,
	"🕔": true,
	"🕠": true,
	"🕕": true,
	"🕡": true,
	"🕖": true,
	"🕢": true,
	"🕗": true,
	"🕣": true,
	"🕘": true,
	"🕤": true,
	"🕙": true,
	"🕥": true,
	"🕚": true,
	"🕦": true,
	"🌑": true,
	"🌒": true,
	"🌓": true,
	"🌔": true,
	"🌕": true,
	"🌖": true,
	"🌗": true,
	"🌘": true,
	"🌙": true,
	"🌚": true,
	"🌛": true,
	"🌜": true,
	"🌡️": true,
	"☀️": true,
	"🌝": true,
	"🌞": true,
	"🪐": true,
	"⭐": true,
	"🌟": true,
	"🌠": true,
	"🌌": true,
	"☁️": true,
	"⛅": true,
	"⛈️": true,
	"🌤️": true,
	"🌥️": true,
	"🌦️": true,
	"🌧️": true,
	"🌨️": true,
	"🌩️": true,
	"🌪️": true,
	"🌫️": true,
	"🌬️": true,
	"🌀": true,
	"🌈": true,
	"🌂": true,
	"☂️": true,
	"☔": true,
	"⛱️": true,
	"⚡": true,
	"❄️": true,
	"☃️": true,
	"⛄": true,
	"☄️": true,
	"🔥": true,
	"💧": true,
	"🌊": true,
	"🎃": true,
	"🎄": true,
	"🎆": true,
	"🎇": true,
	"🧨": true,
	"✨": true,
	"🎈": true,
	"🎉": true,
	"🎊": true,
	"🎋": true,
	"🎍": true,
	"🎎": true,
	"🎏": true,
	"🎐": true,
	"🎑": true,
	"🧧": true,
	"🎀": true,
	"🎁": true,
	"🎗️": true,
	"🎟️": true,
	"🎫": true,
	"🎖️": true,
	"🏆": true,
	"🏅": true,
	"🥇": true,
	"🥈": true,
	"🥉": true,
	"⚽": true,
	"⚾": true,
	"🥎": true,
	"🏀": true,
	"🏐": true,
	"🏈": true,
	"🏉": true,
	"🎾": true,
	"🥏": true,
	"🎳": true,
	"🏏": true,
	"🏑": true,
	"🏒": true,
	"🥍": true,
	"🏓": true,
	"🏸": true,
	"🥊": true,
	"🥋": true,
	"🥅": true,
	"⛳": true,
	"⛸️": true,
	"🎣": true,
	"🤿": true,
	"🎽": true,
	"🎿": true,
	"🛷": true,
	"🥌": true,
	"🎯": true,
	"🪀": true,
	"🪁": true,
	"🔫": true,
	"🎱": true,
	"🔮": true,
	"🪄": true,
	"🎮": true,
	"🕹️": true,
	"🎰": true,
	"🎲": true,
	"🧩": true,
	"🧸": true,
	"🪅": true,
	"🪩": true,
	"🪆": true,
	"♠️": true,
	"♥️": true,
	"♦️": true,
	"♣️": true,
	"♟️": true,
	"🃏": true,
	"🀄": true,
	"🎴": true,
	"🎭": true,
	"🖼️": true,
	"🎨": true,
	"🧵": true,
	"🪡": true,
	"🧶": true,
	"🪢": true,
	"👓": true,
	"🕶️": true,
	"🥽": true,
	"🥼": true,
	"🦺": true,
	"👔": true,
	"👕": true,
	"👖": true,
	"🧣": true,
	"🧤": true,
	"🧥": true,
	"🧦": true,
	"👗": true,
	"👘": true,
	"🥻": true,
	"🩱": true,
	"🩲": true,
	"🩳": true,
	"👙": true,
	"👚": true,
	"🪭": true,
	"👛": true,
	"👜": true,
	"👝": true,
	"🛍️": true,
	"🎒": true,
	"🩴": true,
	"👞": true,
	"👟": true,
	"🥾": true,
	"🥿": true,
	"👠": true,
	"👡": true,
	"🩰": true,
	"👢": true,
	"🪮": true,
	"👑": true,
	"👒": true,
	"🎩": true,
	"🎓": true,
	"🧢": true,
	"🪖": true,
	"⛑️": true,
	"📿": true,
	"💄": true,
	"💍": true,
	"💎": true,
	"🔇": true,
	"🔈": true,
	"🔉": true,
	"🔊": true,
	"📢": true,
	"📣": true,
	"📯": true,
	"🔔": true,
	"🔕": true,
	"🎼": true,
	"🎵": true,
	"🎶": true,
	"🎙️": true,
	"🎚️": true,
	"🎛️": true,
	"🎤": true,
	"🎧": true,
	"📻": true,
	"🎷": true,
	"🪗": true,
	"🎸": true,
	"🎹": true,
	"🎺": true,
	"🎻": true,
	"🪕": true,
	"🥁": true,
	"🪘": true,
	"🪇": true,
	"🪈": true,
	"🪉": true,
	"📱": true,
	"📲": true,
	"☎️": true,
	"📞": true,
	"📟": true,
	"📠": true,
	"🔋": true,
	"🪫": true,
	"🔌": true,
	"💻": true,
	"🖥️": true,
	"🖨️": true,
	"⌨️": true,
	"🖱️": true,
	"🖲️": true,
	"💽": true,
	"💾": true,
	"💿": true,
	"📀": true,
	"🧮": true,
	"🎥": true,
	"🎞️": true,
	"📽️": true,
	"🎬": true,
	"📺": true,
	"📷": true,
	"📸": true,
	"📹": true,
	"📼": true,
	"🔍": true,
	"🔎": true,
	"🕯️": true,
	"💡": true,
	"🔦": true,
	"🏮": true,
	"🪔": true,
	"📔": true,
	"📕": true,
	"📖": true,
	"📗": true,
	"📘": true,
	"📙": true,
	"📚": true,
	"📓": true,
	"📒": true,
	"📃": true,
	"📜": true,
	"📄": true,
	"📰": true,
	"🗞️": true,
	"📑": true,
	"🔖": true,
	"🏷️": true,
	"💰": true,
	"🪙": true,
	"💴": true,
	"💵": true,
	"💶": true,
	"💷": true,
	"💸": true,
	"💳": true,
	"🧾": true,
	"💹": true,
	"✉️": true,
	"📧": true,
	"📨": true,
	"📩": true,
	"📤": true,
	"📥": true,
	"📦": true,
	"📫": true,
	"📪": true,
	"📬": true,
	"📭": true,
	"📮": true,
	"🗳️": true,
	"✏️": true,
	"✒️": true,
	"🖋️": true,
	"🖊️": true,
	"🖌️": true,
	"🖍️": true,
	"📝": true,
	"💼": true,
	"📁": true,
	"📂": true,
	"🗂️": true,
	"📅": true,
	"📆": true,
	"🗒️": true,
	"🗓️": true,
	"📇": true,
	"📈": true,
	"📉": true,
	"📊": true,
	"📋": true,
	"📌": true,
	"📍": true,
	"📎": true,
	"🖇️": true,
	"📏": true,
	"📐": true,
	"✂️": true,
	"🗃️": true,
	"🗄️": true,
	"🗑️": true,
	"🔒": true,
	"🔓": true,
	"🔏": true,
	"🔐": true,
	"🔑": true,
	"🗝️": true,
	"🔨": true,
	"🪓": true,
	"⛏️": true,
	"⚒️": true,
	"🛠️": true,
	"🗡️": true,
	"⚔️": true,
	"💣": true,
	"🪃": true,
	"🏹": true,
	"🛡️": true,
	"🪚": true,
	"🔧": true,
	"🪛": true,
	"🔩": true,
	"⚙️": true,
	"🗜️": true,
	"⚖️": true,
	"🦯": true,
	"🔗": true,
	"⛓️‍💥": true,
	"⛓️": true,
	"🪝": true,
	"🧰": true,
	"🧲": true,
	"🪜": true,
	"🪏": true,
	"⚗️": true,
	"🧪": true,
	"🧫": true,
	"🧬": true,
	"🔬": true,
	"🔭": true,
	"📡": true,
	"💉": true,
	"🩸": true,
	"💊": true,
	"🩹": true,
	"🩼": true,
	"🩺": true,
	"🩻": true,
	"🚪": true,
	"🛗": true,
	"🪞": true,
	"🪟": true,
	"🛏️": true,
	"🛋️": true,
	"🪑": true,
	"🚽": true,
	"🪠": true,
	"🚿": true,
	"🛁": true,
	"🪤": true,
	"🪒": true,
	"🧴": true,
	"🧷": true,
	"🧹": true,
	"🧺": true,
	"🧻": true,
	"🪣": true,
	"🧼": true,
	"🫧": true,
	"🪥": true,
	"🧽": true,
	"🧯": true,
	"🛒": true,
	"🚬": true,
	"⚰️": true,
	"🪦": true,
	"⚱️": true,
	"🧿": true,
	"🪬": true,
	"🗿": true,
	"🪧": true,
	"🪪": true,
	"🏧": true,
	"🚮": true,
	"🚰": true,
	"♿": true,
	"🚹": true,
	"🚺": true,
	"🚻": true,
	"🚼": true,
	"🚾": true,
	"🛂": true,
	"🛃": true,
	"🛄": true,
	"🛅": true,
	"⚠️": true,
	"🚸": true,
	"⛔": true,
	"🚫": true,
	"🚳": true,
	"🚭": true,
	"🚯": true,
	"🚱": true,
	"🚷": true,
	"📵": true,
	"🔞": true,
	"☢️": true,
	"☣️": true,
	"⬆️": true,
	"↗️": true,
	"➡️": true,
	"↘️": true,
	"⬇️": true,
	"↙️": true,
	"⬅️": true,
	"↖️": true,
	"↕️": true,
	"↔️": true,
	"↩️": true,
	"↪️": true,
	"⤴️": true,
	"⤵️": true,
	"🔃": true,
	"🔄": true,
	"🔙": true,
	"🔚": true,
	"🔛": true,
	"🔜": true,
	"🔝": true,
	"🛐": true,
	"⚛️": true,
	"🕉️": true,
	"✡️": true,
	"☸️": true,
	"☯️": true,
	"✝️": true,
	"☦️": true,
	"☪️": true,
	"☮️": true,
	"🕎": true,
	"🔯": true,
	"🪯": true,
	"♈": true,
	"♉": true,
	"♊": true,
	"♋": true,
	"♌": true,
	"♍": true,
	"♎": true,
	"♏": true,
	"♐": true,
	"♑": true,
	"♒": true,
	"♓": true,
	"⛎": true,
	"🔀": true,
	"🔁": true,
	"🔂": true,
	"▶️": true,
	"⏩": true,
	"⏭️": true,
	"⏯️": true,
	"◀️": true,
	"⏪": true,
	"⏮️": true,
	"🔼": true,
	"⏫": true,
	"🔽": true,
	"⏬": true,
	"⏸️": true,
	"⏹️": true,
	"⏺️": true,
	"⏏️": true,
	"🎦": true,
	"🔅": true,
	"🔆": true,
	"📶": true,
	"🛜": true,
	"📳": true,
	"📴": true,
	"♀️": true,
	"♂️": true,
	"⚧️": true,
	"✖️": true,
	"➕": true,
	"➖": true,
	"➗": true,
	"🟰": true,
	"♾️": true,
	"‼️": true,
	"⁉️": true,
	"❓": true,
	"❔": true,
	"❕": true,
	"❗": true,
	"〰️": true,
	"💱": true,
	"💲": true,
	"⚕️": true,
	"♻️": true,
	"⚜️": true,
	"🔱": true,
	"📛": true,
	"🔰": true,
	"⭕": true,
	"✅": true,
	"☑️": true,
	"✔️": true,
	"❌": true,
	"❎": true,
	"➰": true,
	"➿": true,
	"〽️": true,
	"✳️": true,
	"✴️": true,
	"❇️": true,
	"©️": true,
	"®️": true,
	"™️": true,
	"🫟": true,
	"#️⃣": true,
	"*️⃣": true,
	"0️⃣": true,
	"1️⃣": true,
	"2️⃣": true,
	"3️⃣": true,
	"4️⃣": true,
	"5️⃣": true,
	"6️⃣": true,
	"7️⃣": true,
	"8️⃣": true,
	"9️⃣": true,
	"🔟": true,
	"🔠": true,
	"🔡": true,
	"🔢": true,
	"🔣": true,
	"🔤": true,
	"🅰️": true,
	"🆎": true,
	"🅱️": true,
	"🆑": true,
	"🆒": true,
	"🆓": true,
	"ℹ️": true,
	"🆔": true,
	"Ⓜ️": true,
	"🆕": true,
	"🆖": true,
	"🅾️": true,
	"🆗": true,
	"🅿️": true,
	"🆘": true,
	"🆙": true,
	"🆚": true,
	"🈁": true,
	"🈂️": true,
	"🈷️": true,
	"🈶": true,
	"🈯": true,
	"🉐": true,
	"🈹": true,
	"🈚": true,
	"🈲": true,
	"🉑": true,
	"🈸": true,
	"🈴": true,
	"🈳": true,
	"㊗️": true,
	"㊙️": true,
	"🈺": true,
	"🈵": true,
	"🔴": true,
	"🟠": true,
	"🟡": true,
	"🟢": true,
	"🔵": true,
	"🟣": true,
	"🟤": true,
	"⚫": true,
	"⚪": true,
	"🟥": true,
	"🟧": true,
	"🟨": true,
	"🟩": true,
	"🟦": true,
	"🟪": true,
	"🟫": true,
	"⬛": true,
	"⬜": true,
	"◼️": true,
	"◻️": true,
	"◾": true,
	"◽": true,
	"▪️": true,
	"▫️": true,
	"🔶": true,
	"🔷": true,
	"🔸": true,
	"🔹": true,
	"🔺": true,
	"🔻": true,
	"💠": true,
	"🔘": true,
	"🔳": true,
	"🔲": true,
	"🏁": true,
	"🚩": true,
	"🎌": true,
	"🏴": true,
	"🏳️": true,
	"🏳️‍🌈": true,
	"🏳️‍⚧️": true,
	"🏴‍☠️": true,
	"🇦🇨": true,
	"🇦🇩": true,
	"🇦🇪": true,
	"🇦🇫": true,
	"🇦🇬": true,
	"🇦🇮": true,
	"🇦🇱": true,
	"🇦🇲": true,
	"🇦🇴": true,
	"🇦🇶": true,
	"🇦🇷": true,
	"🇦🇸": true,
	"🇦🇹": true,
	"🇦🇺": true,
	"🇦🇼": true,
	"🇦🇽": true,
	"🇦🇿": true,
	"🇧🇦": true,
	"🇧🇧": true,
	"🇧🇩": true,
	"🇧🇪": true,
	"🇧🇫": true,
	"🇧🇬": true,
	"🇧🇭": true,
	"🇧🇮": true,
	"🇧🇯": true,
	"🇧🇱": true,
	"🇧🇲": true,
	"🇧🇳": true,
	"🇧🇴": true,
	"🇧🇶": true,
	"🇧🇷": true,
	"🇧🇸": true,
	"🇧🇹": true,
	"🇧🇻": true,
	"🇧🇼": true,
	"🇧🇾": true,
	"🇧🇿": true,
	"🇨🇦": true,
	"🇨🇨": true,
	"🇨🇩": true,
	"🇨🇫": true,
	"🇨🇬": true,
	"🇨🇭": true,
	"🇨🇮": true,
	"🇨🇰": true,
	"🇨🇱": true,
	"🇨🇲": true,
	"🇨🇳": true,
	"🇨🇴": true,
	"🇨🇵": true,
	"🇨🇶": true,
	"🇨🇷": true,
	"🇨🇺": true,
	"🇨🇻": true,
	"🇨🇼": true,
	"🇨🇽": true,
	"🇨🇾": true,
	"🇨🇿": true,
	"🇩🇪": true,
	"🇩🇬": true,
	"🇩🇯": true,
	"🇩🇰": true,
	"🇩🇲": true,
	"🇩🇴": true,
	"🇩🇿": true,
	"🇪🇦": true,
	"🇪🇨": true,
	"🇪🇪": true,
	"🇪🇬": true,
	"🇪🇭": true,
	"🇪🇷": true,
	"🇪🇸": true,
	"🇪🇹": true,
	"🇪🇺": true,
	"🇫🇮": true,
	"🇫🇯": true,
	"🇫🇰": true,
	"🇫🇲": true,
	"🇫🇴": true,
	"🇫🇷": true,
	"🇬🇦": true,
	"🇬🇧": true,
	"🇬🇩": true,
	"🇬🇪": true,
	"🇬🇫": true,
	"🇬🇬": true,
	"🇬🇭": true,
	"🇬🇮": true,
	"🇬🇱": true,
	"🇬🇲": true,
	"🇬🇳": true,
	"🇬🇵": true,
	"🇬🇶": true,
	"🇬🇷": true,
	"🇬🇸": true,
	"🇬🇹": true,
	"🇬🇺": true,
	"🇬🇼": true,
	"🇬🇾": true,
	"🇭🇰": true,
	"🇭🇲": true,
	"🇭🇳": true,
	"🇭🇷": true,
	"🇭🇹": true,
	"🇭🇺": true,
	"🇮🇨": true,
	"🇮🇩": true,
	"🇮🇪": true,
	"🇮🇱": true,
	"🇮🇲": true,
	"🇮🇳": true,
	"🇮🇴": true,
	"🇮🇶": true,
	"🇮🇷": true,
	"🇮🇸": true,
	"🇮🇹": true,
	"🇯🇪": true,
	"🇯🇲": true,
	"🇯🇴": true,
	"🇯🇵": true,
	"🇰🇪": true,
	"🇰🇬": true,
	"🇰🇭": true,
	"🇰🇮": true,
	"🇰🇲": true,
	"🇰🇳": true,
	"🇰🇵": true,
	"🇰🇷": true,
	"🇰🇼": true,
	"🇰🇾": true,
	"🇰🇿": true,
	"🇱🇦": true,
	"🇱🇧": true,
	"🇱🇨": true,
	"🇱🇮": true,
	"🇱🇰": true,
	"🇱🇷": true,
	"🇱🇸": true,
	"🇱🇹": true,
	"🇱🇺": true,
	"🇱🇻": true,
	"🇱🇾": true,
	"🇲🇦": true,
	"🇲🇨": true,
	"🇲🇩": true,
	"🇲🇪": true,
	"🇲🇫": true,
	"🇲🇬": true,
	"🇲🇭": true,
	"🇲🇰": true,
	"🇲🇱": true,
	"🇲🇲": true,
	"🇲🇳": true,
	"🇲🇴": true,
	"🇲🇵": true,
	"🇲🇶": true,
	"🇲🇷": true,
	"🇲🇸": true,
	"🇲🇹": true,
	"🇲🇺": true,
	"🇲🇻": true,
	"🇲🇼": true,
	"🇲🇽": true,
	"🇲🇾": true,
	"🇲🇿": true,
	"🇳🇦": true,
	"🇳🇨": true,
	"🇳🇪": true,
	"🇳🇫": true,
	"🇳🇬": true,
	"🇳🇮": true,
	"🇳🇱": true,
	"🇳🇴": true,
	"🇳🇵": true,
	"🇳🇷": true,
	"🇳🇺": true,
	"🇳🇿": true,
	"🇴🇲": true,
	"🇵🇦": true,
	"🇵🇪": true,
	"🇵🇫": true,
	"🇵🇬": true,
	"🇵🇭": true,
	"🇵🇰": true,
	"🇵🇱": true,
	"🇵🇲": true,
	"🇵🇳": true,
	"🇵🇷": true,
	"🇵🇸": true,
	"🇵🇹": true,
	"🇵🇼": true,
	"🇵🇾": true,
	"🇶🇦": true,
	"🇷🇪": true,
	"🇷🇴": true,
	"🇷🇸": true,
	"🇷🇺": true,
	"🇷🇼": true,
	"🇸🇦": true,
	"🇸🇧": true,
	"🇸🇨": true,
	"🇸🇩": true,
	"🇸🇪": true,
	"🇸🇬": true,
	"🇸🇭": true,
	"🇸🇮": true,
	"🇸🇯": true,
	"🇸🇰": true,
	"🇸🇱": true,
	"🇸🇲": true,
	"🇸🇳": true,
	"🇸🇴": true,
	"🇸🇷": true,
	"🇸🇸": true,
	"🇸🇹": true,
	"🇸🇻": true,
	"🇸🇽": true,
	"🇸🇾": true,
	"🇸🇿": true,
	"🇹🇦": true,
	"🇹🇨": true,
	"🇹🇩": true,
	"🇹🇫": true,
	"🇹🇬": true,
	"🇹🇭": true,
	"🇹🇯": true,
	"🇹🇰": true,
	"🇹🇱": true,
	"🇹🇲": true,
	"🇹🇳": true,
	"🇹🇴": true,
	"🇹🇷": true,
	"🇹🇹": true,
	"🇹🇻": true,
	"🇹🇼": true,
	"🇹🇿": true,
	"🇺🇦": true,
	"🇺🇬": true,
	"🇺🇲": true,
	"🇺🇳": true,
	"🇺🇸": true,
	"🇺🇾": true,
	"🇺🇿": true,
	"🇻🇦": true,
	"🇻🇨": true,
	"🇻🇪": true,
	"🇻🇬": true,
	"🇻🇮": true,
	"🇻🇳": true,
	"🇻🇺": true,
	"🇼🇫": true,
	"🇼🇸": true,
	"🇽🇰": true,
	"🇾🇪": true,
	"🇾🇹": true,
	"🇿🇦": true,
	"🇿🇲": true,
	"🇿🇼": true,
	"🏴󠁧󠁢󠁥󠁮󠁧󠁿": true,
	"🏴󠁧󠁢󠁳󠁣󠁴󠁿": true,
	"🏴󠁧󠁢󠁷󠁬󠁳󠁿": true
};

// This is a modified https://github.com/JustStudio7/Encoder.js/blob/main/_just/dangerously-insert-files/encoder.js%401.0.1.js code

const EN = [
    ' all', ' All', ' ALL', 'all', 'All', 'ALL',
    ' and', ' And', ' AND', 'and', 'And', 'AND',
    ' that', ' That', ' THAT', 'that', 'That', 'THAT',
    ' have', ' Have', ' HAVE', 'have', 'Have', 'HAVE',
    ' for', ' For', ' FOR', 'for', 'For', 'FOR',
    ' not', ' Not', ' NOT', 'not', 'Not', 'NOT',
    ' with', ' With', ' WITH', 'with', 'With', 'WITH',
    ' be', ' Be', ' BE', ' to', ' To', ' TO',
    ' of', ' Of', ' OF', ' in', ' In', ' IN',
    ' it', ' It', ' IT', ' on', ' On', ' ON',
    ' the', ' The', ' THE', 'the', 'The', 'THE',
    ' this', ' This', ' THIS', 'this', 'This', 'THIS',
    ' from', ' From', ' FROM', 'from', 'From', 'FROM',
    'his', 'His', 'HIS', 'her', 'Her', 'HER',
    'what', 'What', 'WHAT', 'about', 'About', 'ABOUT',
    'which', 'Which', 'WHICH', 'when', 'When', 'WHEN',
    'as', 'AS', 'do', 'DO'
];
const RU = [
    ' не', ' \u041d\u0435', ' \u041d\u0415', ' она', ' Она', ' \u041e\u041d\u0410',
    ' он', ' Он', ' \u041e\u041d', 'она', 'Она', '\u041e\u041d\u0410',
    ' на', ' \u041d\u0430', ' \u041d\u0410', ' они', ' Они', ' ОНИ',
    ' что', ' Что', ' ЧТО', 'что', 'Что', 'ЧТО',
    ' тот', ' Тот', ' \u0422\u041e\u0422', 'тот', 'Тот', '\u0422\u041e\u0422',
    ' быть', ' Быть', ' БЫТЬ', 'быть', 'Быть', 'БЫТЬ',
    ' весь', ' Весь', ' \u0412\u0415\u0421\u042c', 'весь', 'Весь', '\u0412\u0415\u0421\u042c',
    ' это', ' Это', ' ЭТО', ' это', ' Это', ' ЭТО',
    ' как', ' Как', ' \u041a\u0410\u041a', 'как', 'Как', '\u041a\u0410\u041a',
    ' по', ' По', ' ПО', ' но', ' \u041d\u043e', ' \u041d\u041e',
    ' ты', ' Ты', ' ТЫ', ' из', ' Из', ' ИЗ',
    ' мы', ' Мы', ' МЫ', ' за', ' \u0417\u0430', ' \u0417\u0410',
    ' вы', ' Вы', ' ВЫ', ' же', ' Же', ' ЖЕ',
    ' от', ' От', ' \u041e\u0422', ' бы', ' Бы', ' БЫ',
    'так', 'Так', '\u0422\u0410\u041a', 'который', 'Который', 'КОТОРЫЙ',
    'этот', 'Этот', 'ЭТОТ', 'когда', 'Когда', 'КОГДА',
    'только', 'Только', 'ТОЛЬКО', 'же '
];
const FR = [
    ' tout', ' Tout', ' TOUT', 'tout', 'Tout', 'TOUT',
    ' et', ' Et', ' ET', 'et', 'Et', 'ET',
    ' que', ' Que', ' QUE', 'que', 'Que', 'QUE',
    ' avoir', ' Avoir', ' AVOIR', 'avoir', 'Avoir', 'AVOIR',
    ' pour', ' Pour', ' POUR', 'pour', 'Pour', 'POUR',
    ' n\'', ' N\'', ' N\'', 'n\'', 'N\'', 'N\'',
    ' avec', ' Avec', ' AVEC', 'avec', 'Avec', 'AVEC',
    ' être', ' Être', ' ÊTRE', ' pour', ' Pour', ' POUR',
    ' pour', ' Pour', ' POUR', ' dans', ' Dans', ' DANS',
    ' il', ' Il', ' IL', ' sur', ' Sur', ' SUR',
    'lequel', 'Lequel', 'LEQUEL', 'le', 'Le', 'LE',
    ' ceci', ' ceci', ' CECI', 'ceci', 'Ceci', 'CECI',
    'à la place de', 'A LA PLACE DE', ' DE', 'de', 'De', 'DE',
    'son', 'Son', 'SON', 'sa', 'Sa', 'SA',
    'que', 'Que', 'QUE', 'à propos', 'A propos', 'A PROPOS',
    ' le', ' Le', ' LE', 'quand', 'Quand', 'QUAND',
    ' de', ' De', 'faire', 'FAIRE'
];
const UA = [
    'так', 'Так', '\u0422\u0410\u041a', ' ні', ' \u041d\u0456', ' \u041d\u0406',
    'він', 'Він', '\u0412\u0406\u041d', 'вона', 'Вона', '\u0412\u041e\u041d\u0410',
    'вони', 'Вони', 'ВОНИ', 'дякую', 'Дякую', 'ДЯКУЮ',
    ' як', ' Як', ' ЯК', 'що', 'Що', 'ЩО',
    'від', 'Від', 'ВІД', ' це', ' Це', ' ЦЕ',
    'коли', 'Коли', 'КОЛИ', 'зараз', 'Зараз', '\u0417\u0410\u0420\u0410\u0417',
    'хочу', 'Хочу', 'ХОЧУ', 'можливо', 'Можливо', 'МОЖЛИВО',
    ' ти', ' Ти', ' ТИ', ' ми', ' Ми', ' МИ',
    'але', 'Але', 'АЛЕ', 'який', 'Який', 'ЯКИЙ',
    'чому', 'Чому', 'ЧОМУ', 'тільки', 'Тільки', 'ТІЛЬКИ',
    'цей', 'Цей', 'ЦЕЙ', 'друзі', 'Друзі', 'ДРУЗІ',
    'Їжа', 'Їжа', 'ЇЖА', 'навіщо', 'Навіщо', 'НАВІЩО',
    'поки що', 'Поки що', 'ПОКИ ЩО', 'вчора', 'Вчора', 'ВЧОРА',
    'привіт', 'Привіт', 'ПРИВІТ', 'якщо', 'Якщо', 'ЯКЩО',
    'також', 'Також', 'ТАКОЖ', 'існує', 'Існує', 'ІСНУЄ',
    'як справи', 'Як справи', 'ЯК СПРАВИ', 'раніше', 'Раніше', 'РАНІШЕ',
    'зрозуміло', 'Зрозуміло', 'ЗРОЗУМИЛО', 'до побачення'
];
const BN = [
    'আমি', 'তুমি', 'সে', 'আমরা', 'তারা', 'এটা',
    'কি', 'যে', 'না', 'হ্যাঁ', 'এবং', 'কিন্তু',
    'যদি', 'কারণ', 'অথবা', 'জন্য', 'সাথে', 'থেকে',
    'মধ্যে', 'পর্যন্ত','উপর', 'নিচে', 'কাছে', 'দূরে',
    'বড়', 'ছোট', 'ভালো', 'খারাপ', 'নতুন', 'পুরানো',
    'জল', 'আগুন', 'মাটি', 'বাতাস', 'আকাশ', 'সূর্য',
    'চাঁদ', 'দিন', 'রাত', 'বছর', 'সময়', 'মানুষ',
    'লোক', 'বাড়ি', 'রাস্তা', 'দেশ', 'শহর', 'কাজ',
    'খাবার', 'কাপড়', 'বই', 'লেখা', 'পড়া', 'দেখা',
    'শোনা', 'কথা', 'জানা', 'বোঝা', 'করা', 'যাওয়া',
    'আসা', 'দেওয়া', 'নেওয়া', 'রাখা', 'খোঁজা', 'পাওয়া',
    'হওয়া', 'থাকা', 'চাওয়া', 'পার', 'হতে', 'হয়ে',
    'হয়েছিল', 'করতে', 'বলতে', 'দেখতে', 'শুনতে', 'জানতে',
    'বুঝতে', 'যেতে', 'আসতে', 'দিতে', 'নিতে', 'রাখতে',
    'খুঁজতে', 'পেতে', 'চাই', 'পারি', 'হবে', 'করব',
    'বলব', 'দেখব', 'শুনব', 'জানব', 'বুঝব', 'যাব',
    'আসবে', 'দেব', 'নেব', 'রাখব'
];

const emoji = Object.keys(emojiObject);

function d835(char) {
    return '\ud835'+char;
}
function d834(char) {
    return '\ud834'+char;
}
const dict = [
    'th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'nd', 'ing', 'un', 'ab', 'ir',
    'Th', 'He', 'In', 'Er', 'An', 'Re', 'On', 'At', 'Nd', 'Ing', 'Un', 'Ab', 'Ir',
    'TH', 'HE', 'IN', 'ER', 'AN', 'RE', 'ON', 'AT', 'ND', 'ING', 'UN', 'AB', 'IR',

    ' a ', ' you ', ' we ', ' they ', ' i ', ' is ', ' are ', ' was ', ' were ', ' to ', ' in ', ' on ', ' at ', ' and ', ' or ', ' but ',
    ' A ', ' You ', ' We ', ' They ', ' I ', ' Is ', ' Are ', ' Was ', ' Were ', ' To ', ' In ', ' On ', ' At ', ' And ', ' Or ', ' But ',
    ' A' , ' YOU ', ' WE ', ' THEY ', ' I',  ' IS ', ' ARE ', ' WAS ', ' WERE ', ' TO ', ' IN ', ' ON ', ' AT ', ' AND ', ' OR ', ' BUT ',

    ' he ', ' she ', ' it ', ' his ', ' her ', ' its ', ' am ', ' do ', ' cause ', ' because ', ' like ', ' fortunately ', ' unfortunately ',
    ' He ', ' She ', ' It ', ' His ', ' Her ', ' Its ', ' Am ', ' Do ', ' Cause ', ' Because ', ' Like ', ' Fortunately ', ' Unfortunately ',
    ' HE ', ' SHE ', ' IT ', ' HIS ', ' HER ', ' ITS ', ' AM ', ' DO ', ' CAUSE ', ' BECAUSE ', ' LIKE ', ' FORTUNATELY ', ' UNFORTUNATELY ',

    'hi', 'wsg', 'hru', 'wdym', 'idk', 'imo', 'jk', 'tbh', 'ig', 'wow', 'lol', 'ez', 'gg',

    'ст', 'но', 'то', 'на', 'ен', 'ов', 'ни', 'пре', 'при', 'ри', 'ть', 'рю', 'шь', 'за', 'от', 'под', 'да', 'не', 'из',
    'Ст', '\u041d\u043e', '\u0422\u043e', '\u041d\u0430', 'Ен', 'Ов', 'Ни', 'Пре', 'При', 'Ри', 'Ть', 'Рю', 'Шь', '\u0417\u0430', 
    'От', 'Под', 'Да', '\u041d\u0435', 'Из',
    '\u0421\u0422', '\u041d\u041e', '\u0422\u041e', '\u041d\u0410', '\u0415\u041d', '\u041e\u0412', 'НИ', 'ПРЕ', 'ПРИ', 'РИ', '\u0422\u042c', 
    'РЮ', 'ШЬ', '\u0417\u0410', '\u041e\u0422', 'ПОД', 'ДА', '\u041d\u0415', 'ИЗ',

    'прив', 'крч', 'крут', 'хз', 'кд', 'ку', 'пон', 'ок', 'всм', 'щас', 'лол', 'изи', '\u0433'.repeat(2),

    ' '.repeat(2), ' '.repeat(3), '!'.repeat(2), '?'.repeat(2), '.'.repeat(3), '-'.repeat(3), '='.repeat(2), '+'.repeat(2),
    '\n\n', '\r\n', ' \n', '\n ',

    'const', 'let', 'var', 'import', 'from', 'with', 'export', 'class', 'public', 'private',
    'static', 'function', 'end', 'if', 'else', 'elseif', 'elif', 'try', 'catch', 'new',
    'for', 'typeof', 'type', 'of', 'return', 'switch', 'case', 'esac', 'finally', 'fi',
    '/*', '*/', '--', 'while', 'do', 'true', 'false', 'null', 'nil', 'nullptr', 'throw',

    '://', 'https', 'data', 'sms', 'mms', 'tel', 'file', 'mailto', 'http', 'ftp', 'wss', 'websocket', 'docs.',
    'www.', 'www', '.com', '.org', '.dev', 'tld', 'subdomain', 'domain', 'website', 'site', 'web', 'email', 'mail',
    'GET', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'com', 'org', 'dev', 'xhr', 'fetch',

    '//#', '//', '/>', '()', '{}', '[]', '<>',

    ...(()=>{
        const out = [];
        for (let i = 0xDC00; i < 0xDC9B + 1; i++) {
            if (i != 0xDC55) out.push(d835(String.fromCharCode(i)));
        }
        return out;
    })(),
    ...(()=>{
        const out = [];
        for (let i = 0xDD38; i < 0xDD6B + 1; i++) {
            if (
                i != 0xDD3A && i != 0xDD3F && i != 0xDD45 &&
                i != 0xDD47 && i != 0xDD48 && i != 0xDD49 && 
                i != 0xDD51
            ) out.push(d835(String.fromCharCode(i)));
        }
        return out;
    })(),
    ...(()=>{
        const out = [];
        for (let i = 0xDEA8; i < 0xDEE1 + 1; i++) {
            out.push(d835(String.fromCharCode(i)));
        }
        return out;
    })(),
    
    ...(()=>{
        const out = [];
        for (let i = 0xDD00; i < 0xDD26 + 1; i++) {
            out.push(d834(String.fromCharCode(i)));
        }
        return out;
    })(),
];
const seq = [
    ...emoji,
    ...EN,
    ...RU,
    ...FR,
    ...UA,
    ...BN,
    ...dict    
];
const seqOffset = 0x10001;
function buildTrie(sequences) {
    const root = Object.create(null);

    for (let index = 0; index < sequences.length; index++) {
        const str = sequences[index];
        let node = root;

        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            node = node[code] ??= Object.create(null);
        }

        node.$ = index;
    }

    return root;
}
const seqTrie = buildTrie(seq);

function stringChunks(str, num) {
    const output = [];
    for (let i = 0; i < str.length; i += num) {
        output.push(str.slice(i, i + num));
    }
    return output
}

function check(s, b, bc) {
    const prefix = 'JSSC: UTF-16-to-any-Base: ';
    
    if (typeof s != 'string')   throw new Error(prefix+'Input UTF-16 string ("str" / argument 0) should be a string.');
    if (typeof b != 'number')   throw new Error(prefix+'Input Base number ("base" / argument 1) should be a number.');
    if (typeof bc!= 'string')   throw new Error(prefix+'Input Base characters string ("baseChars" / argument 2) should be a string.');
    if (b < 2)                  throw new Error(prefix+'Base ' + b + ' does not exist.');
    if (b > bc.length)          throw new Error(prefix+'Cannot use a higher base than the length of the provided base characters string.');
}

const MAX_BASE41 = 41 ** 3;
const RLE_OFFSET = seqOffset + seq.length;
const RLE_MAX = MAX_BASE41 - RLE_OFFSET;
function RLE(arr) {
    const result = [];
    let i = 0;

    while (i < arr.length) {
        const current = arr[i];
        let j = i + 1;

        while (j < arr.length && arr[j] === current) j++;

        let count = j - i;

        result.push(current);

        if (count >= 3 && current !== '000') {
            let remaining = count - 1;

            while (remaining > 0) {

                if (remaining === 2) {
                    result.push('000');
                    remaining -= 2;
                    continue;
                }

                let bestBlock = 0;
                let bestCode = -1;

                for (let r = 0; r < RLE_MAX; r++) {
                    let size;

                    if (r < 18) {
                        size = 2 ** (r + 1);
                    } else {
                        size = 2 * (r + 1);
                    }

                    if (size <= remaining && size > bestBlock) {
                        bestBlock = size;
                        bestCode = r;
                    }
                }

                if (bestBlock > 0) {
                    const packed = RLE_OFFSET + bestCode;
                    result.push(
                        convertBase(packed.toString(10), 10, 41).padStart(3, '0')
                    );
                    remaining -= bestBlock;
                } else {
                    result.push(current);
                    remaining--;
                }
            }

        } else {
            for (let k = 1; k < count; k++) {
                result.push(current);
            }
        }

        i = j;
    }

    return result;
}

/**
 * Converts UTF-16 string to any base
 * 
 * @param {string} str - UTF-16 string
 * @param {number?} base - Base number (`optional`) (`64` by default)
 * @param {string?} baseChars - Base characters string (`optional`) (supports up to Base64 by default)
 * @returns {string} Encoded string
 */
function encode(str, base = 64, baseChars = B64) {
    check(str, base, baseChars);

    const output = [];

    for (let i = 0; i < str.length;) {

        let node = seqTrie;
        let j = i;
        let lastMatch = -1;
        let lastIndex = -1;

        while (j < str.length) {
            const code = str.charCodeAt(j);
            node = node[code];
            if (!node) break;

            if (node.$ !== undefined) {
                lastMatch = j;
                lastIndex = node.$;
            }

            j++;
        }

        if (lastMatch !== -1) {
            const packed = seqOffset + lastIndex;
            output.push(convertBase(packed.toString(10), 10, 41).padStart(3, '0'));
            i = lastMatch + 1;
        } else {
            const packed = str.charCodeAt(i) + 1;
            output.push(convertBase(packed.toString(10), 10, 41).padStart(3, '0'));
            i++;
        }
    }

    return convertBase(RLE(output).join(''), 41, base);
}

/**
 * Converts any base string to UTF-16
 * 
 * @param {string} str - Encoded string
 * @param {number?} base - Base number (`optional`) (`64` by default)
 * @param {string?} baseChars - Base characters string (`optional`) (supports up to Base64 by default)
 * @returns {string} UTF-16 string
 */
function decode(str, base = 64, baseChars = B64) {
    check(str, base, baseChars);

    let base41 = convertBase(str, base, 41);
    let output = '';

    const d3 = base41.length % 3;
    if (d3 == 1) base41 = '00' + base41;
    if (d3 == 2) base41 = '0' + base41;

    let last = '';
    for (const chunk of stringChunks(base41, 3)) {
        const value = parseInt(convertBase(chunk, 41, 10), 10);

        let back = [false, last];
        if (value == 0) {
            last = last.repeat(2);
            back[0] = true;
        } else if (value >= seq.length + seqOffset) {
            const val = value - seq.length - seqOffset;
            if (val < 18) {
                last = last.repeat(2 ** (val + 1));
            } else {
                last = last.repeat(2 * (val + 1));
            }
            back[0] = true;
        } else if (value >= seqOffset) {
            const index = value - seqOffset;
            last = seq[index];
        } else {
            last = String.fromCharCode(value - 1);
        }
        output += last;

        if (back[0]) {
            last = back[1];
        }
    }

    return output;
}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function getAugmentedNamespace(n) {
  if (Object.prototype.hasOwnProperty.call(n, '__esModule')) return n;
  var f = n.default;
	if (typeof f == "function") {
		var a = function a () {
			var isInstance = false;
      try {
        isInstance = this instanceof a;
      } catch {}
			if (isInstance) {
        return Reflect.construct(f, arguments, this.constructor);
			}
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

var utf8$1 = {};

/*! https://mths.be/utf8js v3.0.0 by @mathias */

var hasRequiredUtf8;

function requireUtf8 () {
	if (hasRequiredUtf8) return utf8$1;
	hasRequiredUtf8 = 1;
	(function (exports$1) {
(function(root) {

			var stringFromCharCode = String.fromCharCode;

			// Taken from https://mths.be/punycode
			function ucs2decode(string) {
				var output = [];
				var counter = 0;
				var length = string.length;
				var value;
				var extra;
				while (counter < length) {
					value = string.charCodeAt(counter++);
					if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
						// high surrogate, and there is a next character
						extra = string.charCodeAt(counter++);
						if ((extra & 0xFC00) == 0xDC00) { // low surrogate
							output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
						} else {
							// unmatched surrogate; only append this code unit, in case the next
							// code unit is the high surrogate of a surrogate pair
							output.push(value);
							counter--;
						}
					} else {
						output.push(value);
					}
				}
				return output;
			}

			// Taken from https://mths.be/punycode
			function ucs2encode(array) {
				var length = array.length;
				var index = -1;
				var value;
				var output = '';
				while (++index < length) {
					value = array[index];
					if (value > 0xFFFF) {
						value -= 0x10000;
						output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
						value = 0xDC00 | value & 0x3FF;
					}
					output += stringFromCharCode(value);
				}
				return output;
			}

			function checkScalarValue(codePoint) {
				if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
					throw Error(
						'Lone surrogate U+' + codePoint.toString(16).toUpperCase() +
						' is not a scalar value'
					);
				}
			}
			/*--------------------------------------------------------------------------*/

			function createByte(codePoint, shift) {
				return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
			}

			function encodeCodePoint(codePoint) {
				if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
					return stringFromCharCode(codePoint);
				}
				var symbol = '';
				if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
					symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
				}
				else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
					checkScalarValue(codePoint);
					symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
					symbol += createByte(codePoint, 6);
				}
				else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
					symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
					symbol += createByte(codePoint, 12);
					symbol += createByte(codePoint, 6);
				}
				symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
				return symbol;
			}

			function utf8encode(string) {
				var codePoints = ucs2decode(string);
				var length = codePoints.length;
				var index = -1;
				var codePoint;
				var byteString = '';
				while (++index < length) {
					codePoint = codePoints[index];
					byteString += encodeCodePoint(codePoint);
				}
				return byteString;
			}

			/*--------------------------------------------------------------------------*/

			function readContinuationByte() {
				if (byteIndex >= byteCount) {
					throw Error('Invalid byte index');
				}

				var continuationByte = byteArray[byteIndex] & 0xFF;
				byteIndex++;

				if ((continuationByte & 0xC0) == 0x80) {
					return continuationByte & 0x3F;
				}

				// If we end up here, it’s not a continuation byte
				throw Error('Invalid continuation byte');
			}

			function decodeSymbol() {
				var byte1;
				var byte2;
				var byte3;
				var byte4;
				var codePoint;

				if (byteIndex > byteCount) {
					throw Error('Invalid byte index');
				}

				if (byteIndex == byteCount) {
					return false;
				}

				// Read first byte
				byte1 = byteArray[byteIndex] & 0xFF;
				byteIndex++;

				// 1-byte sequence (no continuation bytes)
				if ((byte1 & 0x80) == 0) {
					return byte1;
				}

				// 2-byte sequence
				if ((byte1 & 0xE0) == 0xC0) {
					byte2 = readContinuationByte();
					codePoint = ((byte1 & 0x1F) << 6) | byte2;
					if (codePoint >= 0x80) {
						return codePoint;
					} else {
						throw Error('Invalid continuation byte');
					}
				}

				// 3-byte sequence (may include unpaired surrogates)
				if ((byte1 & 0xF0) == 0xE0) {
					byte2 = readContinuationByte();
					byte3 = readContinuationByte();
					codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
					if (codePoint >= 0x0800) {
						checkScalarValue(codePoint);
						return codePoint;
					} else {
						throw Error('Invalid continuation byte');
					}
				}

				// 4-byte sequence
				if ((byte1 & 0xF8) == 0xF0) {
					byte2 = readContinuationByte();
					byte3 = readContinuationByte();
					byte4 = readContinuationByte();
					codePoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0C) |
						(byte3 << 0x06) | byte4;
					if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
						return codePoint;
					}
				}

				throw Error('Invalid UTF-8 detected');
			}

			var byteArray;
			var byteCount;
			var byteIndex;
			function utf8decode(byteString) {
				byteArray = ucs2decode(byteString);
				byteCount = byteArray.length;
				byteIndex = 0;
				var codePoints = [];
				var tmp;
				while ((tmp = decodeSymbol()) !== false) {
					codePoints.push(tmp);
				}
				return ucs2encode(codePoints);
			}

			/*--------------------------------------------------------------------------*/

			root.version = '3.0.0';
			root.encode = utf8encode;
			root.decode = utf8decode;

		}(exports$1)); 
	} (utf8$1));
	return utf8$1;
}

var utf8Exports = requireUtf8();
var utf8 = /*@__PURE__*/getDefaultExportFromCjs(utf8Exports);

var lzString = {exports: {}};

var hasRequiredLzString;

function requireLzString () {
	if (hasRequiredLzString) return lzString.exports;
	hasRequiredLzString = 1;
	(function (module) {
		// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
		// This work is free. You can redistribute it and/or modify it
		// under the terms of the WTFPL, Version 2
		// For more information see LICENSE.txt or http://www.wtfpl.net/
		//
		// For more information, the home page:
		// http://pieroxy.net/blog/pages/lz-string/testing.html
		//
		// LZ-based compression algorithm, version 1.4.5
		var LZString = (function() {

		// private property
		var f = String.fromCharCode;
		var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
		var baseReverseDic = {};

		function getBaseValue(alphabet, character) {
		  if (!baseReverseDic[alphabet]) {
		    baseReverseDic[alphabet] = {};
		    for (var i=0 ; i<alphabet.length ; i++) {
		      baseReverseDic[alphabet][alphabet.charAt(i)] = i;
		    }
		  }
		  return baseReverseDic[alphabet][character];
		}

		var LZString = {
		  compressToBase64 : function (input) {
		    if (input == null) return "";
		    var res = LZString._compress(input, 6, function(a){return keyStrBase64.charAt(a);});
		    switch (res.length % 4) { // To produce valid Base64
		    default: // When could this happen ?
		    case 0 : return res;
		    case 1 : return res+"===";
		    case 2 : return res+"==";
		    case 3 : return res+"=";
		    }
		  },

		  decompressFromBase64 : function (input) {
		    if (input == null) return "";
		    if (input == "") return null;
		    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrBase64, input.charAt(index)); });
		  },

		  compressToUTF16 : function (input) {
		    if (input == null) return "";
		    return LZString._compress(input, 15, function(a){return f(a+32);}) + " ";
		  },

		  decompressFromUTF16: function (compressed) {
		    if (compressed == null) return "";
		    if (compressed == "") return null;
		    return LZString._decompress(compressed.length, 16384, function(index) { return compressed.charCodeAt(index) - 32; });
		  },

		  //compress into uint8array (UCS-2 big endian format)
		  compressToUint8Array: function (uncompressed) {
		    var compressed = LZString.compress(uncompressed);
		    var buf=new Uint8Array(compressed.length*2); // 2 bytes per character

		    for (var i=0, TotalLen=compressed.length; i<TotalLen; i++) {
		      var current_value = compressed.charCodeAt(i);
		      buf[i*2] = current_value >>> 8;
		      buf[i*2+1] = current_value % 256;
		    }
		    return buf;
		  },

		  //decompress from uint8array (UCS-2 big endian format)
		  decompressFromUint8Array:function (compressed) {
		    if (compressed===null || compressed===undefined){
		        return LZString.decompress(compressed);
		    } else {
		        var buf=new Array(compressed.length/2); // 2 bytes per character
		        for (var i=0, TotalLen=buf.length; i<TotalLen; i++) {
		          buf[i]=compressed[i*2]*256+compressed[i*2+1];
		        }

		        var result = [];
		        buf.forEach(function (c) {
		          result.push(f(c));
		        });
		        return LZString.decompress(result.join(''));

		    }

		  },


		  //compress into a string that is already URI encoded
		  compressToEncodedURIComponent: function (input) {
		    if (input == null) return "";
		    return LZString._compress(input, 6, function(a){return keyStrUriSafe.charAt(a);});
		  },

		  //decompress from an output of compressToEncodedURIComponent
		  decompressFromEncodedURIComponent:function (input) {
		    if (input == null) return "";
		    if (input == "") return null;
		    input = input.replace(/ /g, "+");
		    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrUriSafe, input.charAt(index)); });
		  },

		  compress: function (uncompressed) {
		    return LZString._compress(uncompressed, 16, function(a){return f(a);});
		  },
		  _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
		    if (uncompressed == null) return "";
		    var i, value,
		        context_dictionary= {},
		        context_dictionaryToCreate= {},
		        context_c="",
		        context_wc="",
		        context_w="",
		        context_enlargeIn= 2, // Compensate for the first entry which should not count
		        context_dictSize= 3,
		        context_numBits= 2,
		        context_data=[],
		        context_data_val=0,
		        context_data_position=0,
		        ii;

		    for (ii = 0; ii < uncompressed.length; ii += 1) {
		      context_c = uncompressed.charAt(ii);
		      if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
		        context_dictionary[context_c] = context_dictSize++;
		        context_dictionaryToCreate[context_c] = true;
		      }

		      context_wc = context_w + context_c;
		      if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
		        context_w = context_wc;
		      } else {
		        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
		          if (context_w.charCodeAt(0)<256) {
		            for (i=0 ; i<context_numBits ; i++) {
		              context_data_val = (context_data_val << 1);
		              if (context_data_position == bitsPerChar-1) {
		                context_data_position = 0;
		                context_data.push(getCharFromInt(context_data_val));
		                context_data_val = 0;
		              } else {
		                context_data_position++;
		              }
		            }
		            value = context_w.charCodeAt(0);
		            for (i=0 ; i<8 ; i++) {
		              context_data_val = (context_data_val << 1) | (value&1);
		              if (context_data_position == bitsPerChar-1) {
		                context_data_position = 0;
		                context_data.push(getCharFromInt(context_data_val));
		                context_data_val = 0;
		              } else {
		                context_data_position++;
		              }
		              value = value >> 1;
		            }
		          } else {
		            value = 1;
		            for (i=0 ; i<context_numBits ; i++) {
		              context_data_val = (context_data_val << 1) | value;
		              if (context_data_position ==bitsPerChar-1) {
		                context_data_position = 0;
		                context_data.push(getCharFromInt(context_data_val));
		                context_data_val = 0;
		              } else {
		                context_data_position++;
		              }
		              value = 0;
		            }
		            value = context_w.charCodeAt(0);
		            for (i=0 ; i<16 ; i++) {
		              context_data_val = (context_data_val << 1) | (value&1);
		              if (context_data_position == bitsPerChar-1) {
		                context_data_position = 0;
		                context_data.push(getCharFromInt(context_data_val));
		                context_data_val = 0;
		              } else {
		                context_data_position++;
		              }
		              value = value >> 1;
		            }
		          }
		          context_enlargeIn--;
		          if (context_enlargeIn == 0) {
		            context_enlargeIn = Math.pow(2, context_numBits);
		            context_numBits++;
		          }
		          delete context_dictionaryToCreate[context_w];
		        } else {
		          value = context_dictionary[context_w];
		          for (i=0 ; i<context_numBits ; i++) {
		            context_data_val = (context_data_val << 1) | (value&1);
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		            value = value >> 1;
		          }


		        }
		        context_enlargeIn--;
		        if (context_enlargeIn == 0) {
		          context_enlargeIn = Math.pow(2, context_numBits);
		          context_numBits++;
		        }
		        // Add wc to the dictionary.
		        context_dictionary[context_wc] = context_dictSize++;
		        context_w = String(context_c);
		      }
		    }

		    // Output the code for w.
		    if (context_w !== "") {
		      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
		        if (context_w.charCodeAt(0)<256) {
		          for (i=0 ; i<context_numBits ; i++) {
		            context_data_val = (context_data_val << 1);
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		          }
		          value = context_w.charCodeAt(0);
		          for (i=0 ; i<8 ; i++) {
		            context_data_val = (context_data_val << 1) | (value&1);
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		            value = value >> 1;
		          }
		        } else {
		          value = 1;
		          for (i=0 ; i<context_numBits ; i++) {
		            context_data_val = (context_data_val << 1) | value;
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		            value = 0;
		          }
		          value = context_w.charCodeAt(0);
		          for (i=0 ; i<16 ; i++) {
		            context_data_val = (context_data_val << 1) | (value&1);
		            if (context_data_position == bitsPerChar-1) {
		              context_data_position = 0;
		              context_data.push(getCharFromInt(context_data_val));
		              context_data_val = 0;
		            } else {
		              context_data_position++;
		            }
		            value = value >> 1;
		          }
		        }
		        context_enlargeIn--;
		        if (context_enlargeIn == 0) {
		          context_enlargeIn = Math.pow(2, context_numBits);
		          context_numBits++;
		        }
		        delete context_dictionaryToCreate[context_w];
		      } else {
		        value = context_dictionary[context_w];
		        for (i=0 ; i<context_numBits ; i++) {
		          context_data_val = (context_data_val << 1) | (value&1);
		          if (context_data_position == bitsPerChar-1) {
		            context_data_position = 0;
		            context_data.push(getCharFromInt(context_data_val));
		            context_data_val = 0;
		          } else {
		            context_data_position++;
		          }
		          value = value >> 1;
		        }


		      }
		      context_enlargeIn--;
		      if (context_enlargeIn == 0) {
		        context_enlargeIn = Math.pow(2, context_numBits);
		        context_numBits++;
		      }
		    }

		    // Mark the end of the stream
		    value = 2;
		    for (i=0 ; i<context_numBits ; i++) {
		      context_data_val = (context_data_val << 1) | (value&1);
		      if (context_data_position == bitsPerChar-1) {
		        context_data_position = 0;
		        context_data.push(getCharFromInt(context_data_val));
		        context_data_val = 0;
		      } else {
		        context_data_position++;
		      }
		      value = value >> 1;
		    }

		    // Flush the last char
		    while (true) {
		      context_data_val = (context_data_val << 1);
		      if (context_data_position == bitsPerChar-1) {
		        context_data.push(getCharFromInt(context_data_val));
		        break;
		      }
		      else context_data_position++;
		    }
		    return context_data.join('');
		  },

		  decompress: function (compressed) {
		    if (compressed == null) return "";
		    if (compressed == "") return null;
		    return LZString._decompress(compressed.length, 32768, function(index) { return compressed.charCodeAt(index); });
		  },

		  _decompress: function (length, resetValue, getNextValue) {
		    var dictionary = [],
		        enlargeIn = 4,
		        dictSize = 4,
		        numBits = 3,
		        entry = "",
		        result = [],
		        i,
		        w,
		        bits, resb, maxpower, power,
		        c,
		        data = {val:getNextValue(0), position:resetValue, index:1};

		    for (i = 0; i < 3; i += 1) {
		      dictionary[i] = i;
		    }

		    bits = 0;
		    maxpower = Math.pow(2,2);
		    power=1;
		    while (power!=maxpower) {
		      resb = data.val & data.position;
		      data.position >>= 1;
		      if (data.position == 0) {
		        data.position = resetValue;
		        data.val = getNextValue(data.index++);
		      }
		      bits |= (resb>0 ? 1 : 0) * power;
		      power <<= 1;
		    }

		    switch (bits) {
		      case 0:
		          bits = 0;
		          maxpower = Math.pow(2,8);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
		            power <<= 1;
		          }
		        c = f(bits);
		        break;
		      case 1:
		          bits = 0;
		          maxpower = Math.pow(2,16);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
		            power <<= 1;
		          }
		        c = f(bits);
		        break;
		      case 2:
		        return "";
		    }
		    dictionary[3] = c;
		    w = c;
		    result.push(c);
		    while (true) {
		      if (data.index > length) {
		        return "";
		      }

		      bits = 0;
		      maxpower = Math.pow(2,numBits);
		      power=1;
		      while (power!=maxpower) {
		        resb = data.val & data.position;
		        data.position >>= 1;
		        if (data.position == 0) {
		          data.position = resetValue;
		          data.val = getNextValue(data.index++);
		        }
		        bits |= (resb>0 ? 1 : 0) * power;
		        power <<= 1;
		      }

		      switch (c = bits) {
		        case 0:
		          bits = 0;
		          maxpower = Math.pow(2,8);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
		            power <<= 1;
		          }

		          dictionary[dictSize++] = f(bits);
		          c = dictSize-1;
		          enlargeIn--;
		          break;
		        case 1:
		          bits = 0;
		          maxpower = Math.pow(2,16);
		          power=1;
		          while (power!=maxpower) {
		            resb = data.val & data.position;
		            data.position >>= 1;
		            if (data.position == 0) {
		              data.position = resetValue;
		              data.val = getNextValue(data.index++);
		            }
		            bits |= (resb>0 ? 1 : 0) * power;
		            power <<= 1;
		          }
		          dictionary[dictSize++] = f(bits);
		          c = dictSize-1;
		          enlargeIn--;
		          break;
		        case 2:
		          return result.join('');
		      }

		      if (enlargeIn == 0) {
		        enlargeIn = Math.pow(2, numBits);
		        numBits++;
		      }

		      if (dictionary[c]) {
		        entry = dictionary[c];
		      } else {
		        if (c === dictSize) {
		          entry = w + w.charAt(0);
		        } else {
		          return null;
		        }
		      }
		      result.push(entry);

		      // Add w+entry[0] to the dictionary.
		      dictionary[dictSize++] = w + entry.charAt(0);
		      enlargeIn--;

		      w = entry;

		      if (enlargeIn == 0) {
		        enlargeIn = Math.pow(2, numBits);
		        numBits++;
		      }

		    }
		  }
		};
		  return LZString;
		})();

		if( module != null ) {
		  module.exports = LZString;
		} else if( typeof angular !== 'undefined' && angular != null ) {
		  angular.module('LZString', [])
		  .factory('LZString', function () {
		    return LZString;
		  });
		} 
	} (lzString));
	return lzString.exports;
}

var lzStringExports = requireLzString();
var lz = /*@__PURE__*/getDefaultExportFromCjs(lzStringExports);

let WorkerImpl = null;
let maxWorkers = 4;

const isNode =
    typeof process !== 'undefined' &&
    process.versions &&
    process.versions.node;

async function init() {
    if (WorkerImpl) return;

    if (isNode) {
        const os = await import('node:os');
        const wt = await import('node:worker_threads');
        WorkerImpl = wt.Worker;
        maxWorkers = os.cpus()?.length || 4;
    } else if (typeof Worker !== 'undefined') {
        WorkerImpl = Worker;
        maxWorkers = navigator.hardwareConcurrency || 4;
    }
}

async function canUseWorkers() {
    await init();
    return !!WorkerImpl;
}

async function runInWorkers(candidateNames, context, workerURL, custom = false) {
    await init();

    const queue = [...candidateNames];
    const results = [];
    let active = 0;


    return new Promise((resolve) => {
        function next() {
            if (!queue.length && active === 0) {
                resolve(results);
                return;
            }
            while (active < maxWorkers && queue.length) {
                const name = queue.shift();

                const worker = new WorkerImpl(
                    (
                        custom ? new URL(workerURL) : 
                        new URL(workerURL, import.meta.url)
                    ), {
                        type: 'module'
                    }
                );

                active++;

                const finish = (result) => {
                    results.push(result ?? null);
                    worker.terminate();
                    active--;
                    next();
                };

                if (isNode) {
                    worker.on('message', (msg) => {
                        finish(msg?.result);
                    });

                    worker.on('error', () => {
                        finish(null);
                    });
                } else {
                    worker.onmessage = (e) => {
                        finish(e.data?.result);
                    };

                    worker.onerror = () => {
                        finish(null);
                    };
                }

                worker.postMessage({
                    candidate: name,
                    context
                });
            }
        }

        next();
    });
}

const workerURL = './worker.js';
const workerMin = './worker.min.js';

const validateCache = new Map();
let maxCache = 5000;

function isMemHigh() {
    const threshold = 0.9;
    if (typeof process !== 'undefined' && process.memoryUsage) {
        const { heapUsed, heapTotal } = process.memoryUsage();
        return heapUsed / heapTotal > threshold;
    } else if (performance && performance.memory) {
        const { usedJSHeapSize, totalJSHeapSize } = performance.memory;
        return usedJSHeapSize / totalJSHeapSize > threshold;
    }
    return false;
}

function clear(warn = true) {
    validateCache.clear();
    if (warn && typeof process !== 'undefined') console.warn(prefix+'Memory high, cache cleared');
}

function setCache(key, value) {
    if (validateCache.size > maxCache) {
        const firstKey = validateCache.keys().next().value;
        validateCache.delete(firstKey);
    }
    validateCache.set(key, value);
    if (isMemHigh()) clear();
}

function compress$2(str) {
    const original = Array.from(str, ch => ch.charCodeAt(0));
    const N = original.length;
    if (N === 0) return null;

    let bestSize = N;
    let bestMode = -1;
    let bestPacked = null;

    for (let i = 0; i < 16; i++) {
        const constVal = i * 256;
        const xored = original.map(v => v ^ constVal);

        const bits = [];
        const bytes = [];
        for (const v of xored) {
            if (v >= 256) {
                bits.push(1);
                bytes.push(v >> 8, v & 0xFF);
            } else {
                bits.push(0);
                bytes.push(v);
            }
        }

        const bitWords = [];
        for (let j = 0; j < N; j += 16) {
            let word = 0;
            for (let b = 0; b < 16 && j + b < N; b++) {
                if (bits[j + b]) word |= (1 << b);
            }
            bitWords.push(word);
        }

        const dataWords = [];
        for (let j = 0; j < bytes.length; j += 2) {
            const b1 = bytes[j];
            const b2 = (j + 1 < bytes.length) ? bytes[j + 1] : 0;
            dataWords.push((b1 << 8) | b2);
        }

        const totalWords = 1 + bitWords.length + dataWords.length;
        if (totalWords < bestSize) {
            bestSize = totalWords;
            bestMode = i;
            bestPacked = [N, ...bitWords, ...dataWords];
        }
    }

    if (bestMode !== -1) return [String.fromCharCode(...bestPacked), bestMode];
    return null;
}

function decompress$1(compressed, mode) {
    const words = Array.from(compressed, ch => ch.charCodeAt(0));
    const N = words[0];
    const bitWordsCount = Math.ceil(N / 16);
    const bitWords = words.slice(1, 1 + bitWordsCount);
    const dataWords = words.slice(1 + bitWordsCount);

    const bits = [];
    for (let i = 0; i < N; i++) {
        const w = bitWords[Math.floor(i / 16)];
        bits.push(((w >> (i % 16)) & 1) === 1);
    }

    const bytes = [];
    for (const w of dataWords) {
        bytes.push(w >> 8, w & 0xFF);
    }
    const totalBytes = N + bits.filter(b => b).length;
    bytes.length = totalBytes;

    const xored = [];
    let byteIdx = 0;
    for (let i = 0; i < N; i++) {
        if (bits[i]) {
            xored.push((bytes[byteIdx++] << 8) | bytes[byteIdx++]);
        } else {
            xored.push(bytes[byteIdx++]);
        }
    }

    const constVal = mode * 256;
    const original = xored.map(v => v ^ constVal);
    return String.fromCharCode(...original);
}

function B64toUI8A(B64) {
    const convert = [0, 3, 2, 1];
    const add = convert[B64.length % 4];
    B64 = '0'.repeat(add) + B64;

    const bin6 = [];
    for (let i = 0; i < B64.length; i++) {
        const bin = convertBase$1(B64[i], 64, 2);
        if (bin != null) bin6.push(bin.padStart(6, '0'));
    }
    
    const bin8 = stringChunks$1(bin6.join(''), 8);
    const int8 = [add];
    for (let i = 0; i < bin8.length; i++) {
        int8.push(parseInt(bin8[i], 2));
    }

    return new Uint8Array(int8);
}

function UI8AtoB64(UI8A) {
    const remove = UI8A[0];
    const bin8 = [];
    for (let i = 1; i < UI8A.length; i++) {
        bin8.push(UI8A[i].toString(2).padStart(8, '0'));
    }

    const bin6 = stringChunks$1(bin8.join(''), 6);
    const B64 = [];
    for (let i = 0; i < bin6.length; i++) {
        B64.push(convertBase$1(bin6[i], 2, 64));
    }

    return B64.join('').slice(remove);
}

const { eUTF8 } = (()=>{
    const { encode } = utf8;
    return { eUTF8: encode };
})();
 const { cLZ, dLZ } = (()=>{
    const { compressToUTF16, decompressFromUTF16 } = lz;
    return { cLZ: compressToUTF16, dLZ: decompressFromUTF16 };
})();

function cryptCharCode(
    code, get = false,
    repeatBefore = false, repeatAfter = false,
    beginId = -1, code2 = 0, sequences = false,
    code3 = -1
) {
    if (get) {
        const codeBin = decToBin(code, 16);
        const codeSet = codeBin.slice(8,11).split('');
        const codeDec = binToDec(codeBin.slice(11));
        const begid = binToDec(codeBin.slice(5,8));
        return {
            code: codeDec,
            repeatBefore: codeSet[0] === '1',
            repeatAfter: codeSet[1] === '1',
            beginId: codeSet[2] === '1' ? begid : -1,
            code2: binToDec(codeBin.slice(0,4)),
            sequences: codeBin.slice(4,5) === '1',
            code3: codeSet[2] === '0' ? begid : -1,
            bin: codeBin,
        }
    } else {
        const sixteenBits =                                               /* 16-bit Data/Header character */

            decToBin(code2, 4) +                                          /* Bits  0-3  :           code2 */
            (sequences ? '1' : '0') +                                     /* Bit    4   : sequences?|odd? */
            decToBin(beginId >= 0 ? beginId : code3 < 0 ? 0 : code3, 3) + /* Bits  5-7  : beginID | code3 */
            (repeatBefore ? '1' : '0') +                                  /* Bit    8   : inp RLE? | num? */
            (repeatAfter ? '1' : '0') +                                   /* Bit    9   :     output RLE? */
            (beginId >= 0 ? '1' : '0') +                                  /* Bit   10   :        beginID? */
            decToBin(code, 5);                                            /* Bits 11-15 :           code1 */
        
        return binToDec(sixteenBits);
    }
}

/*
     _________________________________________________________________________________________________
    | Name                             | Short name | Mode ID | Code #1 usage | Code #2 usage | Since |
    |----------------------------------|------------|---------|---------------|---------------|-------|
    | No Compression                   | NC         |       0 | 00            | 00            | 1.0.0 |
    | Two-Digit CharCode Concatenation | TDCCC      |       1 | 01            | 00            | 1.0.0 |
    | Two-Byte CharCode Concatenation  | TBCCC      |       2 | 02            | 00            | 1.0.0 |
    | Decimal Integer Packing          | DIP        |       3 | 03            | 00            | 1.0.0 |
    | Alphabet Encoding                | AE         |       4 | 04            | 00 - 15       | 1.1.0 |
    | Character Encoding               | CE         |       5 | 05            | 00 - 15       | 1.0.0 |
    | Inline Integer Encoding          | IIE        |       6 | 00 / 06       | 01 - 15       | 2.0.0 |
    | Frequency Map                    | FM         |       7 | 07            | 00 - 15       | 2.0.0 |
    | URL                              | URL        |       8 | 08            | 00 - 15       | 2.0.0 |
    | Segmentation                     | S          |       9 | 09            | 00 - 15       | 2.0.0 |
    | String Repetition                | SR         |      10 | 10            | 00 - 15       | 2.0.0 |
    | Recursive Compression            | RC         |      11 | 31            | 00 - 15       | 2.0.0 |
    | Emoji Packing                    | EP         |      12 | 11            | 00            | 2.1.0 |
    | Base-64 Integer Encoding         | B64IE      |      13 | 11            | 01            | 2.1.0 |
    | Base-64 Packing                  | B64P       |      14 | 12            | 00 - 15       | 2.1.0 |
    | Offset Encoding                  | OE         |      15 | 30            | custom layout | 2.1.0 |
    | lz-string                        | LZ         |      16 | 11            | 02            | 2.1.0 |
    | Chunkification                   | C          |      17 | 11            | 03            | 2.1.0 |
    | Adaptive XOR                     | AXOR       |      18 | 13            | 00 - 15       | 2.1.0 |
    |----------------------------------|------------|---------|---------------|---------------|-------|

*/

async function tryRecursive(base, opts) {
    if (!opts.recursivecompression) return base;

    let cur = base;
    let depth = 0;

    while (depth < 15) {
        depth++;
        const next = await compress$1(cur, {
            ...opts,
            recursivecompression: false,
            depth: opts.depth + 1
        });

        if (next.length >= cur.length) break;

        const dec = await decompress(next, true);
        if (dec !== cur) break;

        cur = next;
    }

    if (depth === 0) return null;

    return (
        charCode(
            cryptCharCode(
                31,
                false,
                false,
                false,
                -1,
                depth,
                false,
                -1
            )
        ) + cur
    );
}

function readOptions(options, defaults) {
    if (typeof options != 'object' || Array.isArray(options)) throw new Error(prefix+'Invalid options input.');
    for (const [key, value] of Object.entries(options)) {
        if ((key == 'depth' || key.toLowerCase() == 'depthlimit' || key == 'worker' || key.toLowerCase() == 'workerlimit') && typeof value == 'number') {
            defaults[key.toLowerCase()] = value;
            continue;
        }
        if (typeof value == 'undefined') continue;
        if (typeof value != 'boolean') throw new Error(prefix+'Invalid options input.');
        if (key.toLowerCase() in defaults) {
            defaults[key.toLowerCase()] = value;
            continue;
        }
        console.warn(prefix+`Unknown option: "${key}".`);
    }
    return defaults;
}

function getModeID(code1, code2) {
    switch (code1) {
        case 0:
            return code2 == 0 ? 0 : 6;
        case 11: {
            switch (code2) {
                case 0:
                    return 12;
                case 1:
                    return 13;
                case 2:
                    return 16;
                case 3:
                    return 17;
            }
        }
        case 12:
            return 14;
        case 13:
            return 18;
        case 30:
            return 15;
        case 31:
            return 11;
        default:
            return code1;
    }
}
class JSSC {
    constructor (com, dec, opts, m = 0, workers = false) {
        const headerchar = decToBin(com.charCodeAt(0), 16);
        const code1 = headerchar.slice(11);
        const code2 = headerchar.slice(0,4);
        const code3 = headerchar.slice(5,8);
        const s = headerchar.slice(4,5);
        const i = headerchar.slice(8,9);
        const o = headerchar.slice(9,10);
        const b = headerchar.slice(10,11);

        const compressed = {
            string: com,
            header: {
                code: binToDec(headerchar),
                bin: headerchar,
                blocks: [
                    code2,
                    s,
                    code3,
                    i,
                    o,
                    b,
                    code1
                ],
                code1, code2, code3,
                s: s == '1',
                i: i == '1',
                o: o == '1',
                b: b == '0'
            },
            mode: getModeID(binToDec(code1), binToDec(code2))
        };

        this.output = m == 0 ? compressed : dec;
        this.options = opts;
        this.input = m == 0 ? dec : compressed;
        this.workers = workers;
        Object.freeze(this);
    }
}

function offsetEncoding(string) {
    const group = Math.floor(stringCodes(string).minCharCode / 32);
    const offset = group * 32;
    const result = [];
    for (let i = 0; i < string.length; i++) {
        result.push(String.fromCharCode(string.charCodeAt(i) - offset));
    }
    const char = charCode(binToDec(decToBin(group, 11) + decToBin(30, 5)));
    return [result.join(''), char, group];
}
async function validateOffsetEncoding(string, inp, group) {
    try {
        return group > 0 && (
            eUTF8(string).length < eUTF8(inp).length ||
            encode(string).length < encode(inp).length ||
            (new TextEncoder()).encode(string).length < (new TextEncoder()).encode(inp).length ||
            opts.offsetencode
        ) && await validate(string);
    } catch (_) {
        return false;
    }
}

async function parseJUSTC(str) {
    try {
        const result = JUSTC.parse(str);

        if (result && typeof result.then === 'function') {
            return await result;
        }

        return result;
    } catch (err) {
        if (typeof window !== 'undefined') { /* Browsers */
            try {
                await JUSTC.initialize();

                const retry = JUSTC.parse(str);
                if (retry && typeof retry.then === 'function') {
                    return await retry;
                }

                return retry;
            } catch {
                return null;
            }
        }

        return null;
    }
}

/**
 * **JavaScript String Compressor - compress function.**
 * @param {string|object|number} input string
 * @param {{segmentation?: boolean, recursiveCompression?: boolean, JUSTC?: boolean, base64IntegerEncoding?: boolean, base64Packing?: boolean, offsetEncoding?: boolean, lzstring?: boolean, offsetEncode?: boolean, minifiedworker?: boolean, depthLimit?: number, workerLimit?: number, JSONstring?: boolean, debug?: boolean}} [options]
 * @returns {Promise<string>} Compressed string
 * @example await compress('Hello, World!');
 * @since 1.0.0
 */
async function compress$1(input, options) {
    if (typeof input != 'string' && typeof input != 'object' && typeof input != 'number') throw new Error(prefix+'Invalid input.');
    let opts = {
        segmentation: true,
        recursivecompression: true,
        justc: JUSTC ? true : false,
        base64integerencoding: true,
        base64packing: true,
        offsetencoding: true,
        lzstring: true,
        
        offsetencode: false,
        minifiedworker: true,
        depthlimit: 10,
        workerlimit: 2,
        jsonstring: false,
        debug: false,

        depth: 0,
        worker: 0
    };

    /* Read options */
    if (options) opts = readOptions(options, opts);
    if (opts.depth >= opts.depthlimit) throw new Error('');

    const originalInput = input;
    let str = input;
    let isNum = false;

    if (typeof str === 'number') {
        isNum = true;
        str = str.toString();
        if (str.includes('.')) throw new Error(prefix+'Invalid input.');
    }

    let repeatBefore = false;
    function repeatChars(txt) {
        return txt.replace(/(.)\1+/g, ( a , b ) => b + a.length);
    }

    let beginId = -1;
    if (typeof str == 'string') for (const begin of _JSSC._begin) {
        if (str.startsWith(begin)) {
            beginId = _JSSC._begin.indexOf(begin);
            str = str.slice(begin.length);
            break;
        }
    }
    let code3 = -1;
    async function toJUSTC(obj) {
        try {
            const result = await JUSTC.stringify(obj);
            if (result && typeof result.then === 'function') {
                return await result;
            }
            return result;
        } catch (_) {
            /* Browsers */
            await JUSTC.initialize();
            return JUSTC.stringify(obj);
        }
    }
    if (beginId == -1) {
        /* JSON Array (as object) */
        if (typeof str == 'object' && Array.isArray(str)) {
            str = JSON.stringify(str).slice(1,-1);
            code3 = 4;
        } else
        /* JSON Object (as object) */
        if (typeof str == 'object') try {
            let JUSTCstr = undefined;
            if (opts.justc) {
                const JUSTCobj = await toJUSTC(str);
                const JSONstr = JSON.stringify(await parseJUSTC(JUSTCobj));
                if (JSONstr == JSON.stringify(str)) JUSTCstr = JUSTCobj;
            }

            if (typeof JUSTCstr != 'undefined') {
                str = JUSTCstr;
                code3 = 2;
            } else {
                str = JSON.stringify(str);
                code3 = 6;
            }
        } catch (error) {
            const msg = new Error(prefix+'Invalid input.');
            throw new AggregateError([msg, error], msg.message);
        } else
        /* JSON Object (as string) */
        try {
            const obj = JSON.parse(str);
            if (!Array.isArray(obj) && typeof obj == 'object') {
            
            let JUSTCstr = undefined;
            if (opts.justc && opts.jsonstring) {
                const JUSTCobj = await toJUSTC(obj);
                const JSONstr = JSON.stringify(await parseJUSTC(JUSTCobj));
                if (JSONstr == JSON.stringify(str)) JUSTCstr = JUSTCobj;
            }

            if (typeof JUSTCstr != 'undefined' && JUSTCstr.length < str.length && str == JSON.stringify(obj)) {                
                str = JUSTCstr;
                code3 = 1;
            } else {
                str = str.slice(1,-1);
                code3 = 5;
            }
        } else if (typeof obj == 'object' && Array.isArray(obj)) {
        /* JSON Array (as string) */
        str = str.slice(1,-1);
        code3 = 3;
        }} catch (_) {
    }}

    if (!/\d/.test(str)) {
        str = repeatChars(str);
        repeatBefore = true;
    }
    
    function processOutput(output, disableSeq = false) {
        let repeatAfter = false;
        let sequences = false;

        const hasDigits = /\d/.test(output);
        if (!hasDigits) {
            repeatAfter = true;
            output = repeatChars(output);
        }
        
        if (!disableSeq) {
            const compressed = compressSequences(output);
            if (compressed.sequences) {
                sequences = true;
                return [compressed.compressed, repeatAfter, sequences];
            }
        }
        
        return [output, repeatAfter, sequences];
    }

    const safeTry = async (fn) => {
        try {
            return await fn();
        } catch (err) {
            if (opts.debug) console.warn(err);
            return null;
        }
    };

    const validate = async (compressed) => {
        try {
            const dec = await decompress(compressed, true);
            return dec === String(originalInput);
        } catch {
            return false;
        }
    };

    let results;
    const context = {
        opts,
        str, isNum, code3, originalInput,
        beginId, repeatBefore
    };
    const candidates = [
        IIE,
        DIP,
        B64IE,
        TDCCC,
        TBCCC,
        CE,
        AE,
        FM,
        URL_,
        S,
        SR,
        EP,
        B64P,
        OE,
        LZS,
        AXOR
    ];
    async function noWorkers() {
        return await Promise.all(candidates.map(fn => safeTry(async () => await fn(context))));
    }

    let usedWorkers = false;
    if (!(opts.worker > opts.workerlimit) && originalInput.length > 64 && await canUseWorkers()) {
        try {
            usedWorkers = true;
            results = await runInWorkers(
                candidates.map(fn => fn.name), 
                context, 
                customWorkerURL != null && typeof customWorkerURL != 'undefined' ? customWorkerURL
                : opts.minifiedworker ? workerMin : workerURL
            );
        } catch (err) {
            if (opts.debug) console.warn(err);
        }
    } else results = await noWorkers();

    if (usedWorkers && (
        !Array.isArray(results) ||
        results.length == 0 ||
        results.every(c => c == null)
    )) {
        results = await noWorkers();
        usedWorkers = false;
    }

    results = results.filter(r => typeof r === 'string' && r.length <= String(originalInput).length);

    let best;
    if (!results.length) {
        let [repeatAfter, sequences] = [false, false];
        const savedStr = str;
        [str, repeatAfter, sequences] = processOutput(str);
        if (await validate(str)) best = charCode(cryptCharCode(0, false, repeatBefore, repeatAfter, beginId, 0, sequences, code3)) + str;
        else best = charCode(cryptCharCode(0, false, repeatBefore, false, beginId, 0, false, code3)) + savedStr;
    } else best = results.reduce((a, b) => (b.length < a.length ? b : a));

    if (opts.recursivecompression) try {
        for (const r of results) {
            const rc = await tryRecursive(r, opts);
            if (rc && rc.length <= best.length && await validate(rc)) {
                best = rc;
            }
        }
    } catch (_){}
    /* postprocessing */
    if (opts.offsetencoding) {
        const enc = offsetEncoding(best);
        const res = enc[1] + enc[0];
        if (await validateOffsetEncoding(res, best, enc[2])) best = res;
    }

    if (opts.debug) return new JSSC(best, originalInput, opts, 0, usedWorkers);

    return best;
}

function characterEncodings(id, realstr) {
    const strcode2charencoding = {};
    for (const [name, code] of Object.entries(_JSSC._IDs)) {
        strcode2charencoding[code] = name;
    }
    const possibleCharEncoding = strcode2charencoding[id];
    if (possibleCharEncoding) {
        const characterEncodings_ = new _JSSC.use();
        const characterEncoding = characterEncodings_[name__+possibleCharEncoding]();
        const output = [];
        for (let i = 0; i < realstr.length; i++) {
            const characterCode = realstr.charCodeAt(i);
            const binCode0 = decToBin(characterCode, 0);
            function binCodeToChar(charr) {
                return String(characterEncoding[String(binToDec(charr))]);
            }
            if (binCode0.length > 8) {
                const [character1, character2] = stringChunks$1(decToBin(characterCode, 16), 8);
                output.push(binCodeToChar(character1) + binCodeToChar(character2));
            } else {
                const character = decToBin(characterCode, 8);
                output.push(binCodeToChar(character));
            }
        }
        return output.join('');
    }
}

function offsetDecoding(str, group) {
    const offset = group * 32;
    const result = [];
    
    for (let i = 0; i < str.length; i++) {
        result.push(String.fromCharCode(str.charCodeAt(i) + offset));
    }
    
    return result.join('');
}

/**
 * **JavaScript String Compressor - decompress function.**
 * @param {string} str Compressed string
 * @param {boolean | {stringify?: boolean, debug?: boolean}} [stringify] Return only string in any way
 * @returns {Promise<string|object|number>} Decompressed string/object/integer
 * @since 1.0.0
 */
async function decompress(str, stringify = false) {
    if (typeof str != 'string') throw new Error(prefix+'Invalid input.');
    const s = str;
    let opts = {
        stringify: false,

        debug: false
    };

    /* Read options */
    switch (typeof stringify) {
        case 'boolean':
            opts.stringify = stringify;
            break;
        case 'object':
            opts = readOptions(stringify, opts);
            break;
        default:
            opts.stringify = Boolean(stringify);
            break;
    }

    const charcode = (str.charCodeAt(0) - 32 + 65535) % 65535;
    const strcodes = cryptCharCode(charcode, true);
    const strcode = strcodes.code;
    
    function repeatChars(txt) {
        return txt.replace(/(\D)(\d+)/g, (_, g1, g2) => g1.repeat(g2));
    }
    
    /* sequences */
    let realstr = str.slice(1);
    if (strcodes.sequences && ![8,9,13,30].includes(strcode)) {
        realstr = decompressSequences(realstr);
    }
    
    /* RLE */
    if (strcodes.repeatAfter && ![9,13,30].includes(strcode)) {
        realstr = repeatChars(realstr);
    }
    
    async function begin(out) {
        if (strcodes.beginId >= 0) {
            return _JSSC._begin[strcodes.beginId] + out;
        } else if (strcodes.code3 == 1 || strcodes.code3 == 2) {
            /* JSON Object */
            const result = await parseJUSTC(out);
            if (result && typeof result.then === 'function') {
                return JSON.stringify(await result);
            } else return JSON.stringify(result);
        } else return out;
    }
    
    function checkOutput(out) {
        if (opts.debug) return new JSSC(s, out, opts, 1);
        return out;
    }
    async function processOutput(out, checkOut = true) {
        let output = out;

        if (strcodes.repeatBefore && strcode != 3 && strcode != 12) {
            output = repeatChars(await begin(out));
        } else output = await begin(out);

        if ((strcodes.repeatBefore && (strcode == 3 || strcode == 12)) || strcode == 30) output = parseInt(output); else { /*            Integer            */
        if (strcodes.code3 == 3 || strcodes.code3 == 4) output = '[' + output + ']';                                       /*          JSON  Array          */
        else if (strcodes.code3 == 5) output = '{' + output + '}';                                                         /*    JSON Object (as string)    */
        if (strcodes.code3 == 2 || strcodes.code3 == 4 || strcodes.code3 == 6) output = JSON.parse(output);}               /* JSON Object/Array (as object) */

        if (opts.stringify) {
            if (typeof output == 'object') output = JSON.stringify(output);
            else if (typeof output == 'number') output = output.toString();
        }

        return checkOut ? checkOutput(output) : output;
    }
    
    const output = [];
    switch (strcode) {
        case 0: case 6:
            if (strcodes.code2 > 0) return await processOutput(String(strcodes.code2 - 1)); /* Inline Integer Encoding */
            return await processOutput(realstr); /* No Compression */
        case 1: /* Two-Digit CharCode Concatenation */
            function addChar(cde) {
                output.push(String.fromCharCode(cde));
            }
            for (let i = 0; i < realstr.length; i++) {
                const char = realstr.charCodeAt(i);
                const charcde = String(char);
                if (charcde.length > 2) {
                    const charcds = stringChunks$1(charcde, 2);
                    for (const chrcode of charcds) {
                        addChar(parseInt(chrcode));
                    }
                } else {
                    addChar(char);
                }
            }
            return await processOutput(output.join(''));
        case 2: /* Two-Byte CharCode Concatenation */
            function toChar(binCode) {
                return String.fromCharCode(binToDec(binCode));
            }
            for (let i = 0; i < realstr.length; i++) {
                const char = realstr.charCodeAt(i);
                const binCode = decToBin(char, 16);
                const binCode0 = decToBin(char, 0);
                if (binCode0.length > 8) {
                    const [bin1, bin2] = stringChunks$1(binCode, 8);
                    output.push(toChar(bin1) + toChar(bin2));
                } else {
                    const binCode8 = decToBin(char, 8);
                    output.push(toChar(binCode8));
                }
            }
            return await processOutput(output.join(''));
        case 3: /* Decimal Integer Packing */
            for (let i = 0; i < realstr.length; i++) {
                const char = realstr.charCodeAt(i);
                const binCodes = stringChunks$1(decToBin(char, 16), 4);
                for (const binCode of binCodes) {
                    const numm = binToDec(binCode);
                    if (numm != 15) {
                        output.push(numm.toString(10));
                    }
                }
            }
            return await processOutput(output.join(''));
        case 4: /* Alphabet Encoding */
            const chars = [];
            for (let i = 0; i < realstr.slice(0, strcodes.code2).length; i++) {
                chars.push(realstr[i]);
            }
            for (let i = 0; i < realstr.slice(strcodes.code2).length; i++) {
                const binCodes = stringChunks$1(decToBin(realstr.charCodeAt(i), 16), 4);
                for (const binCode of binCodes) {
                    if (binCode != '1111') {
                        const numm = binToDec(binCode);
                        output.push(chars[numm]);
                    }
                }
            }
            return await processOutput(output.join(''));
        case 5: /* Character Encoding */
            const decoded = characterEncodings(strcodes.code2, realstr);
            if (decoded) {
                return await processOutput(decoded);
            } else throw new Error(prefix+'Invalid compressed string');
        case 7: /* Frequency Map */
            const splitter = freqMapSplitters[binToDec(decToBin(strcodes.code2).slice(1))];
            let output_ = freqMap.decompress(realstr, splitter);
            if (parseInt(decToBin(strcodes.code2).slice(0,1)) == 1) output_ = output_.slice(0,-1);
            return await processOutput(output_);
        case 8: { /* URL */
            let bytes = [];
            for (const ch of realstr) {
                const c = ch.charCodeAt(0);
                bytes.push((c >> 8) & 0xFF, c & 0xFF);
            }
            if (strcodes.sequences) bytes.pop();

            let out = [];
            for (const b of bytes) {
                out.push(String.fromCharCode(b));
            }
            out = out.join('');

            /* percent restore if needed */
            if (strcodes.code2 & 1) {
                out = out.replace(
                    /[\x00-\x20\x7F-\xFF]/g,
                    c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()
                );
            }

            /* punycode restore */
            if (strcodes.code2 & 2 && typeof punycode !== 'undefined') {
                const u = new URL(out);
                u.hostname = punycode.toASCII(u.hostname);
                out = u.href;
            }

            return await processOutput(out);}
        case 9: { /* Segmentation */
            let idx = 0;
            const segCount = strcodes.code2 < 15 ? strcodes.code2 + 2 : realstr.charCodeAt(idx++) + 2;

            for (let i = 0; i < segCount; i++) {
                const len = realstr.charCodeAt(idx++);
                const segmentCompressed = realstr.slice(idx);

                const seg = (await decompress(
                    segmentCompressed, true
                )).slice(0, len);

                output.push(seg);
                idx += (await compress$1(seg, {segmentation: false, justc: strcodes.repeatAfter, recursivecompression: strcodes.sequences})).length;
            }

            return await processOutput(output.join(''));}
        case 10: /* String Repetition */
            const sliceChar = strcodes.code2 == 15;
            const repeatCount = sliceChar ? realstr.charCodeAt(0) + 15 : strcodes.code2;
            if (sliceChar) realstr = realstr.slice(1);
            return await processOutput(realstr.repeat(repeatCount));
        case 11: {
            switch (strcodes.code2) {
                case 0: { /* Emoji Packing */
                    const base = 0x1F300;

                    let bits = [];

                    for (let i = 0; i < realstr.length; i++) {
                        const code = realstr.charCodeAt(i);
                        bits.push(code.toString(2).padStart(16, '0'));
                    }
                    bits = bits.join('');

                    let pos = 0;
                    
                    while (pos + 3 <= bits.length) {
                        const length = parseInt(bits.slice(pos, pos + 3), 2);
                        pos += 3;

                        if (length === 0) break;

                        if (pos + (length * 11) > bits.length) break;

                        const cluster = [];

                        for (let i = 0; i < length; i++) {
                            const delta = parseInt(bits.slice(pos, pos + 11), 2);
                            pos += 11;

                            const cp = base + delta;
                            cluster.push(String.fromCodePoint(cp));
                        }

                        output.push(cluster.join(''));
                    }

                    return checkOutput(output.join(''));
                }
                case 1: { /* Base-64 Integer Encoding */
                    return checkOutput(await decompress(
                        await processOutput(convertBase$1(realstr, 64, 10), false)
                    ));
                }
                case 2: { /* lz-string */
                    return await processOutput(dLZ(realstr));
                }
                case 3: { /* Chunkification */
                    let i = 0;
                    while (i < realstr.length) {
                        const length = realstr.charCodeAt(i) + i;
                        i++;
                        output.push(await decompress(realstr.slice(i, length)));
                    }
                    return checkOutput(output.join(''));
                }
                default: throw new Error(prefix+'Invalid compressed string');
            }
        }
        case 12: /* Base-64 Packing */
            let len = strcodes.code2;
            let slice = len == 16;
            if (slice) len = realstr.slice(0,1).charCodeAt(0) + 16;
            return await processOutput(decompressB64(slice ? realstr.slice(1) : realstr, len));
        case 13: /* Adaptive XOR */
            return await processOutput(decompress$1(realstr, strcodes.code2));
        case 30: /* Offset Encoding */
            const dec = offsetDecoding(realstr, binToDec(decToBin(charcode, 16).slice(0,11)));
            return checkOutput(await decompress(dec));
        case 31: { /* Recursive Compression */
            let out = realstr;
            const depth = strcodes.code2;

            for (let i = 0; i < depth; i++) {
                const first = out.charCodeAt(0) - 32;
                const meta = cryptCharCode(first, true);

                if (meta.code === 31) {
                    throw new Error(prefix+'Attempt to nested recursive compression');
                }

                out = await decompress(out, true);
            }

            return checkOutput(out);
        }
        default:
            throw new Error(prefix+'Invalid compressed string');
    }
}

function noDebugMode(result) {
    if (result instanceof JSSC) throw new Error(prefix+'Invalid options input.');
    return result;
}

async function compressToBase64(...input) {
    const compressed = noDebugMode(await compress$1(...input));
    return B64Padding(encode(compressed));
}
async function decompressFromBase64(base64, ...params) {
    return noDebugMode(await decompress(decode(base64.replace(/=+$/, '')), ...params));
}
async function compressLargeToBase64(...input) {
    const compressed = noDebugMode(await compress$1(...input));
    return B64Padding(encode(compressed));
}

async function validate(compressed, originalInput) {
    const cached = validateCache.get(compressed);
    if (typeof cached == 'boolean') return cached;

    let result;

    if (compressed.length > (originalInput.length + 1)) result = false;
    else try {
        const dec = await decompress(compressed, true);
        result = dec === String(originalInput);
    } catch {
        result = false;
    }    
    setCache(compressed, result);
    return result;
}
const n = /^\d+$/;
function repeatChars(txt) {
    return txt.replace(/(.)\1+/g, ( a , b ) => b + a.length);
}
function processOutput(output, disableSeq = false) {
    let repeatAfter = false;
    let sequences = false;

    const hasDigits = /\d/.test(output);
    if (!hasDigits) {
        repeatAfter = true;
        output = repeatChars(output);
    }
    
    if (!disableSeq) {
        const compressed = compressSequences(output);
        if (compressed.sequences) {
            sequences = true;
            return [compressed.compressed, repeatAfter, sequences];
        }
    }
    
    return [output, repeatAfter, sequences];
}

/**
 * Inline Integer Encoding
 */
async function IIE(context){
    const {str, isNum, code3, originalInput} = context;
    if (!n.test(str)) return null;

    const out = await (async () => {
        const num = parseInt(str);
        if (num < 15) {
            return charCode(
                cryptCharCode(isNum ? 6 : 0, false, false, false, -1, num + 1, false, code3)
            );
        }
        return null;
    })();
    if (!out) return null;
    if (!(await validate(out, originalInput))) return null;
    return out;
}

/**
 * Decimal Integer Packing
 */
async function DIP(context) {
    const {str, isNum, code3, originalInput} = context;
    if (!n.test(str)) return null;

    const convertNums = {
        'A': 10,
        'B': 11,
        'C': 12,
        'D': 13,
        'E': 14
    };
    const inputt = str
        .replaceAll('10', 'A')
        .replaceAll('11', 'B')
        .replaceAll('12', 'C')
        .replaceAll('13', 'D')
        .replaceAll('14', 'E');
    const binOut = [];
    for (let i = 0; i < inputt.length; i++) {
        const character = inputt[i];
        if (/\d/.test(character)) {
            binOut.push(decToBin(parseInt(character), 4));
        } else {
            binOut.push(decToBin(convertNums[character], 4));
        }
    }    let [output, RLE, sequences] = [[], false, false];
    function binPadStart(bin) {
        if (bin.length < 16) {
            const numm = 4 - stringChunks$1(bin, 4).length;
            return decToBin(15, 4).repeat(numm)+bin;
        } else return bin;
    }
    for (const character of chunkArray(binOut, 4)) {
        output.push(String.fromCharCode(binToDec(binPadStart(character.join('')))));
    }
    output = output.join('');
    [output, RLE, sequences] = processOutput(output);
    output = charCode(cryptCharCode(3, false, isNum, RLE, -1, 0, sequences, code3)) + output;
    if (!(await validate(output, originalInput))) return null;
    return output;
}

/**
 * Base-64 Integer Encoding
 */
async function B64IE(context) {
    const {str, isNum, code3, originalInput, opts} = context;
    if (!n.test(str) || !opts.base64integerencoding) return null;

    let [output, RLE, seq] = processOutput(convertBase$1(str, 10, 64));
    output = await compress$1(output, {
        JUSTC: false,
        segmentation: false,
        recursiveCompression: false,
        base64IntegerEncoding: false,
        depth: opts.depth + 1,
    });
    output = charCode(cryptCharCode(11, false, isNum, RLE, -1, 1, seq, code3)) + output;
    if (!(await validate(output, originalInput))) return null;
    return output;
}

/**
 * Two-Digit CharCode Concatenation
 */
async function TDCCC(context) {
    const {str, code3, repeatBefore, beginId, originalInput} = context;

    const strdata = stringCodes(str);
    if (!(strdata.max === 2 && strdata.min === 2)) return null;

    let chars = strdata.output;
    let [output, repeatAfter, seq] = [[], false, false];
    function addChar(codee) {
        output.push(String.fromCharCode(codee));
    }
    function sliceChars(numbr) {
        chars = chars.slice(numbr);
    }
    while (chars.length > 0) {
        if (chars.length === 1) {
            addChar(chars[0]);
            sliceChars(1);
        } else if (chars.length < 3) {
            for (const char of chars) {
                addChar(char);
            }
            sliceChars(chars.length);
        } else {
            const a1 = parseInt(String(chars[0]) + String(chars[1]) + String(chars[2]));
            const a2 = parseInt(String(chars[0]) + String(chars[1]));
            if (checkChar(a1)) {
                addChar(a1);
                sliceChars(3);
            } else if (checkChar(a2)) {
                addChar(a2);
                sliceChars(2);
            } else {
                addChar(chars[0]);
                sliceChars(1);
            }
        }
    }
    output = output.join('');
    [output, repeatAfter, seq] = processOutput(output);
    const res = charCode(cryptCharCode(1, false, repeatBefore, repeatAfter, beginId, 0, seq, code3)) + output;
    if (!(await validate(res, originalInput))) return null;
    return res;
}

/**
 * Two-Byte CharCode Concatenation
 */
async function TBCCC(context) {
    const {str, code3, repeatBefore, beginId, originalInput} = context;

    const strdata = stringCodes(str);
    if (strdata.maxCharCode >= 256) return null;

    let [out, repeatAfter, seq] = [[], false, false];
    for (const pair of stringChunks$1(str, 2)) {
        const bin = [];
        for (const c of pair) bin.push(decToBin(c.charCodeAt(0), 8));
        out.push(String.fromCharCode(binToDec(bin.join(''))));
    }
    out = out.join('');

    [out, repeatAfter, seq] = processOutput(out);
    const res = charCode(cryptCharCode(2, false, repeatBefore, repeatAfter, beginId, 0, seq, code3)) + out;
    if (!(await validate(res, originalInput))) return null;
    return res;
}

/**
 * Character Encoding
 */
async function CE(context) {
    const {str, code3, repeatBefore, beginId, originalInput} = context;

    const characterEncodings = new _JSSC.use();
    let useCharacterEncoding;
    let charEncodingID = NaN;
    
    for (const [characterEncodingName, characterEncoding] of Object.entries(characterEncodings)) {
        const table = characterEncoding();
        table.length = 256;
        const arrayy = Array.from(table);
        let usethisone = true;
        for (let i = 0; i < str.length; i++) {
            if (!arrayy.includes(str[i])) {
                usethisone = false;
                break;
            }
        }
        if (usethisone) {
            useCharacterEncoding = characterEncoding();
            charEncodingID = _JSSC._IDs[characterEncodingName.slice(4)];
            break;
        }
    }
    
    if (useCharacterEncoding) {
        const reverseCharacterEncoding = {};
        for (const [charCode, character] of Object.entries(useCharacterEncoding)) {
            reverseCharacterEncoding[character] = charCode;
        }
        const binaryCharCodes = [];
        const convertCharCodes = [];
        for (let i = 0; i < str.length; i++) {
            binaryCharCodes.push(decToBin(parseInt(reverseCharacterEncoding[str[i]]), 8));
        }
        for (const binCharCodes of chunkArray(binaryCharCodes, 2)) {
            convertCharCodes.push(binCharCodes.join('').padStart(16, '0'));
        }
        let [outputStr, repeatAfter, seq] = [[], false, false];
        for (const characterCode of convertCharCodes) {
            outputStr.push(String.fromCharCode(binToDec(characterCode)));
        }
        outputStr = outputStr.join('');

        [outputStr, repeatAfter, seq] = processOutput(outputStr);
        outputStr = charCode(cryptCharCode(5, false, repeatBefore, repeatAfter, beginId, charEncodingID, seq, code3)) + outputStr;
        if (await validate(outputStr, originalInput)) return outputStr;
    }
    return null;
}

/**
 * Alphabet Encoding
 */
async function AE(context) {
    const {str, code3, repeatBefore, beginId, originalInput} = context;

    const uniq = [...new Set(str.split('').map(c => c.charCodeAt(0)))];
    if (uniq.length >= 16) return null;

    let out = [uniq.map(c => String.fromCharCode(c)).join('')];
    let buf = [];
    let [repeatAfter, seq] = [false, false];

    for (const c of str) {
        buf.push(uniq.indexOf(c.charCodeAt(0)));
        if (buf.length === 4) {
            out.push(String.fromCharCode(binToDec(buf.map(n => decToBin(n, 4)).join(''))));
            buf = [];
        }
    }

    if (buf.length) {
        out.push(String.fromCharCode(
            binToDec(buf.map(n => decToBin(n, 4)).join('').padStart(16, '1'))
        ));
    }

    [out, repeatAfter, seq] = processOutput(out.join(''));
    const res = charCode(cryptCharCode(4, false, repeatBefore, repeatAfter, beginId, uniq.length, seq, code3)) + out;
    if (!(await validate(res, originalInput))) return null;
    return res;
}

/**
 * Frequency Map
 */
async function FM(context) {
    const {str, originalInput} = context;

    for (const splitter of freqMapSplitters) {
        const test = freqMap.test(str, splitter);
        if (!Array.isArray(test)) continue;

        const [, , sp, packed] = test;
        const code2 = binToDec((test[0] - 1).toString() + decToBin(freqMapSplitters.indexOf(sp), 3));
        const res = charCode(cryptCharCode(7, false, false, false, -1, code2)) + packed;

        if (await validate(res, originalInput)) return res;
    }
    return null;
}

/*
 * URL
 */
async function URL_(context) {
    const {str, code3, repeatBefore, beginId, originalInput} = context;

    if (typeof str !== 'string') return null;

    let url;
    try {
        url = new URL(_JSSC._begin[beginId] + str);
    } catch {
        return null;
    }

    const originalHref = url.href;

    let hasPercent = /%[0-9A-Fa-f]{2}/.test(originalHref);
    let hasPunycode = url.hostname.includes('xn--');
    let hasQuery = !!url.search;
    let hasFragment = !!url.hash;

    /* normalize */
    let normalized = originalHref.slice(_JSSC._begin[beginId].length);

    /* punycode to unicode */
    if (hasPunycode && typeof punycode !== 'undefined') {
        url.hostname = punycode.toUnicode(url.hostname);
        normalized = url.href.slice(_JSSC._begin[beginId].length);
    }

    /* percent to bytes */
    let bytes = [];
    for (let i = 0; i < normalized.length; i++) {
        const ch = normalized[i];
        if (ch === '%' && i + 2 < normalized.length) {
            const hex = normalized.slice(i + 1, i + 3);
            if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
                bytes.push(parseInt(hex, 16));
                i += 2;
                continue;
            }
        }
        bytes.push(normalized.charCodeAt(i));
    }
    
    let odd = bytes.length & 1;
    if (odd) bytes.push(0);

    /* bytes to UTF16 */
    let out = [];
    for (let i = 0; i < bytes.length; i += 2) {
        out.push(String.fromCharCode(
            (bytes[i] << 8) | (bytes[i + 1] ?? 0)
        ));
    }

    let code2 =
        (hasPercent ? 1 : 0) |
        (hasPunycode ? 2 : 0) |
        (hasQuery ? 4 : 0) |
        (hasFragment ? 8 : 0);

    let repeatAfter = false;
    [out, repeatAfter,] = processOutput(out.join(''), true);

    const res =
        charCode(
            cryptCharCode(
                8,
                false,
                repeatBefore,
                repeatAfter,
                beginId,
                code2,
                odd,
                code3
            )
        ) + out;

    if (!(await validate(res, originalInput))) return null;
    return res;
}

/*
 * Segmentation
 */
async function S(context) {
    const {str, code3, repeatBefore, beginId, opts, originalInput} = context;

    const segs = segments(str);

    if (segs.length < 2) return null;

    const out = [segs.length - 2 < 15 ? '' : String.fromCharCode(segs.length - 2)];

    for (const seg of segs) {
        const segOpts = {
            ...opts,
            segmentation: false,
            depth: opts.depth + 1
        };
        const compressed = await compress$1(seg, segOpts);

        out.push(String.fromCharCode(seg.length));
        out.push(compressed);
    }

    const res =
        charCode(
            cryptCharCode(
                9,
                false,
                repeatBefore,
                opts.justc,
                beginId,
                Math.min(segs.length - 2, 15),
                opts.recursivecompression,
                code3
            )
        ) + out.join('');

    if (!(await validate(res, originalInput))) return null;
    return res;
}

/*
 * String Repetition
 */
async function SR(context) {
    const {str, code3, repeatBefore, beginId, originalInput} = context;

    const rcheck = str.match(/^(.{1,7}?)(?:\1)+$/);
    if (!rcheck) return null;

    const main = rcheck[1];
    const count = str.length / main.length;
    if (Math.floor(count) != count || count < 1 || count > 65535 + 15) return null;
    let [out, repeatAfter, seq] = ['', false, false];
    [out, repeatAfter, seq] = processOutput(main);

    const res =
        charCode(
            cryptCharCode(
                10,
                false,
                repeatBefore,
                repeatAfter,
                beginId,
                Math.min(count - 1, 15),
                seq,
                code3
            )
        ) + (
            (count - 1) > 14 ? String.fromCharCode(count - 15) : ''
        ) + out;

    if (!(await validate(res, originalInput))) return null;
    return res;
}

/**
 * Emoji Packing
 */
async function EP(context) {
    const {str, code3, repeatBefore, beginId, originalInput} = context;

    const graphemes = splitGraphemes(str);
    function isEmojiCluster(cluster) {
        const code = cluster.codePointAt(0);
        return (code >= 0x1F300 && code <= 0x1FAFF);
    }
    
    if (!graphemes.every(isEmojiCluster)) return null;

    const base = 0x1F300;
    const bits = [];

    for (const g of graphemes) {
        const cps = Array.from(g).map(c => c.codePointAt(0));
        bits.push(decToBin(cps.length, 3));
        for (const cp of cps) {
            bits.push(decToBin(cp - base, 11));
        }
    }

    const out = [];
    for (const chunk of stringChunks$1(bits.join(''), 16)) {
        out.push(String.fromCharCode(binToDec(chunk.padEnd(16,'0'))));
    }

    const [outPostprocessed, repeatAfter, seq] = processOutput(out.join(''));

    function hchar(ra = false, sq = false) {
        return cryptCharCode(11, false, repeatBefore, ra, beginId, 0, sq, code3);
    }
    const resA = charCode(hchar(repeatAfter, seq)) + outPostprocessed;
    const resB = charCode(hchar()) + out;

    if (await validate(resA, originalInput)) return resA;
    if (await validate(resB, originalInput)) return resB;
    return null;
}

/**
 * Base-64 Packing
 */
async function B64P(context) {
    const {str, code3, repeatBefore, beginId, opts, originalInput} = context;

    if (!(/^[0-9a-zA-Z+/]+$/.test(str) && opts.base64packing)) return null;
    
    const { data, length } = compressB64(str);

    let len = '';
    if (length > 14) {
        const lng = length - 15;
        if (lng > 0xFFFF) return null;
        len = String.fromCharCode(lng);
    }

    const res = charCode(cryptCharCode(12, false, repeatBefore, false, beginId, Math.min(length, 15), false, code3)) + len + data;
    if (await validate(res, originalInput)) return res;
    return null;
}

/* 
 * Offset Encoding
 */
async function OE(context) {
    const {originalInput, opts} = context;
    if (!opts.offsetencoding) return null;

    const enc = offsetEncoding(originalInput);
    const res = enc[1] + await compress$1(enc[0], {
        ...opts,
        offsetencoding: false,
        depth: opts.depth + 1
    });
    if (await validateOffsetEncoding(res, originalInput, enc[2])) return res;
    return null;
}

/*
 * lz-string
 */
async function LZS(context) {
    const {str, code3, repeatBefore, beginId, opts, originalInput} = context;
    if (!opts.lzstring) return null;
    const res = charCode(cryptCharCode(11, false, repeatBefore, false, beginId, 2, false, code3)) + cLZ(str);
    if (await validate(res, originalInput)) return res;
    return null;
}

/*
 * Adaptive XOR
 */
async function AXOR(context) {
    const {str, code3, repeatBefore, beginId, originalInput} = context;
    const [compressed, mode] = compress$2(str);
    const res = charCode(cryptCharCode(13, false, repeatBefore, false, beginId, mode, false, code3)) + compressed;
    if (await validate(res, originalInput)) return res;
    return null;
}

let customWorkerURL = null;

if ((String.fromCharCode(65536).charCodeAt(0) === 65536) || !(String.fromCharCode(256).charCodeAt(0) === 256)) {
    throw new Error(prefix+'Supported UTF-16 only!')
}

var _import = {exports: {}};

const __dirname$2 = path.dirname(fileURLToPath(import.meta.url));
const uiDir = path.resolve(__dirname$2, "./ui");
const confirmPs1 = path.resolve(uiDir, "./confirm.ps1");
const welcomePs1 = path.resolve(uiDir, "./welcome.ps1");
const compresPs1 = path.resolve(uiDir, "./compress.ps1");

function confirm(title, text, repo, site) {
    try {
        const lines = text.replace(/`/g, '``').replace(/\$/g, '`$').replace(/"/g, '\\"').split(/(\n\n|\n)/g).filter(a=>a&&a!='\n'&&a!='\n\n');
        
        const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${confirmPs1}" -Title "${title}" ${
            (()=>{
                let out = [];
                let id = 1;
                for (const line of lines) {
                    out.push(`-Line${id++} "${line}"`);
                }
                return out.join(' ');
            })()
        } -Repo "${repo}" -Site "${site}"`;
        
        const result = execSync(cmd).toString().trim();
        return result === 'True';
    } catch (e) {
        return false;
    }
}

function welcome(title, text, repo, site) {
    try {
        const lines = text.replace(/`/g, '``').replace(/\$/g, '`$').replace(/"/g, '\\"').split(/(\n\n|\n)/g).filter(a=>a&&a!='\n'&&a!='\n\n');
        
        const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${welcomePs1}" -Title "${title}" ${
            (()=>{
                let out = [];
                let id = 1;
                for (const line of lines) {
                    out.push(`-Line${id++} "${line}"`);
                }
                return out.join(' ');
            })()
        } -Repo "${repo}" -Site "${site}"`;
        
        const result = execSync(cmd).toString().trim();
        return result === 'True';
    } catch (e) {
        return false;
    }
}

function compress(title, name, icon, config) {
    try {
        const cd = {
            1: config.JUSTC,
            2: config.recursiveCompression,
            3: config.segmentation,
            4: config.base64IntegerEncoding,
            5: config.base64Packing,
            6: config.offsetEncoding,
            7: config.lzstring,
        };

        const cmd = `pwsh -ExecutionPolicy Bypass -File "${compresPs1}" ` +
                    `-IconPath "${icon}" ` +
                    `-CheckDefault1 ${cd[1] ? 1 : 0} ` +
                    `-Title "${title}" ` +
                    `-FileName "${name}" ` +
                    `-CheckDefault2 ${cd[2] ? 1 : 0} ` +
                    `-CheckDefault3 ${cd[3] ? 1 : 0} ` +
                    `-CheckDefault4 ${cd[4] ? 1 : 0} ` +
                    `-CheckDefault5 ${cd[5] ? 1 : 0} ` +
                    `-CheckDefault6 ${cd[6] ? 1 : 0} ` +
                    `-CheckDefault7 ${cd[7] ? 1 : 0}`;

        const stdout = execSync(cmd).toString();
        
        if (stdout) {
            const result = JSON.parse(stdout.trim());
            return [true, result];
        }
    } catch {
        return [false, null];
    }
}

var ui = /*#__PURE__*/Object.freeze({
  __proto__: null,
  compress: compress,
  confirm: confirm,
  welcome: welcome
});

var require$$0 = /*@__PURE__*/getAugmentedNamespace(ui);

function message(title, message, icon = 'Error') {
    const psCommand = `powershell -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('${message}', '${title}', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::${icon})"`;
    
    try {
        execSync(psCommand);
    } catch (error) {
        console.error(error);
    }
}

var message$1 = /*#__PURE__*/Object.freeze({
  __proto__: null,
  message: message
});

var require$$1 = /*@__PURE__*/getAugmentedNamespace(message$1);

var hasRequired_import;

function require_import () {
	if (hasRequired_import) return _import.exports;
	hasRequired_import = 1;
	if (process.platform !== "win32") _import.exports = {
	    compress: () => {},
	    message : () => {}
	}; else {
	    const { compress } = require$$0;
	    const { message } = require$$1;

	    _import.exports = {
	        compress,
	        message
	    };
	}
	return _import.exports;
}

var _importExports = require_import();

var re = {exports: {}};

var constants;
var hasRequiredConstants;

function requireConstants () {
	if (hasRequiredConstants) return constants;
	hasRequiredConstants = 1;

	// Note: this is the semver.org version of the spec that it implements
	// Not necessarily the package version of this code.
	const SEMVER_SPEC_VERSION = '2.0.0';

	const MAX_LENGTH = 256;
	const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER ||
	/* istanbul ignore next */ 9007199254740991;

	// Max safe segment length for coercion.
	const MAX_SAFE_COMPONENT_LENGTH = 16;

	// Max safe length for a build identifier. The max length minus 6 characters for
	// the shortest version with a build 0.0.0+BUILD.
	const MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;

	const RELEASE_TYPES = [
	  'major',
	  'premajor',
	  'minor',
	  'preminor',
	  'patch',
	  'prepatch',
	  'prerelease',
	];

	constants = {
	  MAX_LENGTH,
	  MAX_SAFE_COMPONENT_LENGTH,
	  MAX_SAFE_BUILD_LENGTH,
	  MAX_SAFE_INTEGER,
	  RELEASE_TYPES,
	  SEMVER_SPEC_VERSION,
	  FLAG_INCLUDE_PRERELEASE: 0b001,
	  FLAG_LOOSE: 0b010,
	};
	return constants;
}

var debug_1;
var hasRequiredDebug;

function requireDebug () {
	if (hasRequiredDebug) return debug_1;
	hasRequiredDebug = 1;

	const debug = (
	  typeof process === 'object' &&
	  process.env &&
	  process.env.NODE_DEBUG &&
	  /\bsemver\b/i.test(process.env.NODE_DEBUG)
	) ? (...args) => console.error('SEMVER', ...args)
	  : () => {};

	debug_1 = debug;
	return debug_1;
}

var hasRequiredRe;

function requireRe () {
	if (hasRequiredRe) return re.exports;
	hasRequiredRe = 1;
	(function (module, exports$1) {

		const {
		  MAX_SAFE_COMPONENT_LENGTH,
		  MAX_SAFE_BUILD_LENGTH,
		  MAX_LENGTH,
		} = requireConstants();
		const debug = requireDebug();
		exports$1 = module.exports = {};

		// The actual regexps go on exports.re
		const re = exports$1.re = [];
		const safeRe = exports$1.safeRe = [];
		const src = exports$1.src = [];
		const safeSrc = exports$1.safeSrc = [];
		const t = exports$1.t = {};
		let R = 0;

		const LETTERDASHNUMBER = '[a-zA-Z0-9-]';

		// Replace some greedy regex tokens to prevent regex dos issues. These regex are
		// used internally via the safeRe object since all inputs in this library get
		// normalized first to trim and collapse all extra whitespace. The original
		// regexes are exported for userland consumption and lower level usage. A
		// future breaking change could export the safer regex only with a note that
		// all input should have extra whitespace removed.
		const safeRegexReplacements = [
		  ['\\s', 1],
		  ['\\d', MAX_LENGTH],
		  [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH],
		];

		const makeSafeRegex = (value) => {
		  for (const [token, max] of safeRegexReplacements) {
		    value = value
		      .split(`${token}*`).join(`${token}{0,${max}}`)
		      .split(`${token}+`).join(`${token}{1,${max}}`);
		  }
		  return value
		};

		const createToken = (name, value, isGlobal) => {
		  const safe = makeSafeRegex(value);
		  const index = R++;
		  debug(name, index, value);
		  t[name] = index;
		  src[index] = value;
		  safeSrc[index] = safe;
		  re[index] = new RegExp(value, isGlobal ? 'g' : undefined);
		  safeRe[index] = new RegExp(safe, isGlobal ? 'g' : undefined);
		};

		// The following Regular Expressions can be used for tokenizing,
		// validating, and parsing SemVer version strings.

		// ## Numeric Identifier
		// A single `0`, or a non-zero digit followed by zero or more digits.

		createToken('NUMERICIDENTIFIER', '0|[1-9]\\d*');
		createToken('NUMERICIDENTIFIERLOOSE', '\\d+');

		// ## Non-numeric Identifier
		// Zero or more digits, followed by a letter or hyphen, and then zero or
		// more letters, digits, or hyphens.

		createToken('NONNUMERICIDENTIFIER', `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);

		// ## Main Version
		// Three dot-separated numeric identifiers.

		createToken('MAINVERSION', `(${src[t.NUMERICIDENTIFIER]})\\.` +
		                   `(${src[t.NUMERICIDENTIFIER]})\\.` +
		                   `(${src[t.NUMERICIDENTIFIER]})`);

		createToken('MAINVERSIONLOOSE', `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` +
		                        `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.` +
		                        `(${src[t.NUMERICIDENTIFIERLOOSE]})`);

		// ## Pre-release Version Identifier
		// A numeric identifier, or a non-numeric identifier.
		// Non-numeric identifiers include numeric identifiers but can be longer.
		// Therefore non-numeric identifiers must go first.

		createToken('PRERELEASEIDENTIFIER', `(?:${src[t.NONNUMERICIDENTIFIER]
		}|${src[t.NUMERICIDENTIFIER]})`);

		createToken('PRERELEASEIDENTIFIERLOOSE', `(?:${src[t.NONNUMERICIDENTIFIER]
		}|${src[t.NUMERICIDENTIFIERLOOSE]})`);

		// ## Pre-release Version
		// Hyphen, followed by one or more dot-separated pre-release version
		// identifiers.

		createToken('PRERELEASE', `(?:-(${src[t.PRERELEASEIDENTIFIER]
		}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);

		createToken('PRERELEASELOOSE', `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]
		}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);

		// ## Build Metadata Identifier
		// Any combination of digits, letters, or hyphens.

		createToken('BUILDIDENTIFIER', `${LETTERDASHNUMBER}+`);

		// ## Build Metadata
		// Plus sign, followed by one or more period-separated build metadata
		// identifiers.

		createToken('BUILD', `(?:\\+(${src[t.BUILDIDENTIFIER]
		}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);

		// ## Full Version String
		// A main version, followed optionally by a pre-release version and
		// build metadata.

		// Note that the only major, minor, patch, and pre-release sections of
		// the version string are capturing groups.  The build metadata is not a
		// capturing group, because it should not ever be used in version
		// comparison.

		createToken('FULLPLAIN', `v?${src[t.MAINVERSION]
		}${src[t.PRERELEASE]}?${
		  src[t.BUILD]}?`);

		createToken('FULL', `^${src[t.FULLPLAIN]}$`);

		// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
		// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
		// common in the npm registry.
		createToken('LOOSEPLAIN', `[v=\\s]*${src[t.MAINVERSIONLOOSE]
		}${src[t.PRERELEASELOOSE]}?${
		  src[t.BUILD]}?`);

		createToken('LOOSE', `^${src[t.LOOSEPLAIN]}$`);

		createToken('GTLT', '((?:<|>)?=?)');

		// Something like "2.*" or "1.2.x".
		// Note that "x.x" is a valid xRange identifer, meaning "any version"
		// Only the first item is strictly required.
		createToken('XRANGEIDENTIFIERLOOSE', `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
		createToken('XRANGEIDENTIFIER', `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);

		createToken('XRANGEPLAIN', `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})` +
		                   `(?:\\.(${src[t.XRANGEIDENTIFIER]})` +
		                   `(?:\\.(${src[t.XRANGEIDENTIFIER]})` +
		                   `(?:${src[t.PRERELEASE]})?${
		                     src[t.BUILD]}?` +
		                   `)?)?`);

		createToken('XRANGEPLAINLOOSE', `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})` +
		                        `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` +
		                        `(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})` +
		                        `(?:${src[t.PRERELEASELOOSE]})?${
		                          src[t.BUILD]}?` +
		                        `)?)?`);

		createToken('XRANGE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
		createToken('XRANGELOOSE', `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);

		// Coercion.
		// Extract anything that could conceivably be a part of a valid semver
		createToken('COERCEPLAIN', `${'(^|[^\\d])' +
		              '(\\d{1,'}${MAX_SAFE_COMPONENT_LENGTH}})` +
		              `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?` +
		              `(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
		createToken('COERCE', `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
		createToken('COERCEFULL', src[t.COERCEPLAIN] +
		              `(?:${src[t.PRERELEASE]})?` +
		              `(?:${src[t.BUILD]})?` +
		              `(?:$|[^\\d])`);
		createToken('COERCERTL', src[t.COERCE], true);
		createToken('COERCERTLFULL', src[t.COERCEFULL], true);

		// Tilde ranges.
		// Meaning is "reasonably at or greater than"
		createToken('LONETILDE', '(?:~>?)');

		createToken('TILDETRIM', `(\\s*)${src[t.LONETILDE]}\\s+`, true);
		exports$1.tildeTrimReplace = '$1~';

		createToken('TILDE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
		createToken('TILDELOOSE', `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);

		// Caret ranges.
		// Meaning is "at least and backwards compatible with"
		createToken('LONECARET', '(?:\\^)');

		createToken('CARETTRIM', `(\\s*)${src[t.LONECARET]}\\s+`, true);
		exports$1.caretTrimReplace = '$1^';

		createToken('CARET', `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
		createToken('CARETLOOSE', `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);

		// A simple gt/lt/eq thing, or just "" to indicate "any version"
		createToken('COMPARATORLOOSE', `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
		createToken('COMPARATOR', `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);

		// An expression to strip any whitespace between the gtlt and the thing
		// it modifies, so that `> 1.2.3` ==> `>1.2.3`
		createToken('COMPARATORTRIM', `(\\s*)${src[t.GTLT]
		}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
		exports$1.comparatorTrimReplace = '$1$2$3';

		// Something like `1.2.3 - 1.2.4`
		// Note that these all use the loose form, because they'll be
		// checked against either the strict or loose comparator form
		// later.
		createToken('HYPHENRANGE', `^\\s*(${src[t.XRANGEPLAIN]})` +
		                   `\\s+-\\s+` +
		                   `(${src[t.XRANGEPLAIN]})` +
		                   `\\s*$`);

		createToken('HYPHENRANGELOOSE', `^\\s*(${src[t.XRANGEPLAINLOOSE]})` +
		                        `\\s+-\\s+` +
		                        `(${src[t.XRANGEPLAINLOOSE]})` +
		                        `\\s*$`);

		// Star ranges basically just allow anything at all.
		createToken('STAR', '(<|>)?=?\\s*\\*');
		// >=0.0.0 is like a star
		createToken('GTE0', '^\\s*>=\\s*0\\.0\\.0\\s*$');
		createToken('GTE0PRE', '^\\s*>=\\s*0\\.0\\.0-0\\s*$'); 
	} (re, re.exports));
	return re.exports;
}

var parseOptions_1;
var hasRequiredParseOptions;

function requireParseOptions () {
	if (hasRequiredParseOptions) return parseOptions_1;
	hasRequiredParseOptions = 1;

	// parse out just the options we care about
	const looseOption = Object.freeze({ loose: true });
	const emptyOpts = Object.freeze({ });
	const parseOptions = options => {
	  if (!options) {
	    return emptyOpts
	  }

	  if (typeof options !== 'object') {
	    return looseOption
	  }

	  return options
	};
	parseOptions_1 = parseOptions;
	return parseOptions_1;
}

var identifiers;
var hasRequiredIdentifiers;

function requireIdentifiers () {
	if (hasRequiredIdentifiers) return identifiers;
	hasRequiredIdentifiers = 1;

	const numeric = /^[0-9]+$/;
	const compareIdentifiers = (a, b) => {
	  if (typeof a === 'number' && typeof b === 'number') {
	    return a === b ? 0 : a < b ? -1 : 1
	  }

	  const anum = numeric.test(a);
	  const bnum = numeric.test(b);

	  if (anum && bnum) {
	    a = +a;
	    b = +b;
	  }

	  return a === b ? 0
	    : (anum && !bnum) ? -1
	    : (bnum && !anum) ? 1
	    : a < b ? -1
	    : 1
	};

	const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);

	identifiers = {
	  compareIdentifiers,
	  rcompareIdentifiers,
	};
	return identifiers;
}

var semver$2;
var hasRequiredSemver$1;

function requireSemver$1 () {
	if (hasRequiredSemver$1) return semver$2;
	hasRequiredSemver$1 = 1;

	const debug = requireDebug();
	const { MAX_LENGTH, MAX_SAFE_INTEGER } = requireConstants();
	const { safeRe: re, t } = requireRe();

	const parseOptions = requireParseOptions();
	const { compareIdentifiers } = requireIdentifiers();
	class SemVer {
	  constructor (version, options) {
	    options = parseOptions(options);

	    if (version instanceof SemVer) {
	      if (version.loose === !!options.loose &&
	        version.includePrerelease === !!options.includePrerelease) {
	        return version
	      } else {
	        version = version.version;
	      }
	    } else if (typeof version !== 'string') {
	      throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`)
	    }

	    if (version.length > MAX_LENGTH) {
	      throw new TypeError(
	        `version is longer than ${MAX_LENGTH} characters`
	      )
	    }

	    debug('SemVer', version, options);
	    this.options = options;
	    this.loose = !!options.loose;
	    // this isn't actually relevant for versions, but keep it so that we
	    // don't run into trouble passing this.options around.
	    this.includePrerelease = !!options.includePrerelease;

	    const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);

	    if (!m) {
	      throw new TypeError(`Invalid Version: ${version}`)
	    }

	    this.raw = version;

	    // these are actually numbers
	    this.major = +m[1];
	    this.minor = +m[2];
	    this.patch = +m[3];

	    if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
	      throw new TypeError('Invalid major version')
	    }

	    if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
	      throw new TypeError('Invalid minor version')
	    }

	    if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
	      throw new TypeError('Invalid patch version')
	    }

	    // numberify any prerelease numeric ids
	    if (!m[4]) {
	      this.prerelease = [];
	    } else {
	      this.prerelease = m[4].split('.').map((id) => {
	        if (/^[0-9]+$/.test(id)) {
	          const num = +id;
	          if (num >= 0 && num < MAX_SAFE_INTEGER) {
	            return num
	          }
	        }
	        return id
	      });
	    }

	    this.build = m[5] ? m[5].split('.') : [];
	    this.format();
	  }

	  format () {
	    this.version = `${this.major}.${this.minor}.${this.patch}`;
	    if (this.prerelease.length) {
	      this.version += `-${this.prerelease.join('.')}`;
	    }
	    return this.version
	  }

	  toString () {
	    return this.version
	  }

	  compare (other) {
	    debug('SemVer.compare', this.version, this.options, other);
	    if (!(other instanceof SemVer)) {
	      if (typeof other === 'string' && other === this.version) {
	        return 0
	      }
	      other = new SemVer(other, this.options);
	    }

	    if (other.version === this.version) {
	      return 0
	    }

	    return this.compareMain(other) || this.comparePre(other)
	  }

	  compareMain (other) {
	    if (!(other instanceof SemVer)) {
	      other = new SemVer(other, this.options);
	    }

	    if (this.major < other.major) {
	      return -1
	    }
	    if (this.major > other.major) {
	      return 1
	    }
	    if (this.minor < other.minor) {
	      return -1
	    }
	    if (this.minor > other.minor) {
	      return 1
	    }
	    if (this.patch < other.patch) {
	      return -1
	    }
	    if (this.patch > other.patch) {
	      return 1
	    }
	    return 0
	  }

	  comparePre (other) {
	    if (!(other instanceof SemVer)) {
	      other = new SemVer(other, this.options);
	    }

	    // NOT having a prerelease is > having one
	    if (this.prerelease.length && !other.prerelease.length) {
	      return -1
	    } else if (!this.prerelease.length && other.prerelease.length) {
	      return 1
	    } else if (!this.prerelease.length && !other.prerelease.length) {
	      return 0
	    }

	    let i = 0;
	    do {
	      const a = this.prerelease[i];
	      const b = other.prerelease[i];
	      debug('prerelease compare', i, a, b);
	      if (a === undefined && b === undefined) {
	        return 0
	      } else if (b === undefined) {
	        return 1
	      } else if (a === undefined) {
	        return -1
	      } else if (a === b) {
	        continue
	      } else {
	        return compareIdentifiers(a, b)
	      }
	    } while (++i)
	  }

	  compareBuild (other) {
	    if (!(other instanceof SemVer)) {
	      other = new SemVer(other, this.options);
	    }

	    let i = 0;
	    do {
	      const a = this.build[i];
	      const b = other.build[i];
	      debug('build compare', i, a, b);
	      if (a === undefined && b === undefined) {
	        return 0
	      } else if (b === undefined) {
	        return 1
	      } else if (a === undefined) {
	        return -1
	      } else if (a === b) {
	        continue
	      } else {
	        return compareIdentifiers(a, b)
	      }
	    } while (++i)
	  }

	  // preminor will bump the version up to the next minor release, and immediately
	  // down to pre-release. premajor and prepatch work the same way.
	  inc (release, identifier, identifierBase) {
	    if (release.startsWith('pre')) {
	      if (!identifier && identifierBase === false) {
	        throw new Error('invalid increment argument: identifier is empty')
	      }
	      // Avoid an invalid semver results
	      if (identifier) {
	        const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
	        if (!match || match[1] !== identifier) {
	          throw new Error(`invalid identifier: ${identifier}`)
	        }
	      }
	    }

	    switch (release) {
	      case 'premajor':
	        this.prerelease.length = 0;
	        this.patch = 0;
	        this.minor = 0;
	        this.major++;
	        this.inc('pre', identifier, identifierBase);
	        break
	      case 'preminor':
	        this.prerelease.length = 0;
	        this.patch = 0;
	        this.minor++;
	        this.inc('pre', identifier, identifierBase);
	        break
	      case 'prepatch':
	        // If this is already a prerelease, it will bump to the next version
	        // drop any prereleases that might already exist, since they are not
	        // relevant at this point.
	        this.prerelease.length = 0;
	        this.inc('patch', identifier, identifierBase);
	        this.inc('pre', identifier, identifierBase);
	        break
	      // If the input is a non-prerelease version, this acts the same as
	      // prepatch.
	      case 'prerelease':
	        if (this.prerelease.length === 0) {
	          this.inc('patch', identifier, identifierBase);
	        }
	        this.inc('pre', identifier, identifierBase);
	        break
	      case 'release':
	        if (this.prerelease.length === 0) {
	          throw new Error(`version ${this.raw} is not a prerelease`)
	        }
	        this.prerelease.length = 0;
	        break

	      case 'major':
	        // If this is a pre-major version, bump up to the same major version.
	        // Otherwise increment major.
	        // 1.0.0-5 bumps to 1.0.0
	        // 1.1.0 bumps to 2.0.0
	        if (
	          this.minor !== 0 ||
	          this.patch !== 0 ||
	          this.prerelease.length === 0
	        ) {
	          this.major++;
	        }
	        this.minor = 0;
	        this.patch = 0;
	        this.prerelease = [];
	        break
	      case 'minor':
	        // If this is a pre-minor version, bump up to the same minor version.
	        // Otherwise increment minor.
	        // 1.2.0-5 bumps to 1.2.0
	        // 1.2.1 bumps to 1.3.0
	        if (this.patch !== 0 || this.prerelease.length === 0) {
	          this.minor++;
	        }
	        this.patch = 0;
	        this.prerelease = [];
	        break
	      case 'patch':
	        // If this is not a pre-release version, it will increment the patch.
	        // If it is a pre-release it will bump up to the same patch version.
	        // 1.2.0-5 patches to 1.2.0
	        // 1.2.0 patches to 1.2.1
	        if (this.prerelease.length === 0) {
	          this.patch++;
	        }
	        this.prerelease = [];
	        break
	      // This probably shouldn't be used publicly.
	      // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
	      case 'pre': {
	        const base = Number(identifierBase) ? 1 : 0;

	        if (this.prerelease.length === 0) {
	          this.prerelease = [base];
	        } else {
	          let i = this.prerelease.length;
	          while (--i >= 0) {
	            if (typeof this.prerelease[i] === 'number') {
	              this.prerelease[i]++;
	              i = -2;
	            }
	          }
	          if (i === -1) {
	            // didn't increment anything
	            if (identifier === this.prerelease.join('.') && identifierBase === false) {
	              throw new Error('invalid increment argument: identifier already exists')
	            }
	            this.prerelease.push(base);
	          }
	        }
	        if (identifier) {
	          // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
	          // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
	          let prerelease = [identifier, base];
	          if (identifierBase === false) {
	            prerelease = [identifier];
	          }
	          if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
	            if (isNaN(this.prerelease[1])) {
	              this.prerelease = prerelease;
	            }
	          } else {
	            this.prerelease = prerelease;
	          }
	        }
	        break
	      }
	      default:
	        throw new Error(`invalid increment argument: ${release}`)
	    }
	    this.raw = this.format();
	    if (this.build.length) {
	      this.raw += `+${this.build.join('.')}`;
	    }
	    return this
	  }
	}

	semver$2 = SemVer;
	return semver$2;
}

var parse_1;
var hasRequiredParse;

function requireParse () {
	if (hasRequiredParse) return parse_1;
	hasRequiredParse = 1;

	const SemVer = requireSemver$1();
	const parse = (version, options, throwErrors = false) => {
	  if (version instanceof SemVer) {
	    return version
	  }
	  try {
	    return new SemVer(version, options)
	  } catch (er) {
	    if (!throwErrors) {
	      return null
	    }
	    throw er
	  }
	};

	parse_1 = parse;
	return parse_1;
}

var valid_1;
var hasRequiredValid$1;

function requireValid$1 () {
	if (hasRequiredValid$1) return valid_1;
	hasRequiredValid$1 = 1;

	const parse = requireParse();
	const valid = (version, options) => {
	  const v = parse(version, options);
	  return v ? v.version : null
	};
	valid_1 = valid;
	return valid_1;
}

var clean_1;
var hasRequiredClean;

function requireClean () {
	if (hasRequiredClean) return clean_1;
	hasRequiredClean = 1;

	const parse = requireParse();
	const clean = (version, options) => {
	  const s = parse(version.trim().replace(/^[=v]+/, ''), options);
	  return s ? s.version : null
	};
	clean_1 = clean;
	return clean_1;
}

var inc_1;
var hasRequiredInc;

function requireInc () {
	if (hasRequiredInc) return inc_1;
	hasRequiredInc = 1;

	const SemVer = requireSemver$1();

	const inc = (version, release, options, identifier, identifierBase) => {
	  if (typeof (options) === 'string') {
	    identifierBase = identifier;
	    identifier = options;
	    options = undefined;
	  }

	  try {
	    return new SemVer(
	      version instanceof SemVer ? version.version : version,
	      options
	    ).inc(release, identifier, identifierBase).version
	  } catch (er) {
	    return null
	  }
	};
	inc_1 = inc;
	return inc_1;
}

var diff_1;
var hasRequiredDiff;

function requireDiff () {
	if (hasRequiredDiff) return diff_1;
	hasRequiredDiff = 1;

	const parse = requireParse();

	const diff = (version1, version2) => {
	  const v1 = parse(version1, null, true);
	  const v2 = parse(version2, null, true);
	  const comparison = v1.compare(v2);

	  if (comparison === 0) {
	    return null
	  }

	  const v1Higher = comparison > 0;
	  const highVersion = v1Higher ? v1 : v2;
	  const lowVersion = v1Higher ? v2 : v1;
	  const highHasPre = !!highVersion.prerelease.length;
	  const lowHasPre = !!lowVersion.prerelease.length;

	  if (lowHasPre && !highHasPre) {
	    // Going from prerelease -> no prerelease requires some special casing

	    // If the low version has only a major, then it will always be a major
	    // Some examples:
	    // 1.0.0-1 -> 1.0.0
	    // 1.0.0-1 -> 1.1.1
	    // 1.0.0-1 -> 2.0.0
	    if (!lowVersion.patch && !lowVersion.minor) {
	      return 'major'
	    }

	    // If the main part has no difference
	    if (lowVersion.compareMain(highVersion) === 0) {
	      if (lowVersion.minor && !lowVersion.patch) {
	        return 'minor'
	      }
	      return 'patch'
	    }
	  }

	  // add the `pre` prefix if we are going to a prerelease version
	  const prefix = highHasPre ? 'pre' : '';

	  if (v1.major !== v2.major) {
	    return prefix + 'major'
	  }

	  if (v1.minor !== v2.minor) {
	    return prefix + 'minor'
	  }

	  if (v1.patch !== v2.patch) {
	    return prefix + 'patch'
	  }

	  // high and low are prereleases
	  return 'prerelease'
	};

	diff_1 = diff;
	return diff_1;
}

var major_1;
var hasRequiredMajor;

function requireMajor () {
	if (hasRequiredMajor) return major_1;
	hasRequiredMajor = 1;

	const SemVer = requireSemver$1();
	const major = (a, loose) => new SemVer(a, loose).major;
	major_1 = major;
	return major_1;
}

var minor_1;
var hasRequiredMinor;

function requireMinor () {
	if (hasRequiredMinor) return minor_1;
	hasRequiredMinor = 1;

	const SemVer = requireSemver$1();
	const minor = (a, loose) => new SemVer(a, loose).minor;
	minor_1 = minor;
	return minor_1;
}

var patch_1;
var hasRequiredPatch;

function requirePatch () {
	if (hasRequiredPatch) return patch_1;
	hasRequiredPatch = 1;

	const SemVer = requireSemver$1();
	const patch = (a, loose) => new SemVer(a, loose).patch;
	patch_1 = patch;
	return patch_1;
}

var prerelease_1;
var hasRequiredPrerelease;

function requirePrerelease () {
	if (hasRequiredPrerelease) return prerelease_1;
	hasRequiredPrerelease = 1;

	const parse = requireParse();
	const prerelease = (version, options) => {
	  const parsed = parse(version, options);
	  return (parsed && parsed.prerelease.length) ? parsed.prerelease : null
	};
	prerelease_1 = prerelease;
	return prerelease_1;
}

var compare_1;
var hasRequiredCompare;

function requireCompare () {
	if (hasRequiredCompare) return compare_1;
	hasRequiredCompare = 1;

	const SemVer = requireSemver$1();
	const compare = (a, b, loose) =>
	  new SemVer(a, loose).compare(new SemVer(b, loose));

	compare_1 = compare;
	return compare_1;
}

var rcompare_1;
var hasRequiredRcompare;

function requireRcompare () {
	if (hasRequiredRcompare) return rcompare_1;
	hasRequiredRcompare = 1;

	const compare = requireCompare();
	const rcompare = (a, b, loose) => compare(b, a, loose);
	rcompare_1 = rcompare;
	return rcompare_1;
}

var compareLoose_1;
var hasRequiredCompareLoose;

function requireCompareLoose () {
	if (hasRequiredCompareLoose) return compareLoose_1;
	hasRequiredCompareLoose = 1;

	const compare = requireCompare();
	const compareLoose = (a, b) => compare(a, b, true);
	compareLoose_1 = compareLoose;
	return compareLoose_1;
}

var compareBuild_1;
var hasRequiredCompareBuild;

function requireCompareBuild () {
	if (hasRequiredCompareBuild) return compareBuild_1;
	hasRequiredCompareBuild = 1;

	const SemVer = requireSemver$1();
	const compareBuild = (a, b, loose) => {
	  const versionA = new SemVer(a, loose);
	  const versionB = new SemVer(b, loose);
	  return versionA.compare(versionB) || versionA.compareBuild(versionB)
	};
	compareBuild_1 = compareBuild;
	return compareBuild_1;
}

var sort_1;
var hasRequiredSort;

function requireSort () {
	if (hasRequiredSort) return sort_1;
	hasRequiredSort = 1;

	const compareBuild = requireCompareBuild();
	const sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
	sort_1 = sort;
	return sort_1;
}

var rsort_1;
var hasRequiredRsort;

function requireRsort () {
	if (hasRequiredRsort) return rsort_1;
	hasRequiredRsort = 1;

	const compareBuild = requireCompareBuild();
	const rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
	rsort_1 = rsort;
	return rsort_1;
}

var gt_1;
var hasRequiredGt;

function requireGt () {
	if (hasRequiredGt) return gt_1;
	hasRequiredGt = 1;

	const compare = requireCompare();
	const gt = (a, b, loose) => compare(a, b, loose) > 0;
	gt_1 = gt;
	return gt_1;
}

var lt_1;
var hasRequiredLt;

function requireLt () {
	if (hasRequiredLt) return lt_1;
	hasRequiredLt = 1;

	const compare = requireCompare();
	const lt = (a, b, loose) => compare(a, b, loose) < 0;
	lt_1 = lt;
	return lt_1;
}

var eq_1;
var hasRequiredEq;

function requireEq () {
	if (hasRequiredEq) return eq_1;
	hasRequiredEq = 1;

	const compare = requireCompare();
	const eq = (a, b, loose) => compare(a, b, loose) === 0;
	eq_1 = eq;
	return eq_1;
}

var neq_1;
var hasRequiredNeq;

function requireNeq () {
	if (hasRequiredNeq) return neq_1;
	hasRequiredNeq = 1;

	const compare = requireCompare();
	const neq = (a, b, loose) => compare(a, b, loose) !== 0;
	neq_1 = neq;
	return neq_1;
}

var gte_1;
var hasRequiredGte;

function requireGte () {
	if (hasRequiredGte) return gte_1;
	hasRequiredGte = 1;

	const compare = requireCompare();
	const gte = (a, b, loose) => compare(a, b, loose) >= 0;
	gte_1 = gte;
	return gte_1;
}

var lte_1;
var hasRequiredLte;

function requireLte () {
	if (hasRequiredLte) return lte_1;
	hasRequiredLte = 1;

	const compare = requireCompare();
	const lte = (a, b, loose) => compare(a, b, loose) <= 0;
	lte_1 = lte;
	return lte_1;
}

var cmp_1;
var hasRequiredCmp;

function requireCmp () {
	if (hasRequiredCmp) return cmp_1;
	hasRequiredCmp = 1;

	const eq = requireEq();
	const neq = requireNeq();
	const gt = requireGt();
	const gte = requireGte();
	const lt = requireLt();
	const lte = requireLte();

	const cmp = (a, op, b, loose) => {
	  switch (op) {
	    case '===':
	      if (typeof a === 'object') {
	        a = a.version;
	      }
	      if (typeof b === 'object') {
	        b = b.version;
	      }
	      return a === b

	    case '!==':
	      if (typeof a === 'object') {
	        a = a.version;
	      }
	      if (typeof b === 'object') {
	        b = b.version;
	      }
	      return a !== b

	    case '':
	    case '=':
	    case '==':
	      return eq(a, b, loose)

	    case '!=':
	      return neq(a, b, loose)

	    case '>':
	      return gt(a, b, loose)

	    case '>=':
	      return gte(a, b, loose)

	    case '<':
	      return lt(a, b, loose)

	    case '<=':
	      return lte(a, b, loose)

	    default:
	      throw new TypeError(`Invalid operator: ${op}`)
	  }
	};
	cmp_1 = cmp;
	return cmp_1;
}

var coerce_1;
var hasRequiredCoerce;

function requireCoerce () {
	if (hasRequiredCoerce) return coerce_1;
	hasRequiredCoerce = 1;

	const SemVer = requireSemver$1();
	const parse = requireParse();
	const { safeRe: re, t } = requireRe();

	const coerce = (version, options) => {
	  if (version instanceof SemVer) {
	    return version
	  }

	  if (typeof version === 'number') {
	    version = String(version);
	  }

	  if (typeof version !== 'string') {
	    return null
	  }

	  options = options || {};

	  let match = null;
	  if (!options.rtl) {
	    match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
	  } else {
	    // Find the right-most coercible string that does not share
	    // a terminus with a more left-ward coercible string.
	    // Eg, '1.2.3.4' wants to coerce '2.3.4', not '3.4' or '4'
	    // With includePrerelease option set, '1.2.3.4-rc' wants to coerce '2.3.4-rc', not '2.3.4'
	    //
	    // Walk through the string checking with a /g regexp
	    // Manually set the index so as to pick up overlapping matches.
	    // Stop when we get a match that ends at the string end, since no
	    // coercible string can be more right-ward without the same terminus.
	    const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
	    let next;
	    while ((next = coerceRtlRegex.exec(version)) &&
	        (!match || match.index + match[0].length !== version.length)
	    ) {
	      if (!match ||
	            next.index + next[0].length !== match.index + match[0].length) {
	        match = next;
	      }
	      coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
	    }
	    // leave it in a clean state
	    coerceRtlRegex.lastIndex = -1;
	  }

	  if (match === null) {
	    return null
	  }

	  const major = match[2];
	  const minor = match[3] || '0';
	  const patch = match[4] || '0';
	  const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : '';
	  const build = options.includePrerelease && match[6] ? `+${match[6]}` : '';

	  return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options)
	};
	coerce_1 = coerce;
	return coerce_1;
}

var lrucache;
var hasRequiredLrucache;

function requireLrucache () {
	if (hasRequiredLrucache) return lrucache;
	hasRequiredLrucache = 1;

	class LRUCache {
	  constructor () {
	    this.max = 1000;
	    this.map = new Map();
	  }

	  get (key) {
	    const value = this.map.get(key);
	    if (value === undefined) {
	      return undefined
	    } else {
	      // Remove the key from the map and add it to the end
	      this.map.delete(key);
	      this.map.set(key, value);
	      return value
	    }
	  }

	  delete (key) {
	    return this.map.delete(key)
	  }

	  set (key, value) {
	    const deleted = this.delete(key);

	    if (!deleted && value !== undefined) {
	      // If cache is full, delete the least recently used item
	      if (this.map.size >= this.max) {
	        const firstKey = this.map.keys().next().value;
	        this.delete(firstKey);
	      }

	      this.map.set(key, value);
	    }

	    return this
	  }
	}

	lrucache = LRUCache;
	return lrucache;
}

var range;
var hasRequiredRange;

function requireRange () {
	if (hasRequiredRange) return range;
	hasRequiredRange = 1;

	const SPACE_CHARACTERS = /\s+/g;

	// hoisted class for cyclic dependency
	class Range {
	  constructor (range, options) {
	    options = parseOptions(options);

	    if (range instanceof Range) {
	      if (
	        range.loose === !!options.loose &&
	        range.includePrerelease === !!options.includePrerelease
	      ) {
	        return range
	      } else {
	        return new Range(range.raw, options)
	      }
	    }

	    if (range instanceof Comparator) {
	      // just put it in the set and return
	      this.raw = range.value;
	      this.set = [[range]];
	      this.formatted = undefined;
	      return this
	    }

	    this.options = options;
	    this.loose = !!options.loose;
	    this.includePrerelease = !!options.includePrerelease;

	    // First reduce all whitespace as much as possible so we do not have to rely
	    // on potentially slow regexes like \s*. This is then stored and used for
	    // future error messages as well.
	    this.raw = range.trim().replace(SPACE_CHARACTERS, ' ');

	    // First, split on ||
	    this.set = this.raw
	      .split('||')
	      // map the range to a 2d array of comparators
	      .map(r => this.parseRange(r.trim()))
	      // throw out any comparator lists that are empty
	      // this generally means that it was not a valid range, which is allowed
	      // in loose mode, but will still throw if the WHOLE range is invalid.
	      .filter(c => c.length);

	    if (!this.set.length) {
	      throw new TypeError(`Invalid SemVer Range: ${this.raw}`)
	    }

	    // if we have any that are not the null set, throw out null sets.
	    if (this.set.length > 1) {
	      // keep the first one, in case they're all null sets
	      const first = this.set[0];
	      this.set = this.set.filter(c => !isNullSet(c[0]));
	      if (this.set.length === 0) {
	        this.set = [first];
	      } else if (this.set.length > 1) {
	        // if we have any that are *, then the range is just *
	        for (const c of this.set) {
	          if (c.length === 1 && isAny(c[0])) {
	            this.set = [c];
	            break
	          }
	        }
	      }
	    }

	    this.formatted = undefined;
	  }

	  get range () {
	    if (this.formatted === undefined) {
	      this.formatted = '';
	      for (let i = 0; i < this.set.length; i++) {
	        if (i > 0) {
	          this.formatted += '||';
	        }
	        const comps = this.set[i];
	        for (let k = 0; k < comps.length; k++) {
	          if (k > 0) {
	            this.formatted += ' ';
	          }
	          this.formatted += comps[k].toString().trim();
	        }
	      }
	    }
	    return this.formatted
	  }

	  format () {
	    return this.range
	  }

	  toString () {
	    return this.range
	  }

	  parseRange (range) {
	    // memoize range parsing for performance.
	    // this is a very hot path, and fully deterministic.
	    const memoOpts =
	      (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) |
	      (this.options.loose && FLAG_LOOSE);
	    const memoKey = memoOpts + ':' + range;
	    const cached = cache.get(memoKey);
	    if (cached) {
	      return cached
	    }

	    const loose = this.options.loose;
	    // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
	    const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
	    range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
	    debug('hyphen replace', range);

	    // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
	    range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
	    debug('comparator trim', range);

	    // `~ 1.2.3` => `~1.2.3`
	    range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
	    debug('tilde trim', range);

	    // `^ 1.2.3` => `^1.2.3`
	    range = range.replace(re[t.CARETTRIM], caretTrimReplace);
	    debug('caret trim', range);

	    // At this point, the range is completely trimmed and
	    // ready to be split into comparators.

	    let rangeList = range
	      .split(' ')
	      .map(comp => parseComparator(comp, this.options))
	      .join(' ')
	      .split(/\s+/)
	      // >=0.0.0 is equivalent to *
	      .map(comp => replaceGTE0(comp, this.options));

	    if (loose) {
	      // in loose mode, throw out any that are not valid comparators
	      rangeList = rangeList.filter(comp => {
	        debug('loose invalid filter', comp, this.options);
	        return !!comp.match(re[t.COMPARATORLOOSE])
	      });
	    }
	    debug('range list', rangeList);

	    // if any comparators are the null set, then replace with JUST null set
	    // if more than one comparator, remove any * comparators
	    // also, don't include the same comparator more than once
	    const rangeMap = new Map();
	    const comparators = rangeList.map(comp => new Comparator(comp, this.options));
	    for (const comp of comparators) {
	      if (isNullSet(comp)) {
	        return [comp]
	      }
	      rangeMap.set(comp.value, comp);
	    }
	    if (rangeMap.size > 1 && rangeMap.has('')) {
	      rangeMap.delete('');
	    }

	    const result = [...rangeMap.values()];
	    cache.set(memoKey, result);
	    return result
	  }

	  intersects (range, options) {
	    if (!(range instanceof Range)) {
	      throw new TypeError('a Range is required')
	    }

	    return this.set.some((thisComparators) => {
	      return (
	        isSatisfiable(thisComparators, options) &&
	        range.set.some((rangeComparators) => {
	          return (
	            isSatisfiable(rangeComparators, options) &&
	            thisComparators.every((thisComparator) => {
	              return rangeComparators.every((rangeComparator) => {
	                return thisComparator.intersects(rangeComparator, options)
	              })
	            })
	          )
	        })
	      )
	    })
	  }

	  // if ANY of the sets match ALL of its comparators, then pass
	  test (version) {
	    if (!version) {
	      return false
	    }

	    if (typeof version === 'string') {
	      try {
	        version = new SemVer(version, this.options);
	      } catch (er) {
	        return false
	      }
	    }

	    for (let i = 0; i < this.set.length; i++) {
	      if (testSet(this.set[i], version, this.options)) {
	        return true
	      }
	    }
	    return false
	  }
	}

	range = Range;

	const LRU = requireLrucache();
	const cache = new LRU();

	const parseOptions = requireParseOptions();
	const Comparator = requireComparator();
	const debug = requireDebug();
	const SemVer = requireSemver$1();
	const {
	  safeRe: re,
	  t,
	  comparatorTrimReplace,
	  tildeTrimReplace,
	  caretTrimReplace,
	} = requireRe();
	const { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = requireConstants();

	const isNullSet = c => c.value === '<0.0.0-0';
	const isAny = c => c.value === '';

	// take a set of comparators and determine whether there
	// exists a version which can satisfy it
	const isSatisfiable = (comparators, options) => {
	  let result = true;
	  const remainingComparators = comparators.slice();
	  let testComparator = remainingComparators.pop();

	  while (result && remainingComparators.length) {
	    result = remainingComparators.every((otherComparator) => {
	      return testComparator.intersects(otherComparator, options)
	    });

	    testComparator = remainingComparators.pop();
	  }

	  return result
	};

	// comprised of xranges, tildes, stars, and gtlt's at this point.
	// already replaced the hyphen ranges
	// turn into a set of JUST comparators.
	const parseComparator = (comp, options) => {
	  comp = comp.replace(re[t.BUILD], '');
	  debug('comp', comp, options);
	  comp = replaceCarets(comp, options);
	  debug('caret', comp);
	  comp = replaceTildes(comp, options);
	  debug('tildes', comp);
	  comp = replaceXRanges(comp, options);
	  debug('xrange', comp);
	  comp = replaceStars(comp, options);
	  debug('stars', comp);
	  return comp
	};

	const isX = id => !id || id.toLowerCase() === 'x' || id === '*';

	// ~, ~> --> * (any, kinda silly)
	// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0-0
	// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0-0
	// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0-0
	// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0-0
	// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0-0
	// ~0.0.1 --> >=0.0.1 <0.1.0-0
	const replaceTildes = (comp, options) => {
	  return comp
	    .trim()
	    .split(/\s+/)
	    .map((c) => replaceTilde(c, options))
	    .join(' ')
	};

	const replaceTilde = (comp, options) => {
	  const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
	  return comp.replace(r, (_, M, m, p, pr) => {
	    debug('tilde', comp, _, M, m, p, pr);
	    let ret;

	    if (isX(M)) {
	      ret = '';
	    } else if (isX(m)) {
	      ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
	    } else if (isX(p)) {
	      // ~1.2 == >=1.2.0 <1.3.0-0
	      ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
	    } else if (pr) {
	      debug('replaceTilde pr', pr);
	      ret = `>=${M}.${m}.${p}-${pr
	      } <${M}.${+m + 1}.0-0`;
	    } else {
	      // ~1.2.3 == >=1.2.3 <1.3.0-0
	      ret = `>=${M}.${m}.${p
	      } <${M}.${+m + 1}.0-0`;
	    }

	    debug('tilde return', ret);
	    return ret
	  })
	};

	// ^ --> * (any, kinda silly)
	// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0-0
	// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0-0
	// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0-0
	// ^1.2.3 --> >=1.2.3 <2.0.0-0
	// ^1.2.0 --> >=1.2.0 <2.0.0-0
	// ^0.0.1 --> >=0.0.1 <0.0.2-0
	// ^0.1.0 --> >=0.1.0 <0.2.0-0
	const replaceCarets = (comp, options) => {
	  return comp
	    .trim()
	    .split(/\s+/)
	    .map((c) => replaceCaret(c, options))
	    .join(' ')
	};

	const replaceCaret = (comp, options) => {
	  debug('caret', comp, options);
	  const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
	  const z = options.includePrerelease ? '-0' : '';
	  return comp.replace(r, (_, M, m, p, pr) => {
	    debug('caret', comp, _, M, m, p, pr);
	    let ret;

	    if (isX(M)) {
	      ret = '';
	    } else if (isX(m)) {
	      ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
	    } else if (isX(p)) {
	      if (M === '0') {
	        ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
	      } else {
	        ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
	      }
	    } else if (pr) {
	      debug('replaceCaret pr', pr);
	      if (M === '0') {
	        if (m === '0') {
	          ret = `>=${M}.${m}.${p}-${pr
	          } <${M}.${m}.${+p + 1}-0`;
	        } else {
	          ret = `>=${M}.${m}.${p}-${pr
	          } <${M}.${+m + 1}.0-0`;
	        }
	      } else {
	        ret = `>=${M}.${m}.${p}-${pr
	        } <${+M + 1}.0.0-0`;
	      }
	    } else {
	      debug('no pr');
	      if (M === '0') {
	        if (m === '0') {
	          ret = `>=${M}.${m}.${p
	          }${z} <${M}.${m}.${+p + 1}-0`;
	        } else {
	          ret = `>=${M}.${m}.${p
	          }${z} <${M}.${+m + 1}.0-0`;
	        }
	      } else {
	        ret = `>=${M}.${m}.${p
	        } <${+M + 1}.0.0-0`;
	      }
	    }

	    debug('caret return', ret);
	    return ret
	  })
	};

	const replaceXRanges = (comp, options) => {
	  debug('replaceXRanges', comp, options);
	  return comp
	    .split(/\s+/)
	    .map((c) => replaceXRange(c, options))
	    .join(' ')
	};

	const replaceXRange = (comp, options) => {
	  comp = comp.trim();
	  const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
	  return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
	    debug('xRange', comp, ret, gtlt, M, m, p, pr);
	    const xM = isX(M);
	    const xm = xM || isX(m);
	    const xp = xm || isX(p);
	    const anyX = xp;

	    if (gtlt === '=' && anyX) {
	      gtlt = '';
	    }

	    // if we're including prereleases in the match, then we need
	    // to fix this to -0, the lowest possible prerelease value
	    pr = options.includePrerelease ? '-0' : '';

	    if (xM) {
	      if (gtlt === '>' || gtlt === '<') {
	        // nothing is allowed
	        ret = '<0.0.0-0';
	      } else {
	        // nothing is forbidden
	        ret = '*';
	      }
	    } else if (gtlt && anyX) {
	      // we know patch is an x, because we have any x at all.
	      // replace X with 0
	      if (xm) {
	        m = 0;
	      }
	      p = 0;

	      if (gtlt === '>') {
	        // >1 => >=2.0.0
	        // >1.2 => >=1.3.0
	        gtlt = '>=';
	        if (xm) {
	          M = +M + 1;
	          m = 0;
	          p = 0;
	        } else {
	          m = +m + 1;
	          p = 0;
	        }
	      } else if (gtlt === '<=') {
	        // <=0.7.x is actually <0.8.0, since any 0.7.x should
	        // pass.  Similarly, <=7.x is actually <8.0.0, etc.
	        gtlt = '<';
	        if (xm) {
	          M = +M + 1;
	        } else {
	          m = +m + 1;
	        }
	      }

	      if (gtlt === '<') {
	        pr = '-0';
	      }

	      ret = `${gtlt + M}.${m}.${p}${pr}`;
	    } else if (xm) {
	      ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
	    } else if (xp) {
	      ret = `>=${M}.${m}.0${pr
	      } <${M}.${+m + 1}.0-0`;
	    }

	    debug('xRange return', ret);

	    return ret
	  })
	};

	// Because * is AND-ed with everything else in the comparator,
	// and '' means "any version", just remove the *s entirely.
	const replaceStars = (comp, options) => {
	  debug('replaceStars', comp, options);
	  // Looseness is ignored here.  star is always as loose as it gets!
	  return comp
	    .trim()
	    .replace(re[t.STAR], '')
	};

	const replaceGTE0 = (comp, options) => {
	  debug('replaceGTE0', comp, options);
	  return comp
	    .trim()
	    .replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], '')
	};

	// This function is passed to string.replace(re[t.HYPHENRANGE])
	// M, m, patch, prerelease, build
	// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
	// 1.2.3 - 3.4 => >=1.2.0 <3.5.0-0 Any 3.4.x will do
	// 1.2 - 3.4 => >=1.2.0 <3.5.0-0
	// TODO build?
	const hyphenReplace = incPr => ($0,
	  from, fM, fm, fp, fpr, fb,
	  to, tM, tm, tp, tpr) => {
	  if (isX(fM)) {
	    from = '';
	  } else if (isX(fm)) {
	    from = `>=${fM}.0.0${incPr ? '-0' : ''}`;
	  } else if (isX(fp)) {
	    from = `>=${fM}.${fm}.0${incPr ? '-0' : ''}`;
	  } else if (fpr) {
	    from = `>=${from}`;
	  } else {
	    from = `>=${from}${incPr ? '-0' : ''}`;
	  }

	  if (isX(tM)) {
	    to = '';
	  } else if (isX(tm)) {
	    to = `<${+tM + 1}.0.0-0`;
	  } else if (isX(tp)) {
	    to = `<${tM}.${+tm + 1}.0-0`;
	  } else if (tpr) {
	    to = `<=${tM}.${tm}.${tp}-${tpr}`;
	  } else if (incPr) {
	    to = `<${tM}.${tm}.${+tp + 1}-0`;
	  } else {
	    to = `<=${to}`;
	  }

	  return `${from} ${to}`.trim()
	};

	const testSet = (set, version, options) => {
	  for (let i = 0; i < set.length; i++) {
	    if (!set[i].test(version)) {
	      return false
	    }
	  }

	  if (version.prerelease.length && !options.includePrerelease) {
	    // Find the set of versions that are allowed to have prereleases
	    // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
	    // That should allow `1.2.3-pr.2` to pass.
	    // However, `1.2.4-alpha.notready` should NOT be allowed,
	    // even though it's within the range set by the comparators.
	    for (let i = 0; i < set.length; i++) {
	      debug(set[i].semver);
	      if (set[i].semver === Comparator.ANY) {
	        continue
	      }

	      if (set[i].semver.prerelease.length > 0) {
	        const allowed = set[i].semver;
	        if (allowed.major === version.major &&
	            allowed.minor === version.minor &&
	            allowed.patch === version.patch) {
	          return true
	        }
	      }
	    }

	    // Version has a -pre, but it's not one of the ones we like.
	    return false
	  }

	  return true
	};
	return range;
}

var comparator;
var hasRequiredComparator;

function requireComparator () {
	if (hasRequiredComparator) return comparator;
	hasRequiredComparator = 1;

	const ANY = Symbol('SemVer ANY');
	// hoisted class for cyclic dependency
	class Comparator {
	  static get ANY () {
	    return ANY
	  }

	  constructor (comp, options) {
	    options = parseOptions(options);

	    if (comp instanceof Comparator) {
	      if (comp.loose === !!options.loose) {
	        return comp
	      } else {
	        comp = comp.value;
	      }
	    }

	    comp = comp.trim().split(/\s+/).join(' ');
	    debug('comparator', comp, options);
	    this.options = options;
	    this.loose = !!options.loose;
	    this.parse(comp);

	    if (this.semver === ANY) {
	      this.value = '';
	    } else {
	      this.value = this.operator + this.semver.version;
	    }

	    debug('comp', this);
	  }

	  parse (comp) {
	    const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
	    const m = comp.match(r);

	    if (!m) {
	      throw new TypeError(`Invalid comparator: ${comp}`)
	    }

	    this.operator = m[1] !== undefined ? m[1] : '';
	    if (this.operator === '=') {
	      this.operator = '';
	    }

	    // if it literally is just '>' or '' then allow anything.
	    if (!m[2]) {
	      this.semver = ANY;
	    } else {
	      this.semver = new SemVer(m[2], this.options.loose);
	    }
	  }

	  toString () {
	    return this.value
	  }

	  test (version) {
	    debug('Comparator.test', version, this.options.loose);

	    if (this.semver === ANY || version === ANY) {
	      return true
	    }

	    if (typeof version === 'string') {
	      try {
	        version = new SemVer(version, this.options);
	      } catch (er) {
	        return false
	      }
	    }

	    return cmp(version, this.operator, this.semver, this.options)
	  }

	  intersects (comp, options) {
	    if (!(comp instanceof Comparator)) {
	      throw new TypeError('a Comparator is required')
	    }

	    if (this.operator === '') {
	      if (this.value === '') {
	        return true
	      }
	      return new Range(comp.value, options).test(this.value)
	    } else if (comp.operator === '') {
	      if (comp.value === '') {
	        return true
	      }
	      return new Range(this.value, options).test(comp.semver)
	    }

	    options = parseOptions(options);

	    // Special cases where nothing can possibly be lower
	    if (options.includePrerelease &&
	      (this.value === '<0.0.0-0' || comp.value === '<0.0.0-0')) {
	      return false
	    }
	    if (!options.includePrerelease &&
	      (this.value.startsWith('<0.0.0') || comp.value.startsWith('<0.0.0'))) {
	      return false
	    }

	    // Same direction increasing (> or >=)
	    if (this.operator.startsWith('>') && comp.operator.startsWith('>')) {
	      return true
	    }
	    // Same direction decreasing (< or <=)
	    if (this.operator.startsWith('<') && comp.operator.startsWith('<')) {
	      return true
	    }
	    // same SemVer and both sides are inclusive (<= or >=)
	    if (
	      (this.semver.version === comp.semver.version) &&
	      this.operator.includes('=') && comp.operator.includes('=')) {
	      return true
	    }
	    // opposite directions less than
	    if (cmp(this.semver, '<', comp.semver, options) &&
	      this.operator.startsWith('>') && comp.operator.startsWith('<')) {
	      return true
	    }
	    // opposite directions greater than
	    if (cmp(this.semver, '>', comp.semver, options) &&
	      this.operator.startsWith('<') && comp.operator.startsWith('>')) {
	      return true
	    }
	    return false
	  }
	}

	comparator = Comparator;

	const parseOptions = requireParseOptions();
	const { safeRe: re, t } = requireRe();
	const cmp = requireCmp();
	const debug = requireDebug();
	const SemVer = requireSemver$1();
	const Range = requireRange();
	return comparator;
}

var satisfies_1;
var hasRequiredSatisfies;

function requireSatisfies () {
	if (hasRequiredSatisfies) return satisfies_1;
	hasRequiredSatisfies = 1;

	const Range = requireRange();
	const satisfies = (version, range, options) => {
	  try {
	    range = new Range(range, options);
	  } catch (er) {
	    return false
	  }
	  return range.test(version)
	};
	satisfies_1 = satisfies;
	return satisfies_1;
}

var toComparators_1;
var hasRequiredToComparators;

function requireToComparators () {
	if (hasRequiredToComparators) return toComparators_1;
	hasRequiredToComparators = 1;

	const Range = requireRange();

	// Mostly just for testing and legacy API reasons
	const toComparators = (range, options) =>
	  new Range(range, options).set
	    .map(comp => comp.map(c => c.value).join(' ').trim().split(' '));

	toComparators_1 = toComparators;
	return toComparators_1;
}

var maxSatisfying_1;
var hasRequiredMaxSatisfying;

function requireMaxSatisfying () {
	if (hasRequiredMaxSatisfying) return maxSatisfying_1;
	hasRequiredMaxSatisfying = 1;

	const SemVer = requireSemver$1();
	const Range = requireRange();

	const maxSatisfying = (versions, range, options) => {
	  let max = null;
	  let maxSV = null;
	  let rangeObj = null;
	  try {
	    rangeObj = new Range(range, options);
	  } catch (er) {
	    return null
	  }
	  versions.forEach((v) => {
	    if (rangeObj.test(v)) {
	      // satisfies(v, range, options)
	      if (!max || maxSV.compare(v) === -1) {
	        // compare(max, v, true)
	        max = v;
	        maxSV = new SemVer(max, options);
	      }
	    }
	  });
	  return max
	};
	maxSatisfying_1 = maxSatisfying;
	return maxSatisfying_1;
}

var minSatisfying_1;
var hasRequiredMinSatisfying;

function requireMinSatisfying () {
	if (hasRequiredMinSatisfying) return minSatisfying_1;
	hasRequiredMinSatisfying = 1;

	const SemVer = requireSemver$1();
	const Range = requireRange();
	const minSatisfying = (versions, range, options) => {
	  let min = null;
	  let minSV = null;
	  let rangeObj = null;
	  try {
	    rangeObj = new Range(range, options);
	  } catch (er) {
	    return null
	  }
	  versions.forEach((v) => {
	    if (rangeObj.test(v)) {
	      // satisfies(v, range, options)
	      if (!min || minSV.compare(v) === 1) {
	        // compare(min, v, true)
	        min = v;
	        minSV = new SemVer(min, options);
	      }
	    }
	  });
	  return min
	};
	minSatisfying_1 = minSatisfying;
	return minSatisfying_1;
}

var minVersion_1;
var hasRequiredMinVersion;

function requireMinVersion () {
	if (hasRequiredMinVersion) return minVersion_1;
	hasRequiredMinVersion = 1;

	const SemVer = requireSemver$1();
	const Range = requireRange();
	const gt = requireGt();

	const minVersion = (range, loose) => {
	  range = new Range(range, loose);

	  let minver = new SemVer('0.0.0');
	  if (range.test(minver)) {
	    return minver
	  }

	  minver = new SemVer('0.0.0-0');
	  if (range.test(minver)) {
	    return minver
	  }

	  minver = null;
	  for (let i = 0; i < range.set.length; ++i) {
	    const comparators = range.set[i];

	    let setMin = null;
	    comparators.forEach((comparator) => {
	      // Clone to avoid manipulating the comparator's semver object.
	      const compver = new SemVer(comparator.semver.version);
	      switch (comparator.operator) {
	        case '>':
	          if (compver.prerelease.length === 0) {
	            compver.patch++;
	          } else {
	            compver.prerelease.push(0);
	          }
	          compver.raw = compver.format();
	          /* fallthrough */
	        case '':
	        case '>=':
	          if (!setMin || gt(compver, setMin)) {
	            setMin = compver;
	          }
	          break
	        case '<':
	        case '<=':
	          /* Ignore maximum versions */
	          break
	        /* istanbul ignore next */
	        default:
	          throw new Error(`Unexpected operation: ${comparator.operator}`)
	      }
	    });
	    if (setMin && (!minver || gt(minver, setMin))) {
	      minver = setMin;
	    }
	  }

	  if (minver && range.test(minver)) {
	    return minver
	  }

	  return null
	};
	minVersion_1 = minVersion;
	return minVersion_1;
}

var valid;
var hasRequiredValid;

function requireValid () {
	if (hasRequiredValid) return valid;
	hasRequiredValid = 1;

	const Range = requireRange();
	const validRange = (range, options) => {
	  try {
	    // Return '*' instead of '' so that truthiness works.
	    // This will throw if it's invalid anyway
	    return new Range(range, options).range || '*'
	  } catch (er) {
	    return null
	  }
	};
	valid = validRange;
	return valid;
}

var outside_1;
var hasRequiredOutside;

function requireOutside () {
	if (hasRequiredOutside) return outside_1;
	hasRequiredOutside = 1;

	const SemVer = requireSemver$1();
	const Comparator = requireComparator();
	const { ANY } = Comparator;
	const Range = requireRange();
	const satisfies = requireSatisfies();
	const gt = requireGt();
	const lt = requireLt();
	const lte = requireLte();
	const gte = requireGte();

	const outside = (version, range, hilo, options) => {
	  version = new SemVer(version, options);
	  range = new Range(range, options);

	  let gtfn, ltefn, ltfn, comp, ecomp;
	  switch (hilo) {
	    case '>':
	      gtfn = gt;
	      ltefn = lte;
	      ltfn = lt;
	      comp = '>';
	      ecomp = '>=';
	      break
	    case '<':
	      gtfn = lt;
	      ltefn = gte;
	      ltfn = gt;
	      comp = '<';
	      ecomp = '<=';
	      break
	    default:
	      throw new TypeError('Must provide a hilo val of "<" or ">"')
	  }

	  // If it satisfies the range it is not outside
	  if (satisfies(version, range, options)) {
	    return false
	  }

	  // From now on, variable terms are as if we're in "gtr" mode.
	  // but note that everything is flipped for the "ltr" function.

	  for (let i = 0; i < range.set.length; ++i) {
	    const comparators = range.set[i];

	    let high = null;
	    let low = null;

	    comparators.forEach((comparator) => {
	      if (comparator.semver === ANY) {
	        comparator = new Comparator('>=0.0.0');
	      }
	      high = high || comparator;
	      low = low || comparator;
	      if (gtfn(comparator.semver, high.semver, options)) {
	        high = comparator;
	      } else if (ltfn(comparator.semver, low.semver, options)) {
	        low = comparator;
	      }
	    });

	    // If the edge version comparator has a operator then our version
	    // isn't outside it
	    if (high.operator === comp || high.operator === ecomp) {
	      return false
	    }

	    // If the lowest version comparator has an operator and our version
	    // is less than it then it isn't higher than the range
	    if ((!low.operator || low.operator === comp) &&
	        ltefn(version, low.semver)) {
	      return false
	    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
	      return false
	    }
	  }
	  return true
	};

	outside_1 = outside;
	return outside_1;
}

var gtr_1;
var hasRequiredGtr;

function requireGtr () {
	if (hasRequiredGtr) return gtr_1;
	hasRequiredGtr = 1;

	// Determine if version is greater than all the versions possible in the range.
	const outside = requireOutside();
	const gtr = (version, range, options) => outside(version, range, '>', options);
	gtr_1 = gtr;
	return gtr_1;
}

var ltr_1;
var hasRequiredLtr;

function requireLtr () {
	if (hasRequiredLtr) return ltr_1;
	hasRequiredLtr = 1;

	const outside = requireOutside();
	// Determine if version is less than all the versions possible in the range
	const ltr = (version, range, options) => outside(version, range, '<', options);
	ltr_1 = ltr;
	return ltr_1;
}

var intersects_1;
var hasRequiredIntersects;

function requireIntersects () {
	if (hasRequiredIntersects) return intersects_1;
	hasRequiredIntersects = 1;

	const Range = requireRange();
	const intersects = (r1, r2, options) => {
	  r1 = new Range(r1, options);
	  r2 = new Range(r2, options);
	  return r1.intersects(r2, options)
	};
	intersects_1 = intersects;
	return intersects_1;
}

var simplify;
var hasRequiredSimplify;

function requireSimplify () {
	if (hasRequiredSimplify) return simplify;
	hasRequiredSimplify = 1;

	// given a set of versions and a range, create a "simplified" range
	// that includes the same versions that the original range does
	// If the original range is shorter than the simplified one, return that.
	const satisfies = requireSatisfies();
	const compare = requireCompare();
	simplify = (versions, range, options) => {
	  const set = [];
	  let first = null;
	  let prev = null;
	  const v = versions.sort((a, b) => compare(a, b, options));
	  for (const version of v) {
	    const included = satisfies(version, range, options);
	    if (included) {
	      prev = version;
	      if (!first) {
	        first = version;
	      }
	    } else {
	      if (prev) {
	        set.push([first, prev]);
	      }
	      prev = null;
	      first = null;
	    }
	  }
	  if (first) {
	    set.push([first, null]);
	  }

	  const ranges = [];
	  for (const [min, max] of set) {
	    if (min === max) {
	      ranges.push(min);
	    } else if (!max && min === v[0]) {
	      ranges.push('*');
	    } else if (!max) {
	      ranges.push(`>=${min}`);
	    } else if (min === v[0]) {
	      ranges.push(`<=${max}`);
	    } else {
	      ranges.push(`${min} - ${max}`);
	    }
	  }
	  const simplified = ranges.join(' || ');
	  const original = typeof range.raw === 'string' ? range.raw : String(range);
	  return simplified.length < original.length ? simplified : range
	};
	return simplify;
}

var subset_1;
var hasRequiredSubset;

function requireSubset () {
	if (hasRequiredSubset) return subset_1;
	hasRequiredSubset = 1;

	const Range = requireRange();
	const Comparator = requireComparator();
	const { ANY } = Comparator;
	const satisfies = requireSatisfies();
	const compare = requireCompare();

	// Complex range `r1 || r2 || ...` is a subset of `R1 || R2 || ...` iff:
	// - Every simple range `r1, r2, ...` is a null set, OR
	// - Every simple range `r1, r2, ...` which is not a null set is a subset of
	//   some `R1, R2, ...`
	//
	// Simple range `c1 c2 ...` is a subset of simple range `C1 C2 ...` iff:
	// - If c is only the ANY comparator
	//   - If C is only the ANY comparator, return true
	//   - Else if in prerelease mode, return false
	//   - else replace c with `[>=0.0.0]`
	// - If C is only the ANY comparator
	//   - if in prerelease mode, return true
	//   - else replace C with `[>=0.0.0]`
	// - Let EQ be the set of = comparators in c
	// - If EQ is more than one, return true (null set)
	// - Let GT be the highest > or >= comparator in c
	// - Let LT be the lowest < or <= comparator in c
	// - If GT and LT, and GT.semver > LT.semver, return true (null set)
	// - If any C is a = range, and GT or LT are set, return false
	// - If EQ
	//   - If GT, and EQ does not satisfy GT, return true (null set)
	//   - If LT, and EQ does not satisfy LT, return true (null set)
	//   - If EQ satisfies every C, return true
	//   - Else return false
	// - If GT
	//   - If GT.semver is lower than any > or >= comp in C, return false
	//   - If GT is >=, and GT.semver does not satisfy every C, return false
	//   - If GT.semver has a prerelease, and not in prerelease mode
	//     - If no C has a prerelease and the GT.semver tuple, return false
	// - If LT
	//   - If LT.semver is greater than any < or <= comp in C, return false
	//   - If LT is <=, and LT.semver does not satisfy every C, return false
	//   - If LT.semver has a prerelease, and not in prerelease mode
	//     - If no C has a prerelease and the LT.semver tuple, return false
	// - Else return true

	const subset = (sub, dom, options = {}) => {
	  if (sub === dom) {
	    return true
	  }

	  sub = new Range(sub, options);
	  dom = new Range(dom, options);
	  let sawNonNull = false;

	  OUTER: for (const simpleSub of sub.set) {
	    for (const simpleDom of dom.set) {
	      const isSub = simpleSubset(simpleSub, simpleDom, options);
	      sawNonNull = sawNonNull || isSub !== null;
	      if (isSub) {
	        continue OUTER
	      }
	    }
	    // the null set is a subset of everything, but null simple ranges in
	    // a complex range should be ignored.  so if we saw a non-null range,
	    // then we know this isn't a subset, but if EVERY simple range was null,
	    // then it is a subset.
	    if (sawNonNull) {
	      return false
	    }
	  }
	  return true
	};

	const minimumVersionWithPreRelease = [new Comparator('>=0.0.0-0')];
	const minimumVersion = [new Comparator('>=0.0.0')];

	const simpleSubset = (sub, dom, options) => {
	  if (sub === dom) {
	    return true
	  }

	  if (sub.length === 1 && sub[0].semver === ANY) {
	    if (dom.length === 1 && dom[0].semver === ANY) {
	      return true
	    } else if (options.includePrerelease) {
	      sub = minimumVersionWithPreRelease;
	    } else {
	      sub = minimumVersion;
	    }
	  }

	  if (dom.length === 1 && dom[0].semver === ANY) {
	    if (options.includePrerelease) {
	      return true
	    } else {
	      dom = minimumVersion;
	    }
	  }

	  const eqSet = new Set();
	  let gt, lt;
	  for (const c of sub) {
	    if (c.operator === '>' || c.operator === '>=') {
	      gt = higherGT(gt, c, options);
	    } else if (c.operator === '<' || c.operator === '<=') {
	      lt = lowerLT(lt, c, options);
	    } else {
	      eqSet.add(c.semver);
	    }
	  }

	  if (eqSet.size > 1) {
	    return null
	  }

	  let gtltComp;
	  if (gt && lt) {
	    gtltComp = compare(gt.semver, lt.semver, options);
	    if (gtltComp > 0) {
	      return null
	    } else if (gtltComp === 0 && (gt.operator !== '>=' || lt.operator !== '<=')) {
	      return null
	    }
	  }

	  // will iterate one or zero times
	  for (const eq of eqSet) {
	    if (gt && !satisfies(eq, String(gt), options)) {
	      return null
	    }

	    if (lt && !satisfies(eq, String(lt), options)) {
	      return null
	    }

	    for (const c of dom) {
	      if (!satisfies(eq, String(c), options)) {
	        return false
	      }
	    }

	    return true
	  }

	  let higher, lower;
	  let hasDomLT, hasDomGT;
	  // if the subset has a prerelease, we need a comparator in the superset
	  // with the same tuple and a prerelease, or it's not a subset
	  let needDomLTPre = lt &&
	    !options.includePrerelease &&
	    lt.semver.prerelease.length ? lt.semver : false;
	  let needDomGTPre = gt &&
	    !options.includePrerelease &&
	    gt.semver.prerelease.length ? gt.semver : false;
	  // exception: <1.2.3-0 is the same as <1.2.3
	  if (needDomLTPre && needDomLTPre.prerelease.length === 1 &&
	      lt.operator === '<' && needDomLTPre.prerelease[0] === 0) {
	    needDomLTPre = false;
	  }

	  for (const c of dom) {
	    hasDomGT = hasDomGT || c.operator === '>' || c.operator === '>=';
	    hasDomLT = hasDomLT || c.operator === '<' || c.operator === '<=';
	    if (gt) {
	      if (needDomGTPre) {
	        if (c.semver.prerelease && c.semver.prerelease.length &&
	            c.semver.major === needDomGTPre.major &&
	            c.semver.minor === needDomGTPre.minor &&
	            c.semver.patch === needDomGTPre.patch) {
	          needDomGTPre = false;
	        }
	      }
	      if (c.operator === '>' || c.operator === '>=') {
	        higher = higherGT(gt, c, options);
	        if (higher === c && higher !== gt) {
	          return false
	        }
	      } else if (gt.operator === '>=' && !satisfies(gt.semver, String(c), options)) {
	        return false
	      }
	    }
	    if (lt) {
	      if (needDomLTPre) {
	        if (c.semver.prerelease && c.semver.prerelease.length &&
	            c.semver.major === needDomLTPre.major &&
	            c.semver.minor === needDomLTPre.minor &&
	            c.semver.patch === needDomLTPre.patch) {
	          needDomLTPre = false;
	        }
	      }
	      if (c.operator === '<' || c.operator === '<=') {
	        lower = lowerLT(lt, c, options);
	        if (lower === c && lower !== lt) {
	          return false
	        }
	      } else if (lt.operator === '<=' && !satisfies(lt.semver, String(c), options)) {
	        return false
	      }
	    }
	    if (!c.operator && (lt || gt) && gtltComp !== 0) {
	      return false
	    }
	  }

	  // if there was a < or >, and nothing in the dom, then must be false
	  // UNLESS it was limited by another range in the other direction.
	  // Eg, >1.0.0 <1.0.1 is still a subset of <2.0.0
	  if (gt && hasDomLT && !lt && gtltComp !== 0) {
	    return false
	  }

	  if (lt && hasDomGT && !gt && gtltComp !== 0) {
	    return false
	  }

	  // we needed a prerelease range in a specific tuple, but didn't get one
	  // then this isn't a subset.  eg >=1.2.3-pre is not a subset of >=1.0.0,
	  // because it includes prereleases in the 1.2.3 tuple
	  if (needDomGTPre || needDomLTPre) {
	    return false
	  }

	  return true
	};

	// >=1.2.3 is lower than >1.2.3
	const higherGT = (a, b, options) => {
	  if (!a) {
	    return b
	  }
	  const comp = compare(a.semver, b.semver, options);
	  return comp > 0 ? a
	    : comp < 0 ? b
	    : b.operator === '>' && a.operator === '>=' ? b
	    : a
	};

	// <=1.2.3 is higher than <1.2.3
	const lowerLT = (a, b, options) => {
	  if (!a) {
	    return b
	  }
	  const comp = compare(a.semver, b.semver, options);
	  return comp < 0 ? a
	    : comp > 0 ? b
	    : b.operator === '<' && a.operator === '<=' ? b
	    : a
	};

	subset_1 = subset;
	return subset_1;
}

var semver$1;
var hasRequiredSemver;

function requireSemver () {
	if (hasRequiredSemver) return semver$1;
	hasRequiredSemver = 1;

	// just pre-load all the stuff that index.js lazily exports
	const internalRe = requireRe();
	const constants = requireConstants();
	const SemVer = requireSemver$1();
	const identifiers = requireIdentifiers();
	const parse = requireParse();
	const valid = requireValid$1();
	const clean = requireClean();
	const inc = requireInc();
	const diff = requireDiff();
	const major = requireMajor();
	const minor = requireMinor();
	const patch = requirePatch();
	const prerelease = requirePrerelease();
	const compare = requireCompare();
	const rcompare = requireRcompare();
	const compareLoose = requireCompareLoose();
	const compareBuild = requireCompareBuild();
	const sort = requireSort();
	const rsort = requireRsort();
	const gt = requireGt();
	const lt = requireLt();
	const eq = requireEq();
	const neq = requireNeq();
	const gte = requireGte();
	const lte = requireLte();
	const cmp = requireCmp();
	const coerce = requireCoerce();
	const Comparator = requireComparator();
	const Range = requireRange();
	const satisfies = requireSatisfies();
	const toComparators = requireToComparators();
	const maxSatisfying = requireMaxSatisfying();
	const minSatisfying = requireMinSatisfying();
	const minVersion = requireMinVersion();
	const validRange = requireValid();
	const outside = requireOutside();
	const gtr = requireGtr();
	const ltr = requireLtr();
	const intersects = requireIntersects();
	const simplifyRange = requireSimplify();
	const subset = requireSubset();
	semver$1 = {
	  parse,
	  valid,
	  clean,
	  inc,
	  diff,
	  major,
	  minor,
	  patch,
	  prerelease,
	  compare,
	  rcompare,
	  compareLoose,
	  compareBuild,
	  sort,
	  rsort,
	  gt,
	  lt,
	  eq,
	  neq,
	  gte,
	  lte,
	  cmp,
	  coerce,
	  Comparator,
	  Range,
	  satisfies,
	  toComparators,
	  maxSatisfying,
	  minSatisfying,
	  minVersion,
	  validRange,
	  outside,
	  gtr,
	  ltr,
	  intersects,
	  simplifyRange,
	  subset,
	  SemVer,
	  re: internalRe.re,
	  src: internalRe.src,
	  tokens: internalRe.t,
	  SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
	  RELEASE_TYPES: constants.RELEASE_TYPES,
	  compareIdentifiers: identifiers.compareIdentifiers,
	  rcompareIdentifiers: identifiers.rcompareIdentifiers,
	};
	return semver$1;
}

var semverExports = requireSemver();

const semver = new semverExports.SemVer(version$1);
const fileprefix = new TextEncoder().encode(type);

/**
 * To guarantee Uint8Array semantics, convert nodejs Buffers
 * into vanilla Uint8Arrays
 */
function asUint8Array(buf) {
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/**
 * Returns a new Uint8Array created by concatenating the passed Uint8Arrays
 */
function concat(arrays, length) {
    return asUint8Array(Buffer.concat(arrays, length));
}

var crc32$1 = {};

/*! crc32.js (C) 2014-present SheetJS -- http://sheetjs.com */

var hasRequiredCrc32;

function requireCrc32 () {
	if (hasRequiredCrc32) return crc32$1;
	hasRequiredCrc32 = 1;
	(function (exports$1) {
		(function (factory) {
			/*jshint ignore:start */
			/*eslint-disable */
			if(typeof DO_NOT_EXPORT_CRC === 'undefined') {
				{
					factory(exports$1);
				}
			} else {
				factory({});
			}
			/*eslint-enable */
			/*jshint ignore:end */
		}(function(CRC32) {
		CRC32.version = '1.2.2';
		/*global Int32Array */
		function signed_crc_table() {
			var c = 0, table = new Array(256);

			for(var n =0; n != 256; ++n){
				c = n;
				c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
				c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
				c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
				c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
				c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
				c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
				c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
				c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
				table[n] = c;
			}

			return typeof Int32Array !== 'undefined' ? new Int32Array(table) : table;
		}

		var T0 = signed_crc_table();
		function slice_by_16_tables(T) {
			var c = 0, v = 0, n = 0, table = typeof Int32Array !== 'undefined' ? new Int32Array(4096) : new Array(4096) ;

			for(n = 0; n != 256; ++n) table[n] = T[n];
			for(n = 0; n != 256; ++n) {
				v = T[n];
				for(c = 256 + n; c < 4096; c += 256) v = table[c] = (v >>> 8) ^ T[v & 0xFF];
			}
			var out = [];
			for(n = 1; n != 16; ++n) out[n - 1] = typeof Int32Array !== 'undefined' ? table.subarray(n * 256, n * 256 + 256) : table.slice(n * 256, n * 256 + 256);
			return out;
		}
		var TT = slice_by_16_tables(T0);
		var T1 = TT[0],  T2 = TT[1],  T3 = TT[2],  T4 = TT[3],  T5 = TT[4];
		var T6 = TT[5],  T7 = TT[6],  T8 = TT[7],  T9 = TT[8],  Ta = TT[9];
		var Tb = TT[10], Tc = TT[11], Td = TT[12], Te = TT[13], Tf = TT[14];
		function crc32_bstr(bstr, seed) {
			var C = seed ^ -1;
			for(var i = 0, L = bstr.length; i < L;) C = (C>>>8) ^ T0[(C^bstr.charCodeAt(i++))&0xFF];
			return ~C;
		}

		function crc32_buf(B, seed) {
			var C = seed ^ -1, L = B.length - 15, i = 0;
			for(; i < L;) C =
				Tf[B[i++] ^ (C & 255)] ^
				Te[B[i++] ^ ((C >> 8) & 255)] ^
				Td[B[i++] ^ ((C >> 16) & 255)] ^
				Tc[B[i++] ^ (C >>> 24)] ^
				Tb[B[i++]] ^ Ta[B[i++]] ^ T9[B[i++]] ^ T8[B[i++]] ^
				T7[B[i++]] ^ T6[B[i++]] ^ T5[B[i++]] ^ T4[B[i++]] ^
				T3[B[i++]] ^ T2[B[i++]] ^ T1[B[i++]] ^ T0[B[i++]];
			L += 15;
			while(i < L) C = (C>>>8) ^ T0[(C^B[i++])&0xFF];
			return ~C;
		}

		function crc32_str(str, seed) {
			var C = seed ^ -1;
			for(var i = 0, L = str.length, c = 0, d = 0; i < L;) {
				c = str.charCodeAt(i++);
				if(c < 0x80) {
					C = (C>>>8) ^ T0[(C^c)&0xFF];
				} else if(c < 0x800) {
					C = (C>>>8) ^ T0[(C ^ (192|((c>>6)&31)))&0xFF];
					C = (C>>>8) ^ T0[(C ^ (128|(c&63)))&0xFF];
				} else if(c >= 0xD800 && c < 0xE000) {
					c = (c&1023)+64; d = str.charCodeAt(i++)&1023;
					C = (C>>>8) ^ T0[(C ^ (240|((c>>8)&7)))&0xFF];
					C = (C>>>8) ^ T0[(C ^ (128|((c>>2)&63)))&0xFF];
					C = (C>>>8) ^ T0[(C ^ (128|((d>>6)&15)|((c&3)<<4)))&0xFF];
					C = (C>>>8) ^ T0[(C ^ (128|(d&63)))&0xFF];
				} else {
					C = (C>>>8) ^ T0[(C ^ (224|((c>>12)&15)))&0xFF];
					C = (C>>>8) ^ T0[(C ^ (128|((c>>6)&63)))&0xFF];
					C = (C>>>8) ^ T0[(C ^ (128|(c&63)))&0xFF];
				}
			}
			return ~C;
		}
		CRC32.table = T0;
		// $FlowIgnore
		CRC32.bstr = crc32_bstr;
		// $FlowIgnore
		CRC32.buf = crc32_buf;
		// $FlowIgnore
		CRC32.str = crc32_str;
		})); 
	} (crc32$1));
	return crc32$1;
}

var crc32Exports = requireCrc32();
var crc32 = /*@__PURE__*/getDefaultExportFromCjs(crc32Exports);

function int8(n, le = true) {
    const buffer = new ArrayBuffer(1);
    const view = new DataView(buffer);
    view.setInt8(0, n, le);
    return new Uint8Array(buffer);
}

function version() {
    const major = int8(semver.major);
    const minor = int8(semver.minor);
    const patch = int8(semver.patch);
    return concat([major, minor, patch]);
}

function int32(n, le = true) {
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setInt32(0, n, le);
    return new Uint8Array(buffer);
}

function int16(n, le = true) {
    const buffer = new ArrayBuffer(2);
    const view = new DataView(buffer);
    view.setInt16(0, n, le);
    return new Uint8Array(buffer);
}

function data(uint8) {
    return [int32(uint8.length), uint8];
}

function fromInt32(bytes, le = true) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getInt32(0, le);
}

function fromInt16(bytes, le = true) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getInt16(0, le);
}

async function toFile(isDir, extn, files, dirs, useCRC32, startsWithDot) {
    const header = concat([fileprefix, version()]);

    const extn8 = (extn == null || extn === "") 
        ? undefined
        : concat(data(B64toUI8A(extn)));

    const noPath = files.length == 1;
    const output = [];
    const files8 = [];
    let need = 1;
    function set(num) {
        let n = 4;                      // int32
        if (num <= 0xFF) n = 1;         // int8
        else if (num <= 0xFFFF) n = 2;  // int16
        need = Math.max(need, n);
    }
    for (const [path, content] of files) {
        const path8 = noPath ? [int32(0)] : data(B64toUI8A(path));
        const file8 = data(B64toUI8A(content));

        files8.push(path8, file8);
        set(fromInt32(path8[0]));
        set(fromInt32(file8[0]));
    }

    const dirs8 = [];
    for (let i = 0; i < dirs.length; i++) {
        const dir8 = data(B64toUI8A(dirs[i]));
        const zero = int32(0);

        dirs8.push(dir8, [zero, undefined]);
        set(fromInt32(dir8[0]));
    }

    const func = need == 1 ? int8 : need == 2 ? int16 : int32;
    function num(int32) {
        return func(fromInt32(int32));
    }
    for (let i = 0; i < files8.length; i++) {
        const [length, data] = files8[i];
        output.push(num(length));
        if (typeof data !== 'undefined') output.push(data);
    }
    for (let i = 0; i < dirs8.length; i++) {
        const [length, data] = dirs8[i];
        output.push(num(length));
        if (typeof data != 'undefined') output.push(data);
    }

    const npfiles = [[
        name__,
        files[0] ? files[0][1] : null
    ]];
    const checksum = int32(crc32.str(JSON.stringify(
        noPath ? npfiles : files
    )));

    const hasExtn = typeof extn8 != 'undefined';

    /*
        Bits:
        1 2 3 4 5 6 7 8
    */
    const flags = [
        decToBin(need - 1, 2), 
        isDir ? '1' : '0', 
        hasExtn ? '1' : '0', 
        useCRC32 ? '1' : '0', 
        startsWithDot ? '1' : '0'
    ].join('');

    const main = [int8(binToDec(flags))];
    if (hasExtn) main.push(extn8);
    if (useCRC32) main.push(checksum);

    return concat([
        header,
        ...main,
        ...output
    ]);
}

function makeSemVer([major, minor, patch]) {
    return new semverExports.SemVer(major + '.' + minor + '.' + patch);
}

function corrupted(extra) {
    throw new Error(prefix+'Input file was corrupted.'+(
        extra ? ' ('+extra+')' : ''
    ));
}

async function fromFile(uint8) {
    const d = new TextDecoder();

    const filetype = d.decode(uint8.subarray(0,5));
    if (filetype != type) throw new Error(prefix+'Input file type is not '+type);

    const jsscver = makeSemVer(uint8.subarray(5,8));
    if (semverExports.gt(jsscver, makeSemVer([
        semver.major, semver.minor, semver.patch
    ]))) throw new Error(prefix+`Input file was compressed with a higher ${name__} version.`);

    const flags = decToBin(uint8[8]);
    let need = binToDec(flags.slice(0,-4)) + 1;
    if (isNaN(need)) need = 1;
    const isDir = flags.slice(-4, -3) == '1';
    const hasExtn = flags.slice(-3, -2) == '1';
    const hasCRC32 = flags.slice(-2, -1) == '1';
    const startsWithDot = flags.slice(-1) == '1';
    
    let i = 9;
    let legnthLength = 4;
    let func = fromInt32;
    function read() {
        if (i >= uint8.length) return null;
        if (i + legnthLength > uint8.length) corrupted();

        const length = func(uint8.subarray(i, i + legnthLength));
        i += legnthLength;

        if (length == 0) return 0;

        if (i + length > uint8.length) corrupted();

        const data = UI8AtoB64(uint8.subarray(i, i + length));
        i += length;

        return data;
    }
    
    const extn = hasExtn ? read() : 0;
    const checksum = hasCRC32 ? fromInt32(uint8.subarray(i, i + 4)) : undefined;
    if (hasCRC32) i += 4;
    legnthLength = need;
    func = need == 1 ? function(ui8a) {
        return ui8a[0];
    } : need == 2 ? fromInt16 : fromInt32;

    const files = [];
    const dirs = [];
    while (true) {
        const path = read();
        if (path == null) break;

        const content = read();
        if (content == null) corrupted();

        if (content == 0) dirs.push(path);
        else files.push([
            path == 0 ? name__ : path, content
        ]);

        if (i == uint8.length) break;
    }

    if (typeof checksum != 'undefined' && checksum != crc32.str(JSON.stringify(files))) {
        corrupted('CRC32');
    }

    return {
        isDir,
        extn: extn == 0 ? '' : extn,
        files,
        dirs,
        startsWithDot
    };
}

const args = process.argv.slice(2);

const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
const currentdir = process.cwd();

const _winUI = path.resolve(__dirname$1, "./windows/ui");
const _winUIWait = path.resolve(_winUI, "./wait.ps1");
function winUIWait(text) {
    return spawn("powershell", [
        "-NoProfile", 
        "-ExecutionPolicy", "Bypass", 
        "-File", _winUIWait,
        "-Name", name__,
        "-Text", text
    ], { detached: false, stdio: 'ignore' });
}

let WinUIWait = false;
let windows = false;
function exit(code, err) {
    if (WinUIWait) WinUIWait.kill();

    if (code == 1 && windows) _importExports.message(name__, err);

    process.exit(code);
}

let mode = -1;
let file = -1;
let input = '';
let output = '';
let str = false;
let config = '';
let print = false;
let checksum = true;
function invalidArgs() {
    const e = 'Invalid arguments.';
    console.log(prefix + e);
    exit(1, e);
}
function help() {
    console.log(
        name__ + ' v' + version$1 + ' CLI\n\n' + (
            'Usage:\n\n' +
            'jssc <inputFile>\n' +
            'jssc <inputFile> <outputFile>\n' +
            'jssc <inputFile> --decompress\n' +
            'jssc <inputFile> <outputFile> --decompress\n\n\n' +
            'Flags:\n\n' +
            'Short flag,  Argument(s),  \tFlag,               Argument(s)   \t:\t Description\n' +
            '---------------------------\t----------------------------------\t÷\t ------------------------------------------------------------------------------------------------------\n' +
            '-C                         \t--compress                        \t:\t Compress input string/file. (default)\n' +
            '-c           <file.justc>  \t--config            <file.justc>  \t:\t Set custom compressor configuration, same as the JS API, but it should be a JUSTC language script.\n' +
            '-d                         \t--decompress                      \t:\t Decompress input string/file.\n' +
            '-dc                        \t--disable-checksum                \t:\t Do not include CRC32 in the JSSC Archive. (saves 4 bytes, but removes corruption protection)\n' +
            '-h                         \t--help                            \t:\t Print JSSC CLI usage and flags.\n' +
            '-i           <input>       \t--input             <input>       \t:\t Set input file path / Set input string.\n' +
            '-o           <output.jssc> \t--output            <output.jssc> \t:\t Set output file path.\n' +
            '-p                         \t--print                           \t:\t Print output file content. Note that JSSC operates on UTF-16, so the printed output may get corrupted.\n' +
            '-s                         \t--string                          \t:\t Set input type to string. The output file type will not be JSSC1, but a compressed string.\n' +
            '-v                         \t--version                         \t:\t Print current JSSC version.\n' +
            '-w                         \t--windows                         \t:\t Use JSSC Windows integration. Synchronously waits for user input. (Requires JSSC Windows integration)\n' +
            '-wi                        \t--windows-install                 \t:\t Install JSSC Windows integration. (Windows only)\n' +
            '-wu                        \t--windows-uninstall               \t:\t Uninstall JSSC Windows integration. (Windows only)'
        ).replaceAll('-\t', '-' + '- '.repeat(3)).replaceAll('\t -', ' -'.repeat(3) + ' -').replaceAll('\t', ' '.repeat(6))
    );
}
function checkWindows() {
    if (process.platform !== "win32") {
        const e = 'process.platform is not "win32".';
        console.log(prefix + e);
        exit(1, e);
    }
}
for (const arg of args) {
    if (file == 0) {
        input = arg;
        file = -1;
    } else if (file == 1) {
        output = arg;
        file = -1;
    } else if (file == 2) {
        config = arg;
        file = -1;
    } else switch (arg) {
        case '-h': case '--help': {
            help();
            break;
        }
        case '-v': case '--version': {
            console.log(version$1);
            break;
        }
        case '-C': case '--compress': {
            if (mode == -1) mode = 0;
            else invalidArgs();
            break;
        }
        case '-d': case '--decompress': {
            if (mode == -1) mode = 1;
            else invalidArgs();
            break;
        }
        case '-i': case '--input': {
            if (file == -1 && input == '') file = 0;
            else invalidArgs();
            break;
        }
        case '-o': case '--output': {
            if (file == -1 && output == '') file = 1;
            else invalidArgs();
            break;
        }
        case '-s': case '--string': {
            str = true;
            break;
        }
        case '-c': case '--config': {
            if (file == -1 && config == '') file = 2;
            else invalidArgs();
            break;
        }
        case '-p': case '--print': {
            print = true;
            break;
        }
        case '-wi': case '--windows-install': {
            checkWindows();
            execSync('node '+path.resolve(__dirname$1, "./windows/install.js"));
            break;
        }
        case '-wu': case '--windows-uninstall': {
            checkWindows();
            execSync('node '+path.resolve(__dirname$1, "./windows/uninstall.js"));
            break;
        }
        case '-w': case '--windows': {
            checkWindows();
            windows = true;
            break;
        }
        case '-dc': case '--disable-checksum': {
            checksum = false;
            break;
        }
        default:
            if (input == '') input = arg;
            else if (output == '') output = arg;
            else invalidArgs();
            break;
    }
}

if (mode != -1 && input == '') {
    const e = 'Missing input.';
    console.log(prefix + e);
    exit(1, e);
} else if (mode == -1 && input != '') {
    mode = 0;
}
if (args.length == 0) help();
if (mode == -1) exit(0);

if (str && windows) exit(1, 'Invalid flags. Cannot use JSSC Windows Integration to compress a string.');
if (str && checksum) exit(1, 'Invalid flags. JSSC-compressed strings do not have a checksum.');

async function collectFiles(targetPath) {
    try {
        const stats = fs.statSync(targetPath);

        if (stats.isFile()) {
            return [targetPath];
        }

        if (stats.isDirectory()) {
            const files = [];

            function walk(dir) {
                for (const entry of fs.readdirSync(dir)) {
                    const full = path.join(dir, entry);
                    const stat = fs.statSync(full);

                    if (stat.isDirectory()) walk(full);
                    else files.push(full);
                }
            }

            walk(targetPath);
            return files;
        }
    } catch (_){}

    return null
}

function getRoot(inp) {
    const parsed = path.parse(inp);
    if (parsed.dir != '') return parsed.dir.split(path.sep)[0];
    return parsed.name;
}

const defaultConfig = {
    JUSTC: true,
    recursiveCompression: true,
    segmentation: true,
    base64IntegerEncoding: true,
    base64Packing: true,
    offsetEncoding: true,
    lzstring: true,

    offsetEncode: false,
    depthLimit: 10,
    workerlimit: 2,
    minifiedWorker: false,

    stringify: true,
    
    debug: false,
    depth: 0,
    worker: 0,
};

function findEmptyDirs(dir) {
    if (!fs.statSync(dir).isDirectory()) return [];

    let emptyDirs = [];
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const path_ = path.join(dir, file.name);
        
        if (file.isDirectory()) {
            emptyDirs = [...emptyDirs, ...findEmptyDirs(path_)];
            
            const content = fs.readdirSync(path_);
            if (content.length === 0) {
                emptyDirs.push(path_);
            }
        }
    }
    return emptyDirs;
}

(async (inp, out, cfg) => {
    const inpF = await collectFiles(inp);
    const isFile = !str ? inpF != null : !str;
    const input = isFile ? inpF : [inp];

    const isDir = (() => {
        try {
            return fs.statSync(inp).isDirectory()
        } catch (_){}
        return null
    })();
    if (mode == 1 && isDir) {
        const e = 'Invalid input.';
        console.log(prefix + e);
        exit(1, e);
    }

    if (!str && inpF == null) {
        const e = 'File not found.';
        console.log(prefix + e);
        exit(1, e);
    }

    let output = await collectFiles(out) || [out];
    let addFormat = false;
    if (output.length > 1) {
        output = [path.join(getRoot(out), path.parse(inp).name)];
        addFormat = true;
    }

    else if (output[0] == '' && isFile) {
        addFormat = true;
        if (isDir) output = [path.join(getRoot(out), path.parse(inp).name)];
        else if (path.extname(inp).length > 0) output = [inp.slice(0, -(path.extname(inp).length))];
        else output = [inp];
    }

    let config = await collectFiles(cfg) || [''];
    if (config.length > 1) {
        const e = 'Invalid config input.';
        console.log(prefix + e);
        exit(1, e);
    }
    config = config[0];
    if (config == '') config = defaultConfig; 
    else {
        config = fs.readFileSync(config).toString('utf8');
        config = {
            ...defaultConfig,
            ...await JUSTC.execute(config)
        };
    }

    if (mode == 0) {
        if (isFile && print) {
            const e = 'Invalid flags. Cannot compress a file/directory to JSSC1 archive and print the result.';
            console.log(prefix + e);
            exit(1, e);
        }
        if (!(()=>{
            if (!windows || !isFile) return true;

            const customConfig = {};

            const res = _importExports.compress(
                name__,
                path.parse(inp).name + path.parse(inp).ext,
                inp,
                config
            );

            try {
                customConfig.JUSTC = res[1].checked1;
                customConfig.recursiveCompression = res[1].checked2;
                customConfig.segmentation = res[1].checked3;
                customConfig.base64IntegerEncoding = res[1].checked4;
                customConfig.base64Packing = res[1].checked5;
                customConfig.offsetEncoding = res[1].checked6;
                customConfig.lzstring = res[1].checked7;

                customConfig.depthLimit = Math.max(res[1].slider, 1);

                config = {
                    ...config,
                    ...customConfig
                };

                return res[0];
            } catch (_) {
                return false;
            }
        })()) exit(0);

        let extn = '';
        if (!isDir) {
            const extname = path.extname(input[0]);
            if (path.parse(input[0]).name != extname) extn = extname;
        }

        if (windows) WinUIWait = winUIWait('Compressing "' + path.parse(inp).name + '"...');

        config.stringify = undefined;

        if (str) {
            const compressed = await compress$1(input[0], config);
            if (output[0] != '') {
                fs.mkdirSync(path.dirname(output[0]), { recursive: true });
                fs.writeFileSync(output[0], compressed, { encoding: 'utf8' });
            }
            if (print) {
                console.log(compressed);
            }
            exit(0);
        }

        const root = path.resolve(currentdir);
        let prev = root;

        function p(to) {
            const abs = path.resolve(to);
            const rel = path.relative(prev, abs);
            prev = path.dirname(abs);
            return rel.replaceAll("\\", "/");
        }

        const files = [];
        for (const file of input.sort((a,b)=>a.localeCompare(b))) {
            const current = p(file);

            files.push([
                (await compressToBase64(current, config)).replace(/=+$/, ''),
                (await compressLargeToBase64(
                    fs.readFileSync(file, { encoding: 'utf8' }), 
                    config
                )).replace(/=+$/, '')
            ]);
        }
        const dirs = [];
        for (const dir of findEmptyDirs(inp)) {
            const current = p(dir);
            dirs.push((await compressToBase64(current, config)).replace(/=+$/, ''));
        }
        
        const startsWithDot = extn[0] == '.';
        fs.writeFileSync(output[0] + (
            addFormat ? format : ''
        ), await toFile(
            isDir,
            extn == '' ? null : (await compressToBase64(
                startsWithDot ? extn.slice(1) : extn, config
            )).replace(/=+$/, ''),
            files,
            dirs,
            checksum,
            startsWithDot
        ));
        exit(0);
    } else {
        if (print && isFile) {
            const e = 'Invalid flags. Cannot decompress JSSC1 archive and print the result.';
            console.log(prefix + e);
            exit(1, e);
        }
        if (windows) WinUIWait = winUIWait('Decompressing "' + path.parse(inp).name + '"...');

        const raw = isFile ? fs.readFileSync(input[0]) : input[0];

        if (str) {
            try {
                const decompressed = await decompress(raw);
                if (output[0] != '') {
                    fs.mkdirSync(path.dirname(output[0]), { recursive: true });
                    fs.writeFileSync(output[0], decompressed, { encoding: 'utf8' });
                }
                if (print) {
                    console.log(decompressed);
                }
                exit(0);
            } catch (err) {
                const e = prefix + 'Input string was corrupted: ' + err;
                console.error(e);
                exit(1, e);
            }
        }

        try {
            const {isDir, extn, files, dirs, startsWithDot} = await fromFile(raw);

            function checkPath(p) {
                const safe = path.resolve(p);
                const root = path.resolve(output[0]);

                if (!safe.startsWith(root + path.sep) && safe !== root) {
                    const e = prefix + 'Attempt to extract a file or directory outside the archive root. The archive may be malicious or corrupted.';
                    console.error(e);
                    exit(1, e);
                }

                return safe;
            }

            let current;
            for (const [filePath, content] of files) {
                const delta = (await decompressFromBase64(filePath)).replaceAll("/", path.sep);

                let fullPath;
                if (typeof current === "undefined") {
                    fullPath = path.resolve(output[0], delta);
                } else {
                    fullPath = path.resolve(path.dirname(current), delta);
                }
                if (!isDir) {
                    fullPath += (startsWithDot ? '.' : '') + await decompressFromBase64(extn);
                }
                current = checkPath(fullPath);

                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.writeFileSync(fullPath, await decompressFromBase64(content), { encoding: "utf8" });
            }
            for (let i = 0; i < dirs.length; i++) {
                const delta = (await decompressFromBase64(dirs[i])).replaceAll("/", path.sep);

                let fullPath;
                if (typeof current === "undefined") {
                    fullPath = path.resolve(output[0], delta);
                } else {
                    fullPath = path.resolve(path.dirname(current), delta);
                }
                current = checkPath(fullPath);

                fs.mkdirSync(fullPath, { recursive: true });
            }
            exit(0);
        } catch (err) {
            const e = prefix + err;
            console.error(e, '\n', err.stack);
            exit(1, e);
        }
    }
})(input, output, config);
