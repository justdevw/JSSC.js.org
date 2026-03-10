#!/usr/bin/env node
import require$$0 from 'child_process';
import require$$1 from 'fs';
import require$$2 from 'path';
import require$$3 from 'os';

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var uninstall$1 = {};

var hasRequiredUninstall;

function requireUninstall () {
	if (hasRequiredUninstall) return uninstall$1;
	hasRequiredUninstall = 1;
	const isESM = import.meta.url !== undefined;

	if (process.platform !== "win32") {
	    process.exit(0);
	}

	async function loadModules() {
	    if (isESM) {
	        const { execSync } = await import('child_process');
	        const fs = await import('fs');
	        const path = await import('path');
	        const os = await import('os');
	        return { execSync, fs, path, os };
	    } else {
	        return {
	            execSync: require$$0.execSync,
	            fs: require$$1,
	            path: require$$2,
	            os: require$$3
	        };
	    }
	}

	async function uninstall() {
	    const { execSync, fs, path, os } = await loadModules();
	    
	    const APP_NAME = "JSSC";
	    const EXT = ".jssc";
	    
	    const installDir = path.join(
	        process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
	        "JSSC"
	    );
	    
	    function run(cmd) {
	        try {
	            execSync(cmd, { stdio: "ignore", windowsHide: true });
	        } catch {}
	    }
	    
	    run(`reg delete "HKCU\\Software\\Classes\\${EXT}" /f`);
	    run(`reg delete "HKCU\\Software\\Classes\\${APP_NAME}" /f`);
	    run(`reg delete "HKCU\\Software\\Classes\\*\\shell\\JSSC" /f`);
	    run(`reg delete "HKCU\\Software\\Classes\\Directory\\shell\\JSSC" /f`);
	    
	    if (fs.existsSync(installDir)) {
	        try { fs.rmSync(installDir, { recursive: true, force: true }); } catch {}
	    }
	    
	}

	uninstall().catch(console.error);
	return uninstall$1;
}

var uninstallExports = requireUninstall();
var uninstall = /*@__PURE__*/getDefaultExportFromCjs(uninstallExports);

export { uninstall as default };
