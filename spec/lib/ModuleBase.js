const ModuleBase = require('../../lib/ModuleBase');

describe('ModuleBase', () => {
    describe('when instantiated with empty modules', () => {
        class MockWindowManager {
            constructor() {
                this.editors = {
                    getParentEditor() {
                        return null;
                    },
                };
                this.winChannel = (lol, thing) => `w${lol}:${thing}`;
            }
            onChannel() { }
            mount() { }
        }
        class MockIPCSend {}
        const mockWindowInfo = {
            windowID: 1,
        };

        class TestModule extends ModuleBase {}
        let wm = null;
        let mb = null;
        beforeEach(() => {
            wm = new MockWindowManager();
            wm.electron = { ipcMain: { on() {} } };
            spyOn(wm.electron.ipcMain, 'on');
            mb = new TestModule(wm, mockWindowInfo, 'test/path', MockIPCSend);
            spyOn(wm, 'mount');
            spyOn(wm, 'onChannel');
        });

        it('instantiates with expected properties', () => {
            expect(mb.manager).toEqual(wm);
            expect(mb.windowInfo).toEqual(mockWindowInfo);
            expect(mb.path).toEqual('test/path');
            // expect(mb.ipcSend).toEqual(MockIPCSend);
            expect(mb.parentEditor).toEqual(null);
        });

        it('makes expectd subpaths', () => {
            expect(mb.getSubPath('thing')).toEqual('test/path!thing');
        });

        it('can discern subpaths', () => {
            mb.path = mb.getSubPath('one', 'two', 'three');
            expect(mb.path).not.toEqual('test/path');
            expect(mb.getRealPath()).toEqual('test/path');
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
                windowInfo: mockWindowInfo,
            });
        });

        it('registers scoped events', () => {
            class NOOP {}
            mb.on('testchannel', NOOP);
            expect(wm.onChannel).toHaveBeenCalledWith(mb, 'testchannel', NOOP);
        });
    });
});

