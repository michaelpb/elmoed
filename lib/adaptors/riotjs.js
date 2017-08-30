/*
    Riot.js Elmoed Adaptor
    http://riotjs.com/
*/
/* eslint-env browser */

const {riot} = window;
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
    const fauxTag = `<${tagname} id="${id}"></${tagname}>`;

    /* eslint-disable no-param-reassign */
    // Clear any initial HTML
    mountLocation.innerHTML = '';

    // Add in the HTML in the right location for riot to find
    mountLocation.innerHTML = fauxTag;

    // Finally, mount the element where it belongs
    const tagInstance = riot.mount(`#${id}`, props)[0];
    return tagInstance;
}

function update(tagInstance, newProps) {
    tagInstance.opts = newProps; // riot parlance, opts = props
    tagInstance.update(newProps);
}

module.exports = { initialize: () => {}, mount, update };
