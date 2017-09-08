const EditorGraph = require('../../lib/EditorGraph');

describe('EditorGraph', () => {
    let eg;
    let mockWindowA;
    let mockWindowB;
    let mockWindowC;
    let mockEditorA;
    let mockEditorB;
    let mockEditorC;
    let mockEditorD;

    beforeEach(() => {
        eg = new EditorGraph();
        mockWindowA = { id: 3 };
        mockWindowB = { id: 5 };
        mockWindowC = { id: 8 };
        mockEditorA = { path: 'test-a', testMethod1() {} };
        mockEditorB = { path: 'test-b', testMethod2() {} };
        mockEditorC = { path: 'test-c', testMethod1() {} };
        mockEditorD = { path: 'test-d', testMethod1() {} };
        spyOn(mockEditorA, 'testMethod1');
        spyOn(mockEditorB, 'testMethod2');
        spyOn(mockEditorC, 'testMethod1');
        spyOn(mockEditorD, 'testMethod1');

        eg.addEditor(mockEditorA, mockWindowA);
        eg.addEditor(mockEditorB, mockWindowA, mockEditorA);
        eg.addEditor(mockEditorC, mockWindowA, mockEditorB);
        eg.addEditor(mockEditorD, mockWindowA, mockEditorA);
    });

    it('when instantiated has expected properties', () => {
        expect(Object.keys(eg.pathToEditor).length).toEqual(4);
        expect(eg.getEditor(mockEditorA.path)).toEqual(mockEditorA);
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
    });
});

