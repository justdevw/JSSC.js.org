import './style.css';
import './navbar/';
import './glass/';

declare global {
    interface Window {
        anime: {
            createDraggable(...input: any): any;
            spring(...input: any): any;
        }
    }
}

export function Elem(id: string): HTMLElement | any {
    return document.getElementById(id);
}
import { initDemo } from './app';

const hero = Elem('hero');
const demo = Elem('demo');
const logo = Elem('logo') as HTMLImageElement | null;
const bin = Elem('bin');
const opt = Elem('run');
const c = Elem('c');
const txt = Elem('1st');

if (logo) logo.style.scale = '1.75';
for (const e of [bin, opt, c, txt]) if (e) {
    if (e != txt) e.style.opacity = '0';
    e.style.filter = 'blur(16px)';
};

setTimeout(()=>{
    document.documentElement.style.opacity = '1';
}, 100);
document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
    if (!logo || !hero || !demo || !bin || !opt || !c) return;

    logo.style.transform = 'translateY(62px) scaleY(1.4)';
    logo.style.filter = 'blur(1px)';
    hero.style.pointerEvents = 'none';
    logo.style.scale = '1';
    document.documentElement.style.setProperty('--glass', 'url(#glass)');
    logo.style.translate = '0px 0px';
    logo.style.top = '0px';
    logo.style.transition = '400ms';

    setTimeout(() => {
        logo.style.transform = 'translateY(62px) scaleY(1) scaleX(1.1)';
        logo.style.filter = 'blur(0px)';
        logo.style.translate = '';
        logo.style.top = '';
        logo.style.position = '';
        logo.style.transition = '';
    }, 400);

    setTimeout(() => {
        demo.style.opacity = '1';
        demo.style.zIndex = '3';
        logo.src = '/jssc.png';
        logo.style.transform = 'translateY(62px)';
        logo.style.animation = 'var(--anim-duration) logo var(--anim-timing-function) infinite';
        demo.style.filter = '';
        txt.style.filter = '';
        logo.style.filter = 'contrast(0) brightness(2)';
        initDemo(demo);
    }, 600);
    setTimeout(() => {
        bin.style.opacity = '1';
        bin.style.filter = '';
    }, 700);
    setTimeout(() => {
        opt.style.opacity = '1';
        opt.style.filter = '';
    }, 800);
    setTimeout(() => {
        c.style.opacity = '0.5';
        c.style.filter = '';
    }, 900);
}, 900));
