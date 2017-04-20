'use strict';
const {strip, mockElectron} = require('../../lib/testutils');
const mockery = require('mockery');
const path = require('path');

describe('WindowManager', () => {
    let wm = null;
    let electron = null;
    let WindowManager = null;

    beforeEach(() => {
        electron = mockElectron();
        mockery.enable();
        mockery.registerMock('electron', electron);
        mockery.warnOnUnregistered(false);
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
            expect(ctx.adaptorPath).toEqual('');
            expect(ctx.includeHead).toEqual([]);
            expect(ctx.title).toEqual(wm.newWindowTitle);
            expect(ctx.preloadScripts).toBeFalsy();
            expect(ctx.preloadRequires).toBeFalsy();
            expect(ctx.preloadHTML).toBeFalsy();
            expect(ctx.preloadCSS).toBeFalsy();
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
    });

    afterEach(() => {
        wm = null;
        electron = null;
        WindowManager = null;
        mockery.deregisterAll();
        mockery.disable();
    });
});

