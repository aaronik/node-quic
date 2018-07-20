/*
 * Use this to compare speeds between this quic server
 * and a more traditional http server
*/

import quic from '../src/index'
import express from 'express'
import request from 'request'
import bodyParser from 'body-parser'

const quicPort    = 8000
const expressPort = 8001
const address = '0.0.0.0'

const runAsServer = () => {

  // The quic server
  quic.listen(quicPort, address)
    .onError(console.error)
    .then(() => console.log(`quic server listening at: ${address}:${quicPort}`))
    .onData((data, stream) => {
      console.log('quic server bouncing:', data)
      stream.write(data)
    })

  // The express server
  const eApp = express()
  eApp.use(bodyParser.json())

  eApp.post('/test', (req, res) => {
    const data = req.body
    console.log('express server bouncing:', data)
    return res.json(data)
  })

  eApp.listen(
    expressPort,
    () => console.log(`express server listening at: ${address}:${expressPort}`)
  )
}

const runAsClient = () => {
  const data = { information: 'being posted!' }

  console.time('quic')
  quic.send(quicPort, address, data)
    .onError(console.error)
    .onData(data => {
      console.timeEnd('quic')
      console.log('quic client received data:', data)
    })

  console.time('http')
  request({
    method: 'POST',
    uri: `http://${address}:${expressPort}/test`,
    body: data,
    json: true
  }, (err, resp) => {
    const data = resp.body
    console.timeEnd('http')
    console.log('http client received data:', data)
  })
}

const role = process.argv[2]

if (role === 'client') runAsClient()
else                   runAsServer()
