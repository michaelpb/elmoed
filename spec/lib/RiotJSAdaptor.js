const mockery = require('mockery');

describe('Riot.js Adaptor', () => {
    let tagInstance = null;
    let adaptor = null;
    let fauxProps = null;
    let riot = null;

    beforeEach(() => {
        mockery.enable();
        fauxProps = { on: () => {}, clearAll: () => {} };
        spyOn(fauxProps, 'on');
        spyOn(fauxProps, 'clearAll');

        tagInstance = { on: () => {}, update: () => {} };
        spyOn(tagInstance, 'on');
        spyOn(tagInstance, 'update');

        riot = { mount: () => [tagInstance] };
        spyOn(riot, 'mount').and.callThrough();

        // Add in fake window
        mockery.registerMock('mock-window', { riot });

        mockery.warnOnUnregistered(false);
        /* eslint-disable global-require */
        adaptor = require('../../lib/adaptors/riotjs.js');
    });


    describe('has a static method initialize which exists', () => {
        it('which exists', () => {
            expect(adaptor.initialize).toBeTruthy();
        });
    });

    describe('has a static method mount', () => {
        it('which exists', () => {
            expect(adaptor.mount).toBeTruthy();
        });

        it('which calls riot.js mount in turn as expected', () => {
            const mountLocation = { querySelectorAll: () => [] };
            adaptor.mount(mountLocation, 'test-tag', fauxProps);
            expect(tagInstance.on).toHaveBeenCalled();
            expect(mountLocation.innerHTML).toBeTruthy();
            expect(mountLocation.innerHTML).toContain('<test-tag');
            expect(mountLocation.innerHTML)
                .toContain('data-elmoed-editor="test-tag"');

            const [evName, func] = tagInstance.on.calls.allArgs()[0];
            expect(evName).toEqual('before-unmount');
            func();
            expect(fauxProps.clearAll).toHaveBeenCalled();
        });

        it('which attempts to cleanup existing mounted elements', () => {
            const tagList = [
                { _tag: { unmount: () => {} } },
            ];
            const mountLocation = { querySelectorAll: () => tagList };
            spyOn(mountLocation, 'querySelectorAll').and.callThrough();
            spyOn(tagList[0]._tag, 'unmount');
            adaptor.mount(mountLocation, 'test-tag', fauxProps);
            expect(mountLocation.querySelectorAll).toHaveBeenCalled();
            expect(mountLocation.querySelectorAll)
                .toHaveBeenCalledWith('[data-elmoed-editor]');
            expect(tagList[0]._tag.unmount).toHaveBeenCalled();
        });
    });

    describe('has a static method update', () => {
        it('which exists', () => {
            expect(adaptor.update).toBeTruthy();
        });
        it('which calls riots update as expected', () => {
            adaptor.update(tagInstance, fauxProps);
            expect(tagInstance.opts).toEqual(fauxProps);
            expect(tagInstance.update).toHaveBeenCalled();
        });
    });

    afterEach(() => {
        tagInstance = null;
        adaptor = null;
        fauxProps = null;
        mockery.deregisterAll();
        mockery.disable();
    });
});

