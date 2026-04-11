import { Elem } from "./main";
import prettyBytes from 'pretty-bytes';

declare global {
    interface Window {
        JSSC: {
            compress(input: any, options?: any): Promise<string>;
            worker: {
                url: string;
            }
        };
        anime: {
            createDraggable(...input: any): any;
            spring(...input: any): any;
        }
    }
}

function toBin(str: string): [number, string] {
    const input = str.split('');
    const output = [];
    let max = 0;
    for (const char of input) {
        const codes = char.charCodeAt(0).toString(2).padStart(16, '0');
        const code1 = parseInt(codes.slice(0,8), 2).toString(16);
        const code2 = parseInt(codes.slice(8), 2).toString(16);
        max = Math.max(max, code1.length, code2.length);
        output.push(code1, code2);
    }
    let id = 0;
    for (const char of output) {
        output[id++] = char.padStart(max, '0').toUpperCase();
    }
    return [max, output.length ? '<span>' + output.join('</span><span>') + '</span>' : ''];
}

function _hide(bin: HTMLElement) {
    bin.style.display = 'none';
}
function hide(anim: boolean, bin: HTMLElement) {
    bin.style.maxHeight = '0px';
    bin.style.padding = '0px';
    setTimeout(()=>_hide(bin), anim ? 300 : 0);
}
function show(bin: HTMLElement) {
    bin.style.display = '';
    setTimeout(()=>{
        bin.style.maxHeight = '';
        bin.style.padding = '';
    }, 1);
}

export function initDemo(demo: HTMLElement) {
    window.JSSC.worker.url = 'https://jssc.js.org/worker.min.js';

    const trigger = Elem('run') as HTMLButtonElement;
    const input = Elem('input') as HTMLTextAreaElement;
    const output = Elem('output') as HTMLTextAreaElement;
    const inp = Elem('inp') as HTMLDivElement;
    const out = Elem('out') as HTMLDivElement;
    const bin = Elem('bin') as HTMLElement;

    let data = input.value;

    hide(false, bin);

    function run() {
        trigger.removeAttribute('data-grab');
        data = input.value;

        [inp.innerHTML, out.innerHTML] = ['', ''];
        show(bin);

        trigger.classList.add('run');
        trigger.innerText = '\u200b';
        
        const a = Date.now();

        let [w1, w2] = [0,0];
        setTimeout(()=>{window.JSSC.compress(data).then((result: string)=>{
            const b = Date.now();
            output.value = result;

            [w1, inp.innerHTML] = toBin(data);
            [w2, out.innerHTML] = toBin(result);

            inp.setAttribute('w', String(w1));
            out.setAttribute('w', String(w2));

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

            setTimeout(()=>{
                trigger.innerText = 'Compress';
                trigger.classList.remove('run');
            }, Math.max((a + 700) - b, 1))
        })},300);
    }

    window.anime.createDraggable('#run', {
        container: [0, 0, 0, 0],
        releaseEase: window.anime.spring({
            stiffness: 150,
            damping: 15
        }),
        onDrag: ()=>trigger.setAttribute('data-grab', 'true'),
        onRelease: ()=>run(),
        cursor: {
            onHover: 'pointer',
            onGrab: 'grabbing'
        },
        dragThreshold: 10
    });

    window.addEventListener('keypress', (event)=>{
        if (event.key == 'Enter' && event.target != input) run();
    });

    input.addEventListener('input', ()=>{
        if (input.value != data) hide(true, bin);
        else show(bin);
    });
}
