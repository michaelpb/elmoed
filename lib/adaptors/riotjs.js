/*
    Riot.js Elmoed Adaptor
    http://riotjs.com/
*/


const riot = require('riot');

let _uid = 0;
const uid = str => `${str}-${_uid++}`;

// riot.js adaptor
function mount(mountLocation, tagname, props) {
    // return riot.mount(mountLocation, tagname, props)[0];
    const id = uid(`riotjs_mount_${tagname}`);
    const fauxTag = `<${tagname} id="${id}"></${tagname}>`;

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
