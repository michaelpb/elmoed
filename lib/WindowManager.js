'use strict';

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

const WINDOW_PREFS = {
    width: 500,
    height: 400,
    autoHideMenuBar: true,
    backgroundColor: '#FFFFFFFF',
    icon: 'static/img/icon.png',
    "min-width": 200,
    "min-height": 100,
    "web-preferences": {
        "text-areas-are-resizable": false,
    },
};

const WINDOW_LOAD_NONE = 'none';
const WINDOW_LOAD_SPLASH = 'splash';

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
        this.newWindowTitle = options.newWindowTitle || 'Editor';
        this.windowLoadSequence = options.windowLoadSequence || WINDOW_LOAD_SPLASH;
        this.splash = options.splash || null; // use default if null
        this.htmlRoot = options.htmlRoot;
    }

    getEditorClass(typename) {
        const typeInfo = this.modules[typename];
        if (!typeInfo) {
            return null;
        }
        const {module} = typeInfo;
        if (!module) {
            return null;
        }
        if (module instanceof String) {
            return require(module);
        } else {
            return module;
        }
    }

    getEditorTypeName(editorPath) {
        for (const typename of Object.keys(this.modules)) {
            const {edits} = this.modules[typename];
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

    mount(windowInfo, editorPath, selector, callback=NOOP, ...loadArgs) {
        if (!windowInfo) {
            throw new Error('must specify windowInfo');
        }

        // Get editor type name
        const typename = this.getEditorTypeName(editorPath);
        if (!typename) {
            throw new Error('Cannot find editor for type ' + editorPath);
        }

        const typeInfo = this.modules[typename];
        if (!typeInfo) {
            throw new Error(`Cannot mount unknown type "${typename}"`);
        }

        const EditorClass = this.getEditorClass(typename);
        const tagname = typeInfo.tagname || typename;
        const partial_path = typeInfo.path;
        //const editor_path = `../modules/${partial_path}`;
        const {browserWindow} = windowInfo;

        const ipcSend = (subchannel, arg) => {
            browserWindow.webContents.send(`${editorPath}:${subchannel}`, arg);
        };

        // Maintain a cache
        let editorInstance;
        let htmlHead;
        let wasNewlyCreated = false;
        if (this.loadedEditorModules[editorPath]) {
            editorInstance = this.loadedEditorModules[editorPath];
        } else {
            editorInstance = new EditorClass(this, windowInfo, editorPath, ipcSend);
            this.loadedEditorModules[editorPath] = editorInstance;
            wasNewlyCreated = true;
        }

        const mountPayload = {
            path: `modules/${partial_path}.tag`,
            prefix: `${editorPath}:`,
            tagname,
            selector,
        };

        editorInstance.load(() => {
            // Add in one-time head and CSS
            if (wasNewlyCreated) {
                if (editorInstance.getCSS) {
                    // has global css to insert
                    browserWindow.webContents.insertCSS(editorInstance.getCSS());
                }

                if (editorInstance.getHead) {
                    // might have global <head></head> contents to insert
                    mountPayload.htmlHead = editorInstance.getHead();
                }
            }

            // Set up initial opts
            const opts = JSON.stringify(editorInstance.getProps(true));
            mountPayload.opts = opts;

            browserWindow.webContents.send('mount:editor', mountPayload);
        }, ...loadArgs);

        // Once its ready, call any relevant callback
        editorInstance.on('ready', callback);
        return editorInstance;
    }

    createWindow(editorPath, callback=NOOP, ...args) {
        const browserWindow = new this.electron.BrowserWindow(this.windowPrefs);
        const windowID = _nextWindowID();
        const windowInfo = {windowID, browserWindow, editorPath};
        this.windows[windowID] = windowInfo;

        // Set up kick off event
        const ipc = this.electron.ipcMain;

        // mount:ready means we finally mount the top-level editor Module
        ipc.on('mount:ready', (event) => {
            const instance = this.mount(windowInfo, editorPath, '#main', () => {
                // Maximize the window
                browserWindow.maximize();
                browserWindow.webContents.send('mount:hidesplash');
                callback(instance);
            }, ...args);
        });

        // Helper function to log to main process stdout
        ipc.on('_log', (event, payload) => {
            console.log('----', payload);
        });

        // Apply template
        const newText = this.getIndexContents(this.getIndexContext());

        // and load the index.html of the app.
        const mainPath = this.getIndexPath();
        fs.writeFileSync(mainPath, newText);
        browserWindow.loadURL('file://' + mainPath);

        // Open the DevTools.
        //browserWindow.webContents.openDevTools();

        // Prevent all navigation
        browserWindow.webContents.on('will-navigate', (ev, url) => {
            ev.preventDefault()
            opn(url); // open the URL in the preferred browser
        })

        // Emitted when the window is closed.
        browserWindow.on('closed', () => {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
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
        const result = {script: [], html: [], css: [], require: []};
        const _pushLinks = mod => {
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
        const _getInclude = mod => {
            const arr = (mod._include && mod._include.head) || [];
            return Array.isArray(arr) ? arr : [arr];
        }
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
        //this.relativize(script, require, html, css);
        const {script, require, html, css} = this.getLinked();
        return {
            title: this.newWindowTitle,
            adaptorPath: this.adaptorPath,
            windowLoadSequence: this.windowLoadSequence,
            splash: this.splash,
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
        } else {
            return path.resolve(__dirname, '..', 'static', 'index.html.templated');
        }
    }

    getIPCStream(windowInfo, path, subchannel) {
        if (!windowInfo) {
            throw new Error("Need to specify windowInfo");
        }

        const {browserWindow} = windowInfo;
        // console.log(`ipc channel: ${path}:${subchannel}`);
        return new IPCStream(`${path}:${subchannel}`, browserWindow);
    }

    destroyWindow(id) {
        delete this.windows[id];
    }
}

module.exports = WindowManager;
