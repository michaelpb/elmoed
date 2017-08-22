'use strict';

const fs = require('fs');
const path = require('path');
const WindowManager = require('./WindowManager');

const DEFAULT_SETTINGS = {
    adaptorPath: '.', // TODO should create default adaptor
    electron: null,
    extraFlags: [],
    windowPrefs: {},

    // Allow to override argument vector being passed in
    argv: Array.from(process.argv),

    // Set to true to make it automatically change into the directory that is
    // being used, or a string value to override this and change it to a
    // different one
    changeDirectory: true,

    // Where should the HTML be re-situated?
    htmlRoot: null,
};

/*
*/
// function launch(modules, adaptorPath = null, electron = null, windowPrefs = {}, extraFlags = []) {
function launch(options) {
    const opts = Object.assign({}, DEFAULT_SETTINGS, options);
    if (opts.electron === null) {
        opts.electron = require('electron');
    }

    const {argv, modules, adaptorPath, electron, windowPrefs, extraFlags} = opts;

    for (const flag of extraFlags) {
        v8.setFlagsFromString(flag);
    }

    const app = electron.app;

    // The WindowManager class is where the main window / workspace management
    // logic takes place
    const wm = new WindowManager(electron, modules, adaptorPath, opts);

    const path = require('path');

    function splitArgs(args) {
        args.shift(); // get rid of first argument
        while (args.length && extraFlags.indexOf(args[0]) !== -1) {
            args.shift(); // remove all instances of harmony flags
        }

        // Remove entry point script name
        if (args[0].match(/.js$/i)) { args.shift(); }
        const target = args.length > 0 ? args[0] : '';
        return target;
    }

    /*
    Creates the first browser window.
    */
    function createWindow() {
        // Create the browser window.

        // Get full path of the file getting opened
        const target = splitArgs(argv);
        const targetPath = path.resolve(process.cwd(), target);

        if (opts.changeDirectory === true) {
            // If we need to change into the relevant directory, do it now
            const dir = path.dirname(targetPath);
            if (fs.existsSync(dir)) {
                process.chdir(dir);
            }
        } else if (String.isString(opts.changeDirectory)) {
            process.chdir(opts.changeDirectory);
        }
        wm.createWindow(targetPath);
    }

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    app.on('ready', () => {
        createWindow();
    });

    // Quit when all windows are closed.
    app.on('window-all-closed', function () {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', function () {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (wm.openWindows.length === 0) {
            createWindow();
        }
    });
}

module.exports.launch = launch;
