'use strict';

class ModuleBase {
    constructor(editor, wbobj, ipc_send) {
        this.wbobj = wbobj;
        this.ipc_send = ipc_send;
        this.editor = editor; // core editor
    }

    get_opts(initial = false) {
        return {};
    }

    on(channel, callback) {
        const fullchannel = `${this.wbobj.path}:${channel}`;
        this.editor.electron.ipcMain.on(fullchannel, callback);
    }

    update() {
        this.ipc_send('update', JSON.stringify(this.get_opts(false)));
    }
}
module.exports = ModuleBase;
