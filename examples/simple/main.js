// Require elmoed
const elmoed = require('../../index');
// const elmoed = require('elmoed');

const electron = require('electron');
const path = require('path');

const modules = {
};

const adaptorPath = path.resolve(__dirname, 'adaptor');
elmoed.launch(modules, adaptorPath, electron);

