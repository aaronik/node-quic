/*
 * Use this to compare speeds between this quic server
 * and a more traditional http server.
 *
 * USAGE:
 *  * Run the server(s):
 *    `npm run speed-test`
 *
 *  * Then run the client(s):
 *    `npm run speed-test client`
 *
 *  * To change number of servers/clients, modify
 *    the NUM_SPINUPS global variable.
*/

// TODO:
// * mean
// * median
// * std dev
// * min, max times
// * top 5 min, max times
// * swap logging for assertion
// * Add files with 1, 10, 100KB json sizes

import quic from '../src/index'
import express from 'express'
import request from 'request'
import bodyParser from 'body-parser'

// How many servers / clients do we want to spin up?
const NUM_SPINUPS = Number(process.env.NUM_SPINUPS) || 1

// We will go NUM_SPINUPS * 2 increments above this.
const START_PORT = Number(process.env.START_PORT) || 8000

// Where does this server live?
const ADDRESS = process.env.ADDRESS || '0.0.0.0'

console.log('Running speed test with:', { NUM_SPINUPS, START_PORT, ADDRESS }, '\n')

const runAsServer = (quicPort, httpPort) => {

  // The quic server
  quic.listen(quicPort, ADDRESS)
    .onError(console.error)
    .then(() => console.log(`quic server listening at: ${ADDRESS}:${quicPort}`))
    .onData((data, stream) => {
      console.log(`quic server (${quicPort}) bouncing:`, data)
      stream.write(data)
    })

  // The express server
  const eApp = express()
  eApp.use(bodyParser.json())

  eApp.post('/test', (req, res) => {
    const data = req.body
    console.log(`express server (${httpPort}) bouncing:`, data)
    return res.json(data)
  })

  eApp.listen(
    httpPort,
    () => console.log(`express server listening at: ${ADDRESS}:${httpPort}`)
  )
}

const runAsClient = (quicPort, httpPort) => {
  const data = {
    information: 'being posted!'
  }

  const quicTimeLabel = 'quic ' + quicPort
  const httpTimeLabel = 'http ' + httpPort

  console.time(quicTimeLabel)
  quic.send(quicPort, ADDRESS, data)
    .onError(console.error)
    .onData(data => {
      console.timeEnd(quicTimeLabel)
      console.log('quic client received data:', data)
    })

  console.time(httpTimeLabel)
  request({
    method: 'POST',
    uri: `http://${ADDRESS}:${httpPort}/test`,
    body: data,
    json: true
  }, (err, resp) => {
    const data = resp.body
    console.timeEnd(httpTimeLabel)
    console.log('http client received data:', data)
  })
}

const role = process.argv[2]

for (let p = 8000; p < START_PORT + NUM_SPINUPS; p++) {
  if (role === 'client') runAsClient(p, p + NUM_SPINUPS)
  else                   runAsServer(p, p + NUM_SPINUPS)
}

