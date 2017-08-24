
# Electron Modular Editor

Electron Modular Editor is a component system / framework for writing
electron.js-based editing programs. The typical usage would be to build
something like an office suite. It supports the concept of mounting "editors"
that consist of backend (main process code) hooked up with IPC to corresponding
front end (renderer process code). It can automatically mount one of these in
response to "opening a file", or editing a portion of a file.

**WIP:** API subject to drastic change, and not yet documented. Not ready for
public usage, mostly just intended to be used as an internally used library.

Forms the backbone of two other WIP projects, [Scroll
Editor](https://bitbucket.org/michaelb/scrolleditor/) -- an extensible document
preparation system based on markdown -- and
[Whiteboard](https://github.com/michaelpb/whiteboard/) -- an activity- based
slide system for teaching and tutorials.

# Running end-to-end tests

* Run tests with `npm run test`

* Requires node 8 or greater

# Built-in adaptors

Riotjs
