/*

EditorGraph is used by WindowManager to maintain relations between editors and
browser windows in one spot.

Contains a lot of helper code for keeping track of and manipulating editors and
windows.

*/

function pushTo(obj, key, val) {
    if (!(key in obj)) {
        obj[key] = [];
    }
    obj[key].push(val);
}


class EditorGraph {
    constructor() {
        this.pathToEditor = {};
        this.pathToWindowID = {};
        this.windowIDToPath = {};
        this.pathToChildren = {};
        this.pathToParent = {};

        this.getEditor = this.getEditor.bind(this);
        this.destroyEditor = this.destroyEditor.bind(this);
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

    destroyEditor(editor) {
        const childrenEditors = this.getDescendantsOfEditor(editor.path);
        childrenEditors.reverse(); // Reverse so we destroy in the right order

        // Remove and null all references to editor
        delete this.pathToEditor[editor.path];
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

        const editors = this.windowIDToPath[windowID].map(this.getEditor);
        editors.forEach(this.destroyEditor);
        delete this.windowIDToPath[windowID];
    }
}

module.exports = EditorGraph;
