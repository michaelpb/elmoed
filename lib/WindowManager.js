/*
 * Global state management of windows
 */
// TODO: make creating a new browser window async... Presently it does a few
// synchronous things
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
const pathlib = require('path');
const IPCStream = require('electron-ipc-stream');
const TinyTiny = require('tinytiny');
const opn = require('opn');
const fs = require('fs');
const windowStateKeeper = require('electron-window-state');
const EditorGraph = require('./EditorGraph');

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

const NOOP = () => {};

class WindowManager {
    constructor(electron, modules, adaptorPath, options = {}) {
        this.electron = electron;
        this.adaptorPath = adaptorPath;
        this.windows = {};
        this.editors = new EditorGraph();
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
            return require(module); // eslint-disable global-require
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
            } else if (edits(editorPath)) {
                return typename; // found
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
        const { browserWindow, editors } = windowInfo;

        const ipcSend = (subchannel, arg) => {
            browserWindow.webContents.send(`${editorPath}:${subchannel}`, arg);
        };

        // Creates the editor itself, or gets the cached version
        const kwargs = { EditorClass, windowInfo, ipcSend };
        const { editorInstance, wasNewlyCreated } =
            this.editors.getOrCreate(editorPath, this, kwargs);

        // Maintain a list of editors by windowID
        editors.push(editorInstance);

        // Actually do the mounting operation to the DOM of the window setting
        // up inter-process events
        const afterMounted = () => {
            // Add in one-time head and CSS
            if (wasNewlyCreated) {
                if (editorInstance.getCSS) {
                    // has global css to insert
                    browserWindow.webContents.insertCSS(editorInstance.getCSS());
                }

                if (editorInstance.getHead) {
                    // might have global <head></head> contents to insert
                    // mountPayload.htmlHead = editorInstance.getHead();
                    console.error('getHead no longer supported');
                }

                // Once its ready, call any relevant callback
                // TODO: Should be "firstMounted" or something instead
                editorInstance.on('ready', callback);
            }
        };

        this.mountEditor(browserWindow, editorInstance, selector,
            { loadArgs, tagname, callback: afterMounted });
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
            const initialOpts = JSON.stringify(editorInstance.getProps(true));
            mountPayload.opts = initialOpts;
            browserWindow.webContents.send('mount:editor', mountPayload);
            callback();
        }, ...loadArgs);
        return editorInstance;
    }

    createWindow(editorPath, callback = NOOP, ...args) {
        // First check if this editor is already loaded, if it is, do not do
        // anything more, instead just focus that existing window

        // TODO Test
        const existingEditor = this.editors.getEditor(editorPath);
        if (existingEditor) {
            const { windowInfo } = existingEditor;
            const { browserWindow, windowID } = windowInfo;
            browserWindow.show(); // force to bring to front & focus
            callback();
            return windowID;
        }

        // If necessary, restore previous state
        if (this.opts.rememberWindowState) {
            this.setupRememberWindowState();
        }

        // Actually create the new electron Browser instance
        const browserWindow = new this.electron.BrowserWindow(this.windowPrefs);

        // If necessary, set the window state manager to manage the current
        // browser window
        if (this.opts.rememberWindowState) {
            this.mainWindowState.manage(browserWindow);
            browserWindow.hide();
        }

        // Keep track of all windows
        const windowID = browserWindow.id;
        const editors = [];
        const windowInfo = { windowID, browserWindow, editorPath, editors };
        this.windows[windowID] = windowInfo;

        // Set up kick off event
        const ipc = this.electron.ipcMain;

        let editorInstance = null;

        // mount:ready means we finally mount the top-level editor Module
        ipc.on('mount:ready', () => {
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

        // If its in an asar, this will fail, but it should have already been
        // written while running tests etc on the build server
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
            // Dereference the window object, and clean up all mounted editors
            this.destroyWindow(windowID);
        });

        // Set up all miscellaneous events
        this.registerEditorEvents(browserWindow, windowID, [
            ['focus', 'onWindowFocused'],
            ['blur', 'onWindowBlurred'],
            ['enter-full-screen', 'onWindowEnterFullScreen'],
            ['leave-full-screen', 'onWindowLeaveFullScreen'],
        ]);
        return windowID;
    }

    registerEditorEvents(browserWindow, windowID, eventPairs) {
        for (const [eventName, methodName] of eventPairs) {
            browserWindow.on(eventName, () => {
                const { editors } = this.windows[windowID];
                for (const editor of editors) {
                    if (methodName in editor) {
                        editor[methodName]();
                    }
                }
            });
        }
    }

    getIndexContents(ctx) {
        const htmlPath = pathlib.resolve(__dirname, '..', 'static', 'index.html');
        const templateText = fs.readFileSync(htmlPath).toString();
        TinyTiny.filters.is_one_word = input => input.match(/^[a-z]+$/i);
        TinyTiny.filters.basename = input => pathlib.basename(input);
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

    relativizePath(abspath) {
        const path = pathlib.relative(pathlib.dirname(this.getIndexPath()), abspath);
        if (!path.startsWith('.')) {
            // doesn't start with a dot, means it is in the same dir
            return `./${path}`;
        }
        return path;
    }

    relativizePaths(paths) {
        return paths.map(path => this.relativizePath(path));
    }

    /*
        Generates Template context to render the index.html
    */
    getIndexContext() {
        const mounterPathAbs = pathlib.resolve(__dirname, '..', 'static', 'Mounter.js');
        const mounterPath = this.relativizePath(mounterPathAbs);
        const { script, require, html, css } = this.getLinked();
        const preloadScripts = this.relativizePaths(script);
        const preloadRequires = this.relativizePaths(require);
        const preloadHTML = this.relativizePaths(html);
        const preloadCSS = this.relativizePaths(css);
        const adaptorPath = this.relativizePath(this.adaptorPath);
        return {
            adaptorPath,
            preloadScripts,
            preloadRequires,
            preloadHTML,
            preloadCSS,
            mounterPath,
            title: this.opts.newWindowTitle,
            windowLoadSequence: this.opts.windowLoadSequence,
            splash: this.opts.splash,
            includeHead: this.getIncludeHead(),
        };
    }

    getIndexPath() {
        if (this.htmlRoot) {
            return pathlib.resolve(this.htmlRoot, 'index.html.templated');
        }
        return pathlib.resolve(__dirname, '..', 'static', 'index.html.templated');
    }

    getIPCStream(windowInfo, path, subchannel) {
        if (!windowInfo) {
            throw new Error('Need to specify windowInfo');
        }

        const { browserWindow } = windowInfo;
        return new IPCStream(`${path}:${subchannel}`, browserWindow);
    }

    destroyWindow(id) {
        // Destroy the window and all references
        this.editors.callMethodForWindow(id, 'onWindowClosed');
        this.editors.destroyWindow(id);
        delete this.windows[id];
        /*
        const { editors } = this.windows[id];
        // Loop through all editors destroying all reference to them
        for (const editor of editors) {
            // need to destroy each editor
            this.destroyEditor(editor);
        }

        // Destroy all cached info about the window
        */
    }

    destroyEditor(editor) {
        // Destroy the editor and all references
        const { id } = editor;
        this.editors.callMethodForDescendants(editor, 'onWindowClosed');
        this.editors.destroyEditor(id);
        /*
        if (editor.onWindowClosed) {
            editor.onWindowClosed();
        }
        delete this.loadedEditorModules[editor.path];
        */
    }
}

module.exports = WindowManager;
