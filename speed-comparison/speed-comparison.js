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
 *    the NUM_SPINUPS global variable. For start
 *    port, START_PORT, and for listening / sending
 *    address, ADDRESS. Note, each of these can
 *    also be specified as an environment variable
 *    when calling, ex:
 *
 *    `ADDRESS='123.456.789.123' NUM_SPINUPS=100 npm run speed-test client`
*/

// TODO:
// * mean
// * median
// * std dev
// * min, max times
// * top 5 min, max times
// * swap logging for assertion
// * Add files with 1, 10, 100KB json sizes
// * Add CSV printing for easy spreadsheet addition.

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

// get a nice specific timestamp
const getTime = () => {
  // hrtime would be nice to use, but for some reason it doesn't seem very accurate.
  // For example, sometimes it reports start times of nearly a second _after_
  // finish times.
  //
  // const hrtime = process.hrtime()
  // const seconds = Number(`${hrtime[0]}.${hrtime[1]}`)
  // return seconds * 1000 // milliseconds

  return (new Date()).valueOf()
}

const runAsServer = (quicPort, httpPort) => {

  // The quic server
  quic.listen(quicPort, ADDRESS)
    .onError(console.error)
    .then(() => console.log(`quic server listening at: ${ADDRESS}:${quicPort}`))
    .onData((data, stream) => {
      stream.write(data)
    })

  // The express server
  const eApp = express()
  // text/json is little hack to simplify text receiving. Sorry!
  eApp.use(bodyParser.text({ type: 'application/json' }))

  eApp.post('/test', (req, res) => {
    const data = req.body
    return res.send(data)
  })

  eApp.listen(
    httpPort,
    () => console.log(`express server listening at: ${ADDRESS}:${httpPort}`)
  )
}

const runAsClient = (quicPort, httpPort) => {
  const data = 'this is a bunch of data!'

  const quicPromise = new Promise((resolve, reject) => {
    const start = getTime()

    quic.send(quicPort, ADDRESS, data)
      .onError(console.error)
      .onData(resp => {
        if (resp !== data) reject('QUIC received wrong response')
        resolve(getTime() - start)
      })
  })

  const httpPromise = new Promise((resolve, reject) => {
    const start = getTime()

    request({
      method: 'POST',
      uri: `http://${ADDRESS}:${httpPort}/test`,
      body: data,
      json: true
    }, (err, resp) => {
      resp = resp.body
      if (resp !== data) reject('HTTP received wrong response')
      resolve(getTime() - start)
    })
  })

  return Promise.all([quicPromise, httpPromise])
}

async function _sleep (duration) {
  return new Promise(resolve => {
    setTimeout(resolve, duration)
  })
}

const _calculateMean = (nums) => {
  const sum = nums.reduce((sum, num) => sum + num)
  return sum / nums.length
}

const _formatTimings = timings => {
  const quicResponses = timings.map(timingPair => timingPair[0])
  const httpResponses = timings.map(timingPair => timingPair[1])

  const quicAverage = _calculateMean(quicResponses)
  const httpAverage = _calculateMean(httpResponses)

  const ret = {
    quicResponses: JSON.stringify(quicResponses),
    httpResponses: JSON.stringify(httpResponses),
    quicAverage,
    httpAverage
  }

  console.log(ret)
}

async function main () {
  const isClient = process.argv[2] === 'client'
  let responsePromises = []

  for (let p = 8000; p < START_PORT + NUM_SPINUPS; p++) {
    if (isClient) {
      responsePromises.push(runAsClient(p, p + NUM_SPINUPS))
      await _sleep(1) // we don't want the function spinup time to impact our timings
    }
    else          runAsServer(p, p + NUM_SPINUPS)
  }

  if (isClient) Promise.all(responsePromises).then(_formatTimings)
}

main()
