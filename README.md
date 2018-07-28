# node-quic

A wrapper around fidm/quic, node-quic is a dead simple stream based QUIC server / client for use in node.js.

[![Travis](https://travis-ci.org/Aaronik/node-quic.svg?branch=master)](https://travis-ci.org/aaronik/node-quic)
[![Codecov](https://img.shields.io/codecov/c/github/aaronik/node-quic.svg)](https://codecov.io/gh/aaronik/node-quic)
[![npm](https://img.shields.io/npm/v/node-quic.svg)](https://npmjs.com/package/node-quic)

node-quic is a simple way to bring QUIC / UDP into your application.

## Installation

```sh
npm install node-quic
```
## Usage

```js
import quic from 'node-quic'

const port = 1234
const address = 'localhost' // default

quic.listen(port, address)
  .then(() => {})               // called once server starts listening

  .onError((error) => {})       // called if there's an error with the listening.
                                // There are three classes of error:
                                //    * 'server error'
                                //    * 'server session error'
                                //    * 'server stream error'
                                // An error will come out as an object with key
                                // `class` containing one of the above. More information
                                // will be in the error object.

  .onData((buffer, stream) => {}) // You'll receive a buffer of what was received, and a
                                // stream object. `stream` has `.write` and `.end`. Use
                                // `.end` if you have nothing to send back, `.write` if you
                                // do. Note `.write` requires a buffer or string.

quic.send(port, address, data)  // Send data to a listening server. `data` is automatically
                                // stringified, but will need to be parsed manually on receive.

  .then(() => {})               // called after the stream is written

  .onError((error) => {})       // called on error. The error classes for `quic.send` are:
                                //   * 'client stream error'

  .onData((data, buffer) => {}) // `data` is populated by whatever the receiving server deems
                                // necessary to send back. `buffer` contains the unstringified
                                // version of the data.

quic.sendBuffer(port, address, data)
                                // This is the same as quic.send, except it saves approximately
                                // a half a millisecond by not type checking the input. It will
                                // throw if given anything other than a buffer or a string. If
                                // given a string, it will still be converted to a buffer on
                                // the wire.
```

There are also a few utility functions:

```js
quic.stopListening()            // kill the server

quic.getServer()                // return low level server object. Note, a server will only be
                                // returned following a call to `.listen()` and preceding any
                                // calls to `.stopListening()`, a.k.a. when quic is listening.

quic.getAddress()               // returns an object {
                                //   port: <number>,
                                //   family: <string>, // like 'IPv4'
                                //   address: <string> // defaults to '127.0.0.1'
                                // }
                                // Note: these fields will be 0 or the empty string if quic
                                // is not listening.
```

Good luck!
