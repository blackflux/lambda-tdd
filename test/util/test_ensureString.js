const expect = require("chai").expect;
const ensureString = require('../../lib/util/ensureString');


describe("Testing ensureString", () => {
  it("Testing Error", () => {
    expect(ensureString(new Error("some error"))).to.equal('some error');
  });

  it("Testing null", () => {
    expect(ensureString(null)).to.equal('null');
  });

  it("Testing string", () => {
    expect(ensureString("some string")).to.equal('some string');
  });
});
