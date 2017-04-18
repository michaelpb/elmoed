'use strict';
const Application = require('spectron').Application

function spectronLaunch(mainjs, filepath, cb) {
    const app = new Application({
        path: './node_modules/.bin/electron',
        args: [mainjs, filepath],
    })
    app.start().then(() => {
        cb(app);
    });
}

function waitUntilMounted(app, done) {
    // poll until the thing is mounted
    const check = () => {
        app.client.getAttribute('body', 'data-elmoed-mounted').then(value => {
            if (value) {
                done();
            } else {
                setTimeout(check, 100);
            }
        });
    };
    app.client.getWindowCount().then(function (count) {
        check();
    })
}

function strip(text) {
    return text.replace(/\W+/g, ' ').trim();
}

module.exports.spectronLaunch = spectronLaunch;
module.exports.waitUntilMounted = waitUntilMounted;
module.exports.strip = strip;
