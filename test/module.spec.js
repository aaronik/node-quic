/* eslint-env mocha */
import { expect } from 'chai'
import fs from 'fs'
import path from 'path'
let quic = require('../src/index')

const BIG_DATA_LOCATION = '../speed-comparison/data/100kb'

describe('node-quic', () => {

  afterEach(async () => {
    // everything that results in a totally fresh quic server here
    await quic.stopListening()
    quic = require('../src/index')
  })

  it('is properly exported', () => {
    expect(quic).to.be.an('object')
  })

  describe('.getServer()', () => {

    beforeEach((done) => {
      // server only exists on prototype if it's listening
      quic.listen(1234).then(done)
    })

    it('exists as a property', () => {
      expect(quic.getServer).to.be.a('function')
    })

    it('returns server object', () => {
      const server = quic.getServer()
      expect(server).to.be.an('object')
      expect(server).to.have.property('localPort')
      expect(server).to.have.property('localAddress')
      expect(server).to.have.property('localFamily')
      expect(server).to.have.property('listening')
    })

  })

  describe('.getAddress()', () => {

    it('exists as a property', () => {
      expect(typeof quic.getAddress === 'function')
    })

    it('returns address object', () => {
      const address = quic.getAddress()
      expect(address).to.have.property('port')
      expect(address).to.have.property('family')
      expect(address).to.have.property('address')
    })

  })

  describe('.listen()', () => {

    it('exists as a property', () => {
      expect(quic.listen).to.be.a('function')
    })

    it('requires port argument', done => {
      quic.listen().onError(done.bind(null, null))
    })

    it('defaults ip to localhost', done => {
      const defaul = '127.0.0.1'

      quic.listen(1234)
        .onError(done)
        .then(() => {
          expect(quic.getAddress().address).to.eq(defaul)
          done()
        })
    })

    it('takes and assigns ip argument', done => {
      const address = '127.0.0.2'

      quic.listen(1234, address)
        .then(() => {
          expect(quic.getAddress().address).to.eq(address)
          done()
        })
    })

    it('works twice', done => {
      const port = 1235

      quic.stopListening()
        .catch(done)
        .then(() => {
          quic.listen(port)
            .onError(done)
            .then(() => {
              const p = quic.getAddress().port
              expect(p).to.eq(port)
              done()
            })
          })
    })

    it('handles counless sends', done => {
      const port = 1234
      const address = 'localhost'
      const fullData = 'Lopadotemachoselachogaleokranioleipsanodrimhypotrimmatosilphioparaomelitokatakechymenokichlepikossyphophattoperister PNEUMONOULTRAMICROSCOPICSILICOVOLCANOCONIOSIS'
      let recomposedData = ''

      quic.listen(port).onError(done).then(() => {
        fullData.split('').forEach(data => quic.send(port, address, data))
      })
      .onData((data, stream) => {
        recomposedData += data
        if (recomposedData.length === fullData.length) done()
      })
    })

    describe('returned promise', () => {

      let promise

      beforeEach(done => {
        promise = quic.listen(1234).then(done).onError(done)
      })

      describe('promise.then()', () => {

        it('exists as a property', () => {
          expect(promise).to.have.property('then')
          expect(promise.then).to.be.a('function')
        })

        it('is called when the server starts', done => {
          let called = false
          promise
            .then(() => called = true)
            .then(() => {
              expect(called).to.eq(true)
              done()
            })
        })

        it('passes no arguments', (done) => {
          let args = null
          promise
            .then(argv => args = argv)
            .then(() => {
              expect(args).to.eq(undefined)
              done()
            })
        })

      })

      describe('promise.onError()', () => {

        it('exists as a property', () => {
          expect(promise).to.have.property('onError')
          expect(promise.onError).to.be.a('function')
        })

        it('is called when the server cannot start', done => {
          quic.stopListening().then(() => {
            quic.listen().onError(() => done())
          })

        })

        it('passes error argument', done => {
          quic.stopListening().then(() => {
            quic.listen().onError(e => {
              expect(e).to.be.a('string')
              done()
            })
          })
        })

      })

      describe('promise.onData()', () => {

        it('exists as a property', () => {
          expect(promise).to.have.property('onData')
          expect(promise.onData).to.be.a('function')
        })

        describe('when receiving information from a client', () => {

          const data = 'test data'
          const port = 1234
          const address = '127.0.0.1'

          let receivedData
          let receivedStream

          let sendPromise

          beforeEach(done => {
            quic.stopListening().then(() => {
              quic.listen(port, address)
                .onError(done)
                .onData((data, stream) => {
                  receivedData = data
                  receivedStream = stream
                  done()
                })
                .then(() => {
                  sendPromise = quic.send(port, address, data).onError(done)
                })
            })
          })

          it('is called when the server receives stream', () => {
            expect(receivedData).to.eq(data)
          })

          it('passes data and stream arguments', () => {
            expect(receivedStream).to.be.ok
          })

          describe('stream argument', () => {

            it('has .write() property', () => {
              expect(receivedStream).to.have.property('write')
            })

            it('writes data back to sender', done => {
              const sendBackData = 'marissa'

              receivedStream.write(sendBackData)
              sendPromise.onError(done).onData(data => {
                expect(data).to.eq(sendBackData)
                done()
              })
            })
          })
        })
      })
    })
  })

  describe('.stopListening()', () => {

    it('exists as a property', () => {
      expect(typeof quic.stopListening === 'function')
    })

    describe('when called after listen()', () => {

      beforeEach(done => {
        quic.listen(1234).then(done).onError(done)
      })

      it('removes server object from prototype', done => {
        quic.stopListening().catch(done).then(() => {
          const server = quic.getServer()
          expect(server).to.eq(undefined)
          done()
        })
      })
    })
  })

  describe('.send()', () => {

    it('exists as a property', () => {
      expect(quic.send).to.be.a('function')
    })

    it('requires three parameters', done => {
      const promise = quic.send()
      promise.onError(err => {
        expect(err).to.be.a('string')
        done()
      })
    })

    it('stringifies non-string objects', done => {
      const data = { bob: 'struff' }

      quic.listen(1234)
        .onError(done)
        .onData((dat, stream) => {
          stream.end()
          quic.stopListening()
          dat = JSON.parse(dat)
          expect(dat).to.deep.eq(data)
          done()
        })
        .then(() => {
          quic.send(1234, 'localhost', data)
        })
    })

    it('does not stringify given strings', done => {
      const data = 'hello darkness my old friend'

      quic.listen(1234)
        .onError(done)
        .onData((dat, stream) => {
          stream.end()
          quic.stopListening()
          expect(dat).to.deep.eq(data)
          done()
        })
        .then(() => {
          quic.send(1234, 'localhost', data)
        })
    })

    it('includes buffers', done => {
      const data = Buffer.from('burfeer')

      quic.listen(1234)
        .onError(done)
        .onData((dat, stream, buffer) => {
          stream.end()
          quic.stopListening()
          expect(dat).to.deep.eq(data.toString())
          // expect(buffer).to.deep.eq(data)
          done()
        })
        .then(() => {
          quic.send(1234, 'localhost', data)
        })
    })

    describe('returned promise', () => {

      describe('promise.onError()', () => {

        it('is called when there is an error', done => {
          quic.send('invalid arguments').onError(() => done())
        })

        it('passes error argument', done => {
          quic.send('invalid arguments').onError(e => {
            expect(e).to.be.a('string')
            done()
          })
        })
      })

      describe('promise.onData()', () => {

        const port = 1234
        const address = 'localhost'
        const data = Buffer.from('beaufeaux')

        let returnedData
        let returnedBuffer

        beforeEach(done => {
          quic.listen(port, address)
            .onError(done)
            .onData((data, stream) => {
              stream.write(data) // just return the data
            })
            .then(() => {
              quic.send(port, address, data)
                .onError(done)
                .onData((dat, buffer) => {
                  returnedData = dat
                  returnedBuffer = buffer
                  quic.stopListening()
                  done()
                })
            })
        })

        it('is called on return message', () => {
          expect(returnedData).to.deep.eq(data.toString())
        })

        it('contains the unstringified buffer', () => {
          expect(returnedBuffer).to.deep.eq(data)
        })
      })
    })
  })

  describe('when passing back and forth big data', () => {
    const port = 1234
    const address = 'localhost'
    const data = fs.readFileSync(path.resolve(__dirname, BIG_DATA_LOCATION), { encoding: 'utf8' })

    let returnedData

    beforeEach(done => {
      quic.listen(port, address)
        .onError(done)
        .onData((data, stream) => {
          stream.write(data) // just return the data
        })
        .then(() => {
          quic.send(port, address, data)
            .onError(done)
            .onData((dat, buffer) => {
              returnedData = dat
              quic.stopListening()
              done()
            })
        })
    })

    it('survives with the right data', () => {
      expect(returnedData).to.eq(data)
    })

  })

})
