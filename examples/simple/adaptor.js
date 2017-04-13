'use strict';

const TinyTiny = require('../../node_modules/tinytiny');

// Example function to get template via link/import
function _getTemplateFor(tagname) {
    const links = document.querySelectorAll('link[rel="import"]');
    for (const link of links) {
        if (link.href.includes(tagname)) {
            return link.import.children[0].innerHTML;
        }
    }
    throw new Error('Could not find template for ' + tagname);
}

// Here we mount something
function mount(id, tagname, props) {
    window.log('mounting...', id, tagname, props);
    const templateHTML = document.head.querySelector('#' + tagname).innerHTML;
    const template = TinyTiny(templateHTML);
    const mountLocation = document.getElementById(id);
    mountLocation.innerHTML = template(props);
    window.log('mounted!...', mountLocation.innerHTML);
    return {id, template};
}

// mountedInstance is whatever mount returns
function update(mountedInstance, newProps) {
    const {id, template} = mountedInstance;
    const mountLocation = document.getElementById(id);
    mountLocation.innerHTML = template(newProps);
    window.log('updating...', mountedInstance, newProps);
}

module.exports.mount = mount;
module.exports.update = update;

