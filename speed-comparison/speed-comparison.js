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
 *    port, START_PORT, for listening / sending
 *    address, ADDRESS, and DATA_SIZE (0 is a short string.)
 *    Note, each of these can also be specified as an
 *    environment variable when calling, ex:
 *
 *    `ADDRESS='123.456.789.123' NUM_SPINUPS=100 npm run speed-test client`
*/

import quic from '../src/index'
import express from 'express'
import request from 'request'
import bodyParser from 'body-parser'
import fs from 'fs'
import path from 'path'
import WebSocket from 'ws'
import net from 'net'

// How many servers / clients do we want to spin up?
const NUM_SPINUPS = Number(process.env.NUM_SPINUPS) || 1

// We will go NUM_SPINUPS * 2 increments above this.
const START_PORT = Number(process.env.START_PORT) || 8000

// Where does this server live?
const ADDRESS = process.env.ADDRESS || '0.0.0.0'

const DATA_SIZE = Number(process.env.DATA_SIZE) || 0

// get a nice specific timestamp
const _getTime = () => {
  // hrtime would be nice to use, but for some reason it doesn't seem very accurate.
  // For example, sometimes it reports start times of nearly a second _after_
  // finish times.
  //
  // const hrtime = process.hrtime()
  // const seconds = Number(`${hrtime[0]}.${hrtime[1]}`)
  // return seconds * 1000 // milliseconds

  return (new Date()).valueOf()
}

const runAsServer = (quicPort, httpPort, wsPort, netPort) => {

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

  // The websocket server
  const wss = new WebSocket.Server({ port: wsPort }, () => {
    console.log(`web socket server listening at: ${ADDRESS}:${wsPort}`)
  })
  wss.on('connection', ws => ws.on('message', ws.send)) // bounce it back

  const server = net.createServer({ allowHalfOpen: true }, socket => {
    socket.on('error', console.error.bind(null, 'net error:'))

    let data

    socket.on('data', dat => {
      if (data) data = Buffer.concat([data, dat])
      else data = dat
    })

    socket.on('end', () => {
      socket.write(data, () => {
        socket.end()
      })
    })
  })

  server.listen(netPort, ADDRESS, () => {
    console.log(`net server listening at:${ADDRESS}:${netPort}`)
  })
}

const runAsClient = (quicPort, httpPort, wsPort, netPort) => {
  const data = fs.readFileSync(path.resolve(__dirname, `data/${DATA_SIZE}kb`), { encoding: 'utf8' })

  const quicPromise = new Promise((resolve, reject) => {
    const start = _getTime()

    quic.send(quicPort, ADDRESS, data)
      .onError(reject)
      .onData(resp => {
        if (resp !== data) reject('QUIC received wrong response')
        resolve(_getTime() - start)
      })
  })

  const httpPromise = new Promise((resolve, reject) => {
    const start = _getTime()

    request({
      method: 'POST',
      uri: `http://${ADDRESS}:${httpPort}/test`,
      body: data,
      json: true
    }, (err, resp) => {
      if (err) return reject(err)
      resp = resp.body
      if (resp !== data) reject('HTTP received wrong response')
      resolve(_getTime() - start)
    })
  })

  const wsPromise = new Promise((resolve, reject) => {
    const start = _getTime()

    const ws = new WebSocket(`ws://${ADDRESS}:${wsPort}`)

    ws.on('open', () => ws.send(data))
    ws.on('error', reject)
    ws.on('message', message => {
      if (message !== data) reject('WS received wrong response')
      resolve(_getTime() - start)
      ws.close()
    })
  })

  const netPromise = new Promise((resolve, reject) => {
    const client = new net.Socket()

    const start = _getTime()

    client.on('error', reject)

    client.on('close', () => client.destroy())

    let buffer

    client.on('data', dat => {
      if (buffer) buffer = Buffer.concat([buffer, dat])
      else buffer = dat
    })

    client.on('end', () => {
      if (buffer.toString() !== data) return reject('net received wrong response')
      resolve(_getTime() - start)
      client.destroy()
    })

    client.connect(netPort, ADDRESS, () => {
      client.write(data, () => {
        // console.log('client has finished write')
        client.end()
      })
    })
  })

  return Promise.all([quicPromise, httpPromise, wsPromise, netPromise])
}

const _calculateMean = (nums) => {
  const sum = nums.reduce((sum, num) => sum + num, 0)
  return sum / nums.length
}

const _calculateMedian = (nums) => {
  const idx = Math.floor(nums.length / 2)
  return nums[idx]
}

const _calculateHigh = (nums) => {
  return nums[nums.length - 1]
}

const _calculateLow = (nums) => {
  return nums[0]
}

const _calculateVariance = (mean, nums) => {
  const variance = nums.reduce((variance, num) => {
    return Math.pow(num - mean, 2) + variance
  }, 0)

  return variance / nums.length
}

const _calculateStdDev = (nums) => {
  const mean = _calculateMean(nums)
  const variance = _calculateVariance(mean, nums)
  return Math.sqrt(variance)
}

const _getHighFive = (nums) => {
  return nums.slice(-5)
}

const _getLowFive = (nums) => {
  return nums.slice(0, 5)
}

const _withoutExtremes = (nums) => {
  if (nums.length < 11) return nums
  return nums.slice(0, nums.length - 5).slice(5)
}

const _sort = (nums) => {
  return nums.sort((a, b) => {
    if (a < b) return -1
    else if (a > b) return 1
    else if (a === b) return 0
  })
}

async function _sleep (duration) {
  return new Promise(resolve => {
    setTimeout(resolve, duration)
  })
}

const _formatTimings = timings => {
  const quicResponses = timings.map(timingPair => Number(timingPair[0]))
  const httpResponses = timings.map(timingPair => Number(timingPair[1]))
  const wsResponses = timings.map(timingPair => Number(timingPair[2]))
  const netResponses = timings.map(timingPair => Number(timingPair[3]))

  const sortedQuicResponses = _sort(quicResponses)
  const sortedHttpResponses = _sort(httpResponses)
  const sortedWSResponses = _sort(wsResponses)
  const sortedNetResponses = _sort(netResponses)

  const trimmedQuicResponses = _withoutExtremes(sortedQuicResponses)
  const trimmedHttpResponses = _withoutExtremes(sortedHttpResponses)
  const trimmedWSResponses = _withoutExtremes(sortedWSResponses)
  const trimmedNetResponses = _withoutExtremes(sortedNetResponses)

  const quicMean = _calculateMean(trimmedQuicResponses)
  const httpMean = _calculateMean(trimmedHttpResponses)
  const wsMean = _calculateMean(trimmedWSResponses)
  const netMean = _calculateMean(trimmedNetResponses)

  const quicMedian = _calculateMedian(trimmedQuicResponses)
  const httpMedian = _calculateMedian(trimmedHttpResponses)
  const wsMedian = _calculateMedian(trimmedWSResponses)
  const netMedian = _calculateMedian(trimmedNetResponses)

  const quicHigh = _calculateHigh(trimmedQuicResponses)
  const httpHigh = _calculateHigh(trimmedHttpResponses)
  const wsHigh = _calculateHigh(trimmedWSResponses)
  const netHigh = _calculateHigh(trimmedNetResponses)

  const quicLow = _calculateLow(trimmedQuicResponses)
  const httpLow = _calculateLow(trimmedHttpResponses)
  const wsLow = _calculateLow(trimmedWSResponses)
  const netLow = _calculateLow(trimmedNetResponses)

  const quicStdDev = _calculateStdDev(trimmedQuicResponses)
  const httpStdDev = _calculateStdDev(trimmedHttpResponses)
  const wsStdDev = _calculateStdDev(trimmedWSResponses)
  const netStdDev = _calculateStdDev(trimmedNetResponses)

  const quicHighFive = _getHighFive(sortedQuicResponses)
  const httpHighFive = _getHighFive(sortedHttpResponses)
  const wsHighFive = _getHighFive(sortedWSResponses)
  const netHighFive = _getHighFive(sortedWSResponses)

  const quicLowFive = _getLowFive(sortedQuicResponses)
  const httpLowFive = _getLowFive(sortedHttpResponses)
  const wsLowFive = _getLowFive(sortedWSResponses)
  const netLowFive = _getLowFive(sortedWSResponses)

  const ret = {
    // add run arguments for logging
    NUM_SPINUPS, START_PORT, ADDRESS, DATA_SIZE,
    quicResponses: JSON.stringify(trimmedQuicResponses),
    httpResponses: JSON.stringify(trimmedHttpResponses),
    wsResponses: JSON.stringify(trimmedWSResponses),
    netResponses: JSON.stringify(trimmedNetResponses),
    quicMean,
    httpMean,
    wsMean,
    netMean,
    quicMedian,
    httpMedian,
    wsMedian,
    netMedian,
    quicHigh,
    httpHigh,
    wsHigh,
    netHigh,
    quicLow,
    httpLow,
    wsLow,
    netLow,
    quicStdDev,
    httpStdDev,
    wsStdDev,
    netStdDev,
    quicHighFive,
    httpHighFive,
    wsHighFive,
    netHighFive,
    quicLowFive,
    httpLowFive,
    wsLowFive,
    netLowFive
  }

  console.log(ret)
}

async function main () {
  const isClient = process.argv[2] === 'client'
  let responsePromises = []

  for (let p = START_PORT; p < START_PORT + NUM_SPINUPS; p++) {
    if (isClient) {
      await _sleep(300) // without this, we start seeing QUIC_NETWORK_IDLE_TIMEOUT errors on the server
      responsePromises.push(runAsClient(p, p + NUM_SPINUPS, p + (NUM_SPINUPS * 2), p + (NUM_SPINUPS * 3)))
    }
    else runAsServer(p, p + NUM_SPINUPS, p + (NUM_SPINUPS * 2), p + (NUM_SPINUPS * 3))
  }

  if (isClient) Promise.all(responsePromises).then(_formatTimings)
}

main()
