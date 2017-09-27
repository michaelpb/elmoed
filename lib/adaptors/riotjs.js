/*
    Riot.js Elmoed Adaptor - Tested with riot v 3.4.3
    http://riotjs.com/
*/
/* eslint-env browser */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-unresolved */

// For unit tests, use mock-window instead
const { riot } = typeof window === 'undefined'
    ? require('mock-window')
    : window;

if (!riot) {
    console.error('Could not load riot from window, probably misconfigured');
}

let uid = 0;
function makeUID(str) {
    uid += 1;
    return `${str}-${uid}`;
}

// riot.js adaptor
function mount(mountLocation, tagname, props) {
    // return riot.mount(mountLocation, tagname, props)[0];
    const id = makeUID(`riotjs_mount_${tagname}`);
    const fauxTag = `<${tagname} data-elmoed-editor="${tagname}" id="${id}">
        </${tagname}>`;

    // Loop through all sub-mounted editors that might already exist in the
    // mount location and properly unmount them for clean up
    const selector = '[data-elmoed-editor]';
    const subEditors = mountLocation.querySelectorAll(selector);
    for (const submountedEditor of subEditors) {
        // _tag learned from: https://github.com/riot/riot/issues/934
        // Might not be maintained, hence the check for its existence
        if (!submountedEditor._tag) {
            console.error('Unsuccessful unmount tag: Bad Riot.js version?');
            continue;
        }
        submountedEditor._tag.unmount();
    }

    /* eslint-disable no-param-reassign */
    // Clear any initial HTML
    mountLocation.innerHTML = '';

    // Add in the HTML in the right location for riot to find
    mountLocation.innerHTML = fauxTag;

    // Finally, mount the element where it belongs
    const tagInstance = riot.mount(`#${id}`, props)[0];
    tagInstance.on('before-unmount', () => {
        props.clearAll(); // ensure everything gets cleared
    });
    return tagInstance;
}

function update(tagInstance, newProps) {
    tagInstance.opts = newProps; // riot parlance, opts = props
    tagInstance.update(newProps);
}

module.exports = { initialize: () => {}, mount, update };
