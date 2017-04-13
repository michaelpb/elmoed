// Require elmoed
const elmoed = require('../../index');
// const elmoed = require('elmoed');

const path = require('path');

const modules = {
    _preload: {
        script: [
        ],
        require: [
        ],
        html: [
        ],
        css: [
        ],
    },
    _include: {
        head: [
            path.resolve(__dirname, 'text-editor.html'),
        ],
    },
    text: {
        module: require('./TextEditor'),
        tagname: 'text-editor',
        edits: ['.txt', ''],
    },
};

const adaptorPath = path.resolve(__dirname, 'adaptor');
const newWindowTitle = 'Text editor';

elmoed.launch({modules, adaptorPath, newWindowTitle});

