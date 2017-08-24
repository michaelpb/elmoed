/* eslint-env browser */
/* eslint-disable no-param-reassign */

const IPCStream = require('electron-ipc-stream');

function appendHTML(el, str) {
    const div = document.createElement('div');
    div.innerHTML = str;
    while (div.children.length > 0) {
        if (div.children[0].tagName === 'LINK') {
            // Create an actual link element to append later
            const style = document.createElement('link');
            style.href = div.children[0].href;
            style.rel = div.children[0].rel;
            style.type = div.children[0].type;
            // append your other things like rel, type, etc
            el.appendChild(style);
        }
        el.appendChild(div.children[0]);
    }
}

class Mounter {
    constructor(ipc, adapter) {
        this.ipc = ipc;
        this.adapter = adapter;

        // Set up incoming mount event
        this.ipc.on('mount:editor', (ev, payload) => {
            // const {tagname, prefix, path, opts, selector} = payload;
            this.mount(payload.tagname, payload.prefix, payload.path,
                payload.opts, payload.selector, payload.htmlHead);
        });

        this.ipc.on('mount:hidesplash', () => {
            const main = document.getElementById('main');
            const splash = document.getElementById('splash');
            if (splash) { splash.remove(); }
            if (main) { main.style.display = 'block'; }
        });
    }

    ready() {
        // Ready to mount front-end components
        if (this.adapter.initialize) {
            this.adapter.initialize(this.ipc);
        }
        this.ipc.send('mount:ready');
    }

    mount(tagname, prefix, tagPath, optsString, selector, htmlHead) {
        const opts = JSON.parse(optsString || '{}');
        let tagInstance;

        const prepOpts = (newOpts) => {
            // Set up outgoing channel
            newOpts.send = (channel, ...args) => {
                this.ipc.send(`${prefix}${channel}`, ...args);
            };

            // Set up incoming channel
            newOpts.on = (channel, callback) => {
                this.ipc.on(`${prefix}${channel}`, callback);
            };

            // Helper function to create a wrapped IPC for streaming interface
            newOpts.getIPCStream =
                channel => new IPCStream(`${prefix}${channel}`);
        };

        // Set up incoming channels
        this.ipc.on(`${prefix}update`, (ev, payload) => {
            const newOpts = JSON.parse(payload);
            prepOpts(newOpts);
            this.adapter.update(tagInstance, newOpts);
        });

        const mountLocation = document.querySelector(selector);
        if (!mountLocation) {
            throw new Error(`Could not find mount location: ${selector}`);
        }

        if (htmlHead && htmlHead.length > 1) {
            const headNode = document.querySelector('head');
            if (headNode.innerHTML.indexOf(htmlHead) === -1) {
                // Not inserted yet, append
                appendHTML(headNode, htmlHead);
            }
        }

        // Finally, mount the element where it belongs
        prepOpts(opts);
        tagInstance = this.adapter.mount(mountLocation, tagname, opts);

        // And send a 'ready' ev so the main process knows
        opts.send('ready');

        // Add flag for unit tests to know its ready
        document.body.setAttribute('data-elmoed-mounted', 'true');
    }
}

module.exports = Mounter;
