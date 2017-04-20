const path = require('path');

module.exports = {
    text: {
        module: require('./TextEditor'),
        tagname: 'text-editor',
        edits: ['.txt'],
        _include: {head: path.resolve(__dirname, 'text-editor.html')},
    },
    image: {
        module: require('./ImageEditor'),
        tagname: 'image-editor',
        edits: ['.png'],
        _include: {head: path.resolve(__dirname, 'image-editor.html')},
    },
    multiedit: {
        module: require('./MultiEditor'),
        tagname: 'multi-editor',
        edits: ['manifest.json'],
        _include: {head: path.resolve(__dirname, 'multi-editor.html')},
    },
};

