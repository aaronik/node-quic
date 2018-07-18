/* eslint-env mocha */
import { expect } from 'chai';
import { hello, goodbye } from '../src/index';

// quic.listen(2345) // also takes address, defaults to localhost
//   .then(() => {})
//   .onError(error => {})
//   .onData((data, stream) => {})
//     // stream has .write() function

// quic.stopListening()
//   .then(() => {})

// quic.getServer() // low level server object
// quic.getClient() // low level client object
// quic.getAddress() // { port: number,family:string (like "IPv4"),address: string (ip address) }

// quic.send(url, data)
//   .onError(error => {})
//   .onData(data => {})

describe('node-quic', () => {

  describe('.listen()', () => {

    it('returns promise', () => {});

    it('requires port argument', () => {})

    it('defaults ip to localhost', () => {})

    it('takes and assigns ip argument', () => {})

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

    it('returns promise', () => {})

    describe('returned promise', () => {

      it('has .then property', () => {})

    })
  })

  describe('.getServer()', () => {

    it('returns server object', () => {

    })

  })

  describe('.getClient()', () => {

    it('returns client object', () => {})

  })

  describe('.getAddress()', () => {

    it('returns address object', () => {})

  })

  describe('.send()', () => {

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
