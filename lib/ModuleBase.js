'use strict';

const NOOP = () => {};

class ModuleBase {
    constructor(windowManager, windowInfo, path, ipcSend) {
        this.manager = windowManager; // core module loader
        this.windowInfo = windowInfo;
        this.path = path;
        this.send = ipcSend;
    }

    /*
     * Override to add custom loading code
     */
    load(callback) {
        callback();
    }

    /*
     * Mounts in same window as this module
     */
    subMount(path, selector, callback = NOOP) {
        this.manager.mount(this.windowInfo, path, selector, callback);
    }

    getProps(initial = false) {
        return {};
    }

    on(channel, callback) {
        const fullchannel = `${this.path}:${channel}`;
        this.manager.electron.ipcMain.on(fullchannel, callback);
    }

    update() {
        this.send('update', JSON.stringify(this.getProps(false)));
    }
}
module.exports = ModuleBase;
