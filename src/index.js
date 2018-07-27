import { Client, Server } from 'quic'
import ArbitraryPromise from 'arbitrary-promise'

// simple convenience helper
const rejectPromise = (promise, err, message) => {
  promise.reject(Object.assign(err, { class: message }))
}

// the underlying quic library can only handle strings or buffers.
// This is used to convert to one of them.
const convertToSendType = (data) => {
  // buffers should be sendable
  if (Buffer.isBuffer(data)) return data

  // objects must be stringified
  if (typeof data === 'object') return JSON.stringify(data)

  // all else should be strings
  return data
}

class Quic {
  listen(port, address = 'localhost') {
    const promise = new ArbitraryPromise([['resolve', 'then'], ['reject', 'onError'], ['handleData', 'onData']])

    if (!port) return promise.reject('must supply port argument!')

    this._server = new Server()

    this._server
      .on('error', (err) => rejectPromise(promise, err, 'server error'))
      .on('session', (session) => {

        session
          .on('error', (err) => rejectPromise(promise, err, 'server session error'))
          .on('stream', (stream) => {

            let buffer

            stream
              .on('error', (err) => rejectPromise(promise, err, 'server stream error'))
              .on('data', (data) => {
                if (buffer) buffer = Buffer.concat([buffer, data])
                else buffer = data
              })
              .on('end', () => {
                const oldWrite = stream.write.bind(stream)
                stream.write = (data) => {
                  oldWrite(data)
                  stream.end()
                }
                promise.handleData(buffer, stream)
              })
              .on('finish', () => {})
          })
      })

    this._server.listen(port, address).then(promise.resolve).catch(promise.reject)
    return promise
  }

  async stopListening() {
    // TODO returned promise to return onError instead of catch
    this._server && await this._server.close()
    delete this._server
  }

  getServer() {
    return this._server
  }

  getAddress() {
    const defaul = { port: 0, family: '', address: '' }
    return this._server && this._server.address() || defaul
  }

  send(port, address, data) {
    const promise = new ArbitraryPromise([['resolve', 'then'], ['reject', 'onError'], ['handleData', 'onData']])
    if (!port || !address || !data) return promise.reject('must supply three parameters')
    const convertedData = convertToSendType(data)
    return this._send(port, address, convertedData, promise)
  }

  sendBuffer(port, address, buffer) {
    const promise = new ArbitraryPromise([['resolve', 'then'], ['reject', 'onError'], ['handleData', 'onData']])
    return this._send(port, address, buffer, promise)
  }

  // performs no type checks
  _send(port, address, data, promise) {
    const client = new Client()

    client.on('error', err => {
      rejectPromise(promise, err, 'client error')
    })

    // These clients are ephemeral so we'll nuke em when they're done
    client.on('close', () => {
      client.destroy()
    })

    client.connect(port, address).then(() => {

      const stream = client.request()

      let buffer

      stream
        .on('error', err => rejectPromise(promise, err, 'client stream error'))
        .on('data', data => {
          if (buffer) buffer = Buffer.concat([buffer, data])
          else buffer = data
        })
        .on('end', () => {
          client.close()
          promise.handleData(buffer)
        })
        .on('finish', () => {
        })

      stream.write(data, () => {
        promise.resolve()
        stream.end()
      })
    })

    return promise
  }
}

module.exports = new Quic()
