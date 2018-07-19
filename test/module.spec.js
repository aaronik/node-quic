/* eslint-env mocha */
import { expect } from 'chai'
let quic = require('../src/index')

describe.skip('node-quic', () => {

  afterEach(() => {
    // everything that results in a totally fresh quic server here
    quic.stopListening()
    quic = require('../src/index').quic
  })

  it('is properly exported', () => {
    expect(quic).to.be.an('object')
  })

  describe('.getServer()', () => {

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
      expect(quic.getAddress).to.be.a('function')
    })

    it('returns address object', () => {
      console.log(quic.getAddress())
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

    it('requires port argument', () => {
      expect(quic.listen.bind(quic, null, null)).to.throw()
    })

    it.skip('defaults ip to localhost', (done) => {
      quic.listen(1234).then(() => {
        expect(quic.getAddress()).to.eq('localhost')
        done()
      })
    })

    it.skip('takes and assigns ip argument', () => {
      const address = '127.0.0.1'

      quic.listen(1234, address).then(() => {
        expect(quic.getAddress()).to.eq(address)
      })
    })

    it('returns promise', () => {});

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
      expect(quic.stopListening).to.be.a('function')
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
