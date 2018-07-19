/* eslint-env mocha */
import { expect } from 'chai'
let quic = require('../src/index')

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
      expect(server).to.have.property('domain')
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

      quic.listen(1234).then(() => {
        expect(quic.getAddress().address).to.eq(defaul)
        done()
      }).onError(done)
    })

    it('takes and assigns ip argument', done => {
      const address = '127.0.0.2'

      quic.listen(1234, address).then(() => {
        expect(quic.getAddress().address).to.eq(address)
        done()
      })
    })

    it('works twice', done => {
      const port = 1235

      quic.stopListening().then(() => {
        quic.listen(port).then(() => {
          const p = quic.getAddress().port
          expect(p).to.eq(port)
          done()
        }).onError(done)
      }).catch(done)
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
          promise.then(() => called = true).then(() => {
            expect(called).to.eq(true)
            done()
          })
        })

        it('passes no arguments', (done) => {
          let args = null
          promise.then(argv => args = argv).then(() => {
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
              quic.listen(port, address).onData((data, stream) => {
                receivedData = data
                receivedStream = stream
                done()
              }).onError(done).then(() => {
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
              sendPromise.onData(data => {
                expect(data).to.eq(sendBackData)
                done()
              }).onError(done)
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
        quic.stopListening().then(() => {
          const server = quic.getServer()
          expect(server).to.eq(undefined)
          done()
        }).catch(done)
      })
    })

    it('returns promise', () => {})

    describe('returned promise', () => {

      it('has .then property', () => {})

    })
  })

  describe('.getClient()', () => {

    it('exists as a property', () => {
      expect(quic.getClient).to.be.a('function')
    })

    it('returns client object', () => {})

  })

  describe('.send()', () => {

    it('exists as a property', () => {
      expect(quic.send).to.be.a('function')
    })

    it('returns promise', () => {})
    it('requires both parameters', () => {})
    it('stringifies non-string objects', () => {})
    it('does not stringify given strings', () => {})

    describe('returned promise', () => {

      describe('promise.onError()', () => {

        it('exists as a property', () => {})
        it('is called when there is an error', () => {})
        it('passes error argument', () => {})

      })

      describe('promise.onData()', () => {

        it('exists as a property', () => {})
        it('is called on incoming message', () => {})
        it('passes data argument', () => {})

      })
    })
  })

})
