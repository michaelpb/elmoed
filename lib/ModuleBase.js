'use strict';

class ModuleBase {
    constructor(editor, path, ipcSend) {
        this.path = path;
        this.send = ipcSend;
        this.editor = editor; // core editor
    }

    /*
     * Override to add custom loading code
     */
    load(callback) {
        callback();
    }

    getProps(initial = false) {
        return {};
    }

    on(channel, callback) {
        const fullchannel = `${this.path}:${channel}`;
        this.editor.electron.ipcMain.on(fullchannel, callback);
    }

    update() {
        this.send('update', JSON.stringify(this.getProps(false)));
    }
}
module.exports = ModuleBase;
