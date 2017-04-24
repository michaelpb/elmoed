'use strict';

const NOOP = () => {};

class ModuleBase {
    constructor(windowManager, windowInfo, path, ipcSend) {
        this.manager = windowManager; // core module loader
        this.windowInfo = windowInfo;
        this.path = path;
        this.send = ipcSend;
        this.parentEditor = null;
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
    subMount(path, selector, callback = NOOP, ...args) {
        const editor = this.manager.mount(
            this.windowInfo,
            path,
            selector,
            callback,
            ...args
        );
        editor.parentEditor = this;
        return editor;
    }

    /*
    Given any number of path elements, it generates an absolute 'fake' path
    based on this path, using '!' as a faux path separator
    */
    getSubPath(...args) {
        return [this.path, ...args].join('!');
    }

    getProps(initial = false) {
        return {};
    }

    getIPCStream(subchannel) {
        return this.manager.getIPCStream(this.windowInfo, this.path, subchannel);
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
