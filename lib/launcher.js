'use strict';

const Editor = require('./Editor');

/*
*/
function launch(modules, adaptorPath = null, electron = null, windowPrefs = {}, extraFlags = []) {
    if (electron === null) {
        electron = require('electron');
    }

    for (const flag of extraFlags) {
        v8.setFlagsFromString(flag);
    }

    const app = electron.app;

    // The Editor class is where the main window / workspace management logic
    // takes place
    const editor = new Editor(electron, modules, adaptorPath);

    const path = require('path');

    function split_args(args) {
        args.shift(); // get rid of first argument
        while (args.length && extraFlags.indexOf(args[0]) !== -1) {
            args.shift(); // remove all instances of harmony flags
        }

        // Remove entry point script name
        if (args[0].match(/main.js$/i)) { args.shift(); }
        const target = args.length > 0 ? args[0] : '';
        return target;
    }

    function create_window() {
        // Create the browser window.
        const target = split_args(Array.from(process.argv));
        editor.create_window(target);
    }

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    app.on('ready', () => {
        create_window();
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
        if (editor.open_windows.length === 0) {
            create_window();
        }
    });
}

module.exports.launch = launch;
