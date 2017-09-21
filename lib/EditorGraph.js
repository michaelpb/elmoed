/*

EditorGraph is used by WindowManager to maintain relations between editors and
browser windows in one spot.

Contains a lot of helper code for keeping track of and manipulating editors and
windows.

*/

/* eslint-disable no-param-reassign */
function pushTo(obj, key, val) {
    if (!(key in obj)) {
        obj[key] = [];
    }
    obj[key].push(val);
}

function removeFrom(obj, key, val) {
    const withoutVal = obj[key].filter(v => v !== val);
    if (withoutVal.length < 1) {
        delete obj[key];
    } else {
        obj[key] = withoutVal;
    }
}
/* eslint-enable no-param-reassign */


class EditorGraph {
    constructor() {
        this.pathToEditor = {};
        this.pathToWindowID = {};
        this.windowIDToPath = {};
        this.pathToChildren = {};
        this.pathToParent = {};

        this.getEditor = this.getEditor.bind(this);
    }

    addEditor(editor, browserWindow, parentEditor = null) {
        const { id } = browserWindow;
        const { path } = editor;

        // Relate editor to path
        if (path in this.pathToEditor) {
            throw new Error(`Path already exists: "${path}"`);
        }
        this.pathToEditor[path] = editor;

        // Append browser relations
        this.pathToWindowID[path] = editor;
        pushTo(this.windowIDToPath, id, path);

        // Append parent editor relations
        if (parentEditor) {
            const parentPath = parentEditor.path;
            if (!this.getEditor(parentPath)) {
                throw new Error(`Parent editor not found: "${parentPath}"`);
            }
            pushTo(this.pathToChildren, parentPath, path);
            this.pathToParent[path] = parentPath;
        }
    }

    getEditor(path) {
        if (!(path in this.pathToEditor)) {
            return null;
        }
        return this.pathToEditor[path];
    }

    getParentEditor(editor) {
        if (!(editor.path in this.pathToParent)) {
            return null;
        }
        return this.getEditor(this.pathToParent[editor.path]);
    }

    getDescendantsOfEditor(editor) {
        return this.getDescendantsOfEditorPath(editor.path);
    }

    /*
        Given an Editor Path, return an array of all children / descendants
    */
    getDescendantsOfEditorPath(path) {
        const descendants = [];
        if (path in this.pathToChildren) {
            for (const childPath of this.pathToChildren[path]) {
                descendants.push(this.pathToEditor[childPath]);
                descendants.push(...this.getDescendantsOfEditorPath(childPath));
            }
        }
        return descendants;
    }

    getEditorsInWindow(windowID) {
        return (this.windowIDToPath[windowID] || []).map(this.getEditor);
    }

    getOrCreate(path, manager, { EditorClass, windowInfo, ipcSend, parentEditor }) {
        let editorInstance = this.getEditor(path);

        if (editorInstance !== null) {
            return { editorInstance, wasNewlyCreated: false };
        }

        const { browserWindow } = windowInfo;
        editorInstance = new EditorClass(manager, windowInfo, path, ipcSend);
        this.addEditor(editorInstance, browserWindow, parentEditor);
        return { editorInstance, wasNewlyCreated: true };
    }

    /*
    Deletes all references to the given editor from the editor graph
    */
    deleteEditor(editor) {
        const { windowID } = editor.windowInfo;
        const { path } = editor;

        // Remove all ID / path -> id / path relations
        removeFrom(this.windowIDToPath, windowID, path);
        if (editor.parentEditor) {
            removeFrom(this.pathToChildren, editor.parentEditor.path, path);
        }
        delete this.pathToChildren[path];
        delete this.pathToParent[path];

        // Delete the only reference to the editor itself (clear from mem)
        delete this.pathToEditor[path];
    }

    /*
    Deletes all references to editor, and recursively all children editors
    */
    destroyEditor(editor) {
        const children = this.getDescendantsOfEditor(editor);
        for (const child of children) {
            this.deleteEditor(child);
        }

        // Remove all references to editor
        this.deleteEditor(editor);
    }

    callMethod(editor, methodName, ...args) {
        if (methodName in editor) {
            editor[methodName](...args);
        }
    }

    callMethodRecursively(editor, methodName, ...args) {
        this.callMethod(editor, methodName, ...args);
        this.callMethodForDescendants(editor, methodName, ...args);
    }

    callMethodForWindow(windowID, methodName, ...args) {
        for (const editor of this.getEditorsInWindow(windowID)) {
            this.callMethodRecursively(editor, methodName, ...args);
        }
    }

    callMethodForDescendants(editor, methodName, ...args) {
        for (const childEditor of this.getDescendantsOfEditor(editor)) {
            this.callMethod(childEditor, methodName, ...args);
        }
    }

    destroyWindow(windowID) {
        if (!(windowID in this.windowIDToPath)) {
            throw new Error(`Could not find Window with ID ${windowID}`);
        }

        const editors = this.getEditorsInWindow(windowID);

        for (const editor of editors) {
            // Delete all references to editor
            this.deleteEditor(editor);
        }

        delete this.windowIDToPath[windowID];
    }
}

module.exports = EditorGraph;
module.exports.removeFrom = removeFrom; // for unit tests
