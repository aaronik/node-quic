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

const PARALLEL = process.env.PARALLEL === 'true'

const DEBUG = process.env.DEBUG === 'true'

const IS_CLIENT = process.argv[2] === 'client'

const OUTFILE = process.env.OUTFILE || false

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

// return a random character
const _randomChar = () => {
  return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\n'
    .split('')[Math.round(Math.random() * 62)]
}

// create some data of the specified size (in kb)
// note if 0 is specified, a short string will be returned
const _createData = size => {
  if (size === 0) return 'Here\'s the data!'

  let data = ''

  for (let i = 0; i < size * 1000; i++) {
    data += _randomChar()
  }

  return data
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

// simple logging helper
const debug = (...info) => {
  if (DEBUG) console.log(...info)
}

// namespaced -- make a single request, returned a promise that rejects
// with the error or resolves with the duration
const requesters = {
  quic: (port, data) => {
    debug('sending quic request')

    return new Promise((resolve, reject) => {

      const start = _getTime()

      quic.send(port, ADDRESS, { data })
        .onError(reject)
        .onData(resp => {
          if (resp.data !== data) reject('QUIC received wrong response')
          resolve(_getTime() - start)
        })
    })
  },

  http: (port, data) => {
    debug('sending http request')

    return new Promise((resolve, reject) => {
      const start = _getTime()

      request({
        method: 'POST',
        uri: `http://${ADDRESS}:${port}/test`,
        body: data,
        json: true
      }, (err, resp) => {
        if (err) return reject(err)
        resp = resp.body
        if (resp !== data) reject('HTTP received wrong response')
        resolve(_getTime() - start)
      })
    })

  },

  ws: (port, data) => {
    debug('sending ws request')

    return new Promise((resolve, reject) => {
      const start = _getTime()

      const ws = new WebSocket(`ws://${ADDRESS}:${port}`)

      ws.on('open', () => ws.send(data))
      ws.on('error', reject)
      ws.on('message', message => {
        if (message !== data) reject('WS received wrong response')
        resolve(_getTime() - start)
        ws.close()
      })
    })

  },

  net: (port, data) => {
    debug('sending net request')

    return new Promise((resolve, reject) => {
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

      client.connect(port, ADDRESS, () => {
        client.write(data, () => {
          client.end()
        })
      })
    })
  }
}

const runAsClientParallel = (quicPort, httpPort, wsPort, netPort) => {
  const data = _createData(DATA_SIZE)

  const quicPromise = requesters.quic(quicPort, data)
  const httpPromise = requesters.http(httpPort, data)
  const wsPromise   = requesters.ws(wsPort, data)
  const netPromise  = requesters.net(netPort, data)

  return Promise.all([quicPromise, httpPromise, wsPromise, netPromise])
}

const runAsClientSerially = async (numSends, quicPort, httpPort, wsPort, netPort) => {
  const data = _createData(DATA_SIZE)

  const resolvedPromise = new Promise(resolve => resolve(true))

  let responsePromises = [resolvedPromise]

  for (let i = 0; i < numSends; i++) {
    let roundPromises = []

    await last(responsePromises) // wait for the previous round to wrap up
    roundPromises.push(requesters.quic(quicPort, data))

    await last(roundPromises)
    roundPromises.push(requesters.http(httpPort, data))

    await last(roundPromises)
    roundPromises.push(requesters.ws(wsPort, data))

    await last(roundPromises)
    roundPromises.push(requesters.net(netPort, data))

    responsePromises.push(Promise.all(roundPromises))
  }

  // we don't want to return our dummy promise
  responsePromises.shift()

  return responsePromises
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

const last = (array) => {
  return array[array.length - 1]
}

async function _sleep (duration) {
  return new Promise(resolve => {
    setTimeout(resolve, duration)
  })
}

const _formatTimings = timings => {
  // timings comes as a list of N-tuples where N is the number
  // of different protocols we're trying

  const quicResponses = timings.map(timingTuple => Number(timingTuple[0]))
  const httpResponses = timings.map(timingTuple => Number(timingTuple[1]))
  const wsResponses = timings.map(timingTuple => Number(timingTuple[2]))
  const netResponses = timings.map(timingTuple => Number(timingTuple[3]))

  const sortedQuicResponses = _sort(quicResponses)
  const sortedHttpResponses = _sort(httpResponses)
  const sortedWSResponses = _sort(wsResponses)
  const sortedNetResponses = _sort(netResponses)

  const trimmedQuicResponses = _withoutExtremes(sortedQuicResponses)
  const trimmedHttpResponses = _withoutExtremes(sortedHttpResponses)
  const trimmedWSResponses = _withoutExtremes(sortedWSResponses)
  const trimmedNetResponses = _withoutExtremes(sortedNetResponses)

  const ret = {
    // add run arguments for logging
    NUM_SPINUPS, START_PORT, ADDRESS, DATA_SIZE,

    quicResponses: JSON.stringify(trimmedQuicResponses),
    httpResponses: JSON.stringify(trimmedHttpResponses),
    wsResponses: JSON.stringify(trimmedWSResponses),
    netResponses: JSON.stringify(trimmedNetResponses),

    quicMean: _calculateMean(trimmedQuicResponses),
    httpMean: _calculateMean(trimmedHttpResponses),
    wsMean: _calculateMean(trimmedWSResponses),
    netMean: _calculateMean(trimmedNetResponses),

    quicMedian: _calculateMedian(trimmedQuicResponses),
    httpMedian: _calculateMedian(trimmedHttpResponses),
    wsMedian: _calculateMedian(trimmedWSResponses),
    netMedian: _calculateMedian(trimmedNetResponses),

    quicHigh: _calculateHigh(trimmedQuicResponses),
    httpHigh: _calculateHigh(trimmedHttpResponses),
    wsHigh: _calculateHigh(trimmedWSResponses),
    netHigh: _calculateHigh(trimmedNetResponses),

    quicLow: _calculateLow(trimmedQuicResponses),
    httpLow: _calculateLow(trimmedHttpResponses),
    wsLow: _calculateLow(trimmedWSResponses),
    netLow: _calculateLow(trimmedNetResponses),

    quicStdDev: _calculateStdDev(trimmedQuicResponses),
    httpStdDev: _calculateStdDev(trimmedHttpResponses),
    wsStdDev: _calculateStdDev(trimmedWSResponses),
    netStdDev: _calculateStdDev(trimmedNetResponses),

    quicHighFive: _getHighFive(sortedQuicResponses),
    httpHighFive: _getHighFive(sortedHttpResponses),
    wsHighFive: _getHighFive(sortedWSResponses),
    netHighFive: _getHighFive(sortedWSResponses),

    quicLowFive: _getLowFive(sortedQuicResponses),
    httpLowFive: _getLowFive(sortedHttpResponses),
    wsLowFive: _getLowFive(sortedWSResponses),
    netLowFive: _getLowFive(sortedWSResponses)
  }

  if (OUTFILE) {
    fs.writeFileSync(OUTFILE, JSON.stringify(ret), { encoding: 'utf8', flag: 'a' })
  } else {
    console.log(ret)
  }
}

async function main () {
  let responsePromises = []

  if (!PARALLEL) { // we're doing it serially
    const p = START_PORT
    const [ quicPort, httpPort, wsPort, netPort ] = [p, p + 1, p + 2, p + 3]

    // we're in server mode
    if (!IS_CLIENT) {
      return runAsServer(quicPort, httpPort, wsPort, netPort)
    }

    responsePromises = await runAsClientSerially(NUM_SPINUPS, quicPort, httpPort, wsPort, netPort)
  } else { // we're doing it in parallel
    for (let p = START_PORT; p < START_PORT + (NUM_SPINUPS * 4); p += 4) {
      const [ quicPort, httpPort, wsPort, netPort ] = [p, p + 1, p + 2, p + 3]

      // we're in server mode
      if (!IS_CLIENT) {
        runAsServer(quicPort, httpPort, wsPort, netPort)
        continue
      }

      // we're client
      responsePromises.push(runAsClientParallel(quicPort, httpPort, wsPort, netPort))
      await _sleep(300) // without this, we start seeing QUIC_NETWORK_IDLE_TIMEOUT errors on the server
    }
  }

  if (IS_CLIENT) Promise.all(responsePromises).then(_formatTimings)
}

main()
