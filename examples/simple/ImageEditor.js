const {ModuleBase} = require('../../index');

const fs = require('fs');
class ImageEditor extends ModuleBase {
    load(callback) {
        fs.readFile(this.path, (err, data) => {
            this.data = data;
            callback();
        });
    }

    get_opts() {
        return {imageData: this.data.toString('base64')};
    }
}

module.exports = ImageEditor;
