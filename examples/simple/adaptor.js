'use strict';

// This example uses a micro-framework based on templates to mount

// Evaluates string as code in function context, with any number of named args
function scopedEval(thisContext, namedArgs, code) {
    const argPairs = Object.keys(namedArgs).map(key => [key, namedArgs[key]]);
    const argNames = argPairs.map(pair => pair[0]);
    const argValues = argPairs.map(pair => pair[1]);
    return (new Function(...argNames, code)).apply(thisContext, argValues);
}

function initialize() {
    // No need in this example to do any initialization code
}

// Here we mount something
function mount(mountLocation, tagname, props) {
    // Get content of specified template tag
    const {content} = document.querySelector(`[name="${tagname}"]`);

    // Simple templating engine based on backtick templates
    const html = content.children[0].outerHTML.replace('&gt;', '>');
    const template = `return \`${html.replace(/`/g, '\`')}\`;`;
    mountLocation.innerHTML = scopedEval(mountLocation, props, template);

    // Run any scripts encountered
    const script = content.querySelector('script');
    if (script) {
        scopedEval(mountLocation.firstChild, props, script.textContent);
    }
    return {mountLocation, tagname};
}

// mountedInstance is whatever mount returns. In this case, we just call mount
// again to replace the code and re-attach events.
function update(mountedInstance, newProps) {
    const {mountLocation, tagname} = mountedInstance;
    mount(mountLocation, tagname, newProps);
}

module.exports.initialize = initialize;
module.exports.mount = mount;
module.exports.update = update;

