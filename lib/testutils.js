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
    })
}

function strip(text) {
    return text.replace(/\W+/g, ' ').trim();
}

function mockElectron(text) {
    const electron = {
        BrowserWindow: function (...args) {
            this.args = args;
            this.loadURL = () => {};
            this.maximize = () => {};
            this.webContents = jasmine.createSpyObj('webContents',
                ['send', 'on', 'insertCSS', 'openDevTools']);
            this.webContents = jasmine.spyOn(this, 'loadURL');
            this.webContents = jasmine.spyOn(this, 'maximize');
        },
        ipcMain: jasmine.createSpyObj('ipcMain', ['on']),
    };
    return electron;
}

module.exports.spectronLaunch = spectronLaunch;
module.exports.waitUntilMounted = waitUntilMounted;
module.exports.strip = strip;
module.exports.mockElectron = mockElectron;
