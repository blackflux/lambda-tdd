const expect = require('chai').expect;
const ensureString = require('../../src/util/ensure-string');

describe('Testing ensureString', () => {
  it('Testing Error', () => {
    expect(ensureString(new Error('some error'))).to.equal('some error');
  });

  it('Testing null', () => {
    expect(ensureString(null)).to.equal('null');
  });

  it('Testing string', () => {
    expect(ensureString('some string')).to.equal('some string');
  });

  it('Testing circular object', () => {
    const obj = { a: 1 };
    obj.b = obj;
    expect(ensureString(obj)).to.equal('{"a":1,"b":"<circular*>"}');
  });
});
