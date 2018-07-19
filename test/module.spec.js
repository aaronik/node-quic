/* eslint-env mocha */
import { expect } from 'chai'
let quic = require('../src/index').quic

const CustomPromise = require('../src/index').CustomPromise

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

describe('CustomPromise', () => {
  it('is properly exported', () => {
    expect(CustomPromise).to.be.a('function')
  })

  it('throws with no input', () => {
    expect(() => { new CustomPromise() }).to.throw()
  })

  it('throws with malformed input', () => {
    expect(() => { new CustomPromise('bob') }).to.throw()
    expect(() => { new CustomPromise(['bob']) }).to.throw()
    expect(() => { new CustomPromise(['bob', 'jim']) }).to.throw()
  })

  describe('when given well formed input', () => {

    const pass = 'pass'
    const receive = 'receive'
    const passReceivePairs = [[pass, receive]]

    let customPromise

    beforeEach(() => {
      customPromise = new CustomPromise(passReceivePairs)
    })

    it('has clear attribute', () => {
      expect(customPromise).to.have.property('clear')
    })

    it('assigns pass/receive methods to prototype', () => {
      expect(customPromise).to.have.property(pass)
      expect(customPromise).to.have.property(receive)
    })

    describe('when a receive function is given', () => {

      let receivedData = null

      beforeEach(() => {
        customPromise[receive](data => { receivedData = data })
      })

      afterEach(() => {
        receivedData = null
      })

      it('calls it with passed data', () => {
        const data = 'jim'

        customPromise[pass](data)
        expect(receivedData).to.eq(data)
      })
    })

    describe('before a receive function is given', () => {

      it('allows pass function to be called', () => {
        const data = 'fred'

        expect(customPromise[pass].bind(null, data)).to.not.throw()
      })
    })

    describe('when a pass function is called before a receive function', () => {

      const data = 'barney'
      let receivedData1 = null
      let receivedData2 = null

      beforeEach(() => {
        customPromise[pass](data)
        customPromise[receive](data => receivedData1 = data)
        customPromise[receive](data => receivedData2 = data)
      })

      afterEach(() => {
        receivedData1 = null
        receivedData2 = null
      })

      it('calls receive function with previously passed data', () => {
        expect(receivedData1).to.eq(data)
      })

      it('calls a second receive function with previously passed data', () => {
        expect(receivedData2).to.eq(data)
      })

      describe('and then clear is called', () => {

        let receivedData = null

        beforeEach(() => {
          customPromise.clear()
          customPromise[receive](data => receivedData = data)
        })

        it('no longer populates new calls with old data', () => {
          expect(receivedData).to.eq(null)
        })
      })
    })
  })
})

