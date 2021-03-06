const { ModuleBase } = require('../../index');

const fs = require('fs');
const path = require('path');

class TextEditor extends ModuleBase {
    constructor(...args) {
        super(...args);
        this.text = '';

        this.on('save', (ev, newText) => {
            this.send('saving');
            this.text = newText;
            console.log('Simulating a save: ', newText);
            setTimeout(() => {
                this.send('saved');
            }, 1000);
        });
        this.on('reload', (ev) => {
            this.update();
        });
    }

    load(callback) {
        fs.readFile(this.path, 'utf-8', (err, data) => {
            this.text = data;
            callback();
        });
    }

    getProps() {
        return {
            text: this.text,
            path: this.path,
            basename: path.basename(this.path),
        };
    }
}

module.exports = TextEditor;

