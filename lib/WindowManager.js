

/*
 * Global state management of windows
 */
// TODO: make creating a new browser window async... presently it does a
// few synchonous things
const path = require('path');
const IPCStream = require('electron-ipc-stream');
const TinyTiny = require('tinytiny');
const opn = require('opn');
const fs = require('fs');
const tmp = require('tmp');
const windowStateKeeper = require('electron-window-state');

const WINDOW_PREFS = {
    autoHideMenuBar: true,
    backgroundColor: '#FFFFFFFF',
    icon: 'static/img/icon.png',
    minWidth: 200,
    minHeight: 100,
    show: false,
    webPreferences: {
        textAreasAreResizable: false,
    },
};

const WINDOW_LOAD_NONE = 'none';
const WINDOW_LOAD_SPLASH = 'splash';

const DEFAULT_OPTIONS = {
    windowLoadSequence: WINDOW_LOAD_NONE,
    // windowLoadSequence: WINDOW_LOAD_SPLASH,
    newWindowTitle: 'Editor',
    rememberWindowState: true,
    autoMaximize: false,
    splash: null,
};

let _windowID = 1;
const _nextWindowID = () => _windowID++;

const NOOP = () => {};

class WindowManager {
    constructor(electron, modules, adaptorPath, options = {}) {
        this.electron = electron;
        this.adaptorPath = adaptorPath;
        this.windows = {};
        this.loadedEditorModules = {};
        this.modules = modules;
        this.windowPrefs = Object.assign({}, WINDOW_PREFS, options.windowPrefs);
        this.opts = Object.assign({}, DEFAULT_OPTIONS, options);
        this.htmlRoot = options.htmlRoot;

        this.mainWindowState = null;
        if (this.opts.windowLoadSequence === WINDOW_LOAD_SPLASH) {
            this.windowPrefs.width = 500;
            this.windowPrefs.height = 400;
        }
    }

    setupRememberWindowState() {
        this.mainWindowState = windowStateKeeper({
            defaultWidth: 1024,
            defaultHeight: 768,
            fullscreen: false,
        });
        const { x, y, width, height } = this.mainWindowState;
        Object.assign(this.windowPrefs, { x, y, width, height });
    }

    getEditorClass(typename) {
        const typeInfo = this.modules[typename];
        if (!typeInfo) {
            return null;
        }
        const { module } = typeInfo;
        if (!module) {
            return null;
        }
        if (module instanceof String) {
            return require(module);
        }
        return module;
    }

    getEditorTypeName(editorPath) {
        for (const typename of Object.keys(this.modules)) {
            const { edits } = this.modules[typename];
            if (!edits) {
                continue;
            }

            if (edits instanceof Array) {
                for (const matcher of edits) {
                    if (editorPath.endsWith(matcher)) {
                        return typename; // found
                    }
                }
            } else {
                // Assume is function
                if (edits(editorPath)) {
                    return typename; // found
                }
            }
        }
        return null;
    }

    mount(windowInfo, editorPath, selector, callback = NOOP, ...loadArgs) {
        if (!windowInfo) {
            throw new Error('must specify windowInfo');
        }

        // Get editor type name
        const typename = this.getEditorTypeName(editorPath);
        if (!typename) {
            throw new Error(`Cannot find editor for type ${editorPath}`);
        }

        const typeInfo = this.modules[typename];
        if (!typeInfo) {
            throw new Error(`Cannot mount unknown type "${typename}"`);
        }

        const EditorClass = this.getEditorClass(typename);
        const tagname = typeInfo.tagname || typename;
        // const editor_path = `../modules/${partial_path}`;
        const { browserWindow } = windowInfo;

        const ipcSend = (subchannel, arg) => {
            browserWindow.webContents.send(`${editorPath}:${subchannel}`, arg);
        };

        // Maintain a cache
        let editorInstance;
        let wasNewlyCreated = false;
        if (this.loadedEditorModules[editorPath]) {
            editorInstance = this.loadedEditorModules[editorPath];
        } else {
            editorInstance = new EditorClass(this, windowInfo, editorPath, ipcSend);
            this.loadedEditorModules[editorPath] = editorInstance;
            wasNewlyCreated = true;
        }

        this.mountEditor(browserWindow, editorInstance, selector, { loadArgs,
            tagname,
            callback: () => {
                // Add in one-time head and CSS
                if (wasNewlyCreated) {
                    if (editorInstance.getCSS) {
                        // has global css to insert
                        browserWindow.webContents.insertCSS(editorInstance.getCSS());
                    }

                    if (editorInstance.getHead) {
                        // might have global <head></head> contents to insert
                        console.error('getHead no longer supported');
                        // mountPayload.htmlHead = editorInstance.getHead();
                    }

                    // Once its ready, call any relevant callback
                    editorInstance.on('ready', callback);
                }
            },
        });
        return editorInstance;
    }

    mountEditor(browserWindow, editorInstance, selector, opts) {
        const { tagname, loadArgs, callback } = Object.assign({
            loadArgs: [],
            callback: NOOP,
        }, opts);

        const mountPayload = {
            prefix: `${editorInstance.path}:`,
            tagname,
            selector,
        };

        editorInstance.load(() => {
            // Set up initial opts
            const opts = JSON.stringify(editorInstance.getProps(true));
            mountPayload.opts = opts;
            browserWindow.webContents.send('mount:editor', mountPayload);
            callback();
        }, ...loadArgs);
        return editorInstance;
    }

    createWindow(editorPath, callback = NOOP, ...args) {
        // If necessary, restore previous state
        if (this.opts.rememberWindowState) {
            this.setupRememberWindowState();
        }

        // Actually create the new Browser window
        const browserWindow = new this.electron.BrowserWindow(this.windowPrefs);

        // If necessary, set the window state manager to manage the current
        // browser window
        if (this.opts.rememberWindowState) {
            this.mainWindowState.manage(browserWindow);
            browserWindow.hide();
        }

        // Keep track of all windows
        const windowID = _nextWindowID();
        const windowInfo = { windowID, browserWindow, editorPath };
        this.windows[windowID] = windowInfo;

        // Set up kick off event
        const ipc = this.electron.ipcMain;

        let editorInstance = null;

        // mount:ready means we finally mount the top-level editor Module
        ipc.on('mount:ready', (ev) => {
            editorInstance = this.mount(windowInfo, editorPath, '#main', () => {
                // Maximize the window
                if (this.opts.autoMaximize) {
                    browserWindow.maximize();
                }
                browserWindow.show();
                browserWindow.webContents.send('mount:hidesplash');
                callback(editorInstance);
            }, ...args);
        });

        // Helper function to log to main process stdout
        ipc.on('_log', (ev, payload) => {
            console.log('----', payload);
        });

        // Apply template
        const newText = this.getIndexContents(this.getIndexContext());

        // and load the index.html of the app.
        const mainPath = this.getIndexPath();
        fs.writeFileSync(mainPath, newText);
        browserWindow.loadURL(`file://${mainPath}`);

        if (this.opts.windowLoadSequence === WINDOW_LOAD_SPLASH) {
            browserWindow.once('ready-to-show', () => {
                // Show when ready
                browserWindow.show();
            });
        }

        // Open the DevTools if env variable set
        if (process.env.ELMOED_DEBUGGING_DEV_TOOLS) {
            browserWindow.webContents.openDevTools();
        }

        // Prevent all navigation, instead opening links in browser
        browserWindow.webContents.on('will-navigate', (ev, url) => {
            ev.preventDefault();
            opn(url); // open the URL in the preferred browser
        });

        // Emitted when the window is closed.
        browserWindow.on('closed', () => {
            // Dereference the window object, and if the editor has it
            // available, do extra cleanup
            if (editorInstance.onWindowClosed) {
                editorInstance.onWindowClosed();
            }
            this.destroyWindow(windowID);
        });

        return windowID;
    }

    getIndexContents(ctx) {
        const htmlPath = path.resolve(__dirname, '..', 'static', 'index.html');
        const templateText = fs.readFileSync(htmlPath).toString();
        const template = TinyTiny(templateText);
        return template(ctx);
    }

    getModules() {
        return Object.keys(this.modules)
            .filter(key => !key.startsWith('_'))
            .map(key => this.modules[key]);
    }

    getLinked() {
        // Prep all linked / included files (via CSS, link HTML
        // includes, node require, or script tags)
        const result = { script: [], html: [], css: [], require: [] };
        const _pushLinks = (mod) => {
            for (const key of Object.keys(result)) {
                if (!mod._preload || !mod._preload[key]) {
                    continue;
                }
                let arr = mod._preload[key];
                arr = Array.isArray(arr) ? arr : [arr];
                result[key].push(...arr);
            }
        };
        _pushLinks(this.modules); // global preloaded file
        for (const modInfo of this.getModules()) { // per-module
            _pushLinks(modInfo);
        }
        return result;
    }

    getIncludeHead() {
        // Prep all includes, both global and per-module
        const includeHead = [];
        const headFiles = [];
        const _getInclude = (mod) => {
            const arr = (mod._include && mod._include.head) || [];
            return Array.isArray(arr) ? arr : [arr];
        };
        headFiles.push(..._getInclude(this.modules)); // global
        for (const modInfo of this.getModules()) { // per-module
            headFiles.push(..._getInclude(modInfo));
        }

        // Read in contents of includes
        for (const path of headFiles) {
            includeHead.push(fs.readFileSync(path, 'utf-8'));
        }
        return includeHead;
    }


    /*
        Generates Template context to render the index.html
    */
    getIndexContext() {
        const mounterPath = path.resolve(__dirname, '..', 'static', 'Mounter.js');
        // this.relativize(script, require, html, css);
        const { script, require, html, css } = this.getLinked();
        return {
            title: this.opts.newWindowTitle,
            adaptorPath: this.adaptorPath,
            windowLoadSequence: this.opts.windowLoadSequence,
            splash: this.opts.splash,
            includeHead: this.getIncludeHead(),
            preloadScripts: script,
            preloadRequires: require,
            preloadHTML: html,
            preloadCSS: css,
            mounterPath,
        };
    }

    getIndexPath() {
        if (this.htmlRoot) {
            return path.resolve(this.htmlRoot, 'index.html.templated');
        }
        return path.resolve(__dirname, '..', 'static', 'index.html.templated');
    }

    getIPCStream(windowInfo, path, subchannel) {
        if (!windowInfo) {
            throw new Error('Need to specify windowInfo');
        }

        const { browserWindow } = windowInfo;
        return new IPCStream(`${path}:${subchannel}`, browserWindow);
    }

    destroyWindow(id) {
        delete this.windows[id];
    }
}

module.exports = WindowManager;
