import { Client, Server } from 'quic'

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

// A special promise with .onError and .onData functions
// Also does not require executor function, and can have reject
// called on its prototype
class CustomPromise {
  constructor(passReceivePairs) {
    if (!this._validatePassReceivePairs(passReceivePairs))
      throw new Error("must pass in tuples of function names like [['handleData', 'onData'], ...]")

    this._createState()

    passReceivePairs.forEach(this._processPassReceivePair.bind(this))
  }

  // Remove all state. Useful for applications making heavy repeated use
  // of single promises.
  clear() {
    this._resetState()
  }

  _createState() {
    this._state = {}
  }

  _resetState() {
    Object.keys(this._state).forEach(stateKey => {
      this._state[stateKey] = []
    })
  }

  _processPassReceivePair(pair) {
    const [ pass, receive ] = pair

    const stateKey = '__state_' + pass
    const handlerKey = '__handler_' + receive

    // This will contain the data from every pass call
    this._state[stateKey] = []

    this[receive] = (handler) => {
      // set local handler for pass funk to call
      this[handlerKey] = handler

      // Get all data previously called from pass funk
      this._state[stateKey].forEach(handler)
    }

    this[pass] = (data) => {
      // Save data for future receive assignments to get
      this._state[stateKey].push(data)

      // Call receive function with data
      this[handlerKey] && this[handlerKey](data)
    }

  }

  _validatePassReceivePairs(passReceivePairs) {
    const isArray = Array.isArray(passReceivePairs)
    if (!isArray) return false

    const hasSomeEntries = passReceivePairs.length >= 1
    if (!hasSomeEntries) return false

    const isTuples = passReceivePairs.every(pair => {
      return pair.length === 2
    })
    if (!isTuples) return false

    const areStrings = passReceivePairs.every(pair => {
      return typeof pair[0] === 'string' &&
             typeof pair[1] === 'string'
    })
    if (!areStrings) return false

    return true
  }
}

class Quic {
  constructor() {
    this._server = new Server()
  }

  listen(port, address = 'localhost') {
    if (!port) throw new Error('must supply port argument')

    const promise = new CustomPromise([['resolve', 'then'], ['reject', 'onError'], ['handleData', 'onData']])

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

module.exports = { quic: new Quic(), CustomPromise }
