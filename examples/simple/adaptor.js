
// Here we mount something
function mount(id, moduleInfo, props) {
    console.log('mounting...', id, moduleInfo, props);
    return {
        props,
        template,
    };
}

// mountedInstance is whatever mount returns (in this case "null")
function update(mountedInstance, newProps) {
    console.log('updating...', mountedInstance, newProps);
}

module.exports.mount = mount;
module.exports.update = update;

