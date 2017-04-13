'use strict';

/*
 * Global state management, of windows and of loaded decks
 */
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

function exit_error(message) {
    console.error(message);
    process.exit(1);
}

class Editor {
    constructor(electron, modules, adaptorPath, options = {}) {
        this.electron = electron;
        this.adaptorPath = adaptorPath;
        this.decks = {};
        this.windows = [];
        this.editor_cache = {};
        this.modules = modules;
        this.windowPrefs = Object.assign({}, WINDOW_PREFS, options.windowPrefs);
        this.newWindowTitle = options.newWindowTitle || 'Editor';
        this.defaultEditor = options.defaultEditor || Object.keys(modules)[0];
    }

    load_window(browser_window, path) {
        // Finally, mount the deck in the #main element
        this.mount(path, '#main', null, () => {
            // Maximize the window
            browser_window.maximize();
            browser_window.webContents.send('mount:hidesplash');
        });
    }

    get_editor_class(typename) {
        const type_info = this.modules[typename];
        if (!type_info) {
            return null;
        }
        let {module} = type_info;
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

        throw new Error('Cannot find editor for type ' + editorPath);
    }

    mount(editorPath, selector, window_info = null, callback = () => {}) {
        if (!window_info) {
            //console.error("Need to specify window_info");
            // TODO: breaks with multi-window
            window_info = this.windows[0];
        }

        // Get editor type name
        const typename = this.getEditorTypeName(editorPath);

        const type_info = this.modules[typename];
        if (!type_info) {
            throw new Error(`Cannot mount unknown type "${typename}"`);
        }

        const EditorClass = this.get_editor_class(typename);
        const tagname = type_info.tagname || typename;
        const partial_path = type_info.path;
        //const editor_path = `../modules/${partial_path}`;
        const {browser_window} = window_info;

        const ipc_send = (subchannel, arg) => {
            browser_window.webContents.send(`${editorPath}:${subchannel}`, arg);
        };

        // Maintain a cache
        let editor_instance;
        let html_head;
        let newlyCreated = false;
        if (this.editor_cache[editorPath]) {
            editor_instance = this.editor_cache[editorPath];
        } else {
            editor_instance = new EditorClass(this, editorPath, ipc_send);
            this.editor_cache[editorPath] = editor_instance;
            newlyCreated = true;
        }

        const mount_payload = {
            path: `modules/${partial_path}.tag`,
            prefix: `${editorPath}:`,
            html_head: html_head,
            tagname,
            selector,
        };

        // window_info.editors[typename] = editor_instance;
        editor_instance.load(() => {
            // Add in one-time head and CSS
            if (newlyCreated) {
                if (editor_instance.get_css) {
                    // has global css to insert
                    browser_window.webContents.insertCSS(editor_instance.get_css());
                }

                if (editor_instance.get_head) {
                    // might have global <head></head> contents to insert
                    html_head = editor_instance.get_head();
                }
            }

            // Set up initial opts
            const opts = JSON.stringify(editor_instance.get_opts(true));
            mount_payload.opts = opts;

            browser_window.webContents.send('mount:editor', mount_payload);
        });

        // Once its ready, call any relevant callback
        editor_instance.on('ready', callback);
        return editor_instance;
    }

    load_deck(target, done) {
        // Import required stuff
        const Deck = require('./libwhiteboard/Deck');

        // Check if target is actually a path, or else just use CWD
        /*let working_dir = (target.match(/\//) || target.match(/^./))
            ? path.resolve(target)
            : process.cwd();
            */

        // XXX XXX XXX XXX
        // working_dir = path.resolve(__dirname, '..', 'spec', 'data', 'basicws');

        // As a side-effect of loading something, change directory to its
        // containing folder, if we can
        const target_path = path.resolve(process.cwd(), target);
        const dir = path.dirname(target_path);
        if (fs.existsSync(dir)) {
            process.chdir(dir);
        }

        // Load deck:
        Deck.load_deck(target_path, deck => {
            this.deck = deck; // XXX
            done(deck);
        });
    }

    create_window(filePath) {
        const browser_window = new this.electron.BrowserWindow(this.windowPrefs);
        const window_id = 1000 + this.windows.length;
        const window_info = {
            window_id,
            browser_window,
            editors: {},
            args: [filePath],
        };
        this.windows.push(window_info);

        // Set up kick off event
        const ipc = this.electron.ipcMain;
        ipc.on('mount:ready', (event) => {
            this.load_window(browser_window, filePath);
        });

        ipc.on('_log', (event, payload) => {
            console.log('----', payload);
        });


        // TODO finish this stuff
        // Apply template
        const newText = this.getIndexContents(this.getIndexContext());


        // and load the index.html of the app.
        const tmpdir = tmp.dirSync();
        const mainPath = path.resolve(tmpdir.name, 'index.html');
        fs.writeFileSync(mainPath, newText);
        browser_window.loadURL('file://' + mainPath);

        // Open the DevTools.
        //browser_window.webContents.openDevTools();

        // Prevent all navigation
        browser_window.webContents.on('will-navigate', (ev, url) => {
            ev.preventDefault()
            opn(url); // open the URL in the preferred browser
        })

        // Emitted when the window is closed.
        browser_window.on('closed', () => {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            this.destroy_window(window_id);
        });
    }

    getIndexContents(ctx) {
        const htmlPath = path.resolve(__dirname, '..', 'static', 'index.html');
        const templateText = fs.readFileSync(htmlPath).toString();
        const template = TinyTiny(templateText);
        return template(ctx);
    }

    getIndexContext() {
        const mounterPath = path.resolve(__dirname, '..', 'static', 'Mounter.js');
        const {script, require, html, css} = (this.modules._preload || {});

        // TODO: make async
        const head = (this.modules._include.head || []).map(path =>
            fs.readFileSync(path, 'utf-8'));

        //this.relativize(script, require, html, css);
        return {
            title: this.newWindowTitle,
            adaptorPath: this.adaptorPath,
            preloadScripts: script,
            preloadRequires: require,
            preloadHTML: html,
            preloadCSS: css,
            includeHead: head,
            mounterPath,
        }
    }

    get_ipc_stream(window_info, path, subchannel) {
        if (!window_info) {
            console.error("Need to specify window_info");
            // TODO: breaks with multi-window
            window_info = this.windows[0];
        }

        const {browser_window} = window_info;
        console.log(`ipc channel: ${path}:${subchannel}`);
        return new IPCStream(`${path}:${subchannel}`, browser_window);
    }

    destroy_window(window_id) {
        // destroys all for now
        this.windows = [];
    }
}

module.exports = Editor;
