'use strict';

function spectronLaunch(mainjs, filepath, cb) {
    const Application = require('spectron').Application
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
        app.client.getAttribute('body', 'data-elmoed-mounted').then(value => {
            if (value) {
                done();
            } else {
                setTimeout(check, 100);
            }
        });
    };
    app.client.getWindowCount().then(function (count) {
        check();
    });
}

function waitUntilBodyText(app, str, done) {
    // poll until the thing is mounted
    if (app === null) {
        throw new Error('Invalid Application');
    }
    const check = () => {
        app.client.getText('body').then(bodyText => {
            if (bodyText && bodyText.includes(str)) {
                done(bodyText);
            } else{
                setTimeout(check, 300);
            }
        });
    };
    check();
}

function strip(text) {
    return text.replace(/\W+/g, ' ').trim();
}

function mockElectron() {
    let windowInfo = null;
    const electron = {
        BrowserWindow: function (...args) {
            this.args = args;
            this.loadURL = () => {};
            this.maximize = () => {};
            this.on = () => {};
            this.webContents = jasmine.createSpyObj('webContents',
                ['send', 'on', 'insertCSS', 'openDevTools']);
            spyOn(this, 'loadURL');
            spyOn(this, 'maximize');
            spyOn(this, 'on');
            windowInfo = this;
        },
        ipcMain: {
            on: (channel, hook) => {
                if (channel.endsWith('ready')) {
                    // top level, kick off async
                    setTimeout(hook, 0);
                }
            },
        },
    };
    spyOn(electron, 'BrowserWindow').and.callThrough();
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
    const manager = new WindowManager(electron, modules, 'fakeAdaptor.js');
    return {electron, manager, modules};
}

module.exports = {
    spectronLaunch,
    waitUntilMounted,
    waitUntilBodyText,
    strip,
    mockElectron,
    mockWindowManager,
};
