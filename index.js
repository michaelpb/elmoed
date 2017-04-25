"use strict";

const path = require('path');

const adaptorPath = name => path.resolve(__dirname, `./lib/adaptors/${name}`)

module.exports.ModuleBase = require('./lib/ModuleBase');
module.exports.WindowManager = require('./lib/WindowManager');
module.exports.launch = require('./lib/launcher').launch;
module.exports.testutils = require('./lib/testutils');
module.exports.adaptorPaths = {
    riotjs: adaptorPath('riotjs'),
};
