const {ModuleBase} = require('../../index');

const fs = require('fs');

class TextEditor extends ModuleBase {
    constructor(...args) {
        super(...args);
        this.text = '';
    }

    load(callback) {
        fs.readFile(this.path, 'utf-8', (err, data) => {
            this.text = data;
            callback();
        });
    }

    get_opts() {
        return {text: this.text};
    }
}

module.exports = TextEditor;

