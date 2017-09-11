const ModuleBase = require('../../lib/ModuleBase');

describe('ModuleBase', () => {

    describe('when instantiated with empty modules', () => {
        class MockWindowManager {
            mount() { }
            getParentEditor() {
                return null;
            }
        }
        class MockIPCSend {}
        class MockWindowInfo {}

        class TestModule extends ModuleBase {}
        let wm = null;
        let mb = null;
        beforeEach(() => {
            wm = new MockWindowManager();
            wm.electron = {ipcMain: {on () {} }};
            spyOn(wm.electron.ipcMain, 'on');
            mb = new TestModule(wm, MockWindowInfo, 'test/path', MockIPCSend);
            spyOn(wm, 'mount');
        });

        it('instantiates with expected properties', () => {
            expect(mb.manager).toEqual(wm);
            expect(mb.windowInfo).toEqual(MockWindowInfo);
            expect(mb.path).toEqual('test/path');
            expect(mb.send).toEqual(MockIPCSend);
            expect(mb.parentEditor).toEqual(null);
        });

        it('makes expectd subpaths', () => {
            expect(mb.getSubPath('thing')).toEqual('test/path!thing');
        });

        it('submount calls manager method as expected', () => {
            class NOOP {}
            mb.subMount('test/path', '#selector', NOOP, 'extraArg');
            expect(wm.mount).toHaveBeenCalledWith({
                editorPath: 'test/path',
                selector: '#selector',
                callback: NOOP,
                loadArgs: ['extraArg'],
                parentEditor: mb,
                windowInfo: MockWindowInfo,
            });
        });

        it('registers scoped events', () => {
            class NOOP {}
            mb.on('testchannel', NOOP);
            expect(wm.electron.ipcMain.on)
                .toHaveBeenCalledWith('test/path:testchannel', NOOP);
        });
    });

});

