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

const port    = 1234
const address = '127.0.0.1'     // default

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

  .onData(
    (data, stream, buffer) => {}
  )                             // data here will be a stringified version of
                                // whatever was sent using quic.send(), stream will have
                                // two function properties: `write` and `end.`
                                // Use stream.write(data) to return information to the
                                // original sender. Note: stream.write will automatically
                                // stringify any non-buffer data sent to it, but you will need
                                // to parse your own data on the way out of `.onData` for
                                // `quic.listen` and for `quic.send`.  Use `stream.end()`
                                // if you don't need to send anything back. If you are working
                                // with buffers directly and don't need anything stringified,
                                // you can use the buffer argument.

quic.send(port, address, data)  // Send data to a listening server. `data` is automatically
                                // stringified, but will need to be parsed manually on receive.

  .then(() => {})               // called after the stream is written

  .onError((error) => {})       // called on error. The error classes for `quic.send` are:
                                //   * 'client stream error'

  .onData((data, buffer) => {}) // `data` is populated by whatever the receiving server deems
                                // necessary to send back. `buffer` contains the unstringified
                                // version of the data.
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

For example:

```js
const port    = 1234
const address = '127.0.0.1'

// First we listen.
quic.listen(port, address)
  .onData((data, stream, buffer) => {
    const parsedData = JSON.parse(data)

    console.log(parsedData) // { hello: 'world!' }

    // Once the data is received and logged, we'll send it right back
    stream.write(parsedData)
  })

// Now we send the data to the server.
quic.send(port, address, { hello: 'world!' })
  .onData(data => {

    // This is the data that was sent right back
    const parsedData = JSON.parse(data)
    console.log(parsedData) // { hello: 'world!' }

    // now we can stop the server from listening if we want this to be a one-off
    quic.stopListening()
  })

```

Easy Peasy. Enjoy!
