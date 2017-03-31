# mxvr-tourism-demo
A demo of Matrix VR tourism and VR video conferencing

## Usage

```
git clone git@github.com:matrix-org/mxvr-tourism-demo.git
cd mxvr-tourism-demo
npm install
npm run serve
```

N.B. that currently we currently depend on an unreleased version of matrix-js-sdk from github.
matrix-js-sdk has to be transpiled from ES6 to ES5 using Babel however.  running `npm install`
on mxvr-tourism-demo doesn't run the transpilation however; if nothing else the transpilation
step needs devDependencies (exorcist, uglifyjs), which don't get installed for transitive
dependencies.

We fudge this for now by manually calling `npm i` on node_modules/matrix-js-sdk from the
`build` target of mxvr-tourism-demo, which pulls in all the dependencies and does the transpile
(as well as probably installing duplicate dependencies for stuff which mxvr-tourism-demo already
depends on).  This should be removed once we depend on a released matrix-js-sdk.

The pinned dependency on aframe & aframe-look-at-component doesn't suffer from this problem
as it doesn't need to be transpiled.
