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


/*window.elmoedjs.defaultRender = function defaultRender(context) {
    return template;
}*/
window.elmoedjs = {};

const DEFAULT_SCRIPTS = [
    'use strict;',
    'let render = template;',
    'const _render = render;',
];

const SCRIPTS_END = [
    'return {render};',
];

function initialize() {
    // Generates all the components

    // Gets all templates that have a name containing ":"
    const templates = document.querySelectorAll('templates[name*=":"]');
    for (const template of templates) {
        // all top level script tags for template
        const scripts = Array.from(DEFAULT_SCRIPTS);
        const html = []; // all top level html for template

        // Loop through appending all relevant inner content of each child
        for (const element of template.content.children) {
            if (element.tagName === 'SCRIPT') {
                scripts.push(element.textContent);
            } else {
                html.push(element.outerHTML);
            }
        }

        scripts.extend(SCRIPTS_END);

        const context = {
            rawContent: html.join(''),
            template: TinyTiny(html.join('')),
        };

        const contextPairs = Object.keys(context).map(key => [key, context[key]]);
        const argNames = contextPairs.map(pair => pair[0]);
        const argValues = contextPairs.map(pair => pair[1]);
        const functionArgs = argNames.concat([scripts.join('')]);
        const componentMaker = new (Function.prototype.apply(Function, functionArgs));

        const component = {};

        // Execute actual JavaScript code
        Object.assign(component, componentMaker.apply(component, argValues));

        window.elmoedjs[template.name] = component;
    }
}

// Here we mount something
function mount(id, tagname, props) {
    // OLD MOUNT:
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

// module.exports.initialize = initialize;
module.exports.mount = mount;
module.exports.update = update;

