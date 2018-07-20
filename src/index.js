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

            let message = '' // TODO turn into buf?

            stream
              .on('error', (err) => rejectPromise(promise, err, 'server stream error'))
              .on('data', (data) => {
                message += data.toString()
              })
              .on('end', () => {
                const oldWrite = stream.write.bind(stream)
                stream.write = (...args) => {
                  oldWrite(...args)
                  stream.end()
                }
                promise.handleData(message, stream)
                // TODO have to have mechanism to end stream when not returning anything
                // stream.end()
              })
              .on('finish', () => {
                // ilog.info(`server stream ${stream.id} finished`)
              })
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

  send(port, address, data) { // TODO change port, address to address:port?
    const promise = new ArbitraryPromise([['resolve', 'then'], ['reject', 'onError'], ['handleData', 'onData']])

    if (!port || !address || !data) return promise.reject('must supply three parameters')

    if (typeof data !== 'string') data = JSON.stringify(data)

    const client = new Client()

    client.connect(port, address).then(() => {

      const stream = client.request()

      let message = ''

      stream
        .on('error', err => rejectPromise(promise, err, 'client stream error'))
        .on('data', data => message += data.toString())
        .on('end', () => {
          client.close()
          client.destroy()
          promise.handleData(message)
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
