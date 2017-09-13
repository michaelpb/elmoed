/* eslint-disable class-methods-use-this */

const NOOP = () => {};

class ModuleBase {
    constructor(windowManager, windowInfo, path, ipcSend) {
        this.manager = windowManager; // core module loader
        this.windowInfo = windowInfo;
        this.path = path;
        this.ipcSend = ipcSend; // TODO removing this soon
    }

    /*
     * Override to add custom loading code
     */
    load(callback) {
        callback();
    }

    /*
        Mounts in same window as this module
    */
    subMount(editorPath, selector, callback = NOOP, ...loadArgs) {
        return this.manager.mount({
            editorPath,
            selector,
            callback,
            loadArgs,
            parentEditor: this,
            windowInfo: this.windowInfo,
        });
    }

    /*
    Given any number of path elements, it generates an absolute 'fake' path
    based on this path, using '!' as a faux path separator
    */
    getSubPath(...args) {
        return [this.path, ...args].join('!');
    }

    getProps() {
        return {};
    }

    getIPCStream(subchannel) {
        return this.manager.getIPCStream(this.windowInfo, this.path, subchannel);
    }

    on(channel, callback) {
        this.manager.onChannel(this, channel, callback);
    }

    send(channel, ...args) {
        this.manager.sendOnChannel(this, channel, args);
    }

    update() {
        this.send('update', JSON.stringify(this.getProps(false)));
    }

    get parentEditor() {
        // Get the parent editor from the editor graph
        return this.manager.editors.getParentEditor(this);
    }
}

module.exports = ModuleBase;
