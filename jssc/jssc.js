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

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('justc')) :
  typeof define === 'function' && define.amd ? define(['exports', 'justc'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.JSSC = {}, global.JUSTC));
})(this, (function (exports, JUSTC) { 'use strict';

  var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
  var version$1 = "2.1.0-test";
  var pkg = {
  	version: version$1};

  const name__ = 'JSSC';
  const prefix = name__+': ';

  const version = pkg.version;

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

  async function runInWorkers(candidateNames, context, workerURL) {
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
                      new URL(workerURL, (typeof document === 'undefined' && typeof location === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : typeof document === 'undefined' ? location.href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('jssc.js', document.baseURI).href))),
                      { type: 'module' }
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

  function setMaxCache(number) {
      if (typeof number != 'number') throw new Error(prefix+'Invalid argument 0');
      const imh = isMemHigh();
      if (number < maxCache || imh) clear(imh);
      maxCache = number;
  }
  function getMaxCache() {
      return maxCache;
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
  /*          Code 1 usage table          */ /* Mode ID */
  /* ------------------------------------ */ /* ------- */
  /* 00: No Compression                   */ /* 00      */
  /* 01: Two-Digit CharCode Concatenation */ /* 01      */
  /* 02: Two-Byte CharCode Concatenation  */ /* 02      */
  /* 03: Decimal Integer Packing          */ /* 03      */
  /* 04: Alphabet Encoding                */ /* 04      */
  /* 05: Character Encoding               */ /* 05      */
  /* 06: Inline Integer Encoding          */ /* 06      */
  /* 07: Frequency Map                    */ /* 07      */
  /* 08: URL                              */ /* 08      */
  /* 09: Segmentation                     */ /* 09      */
  /* 10: String Repetition                */ /* 10      */
  /* 11: Emoji Packing                    */ /* 12      */
  /* 12: Base-64 Integer Encoding         */ /* 13      */
  /* 13: Base-64 Packing                  */ /* 14      */
  /* 14: Segmentation                     */ /* 17      */
  /* 15 - 28: Reserved                    */ /* --      */
  /* 29: lzstring                         */ /* 16      */
  /* 30: Offset Encoding                  */ /* 15      */
  /* 31: Recursive Compression            */ /* 11      */

  async function tryRecursive(base, opts) {
      if (!opts.recursivecompression) return base;

      let cur = base;
      let depth = 0;

      while (depth < 15) {
          depth++;
          const next = await compress(cur, {
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
                  mode: binToDec(code1)
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

  /**
   * **JavaScript String Compressor - compress function.**
   * @param {string|object|number} input string
   * @param {{segmentation?: boolean, recursiveCompression?: boolean, JUSTC?: boolean, base64IntegerEncoding?: boolean, base64Packing?: boolean, offsetEncoding?: boolean, lzstring?: boolean, offsetEncode?: boolean, minifiedworker?: boolean, depthLimit?: number, workerLimit?: number, debug?: boolean}} [options]
   * @returns {Promise<string>} Compressed string
   * @example await compress('Hello, World!');
   * @since 1.0.0
   */
  async function compress(input, options) {
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
              if (opts.justc) {
                  const JUSTCobj = await toJUSTC(str);
                  str = JUSTCobj;
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
              
              const JUSTCobj = opts.justc ? await toJUSTC(obj) : false;

              if (JUSTCobj && JUSTCobj.length < str.length && str == JSON.stringify(obj)) {                
                  str = JUSTCobj;
                  code3 = 1;
              } else {
                  str = str.slice(1,-1);
                  code3 = 5;
              }
          } else if (typeof obj == 'object') {
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
      ];
      async function noWorkers() {
          return await Promise.all(candidates.map(fn => safeTry(async () => await fn(context))));
      }

      let usedWorkers = false;
      if (!(opts.worker > opts.workerlimit) && originalInput.length > 64 && await canUseWorkers()) {
          results = await runInWorkers(candidates.map(fn => fn.name), context, opts.minifiedworker ? workerMin : workerURL);
          usedWorkers = true;
      } else results = await noWorkers();

      if (usedWorkers && (
          !Array.isArray(results) ||
          results.length == 0 ||
          results.every(c => c == null)
      )) {
          /* workers failed */
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
              if (strcodes.code2 > 0) return await processOutput(String(strcodes.code2 - 1));
              return await processOutput(realstr);
          case 1:
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
          case 2:
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
          case 3:
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
          case 4:
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
          case 5:
              const decoded = characterEncodings(strcodes.code2, realstr);
              if (decoded) {
                  return await processOutput(decoded);
              } else throw new Error(prefix+'Invalid compressed string');
          case 7:
              const splitter = freqMapSplitters[binToDec(decToBin(strcodes.code2).slice(1))];
              let output_ = freqMap.decompress(realstr, splitter);
              if (parseInt(decToBin(strcodes.code2).slice(0,1)) == 1) output_ = output_.slice(0,-1);
              return await processOutput(output_);
          case 8: {
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
          case 9: {
              let idx = 0;
              const segCount = strcodes.code2 < 15 ? strcodes.code2 + 2 : realstr.charCodeAt(idx++) + 2;

              for (let i = 0; i < segCount; i++) {
                  const len = realstr.charCodeAt(idx++);
                  const segmentCompressed = realstr.slice(idx);

                  const seg = (await decompress(
                      segmentCompressed, true
                  )).slice(0, len);

                  output.push(seg);
                  idx += (await compress(seg, {segmentation: false, justc: strcodes.repeatAfter, recursivecompression: strcodes.sequences})).length;
              }

              return await processOutput(output.join(''));}
          case 10:
              const sliceChar = strcodes.code2 == 15;
              const repeatCount = sliceChar ? realstr.charCodeAt(0) + 15 : strcodes.code2;
              if (sliceChar) realstr = realstr.slice(1);
              return await processOutput(realstr.repeat(repeatCount));
          case 11: {
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
          case 12:
              return checkOutput(await decompress(
                  await processOutput(convertBase$1(realstr, 64, 10), false)
              ));
          case 13:
              let len = strcodes.code2;
              let slice = len == 16;
              if (slice) len = realstr.slice(0,1).charCodeAt(0) + 16;
              return await processOutput(decompressB64(slice ? realstr.slice(1) : realstr, len));
          case 14:
              let i = 0;
              while (i < realstr.length) {
                  const length = realstr.charCodeAt(i) + i;
                  i++;
                  output.push(await decompress(realstr.slice(i, length)));
              }
              return checkOutput(output.join(''));
          case 29:
              return await processOutput(dLZ(realstr));
          case 30:
              const dec = offsetDecoding(realstr, binToDec(decToBin(charcode, 16).slice(0,11)));
              return checkOutput(await decompress(dec));
          case 31: {
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

  async function compressToBase64(...input) {
      const compressed = await compress(...input);

      if (compressed instanceof JSSC) throw new Error(prefix+'Invalid options input.');

      return B64Padding(encode(compressed));
  }
  async function decompressFromBase64(base64, ...params) {
      const decompressed = await decompress(decode(base64.replace(/=+$/, '')), ...params);

      if (decompressed instanceof JSSC) throw new Error(prefix+'Invalid options input.');

      return decompressed;
  }

  async function compressLarge(input, ...params) {
      const LENGTH = 1024;
      const result = [charCode(cryptCharCode(14, false))];
      
      for (let i = 0; i < input.length; i += LENGTH) {
          const chunk = input.slice(i, i + LENGTH);
          const compressed = await compress(chunk, ...params);
          result.push(String.fromCharCode(compressed.length), compressed);
      }

      return result.join('');
  }
  async function compressLargeToBase64(...input) {
      const compressed = await compress(...input);

      if (compressed instanceof JSSC) throw new Error(prefix+'Invalid options input.');

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
      output = await compress(output, {
          JUSTC: false,
          segmentation: false,
          recursiveCompression: false,
          base64IntegerEncoding: false,
          depth: opts.depth + 1,
      });
      output = charCode(cryptCharCode(12, false, isNum, RLE, -1, 0, seq, code3)) + output;
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
          const compressed = await compress(seg, segOpts);

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
      if (length > 15) {
          const lng = length - 16;
          if (lng > 0xFFFF) return null;
          len = String.fromCharCode(lng);
      }

      const res = charCode(cryptCharCode(13, false, repeatBefore, false, beginId, Math.min(length, 16), false, code3)) + len + data;
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
      const res = enc[1] + await compress(enc[0], {
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
      const res = charCode(cryptCharCode(29, false, repeatBefore, false, beginId, 0, false, code3)) + cLZ(str);
      if (await validate(res, originalInput)) return res;
      return null;
  }

  if ((String.fromCharCode(65536).charCodeAt(0) === 65536) || !(String.fromCharCode(256).charCodeAt(0) === 256)) {
      throw new Error(prefix+'Supported UTF-16 only!')
  }

  const cache = {
      get['max'] () {
          return getMaxCache();
      },
      set['max'] (number) {
          setMaxCache(number);
      },
      get['clear'] () {
          return function() {
              validateCache.clear();
          }
      },
      get['size'] () {
          return validateCache.size;
      }
  };

  exports.cache = cache;
  exports.compress = compress;
  exports.compressLarge = compressLarge;
  exports.compressLargeToBase64 = compressLargeToBase64;
  exports.compressToBase64 = compressToBase64;
  exports.decompress = decompress;
  exports.decompressFromBase64 = decompressFromBase64;
  exports.version = version;

}));
