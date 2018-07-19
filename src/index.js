import { Client, Server } from 'quic'
import ArbitraryPromise from 'arbitrary-promise'

// quic.listen(2345) // also takes address, defaults to localhost
//   .then(() => {})
//   .onError(error => {})
//   .onData((data, stream) => {})
//     // stream has .write() function

// quic.stopListening()
//   .then(() => {})

// quic.getServer() // low level server object
// quic.getClient() // low level client object
// quic.getAddress() // { port: number,family:string (like "IPv4"),address: string (ip address) }

// quic.send(url, data)
//   .onError(error => {})
//   .onData(data => {})

// simple convenience helper
const rejectPromise = (promise, err, message) => {
  promise.reject(Object.assign(err, { class: message }))
}

class Quic {
  constructor() {
    this._server = new Server()
  }

  listen(port, address = 'localhost') {
    if (!port) throw new Error('must supply port argument')

    const promise = new ArbitraryPromise([['resolve', 'then'], ['reject', 'onError'], ['handleData', 'onData']])

    this._server
      .on('error', (err) => rejectPromise(promise, err, 'server error'))
      .on('session', (session) => {

        session
          .on('error', (err) => rejectPromise(promise, err, 'server session error'))
          .on('stream', (stream) => {

            let message = '' // TODO turn into buf?

            stream
              .on('error', (err) => rejectPromise(promise, err, 'server stream error'))
              .on('data', (data) => {
                message += data.toString()
              })
              .on('end', () => {
                promise.resolve(message, stream)
                stream.end()
              })
              .on('finish', () => {
                // ilog.info(`server stream ${stream.id} finished`)
              })
          })
      })

    // this._server.listen(port, address).then(promise.resolve)
    promise.resolve()

    return promise
  }

  stopListening() {
    this._server.close()
  }

  getServer() {
    return this._server
  }

  getClient() {}

  getAddress() {
    return this._server.address()
  }

  send() {}
}

module.exports = new Quic()
