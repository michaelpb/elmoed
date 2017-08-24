// Require elmoed
const elmoed = require('../../index');
// const elmoed = require('elmoed');

const path = require('path');

const modules = require('./modules');

const adaptorPath = path.resolve(__dirname, 'adaptor');
const newWindowTitle = 'Text editor';

elmoed.launch({ modules, adaptorPath, newWindowTitle });

