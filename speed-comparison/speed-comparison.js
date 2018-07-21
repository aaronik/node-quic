/*
 * Use this to compare speeds between this quic server
 * and a more traditional http server
*/

import quic from '../src/index'
import express from 'express'
import request from 'request'
import bodyParser from 'body-parser'

const address = '0.0.0.0'

const runAsServer = (quicPort, httpPort) => {

  // The quic server
  quic.listen(quicPort, address)
    .onError(console.error)
    .then(() => console.log(`quic server listening at: ${address}:${quicPort}`))
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
    () => console.log(`express server listening at: ${address}:${httpPort}`)
  )
}

const runAsClient = (quicPort, httpPort) => {
  const data = {
    information: 'being posted!'
  }

  const quicTimeLabel = 'quic ' + quicPort
  const httpTimeLabel = 'http ' + httpPort

  console.time(quicTimeLabel)
  quic.send(quicPort, address, data)
    .onError(console.error)
    .onData(data => {
      console.timeEnd(quicTimeLabel)
      console.log('quic client received data:', data)
    })

  console.time(httpTimeLabel)
  request({
    method: 'POST',
    uri: `http://${address}:${httpPort}/test`,
    body: data,
    json: true
  }, (err, resp) => {
    const data = resp.body
    console.timeEnd(httpTimeLabel)
    console.log('http client received data:', data)
  })
}

const role = process.argv[2]

const numSpinups = 1
const startPort = 8000

for (let p = 8000; p < startPort + numSpinups; p++) {
  if (role === 'client') runAsClient(p, p + numSpinups)
  else                   runAsServer(p, p + numSpinups)
}

