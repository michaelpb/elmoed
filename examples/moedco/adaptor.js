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
    '"use strict";',
];

const SCRIPTS_END = [
    "return {render: (typeof render === 'undefined') ? _render : render};",
];

function initialize() {
    // Generates all the components

    // Gets all templates that have a name containing ":"
    const templates = document.querySelectorAll('template[name*=":"]');

    for (const templateTag of templates) {
        // all top level script tags for template
        const scripts = Array.from(DEFAULT_SCRIPTS);
        const name = templateTag.attributes.name.value;
        const html = []; // all top level html for template

        // Loop through appending all relevant inner content of each child
        for (const element of templateTag.content.children) {
            if (element.tagName === 'SCRIPT') {
                scripts.push(element.textContent);
            } else {
                html.push(element.outerHTML);
            }
        }

        scripts.push(...SCRIPTS_END);

        const compiledTemplate = TinyTiny(html.join(''));
        const context = {
            rawContent: html.join(''),
            template: compiledTemplate,
            componentName: name,
            _render: props => compiledTemplate(props),
            _mount: (id, initialProps) => {
                compiledTemplate(props),
                const mountInfo = {id, component: this};
                const mountLocation = document.getElementById(id);
                const rendered = component.render.call(mountInfo, initialProps);
                mountLocation.innerHTML = rendered;
            },
        };

        const contextPairs = Object.keys(context).map(key => [key, context[key]]);
        const argNames = contextPairs.map(pair => pair[0]);
        const argValues = contextPairs.map(pair => pair[1]);
        const fullScript = scripts.join('');

        // Compile the function
        const componentMaker = new Function(...argNames, fullScript);
        const component = {};

        // Execute the JavaScript code to create the new component
        Object.assign(component, componentMaker.apply(component, argValues));

        window.elmoedjs[name] = component;
    }
}

// Here we mount something
function mount(id, tagname, props) {
    // NEW MOUNT (should move to separate file)
    window.log('mounting...', id, tagname, props);
    const component = window.elmoedjs[tagname];
    component.mount(id, props);
    return mountInfo;
}

// mountedInstance is whatever mount returns
function update(mountedInstance, newProps) {
    // NEW UPDATE
    const {id, component} = mountedInstance;
    const mountLocation = document.getElementById(id);
    mountLocation.innerHTML = component.render.call(mountInfo, props);
    window.log('updating...', mountedInstance, newProps);
    return;
}

module.exports.initialize = initialize;
module.exports.mount = mount;
module.exports.update = update;

