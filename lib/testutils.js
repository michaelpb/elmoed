/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-unresolved */
/* eslint-disable global-require */


function spectronLaunch(mainjs, filepath, cb) {
    const Application = require('spectron').Application;
    const app = new Application({
        path: './node_modules/.bin/electron',
        args: [mainjs, filepath],
    });
    app.start().then(() => {
        cb(app);
    });
}

function waitUntilMounted(app, done) {
    // poll until the thing is mounted
    if (app === null) {
        throw new Error('Invalid Application');
    }
    const check = () => {
        app.client.getAttribute('body', 'data-elmoed-mounted').then((value) => {
            if (value) {
                done();
            } else {
                setTimeout(check, 100);
            }
        });
    };
    app.client.getWindowCount().then(() => {
        check();
    });
}

function waitUntilBodyText(app, str, done) {
    // poll until the thing is mounted
    if (app === null) {
        throw new Error('Invalid Application');
    }
    const check = () => {
        app.client.getText('body').then((bodyText) => {
            if (bodyText && bodyText.includes(str)) {
                done(bodyText);
            } else {
                setTimeout(check, 300);
            }
        });
    };
    check();
}

function strip(text) {
    return text.replace(/\W+/g, ' ').trim();
}

function mockMousetrap() {
    return jasmine.createSpyObj('Mousetrap', ['bind', 'reset']);
}

function mockElectron() {
    const EventEmitter = require('events');
    let windowInfo = null;
    let lastCreatedMenu = null;
    let nextWindowID = 0;

    class BrowserWindow extends EventEmitter {
        constructor(...args) {
            super();

            // Set up unique ID
            this.id = nextWindowID;
            nextWindowID += 1;
            this.args = args;

            this.webContents = jasmine.createSpyObj('webContents',
                ['send', 'on', 'insertCSS', 'openDevTools']);
            spyOn(this, 'loadURL');
            spyOn(this, 'maximize');
            spyOn(this, 'show');
            spyOn(this, 'hide');
            spyOn(this, 'setFullScreen');
            spyOn(this, 'setMenuBarVisibility');
            windowInfo = this;
        }
        loadURL() {}
        maximize() {}
        show() {}
        hide() {}
        setFullScreen() {}
        setMenuBarVisibility() {}
        setMenu() {}
    }

    const electron = {
        BrowserWindow: (...args) => new BrowserWindow(...args),
        ipcMain: {
            on: (channel, hook) => {
                if (channel.endsWith('ready')) {
                    // top level, kick off async
                    // TODO: This causes some annoying timing issues,
                    // where events are hooked + fired too soon, need
                    // to address:
                    setTimeout(hook, 10);
                }
            },
        },
        globalShortcut: jasmine.createSpyObj('globalShortcut',
            ['unregisterAll']),
        Menu: {
            buildFromTemplate: data => data,
            setApplicationMenu: (menu) => {
                lastCreatedMenu = menu;
            },
        },
        MenuItem: {
        },
    };
    spyOn(electron, 'BrowserWindow').and.callThrough();
    electron._getMockedMenu = () => lastCreatedMenu;
    electron._getMockedWindowInfo = () => windowInfo; // adds way to get to it
    return electron;
}

function mockWindowManager(name, EditorClass) {
    const WindowManager = require('./WindowManager');
    const electron = mockElectron();
    const modules = {
        [name]: {
            module: EditorClass,
            edits: [name],
        },
    };
    const opts = { rememberWindowState: false };
    const adaptor = 'fakeAdaptor.js';
    const manager = new WindowManager(electron, modules, adaptor, opts);
    return { electron, manager, modules };
}

function setupMockery(mockery) {
    const electron = mockElectron();
    const mousetrap = mockMousetrap();
    mockery.enable();
    mockery.registerMock('electron', electron);
    mockery.registerMock('mousetrap', mousetrap);
    function mockWindowState({ defaultWidth, defaultHeight }) {
        return {
            manage: () => {},
            x: 0,
            y: 0,
            width: defaultWidth,
            height: defaultHeight,
        };
    }
    mockery.registerMock('electron-window-state', mockWindowState);
    mockery.warnOnUnregistered(false);
    return electron;
}

function teardownMockery(mockery) {
    mockery.deregisterAll();
    mockery.disable();
}

module.exports = {
    spectronLaunch,
    waitUntilMounted,
    waitUntilBodyText,
    strip,
    mockElectron,
    mockWindowManager,
    setupMockery,
    teardownMockery,
};
