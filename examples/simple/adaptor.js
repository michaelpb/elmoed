'use strict';

// This example uses a micro-framework to mount page elements

// Evaluates string as code in function context, with any number of named args
function scopedEval(thisContext, namedArgs, code) {
    const argPairs = Object.keys(namedArgs).map(key => [key, namedArgs[key]]);
    const argNames = argPairs.map(pair => pair[0]);
    const argValues = argPairs.map(pair => pair[1]);
    return (new Function(...argNames, code)).apply(thisContext, argValues);
}

function initialize() {
}

// Here we mount something
function mount(id, tagname, props) {
    // Get content of specified template tag
    const {content} = document.querySelector(`[name="${tagname}"]`);

    // Simple templating engine based on backtick templates
    const html = content.children[0].outerHTML;
    const template = `return \`${html.replace(/`/g, '\`')}\`;`;
    const mountLocation = document.getElementById(id);
    mountLocation.innerHTML = scopedEval(mountLocation, props, template);

    const script = content.querySelector('script').textContent;
    if (script) {
        scopedEval(mountLocation.firstChild, props, script);
    }
    return {id, template};
}

// mountedInstance is whatever mount returns
function update(mountedInstance, newProps) {
    const {id, template} = mountedInstance;
    const mountLocation = document.getElementById(id);
    mountLocation.innerHTML = scopedEval(mountLocation, props, template);
    window.log('updating...', mountedInstance, newProps);
}

module.exports.initialize = initialize;
module.exports.mount = mount;
module.exports.update = update;

