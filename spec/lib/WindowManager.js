/* eslint global-require: "off" */
const { setupMockery, teardownMockery } = require('../../lib/testutils');
const mockery = require('mockery');
const path = require('path');

describe('WindowManager', () => {
    let wm = null;
    let electron = null;
    let WindowManager = null;

    beforeEach(() => {
        electron = setupMockery(mockery);
        WindowManager = require('../../lib/WindowManager');
    });

    describe('when instantiated with empty modules', () => {
        beforeEach(() => {
            wm = new WindowManager(electron, {}, '');
        });

        it('has expected properties', () => {
            expect(wm.windows).toEqual({});
            expect(wm.modules).toEqual({});
            expect(wm.loadedEditorModules).toEqual({});
            expect(wm.adaptorPath).toEqual('');
        });

        it('has methods that fail gracefully', () => {
            expect(wm.getEditorClass('test')).toBeNull();
            expect(wm.getEditorTypeName('test')).toBeNull();
        });

        it('can create expected index context', () => {
            const ctx = wm.getIndexContext();
            expect(ctx.adaptorPath).toEqual('..');
            expect(ctx.title).toEqual(wm.opts.newWindowTitle);

            // Check all includes
            expect(ctx.includeHead).toEqual([]);
            expect(ctx.preloadScripts).toEqual([]);
            expect(ctx.preloadRequires).toEqual([]);
            expect(ctx.preloadHTML).toEqual([]);
            expect(ctx.preloadCSS).toEqual([]);
        });
    });

    describe('when instantiated with simple example module', () => {
        beforeEach(() => {
            const modules = require('../../examples/simple/modules');
            const adapter = path.resolve(__dirname,
                '../../', 'examples/simple/adaptor');
            wm = new WindowManager(electron, modules, adapter);
        });

        it('has methods that fail gracefully', () => {
            expect(wm.getEditorClass('test')).toBeNull();
            expect(wm.getEditorTypeName('test')).toBeNull();
        });

        it('picks correct editor', () => {
            expect(wm.getEditorTypeName('.txt')).toBeTruthy();
            expect(wm.getEditorTypeName('.txt')).toEqual('text');
            expect(wm.getEditorClass('text')).toBeTruthy();
            expect(wm.getEditorClass('text').name).toEqual('TextEditor');

            expect(wm.getEditorTypeName('.png')).toBeTruthy();
            expect(wm.getEditorTypeName('.png')).toEqual('image');
            expect(wm.getEditorClass('image')).toBeTruthy();
            expect(wm.getEditorClass('image').name).toEqual('ImageEditor');
        });

        it('can create expected index context', () => {
            const ctx = wm.getIndexContext();
            expect(ctx.includeHead.length).toEqual(3);
            expect(ctx.adaptorPath).toEqual('../examples/simple/adaptor');
            expect(ctx.mounterPath).toEqual('./Mounter.js');
        });

        it('can create a new window', () => {
            // Mocks through entire window creation process
            const windowID = wm.createWindow('test.txt');
            expect(electron.BrowserWindow).toHaveBeenCalled();
            expect(wm.windows[windowID]).toBeTruthy();
            const { browserWindow } = wm.windows[windowID];
            const expURI = `file://${wm.getIndexPath()}`;
            expect(browserWindow.loadURL).toHaveBeenCalledWith(expURI);
        });

        describe('when mounting an editor onto a window', () => {
            let windowID = null;
            let editorInstance = null;
            beforeEach(() => {
                windowID = wm.createWindow('test.txt');
                const windowInfo = wm.windows[windowID];
                editorInstance = wm.mount(windowInfo, 'text.txt', '#main');
            });

            afterEach(() => {
                windowID = null;
                editorInstance = null;
            });

            it('properly associates the editor with the window', () => {
                const { editors } = wm.windows[windowID];
                expect(editors.length).toEqual(1);
                expect(wm.loadedEditorModules[editorInstance.path])
                    .toEqual(editorInstance);
            });

            it('cleans up when closed triggering proper events', () => {
                const { editors, browserWindow } = wm.windows[windowID];
                expect(editors.length).toEqual(1);
                expect(editors[0]).toEqual(editorInstance);
                editorInstance.onWindowClosed = () => {};
                spyOn(editorInstance, 'onWindowClosed');
                browserWindow.emit('closed');
                expect(editorInstance.onWindowClosed).toHaveBeenCalledWith();
                expect(wm.windows[windowID]).not.toBeTruthy();
                expect(wm.loadedEditorModules[editorInstance.path]).not.toBeTruthy();
            });

            it('triggers proper events when focused', () => {
                const { editors, browserWindow } = wm.windows[windowID];
                expect(editors.length).toEqual(1);
                expect(editors[0]).toEqual(editorInstance);
                editorInstance.onWindowFocused = () => {};
                spyOn(editorInstance, 'onWindowFocused');
                browserWindow.emit('focus');
                expect(editorInstance.onWindowFocused).toHaveBeenCalledWith();
            });
        });
    });

    describe('has a getIndexContext method which', () => {
        beforeEach(() => {
            const _st = p => path.resolve(__dirname, '../../', 'static', p);
            const _lib = p => path.resolve(__dirname, '../../', 'lib', p);
            const modules = {
                _preload: {
                    html: [_st('html/path.html')],
                    require: [_st('require/path.js')],
                    css: [_st('css/path.css')],
                    script: [_st('script/path.js')],
                },
                fakeMod: {
                    module: {},
                    _preload: { require: _lib('modreq/path.js') },
                },
            };
            const adapter = path.resolve(__dirname,
                '../../', 'examples/simple/adaptor');
            wm = new WindowManager(electron, modules, adapter);
        });

        it('can create properly relative index context', () => {
            const ctx = wm.getIndexContext();
            expect(ctx.adaptorPath).toEqual('../examples/simple/adaptor');
            expect(ctx.mounterPath).toEqual('./Mounter.js');
            expect(ctx.preloadCSS).toEqual(['./css/path.css']);
            expect(ctx.preloadHTML).toEqual(['./html/path.html']);
            expect(ctx.preloadScripts).toEqual(['./script/path.js']);
            expect(ctx.preloadRequires).toEqual([
                './require/path.js',
                '../lib/modreq/path.js',
            ]);
        });
    });

    afterEach(() => {
        wm = null;
        electron = null;
        WindowManager = null;
        teardownMockery(mockery);
    });
});

