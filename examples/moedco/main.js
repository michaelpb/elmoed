// Require elmoed
const elmoed = require('../../index');
// const elmoed = require('elmoed');

const path = require('path');

const modules = {
    _include: {
        head: [
            path.resolve(__dirname, 'text-editor.html'),
        ],
    },
    text: {
        module: require('./TextEditor'),
        tagname: 'editor:plaintext',
        edits: ['.txt', ''],
    },
};

const adaptorPath = path.resolve(__dirname, 'adaptor');
const newWindowTitle = 'Text Editor - moedco';

elmoed.launch({modules, adaptorPath, newWindowTitle});

