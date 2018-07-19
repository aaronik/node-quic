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

    it('requires port argument', (done) => {
      quic.listen().onError(done.bind(null, null))
    })

    it('defaults ip to localhost', (done) => {
      const defaul = 'localhost'

      quic.listen(1234).then(() => {
        // expect(quic.getAddress().address).to.eq(defaul)
        // expect(quic.getAddress()).to.eq(defaul)
        done()
      })
    })

    it('takes and assigns ip argument', (done) => {
      const address = '127.0.0.1'

      quic.listen(1234, address).then(() => {
        expect(quic.getAddress().address).to.eq(address)
        done()
      })
    })

    describe('returned promise', () => {

      describe('promise.then()', () => {

        it('exists as a property', () => {})
        it('is called when the server starts', () => {})
        it('passes no arguments', () => {})

      })

      describe('promise.onError()', () => {

        it('exists as a property', () => {})
        it('is called when the server cannot start', () => {})
        it('passes error argument', () => {})

      })

      describe('promise.onData()', () => {

        it('exists as a property', () => {})
        it('is called when the server receives stream', () => {})
        it('passes data and stream arguments', () => {})

        describe('stream argument', () => {

          it('has .write() property', () => {})
          it('writes data back to sender', () => {})

        })

      })
    })
  })

  describe('.stopListening()', () => {

    it('exists as a property', () => {
      expect(typeof quic.stopListening === 'function')
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
