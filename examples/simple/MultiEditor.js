const {ModuleBase} = require('../../index');

const fs = require('fs');
const path = require('path');
class MultiEditor extends ModuleBase {
    constructor(...args) {
        super(...args);
        this.on('ready', () => {
            this.paths.forEach((path, i) => {
                this.subMount(path, `#mount_${i}`);
            });
        });
    }

    load(callback) {
        fs.readFile(this.path, 'utf-8', (err, data) => {
            // Read in all paths, and treat as relative to current path
            this.paths = JSON.parse(data).map(fPath =>
                path.resolve(this.path, '..', fPath));
            callback();
        });
    }

    getProps() {
        return {mountIDs: this.paths.map((path, i) => `mount_${i}`)};
    }
}

module.exports = MultiEditor;
