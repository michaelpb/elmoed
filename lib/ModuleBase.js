'use strict';

class ModuleBase {
    constructor(editor, path, ipc_send) {
        this.path = path;
        this.ipc_send = ipc_send;
        this.editor = editor; // core editor
    }

    /*
     * Override to add custom loading code
     */
    load(callback) {
        callback();
    }

    get_opts(initial = false) {
        return {};
    }

    on(channel, callback) {
        const fullchannel = `${this.path}:${channel}`;
        this.editor.electron.ipcMain.on(fullchannel, callback);
    }

    update() {
        this.ipc_send('update', JSON.stringify(this.get_opts(false)));
    }
}
module.exports = ModuleBase;
