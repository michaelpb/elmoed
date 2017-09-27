## Menu / focus / context / event system
- Idea: Move and unify the menu, focus, context, and event system
- Context is from hover
- Focus is configurable (either "follows mouse", or "on click")
- On mount or resize, sends dimensions to backend editor


# TODO

## Critical bugs
- [ ] Multiple windows mounts with conflicting channels for mount:ready etc, or
  opening the same file multiple times

## Mousetrap based keyboard events
- [ ] Mousetrap to register all key combos
    - [ ] Move utility functions to elmoed
    - [ ] Add `.bind` functionality to elmoed, that hooks in Mousetrap on
        front-end with backend
    - [ ] Add auto-unbind on editor unmount (?)
    - [ ] Add editor "focus" concept (?) - this replaces some of the
        boilerplate-y code and allows focus-follows mouse or last click or
        whatever, and may eventually work its way into Scroll

## Brittle potential future bugs
- [ ] Debug why fs.writeFileSync(mainPath, newText); is failing in asar

## Code cleanliness
- [ ] Remove references to windowInfo, make it simply an electron BrowserWindow
  object since we are now using `{ id }` as ID

- [ ] Add tests for Mounter.js

## Misc

- [X] Full editor lifecycle event system for window / editor

- [X] Add in linting

- [X] Add in save window state in personal prefs

- [ ] Prevent multiple instances

- [ ] Instead start new windows if multiple instances occur

- [ ] Add in 'zero state' feature

- [ ] Add personal prefs system

- [ ] Add React and Riot.js examples
