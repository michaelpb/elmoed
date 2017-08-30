# Electron Modular Editor

![Travis CI](https://travis-ci.org/michaelpb/elmoed.svg?branch=master)

![Elmoed badge](https://badge.fury.io/js/elmoed.png)

Electron Modular Editor is a component system / framework for writing
electron.js-based editing programs, factoring away some common boilerplate. The
typical usage would be to build something like an office suite. It supports the
concept of mounting "editors" that consist of backend (main process code)
hooked up with IPC to corresponding front end (renderer process code). It can
automatically mount one of these in response to "opening a file", or editing a
portion of a file.

**WIP:** API subject to drastic change, and not yet documented. Not ready for
public usage, mostly just intended to be used as an internally used library.

Forms the backbone of two other WIP projects, [Scroll
Editor](https://bitbucket.org/michaelb/scrolleditor/) -- an extensible document
preparation system based on markdown -- and
[Whiteboard](https://github.com/michaelpb/whiteboard/) -- an activity- based
slide system for teaching and tutorials.

# Features

- Auto-generates an HTML document with included front-end JS

- Separate out "backend" (main process) electron code from "frontend" (renderer
  process)

- Componentize the editor, with components based on filetype

- Allows multiple windows editing multiple documents, all driven by only 1 main
  process

# Getting started

**NOTE:** You might not want to use elmoed, since its main purpose, at the
present time, is just to power Whiteboard (and, soon, Scroll). However, if you
find the examples close to what you want, then maybe it would make a good
starting point for your editor.

To build a editor or editor-suite based on elmoed, take a look at the
`examples/` directory.  That contains a "micro office suite" of a faux image
editor, a faux text editor, and a faux "manifest" editor, which would make
sense for some sort of mixed-content type editor (e.g., a rich text document
that has a built-in image editor and text editor).

To run each example, try one of the following:

```
npm run example-simple-text
npm run example-simple-image
npm run example-simple
```

# Running end-to-end tests

* Run tests with `npm run test`

* Requires node 8 or greater

# Gotchas

* Breaks with `npm link`, because of adaptorPath, need to manually specify
  adaptorPath

# Built-in adaptors

- Riotjs
