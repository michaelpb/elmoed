const path = require('path');

module.exports = {
    _include: {
        head: [
            path.resolve(__dirname, 'text-editor.html'),
            path.resolve(__dirname, 'image-editor.html'),
            path.resolve(__dirname, 'multi-editor.html'),
        ],
    },
    text: {
        module: require('./TextEditor'),
        tagname: 'text-editor',
        edits: ['.txt'],
    },
    image: {
        module: require('./ImageEditor'),
        tagname: 'image-editor',
        edits: ['.png'],
    },
    multiedit: {
        module: require('./MultiEditor'),
        tagname: 'multi-editor',
        edits: ['manifest.json'],
    },
};

