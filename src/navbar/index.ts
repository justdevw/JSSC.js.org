import './style.css';

class navbar extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <nav class="navbar">
                <div class="nav-left">
                    <span class="brand">JavaScript String Compressor</span>
                    <span class="brand ss">JSSC</span>
                </div>

                <div class="nav-center">
                    <a
                        href="/download"
                        class="docs-link"
                        aria-label="Download"
                        id="d1"
                    >
                        <span>Download</span>
                    </a>
                </div>

                <div class="nav-right">
                    <a
                        href="/download"
                        class="docs-link ss"
                        aria-label="Download"
                        id="d2"
                    >
                        <span class="ss">Download</span>
                    </a>
                    <hr style="
                        height: 32px;
                        width: 2px;
                        background: var(--dark);
                        color: transparent;
                        opacity: 0.5;
                    " class="ss" >
                    <a
                        href="/docs/"
                        class="docs-link"
                        aria-label="Documentation"
                    >
                        <span>Documentation</span>
                        <span class="ss">Docs</span>
                    </a>
                    <a
                        href="https://github.com/JustDeveloper1/JSSC"
                        target="_blank"
                        aria-label="GitHub"
                        class="github-link"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.48 0 12.24c0 5.41 3.44 10 8.2 11.63.6.11.82-.27.82-.6 0-.3-.01-1.1-.02-2.16-3.34.75-4.04-1.66-4.04-1.66-.55-1.42-1.34-1.8-1.34-1.8-1.1-.77.08-.76.08-.76 1.22.09 1.86 1.29 1.86 1.29 1.08 1.9 2.84 1.35 3.54 1.03.11-.8.42-1.35.76-1.66-2.66-.31-5.46-1.36-5.46-6.05 0-1.34.47-2.44 1.24-3.3-.13-.31-.54-1.57.12-3.27 0 0 1.01-.33 3.3 1.26a11.2 11.2 0 013-.42c1.02 0 2.05.14 3 .42 2.28-1.59 3.29-1.26 3.29-1.26.66 1.7.25 2.96.12 3.27.77.86 1.24 1.96 1.24 3.3 0 4.7-2.8 5.74-5.47 6.04.43.38.81 1.13.81 2.28 0 1.65-.02 2.98-.02 3.39 0 .33.22.72.83.6C20.56 22.24 24 17.65 24 12.24 24 5.48 18.63 0 12 0z"/>
                        </svg>
                    </a>
                </div>
            </nav>`;
    }
};

customElements.define('demo-nav', navbar);