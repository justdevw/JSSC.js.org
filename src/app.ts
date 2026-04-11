import { Elem } from "./main";
import prettyBytes from 'pretty-bytes';

declare global {
    interface Window {
        JSSC: {
            compress(input: any, options?: any): Promise<string>;
            decompress(input: any): Promise<any>;
            worker: {
                url: string;
            }
        };
        monaco: any
    }
}

const nothing = '<span>(nothing)</span>';

function toBin(str: string, mode: string = 'Bytes'): [number, string] {
    const input = str.split('');
    const output = [];
    let max = 0;
    switch (mode) {
        case 'Bytes': default:
            for (const char of input) {
                const codes = char.charCodeAt(0).toString(2).padStart(16, '0');
                const code1 = parseInt(codes.slice(0,8), 2).toString(16);
                const code2 = parseInt(codes.slice(8), 2).toString(16);
                max = Math.max(max, code1.length, code2.length);
                output.push(code1, code2);
            }
            break;
        case 'Chars':
            for (const char of input) {
                const code = char.charCodeAt(0).toString(16);
                max = Math.max(max, code.length);
                output.push(code);
            }
            break;
        case 'Codes':
            for (const char of input) {
                const code = char.charCodeAt(0).toString();
                max = Math.max(max, code.length);
                output.push(code);
            }
    }
    let id = 0;
    for (const char of output) {
        output[id++] = char.padStart(max, '0').toUpperCase();
    }
    return [max, output.length ? '<span>' + output.join('</span><span>') + '</span>' : nothing];
}

function update(inp: HTMLDivElement, out: HTMLDivElement, hide1: boolean, hide2: boolean): void {
    [inp.style.maxHeight, out.style.maxHeight] = [inp.offsetHeight + 'px', out.offsetHeight + 'px'];
    if (hide1) inp.style.opacity = '0.5'; else inp.style.opacity = '';
    if (hide2) out.style.opacity = '0.5'; else out.style.opacity = '';
}

function inputPlaceholder(mode: string) {
    return `Enter text to ${mode}…`;
}
function outputPlaceholder(mode:string) {
    let modeArr = mode.split('');
    modeArr[0] = modeArr[0].toUpperCase();
    mode = modeArr.join('');
    return `${mode}ed result`;
}

function stringChunks(str : string, num : number): string[] {
    const output = [];
    for (let i = 0; i < str.length; i += num) {
        output.push(str.slice(i, i + num));
    }
    return output;
}
const encodings = [
    '00: JSSCBASE',
    '01: JSSCRU',
    '02: JSSCENRU',
    '03: JSSCENKK',
    '04: JSSCHI',
    '05: JSSCENHI',
    '06: JSSCBN',
    '07: JSSCENBN',
    '08: JSSCHIBN',
    '09: JSSCJA',
    '10: JSSCTelu',
    '11: JSSCMR',
    '12: JSSCB',
    '13: JSSCE',
    '14: JSSCAR',
    '15: (reserved)'
];
const modes = [
    '00: No Compression',
    '01: Two-Digit CharCode Concatenation',
    '02: Two-Byte CharCode Concatenation',
    '03: Decimal Integer Packing',
    '04: Alphabet Encoding',
    '05: Character Encoding',
    '06: Inline Integer Encoding',
    '07: Frequency Map',
    '08: URL',
    '09: Segmentation',
    '10: String Repetition',
    '31: (reserved)',
    '12: (reserved)',
    '13: (reserved)',
    '14: (reserved)',
    '15: (reserved)',
    '16: (reserved)',
    '17: (reserved)',
    '18: (reserved)',
    '19: (reserved)',
    '20: (reserved)',
    '21: (reserved)',
    '22: (reserved)',
    '23: (reserved)',
    '24: (reserved)',
    '25: (reserved)',
    '26: (reserved)',
    '27: (reserved)',
    '28: (reserved)',
    '29: (reserved)',
    '30: (reserved)',
    '11: Recursive Compression',
];
const types = [
    'String',
    'Object',
    'Object',
    'Array',
    'Array',
    'Object',
    'Object',
    'Unknown'
]

function visualrow(key: string, value: string): string {
    return `<div>${key}:<span>${value}</span></div>`;
}
function visualdata(char: string, small: boolean): string {
    const code = char.charCodeAt(0);
    const bin = code.toString(2).padStart(16, '0');
    const bytes = stringChunks(bin, 4).join(' ');
    const mode = parseInt(bin.slice(11), 2);
    
    const code2 = parseInt(bin.slice(0,4), 2);
    const code3 = parseInt(bin.slice(5,8), 2);

    const begin = bin.slice(10,11) == '0';
    const isInt = (mode == 3 && begin) || mode == 6;
    const isNum = mode == 0 || mode == 6;

    return visualrow('Character', 'U+'+code.toString(16).padStart(4, '0').toUpperCase()) + 
    visualrow('Binary', bytes) + visualrow('Mode', modes[mode]) + (small ? '' : (
        (
            mode == 5 ? visualrow('Character Encoding', encodings[code2]) : visualrow(
                isNum ? 'Integer' : 'Code', 
                (
                    isNum ? code2 - 1 : code2
                ).toString(
                    isNum ? 10 : 16
                )
            )
        ) + 
        visualrow('Type', 
            isInt ? 'Integer' : types[code3]
        )
    ));
}

export function initDemo(demo: HTMLElement) {
    window.JSSC.worker.url = 'https://jssc.js.org/worker.min.js';
    const input = Elem('input') as HTMLTextAreaElement;
    const output = Elem('output') as HTMLTextAreaElement;
    const inp = Elem('inp') as HTMLDivElement;
    const out = Elem('out') as HTMLDivElement;
    const data = Elem('data') as HTMLDivElement;
    const bin = Elem('bin') as HTMLElement;
    let mode = window.JSSC.compress;
    
    const options = {
        visual: Elem('visual') as HTMLSelectElement,
        mode: Elem('mode') as HTMLSelectElement,
        JUSTC: Elem('justc') as HTMLSelectElement,
        segmentation: Elem('segmentation') as HTMLSelectElement,
        recursive: Elem('recursive') as HTMLSelectElement,
        stringify: Elem('stringify') as HTMLSelectElement,
    };
    const opts = {
        JUSTC: true,
        segmentation: true,
        recursive: true,
        stringify: false,
    };

    let [hide1, hide2] = [true, true];

    update(inp, out, hide1, hide2);
    window.addEventListener('resize', () => update(inp, out, hide1, hide2));

    [inp.innerHTML, out.innerHTML] = [nothing, nothing];
    async function run() {
        try {
            let [w1, w2] = [0,0];
            [w1, inp.innerHTML] = toBin(input.value, options.visual.value);
            inp.setAttribute('w', String(w1));
            hide1 = w1 == 0;
            update(inp, out, hide1, hide2);

            const options_ = mode == window.JSSC.compress ? {
                ...opts,
                recursiveCompression: opts.recursive,
                recursive: undefined,
                stringify: undefined,
            } : opts.stringify;
            output.value = await mode(input.value, options_);
            output.style.color = '';
            [w2, out.innerHTML] = toBin(output.value, options.visual.value);
            out.setAttribute('w', String(w2));
            hide2 = w2 == 0;
            update(inp, out, hide1, hide2);

            const datachar = mode == window.JSSC.compress ? output.value[0] : input.value[0];
            data.innerHTML = visualdata(datachar, mode == window.JSSC.decompress);

            const inputBits = input.value.length * 16;
            const outputBits = output.value.length * 16;
            const ratio = Math.round(inputBits / outputBits * 1e3) / 1e3;
            const savedBits = inputBits - outputBits;
            bin.style.setProperty('--ratio', "'" + String(ratio) + "'");
            bin.style.setProperty('--saved', "'" + prettyBytes(savedBits, {
                maximumFractionDigits: 3,
                locale: 'en-US'
            }) + "'");

            inp.style.setProperty('--size', "'" + prettyBytes(inputBits, {maximumFractionDigits: 5, locale: 'en-US'}) + "'");
            out.style.setProperty('--size', "'" + prettyBytes(outputBits,{maximumFractionDigits: 5, locale: 'en-US'}) + "'");
        } catch (error) {
            console.error(error);
            for (const e of [inp, out, data]) {
                e.innerHTML = '<span>(error)</span>';
                if (e != data) e.setAttribute('w', '0');
            }
            update(inp, out, true, true);
            output.value = error as string;
            output.style.color = 'red';

            bin.style.removeProperty('--ratio');
            bin.style.removeProperty('--saved');
            inp.style.removeProperty('--size');
            out.style.removeProperty('--size');
        }
    }
    input.addEventListener('input', run);

    options.visual.addEventListener('change', () => {
        demo.setAttribute('v', options.visual.value);

        if (input.value) {
            let [w1, w2] = [0,0];
            [w1, inp.innerHTML] = toBin(input.value, options.visual.value);
            [w2, out.innerHTML] = toBin(output.value,options.visual.value);

            inp.setAttribute('w', String(w1));
            out.setAttribute('w', String(w2));

            [hide1, hide2] = [w1 == 0, w2 == 0];
            update(inp, out, hide1, hide2);
        }
    });
    options.mode.addEventListener('change', async () => {
        demo.setAttribute('m', options.mode.value);

        if (options.mode.value == 'c') mode = window.JSSC.compress;
        else mode = window.JSSC.decompress;

        const mode_ = (options.mode.value == 'd' ? 'de' : '') + 'compress';
        input.placeholder = inputPlaceholder(mode_);
        output.placeholder = outputPlaceholder(mode_);

        await run();
    });

    for (const name of [
        'JUSTC', 'segmentation', 'recursive'
    ]) options[name as keyof typeof options].addEventListener('change', async () => {
        opts[name as keyof typeof opts] = options[name as keyof typeof options].value == 'y';

        await run();
    });
}
