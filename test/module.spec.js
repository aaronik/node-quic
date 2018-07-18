/* eslint-env mocha */
import { expect } from 'chai';
import { hello, goodbye } from '../src/index';

describe('node-quic', () => {
  describe('hello function', () => {
    it('Should return a greeting with the name', () => {
      const expected = 'Hello, Bob!';
      const actual = hello('Bob');

      expect(actual).to.equal(expected);
    });
    it('Should return a default greeting without name', () => {
      const expected = 'Hello, World!';
      const actual = hello();

      expect(actual).to.equal(expected);
    });
  });

  describe('goodbye function', () => {
    it('Should return a goodbye with the name', () => {
      const expected = 'Bye Bob.';
      const actual = goodbye('Bob');

      expect(actual).to.equal(expected);
    });
    it('Should return a default goodbye without name', () => {
      const expected = 'Bye World.';
      const actual = goodbye();

      expect(actual).to.equal(expected);
    });
  });
});
