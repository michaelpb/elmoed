const EditorGraph = require('../../lib/EditorGraph');

describe('EditorGraph', () => {
    let eg;
    let mockWindowA;
    let mockEditorA;
    let mockEditorB;
    let mockEditorC;
    let mockEditorD;

    beforeEach(() => {
        eg = new EditorGraph();
        mockWindowA = { id: 3 };
        // mockWindowB = { id: 5 }; // unused for now
        // mockWindowC = { id: 8 };
        const windowInfo = { windowID: 3, browser: mockWindowA };
        mockEditorA = { path: 'test-a', testMethod1() {}, windowInfo };
        mockEditorB = { path: 'test-b', testMethod2() {}, windowInfo };
        mockEditorC = { path: 'test-c', testMethod1() {}, windowInfo };
        mockEditorD = { path: 'test-d', testMethod1() {}, windowInfo };
        spyOn(mockEditorA, 'testMethod1');
        spyOn(mockEditorB, 'testMethod2');
        spyOn(mockEditorC, 'testMethod1');
        spyOn(mockEditorD, 'testMethod1');

        eg.addEditor(mockEditorA, mockWindowA);
        eg.addEditor(mockEditorB, mockWindowA, mockEditorA);
        eg.addEditor(mockEditorC, mockWindowA, mockEditorB);
        eg.addEditor(mockEditorD, mockWindowA, mockEditorA);
    });

    it('has static method removeFrom that remove from arrays', () => {
        const obj = { a: ['b', 'c'] };
        EditorGraph.removeFrom(obj, 'a', 'b');
        expect(obj).toEqual({ a: ['c'] });
        EditorGraph.removeFrom(obj, 'a', 'c');
        expect(obj).toEqual({});
    });

    describe('has a method destroyEditor', () => {
        it('which deletes leaf editors as expected', () => {
            expect(Object.keys(eg.pathToEditor).length).toEqual(4);
            eg.destroyEditor(mockEditorC);
            expect(Object.keys(eg.pathToEditor).length).toEqual(3);
        });

        it('which recursively deletes editors as expected', () => {
            expect(Object.keys(eg.pathToEditor).length).toEqual(4);
            eg.destroyEditor(mockEditorA);
            expect(Object.keys(eg.pathToEditor).length).toEqual(0);
        });
    });

    it('when instantiated has expected properties', () => {
        expect(Object.keys(eg.pathToEditor).length).toEqual(4);
        expect(eg.getEditor(mockEditorA.path)).toEqual(mockEditorA);
    });

    it('can set up child to parent relation', () => {
        expect(eg.getParentEditor(mockEditorB)).toEqual(mockEditorA);
        expect(eg.getParentEditor(mockEditorA)).toEqual(null);
    });

    it('can correctly get all descendents', () => {
        expect(eg.getDescendantsOfEditor(mockEditorA))
            .toEqual([mockEditorB, mockEditorC, mockEditorD]);
        expect(eg.getDescendantsOfEditor(mockEditorB))
            .toEqual([mockEditorC]);
        expect(eg.getDescendantsOfEditor(mockEditorD))
            .toEqual([]);
        expect(eg.getDescendantsOfEditor(mockEditorC))
            .toEqual([]);
    });

    it('can call methods on descendants', () => {
        eg.callMethodForDescendants(mockEditorA, 'testMethod1', 'arg1');
        expect(mockEditorA.testMethod1).not.toHaveBeenCalled();
        expect(mockEditorB.testMethod2).not.toHaveBeenCalled();
        expect(mockEditorC.testMethod1).toHaveBeenCalledWith('arg1');
        expect(mockEditorD.testMethod1).toHaveBeenCalledWith('arg1');
    });

    it('can call methods on windows', () => {
        eg.callMethodForWindow(mockWindowA.id, 'testMethod1', 'arg1');
        expect(mockEditorA.testMethod1).toHaveBeenCalledWith('arg1');
        expect(mockEditorB.testMethod2).not.toHaveBeenCalled();
        expect(mockEditorC.testMethod1).toHaveBeenCalledWith('arg1');
        expect(mockEditorD.testMethod1).toHaveBeenCalledWith('arg1');

        // ensure they only got called once
        expect(mockEditorA.testMethod1).toHaveBeenCalledTimes(1);
        expect(mockEditorC.testMethod1).toHaveBeenCalledTimes(1);
        expect(mockEditorD.testMethod1).toHaveBeenCalledTimes(1);
    });
});

