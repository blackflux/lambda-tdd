const expect = require("chai").expect;
const crypto = require("crypto");
const uuid4 = require("uuid/v4");
const RandomSeeder = require('../../src/modules/random-seeder');

describe("Testing RandomKeeper", () => {
  let seeder;
  beforeEach(() => {
    seeder = RandomSeeder();
    seeder.forceSeed("test");
  });

  afterEach(() => {
    seeder.reset();
  });

  describe("Testing Random Consistent", () => {
    it("Testing First", () => {
      expect(uuid4()).to.deep.equal("1b4f0e98-5197-4998-a732-078544c96b36");
      expect(uuid4()).to.deep.equal("60303ae2-2b99-4861-bce3-b28f33eec1be");
    });

    it("Testing Second", () => {
      expect(uuid4()).to.deep.equal("1b4f0e98-5197-4998-a732-078544c96b36");
      expect(uuid4()).to.deep.equal("60303ae2-2b99-4861-bce3-b28f33eec1be");
    });
  });

  it("Testing Callback", (done) => {
    crypto.randomBytes(8, (err, resp) => {
      expect(err).to.equal(null);
      expect(resp.toString('hex')).to.equal("1b4f0e9851971998");
      done();
    });
  });

  it("Testing Long Random", (done) => {
    crypto.randomBytes(456, (err, resp) => {
      expect(err).to.equal(null);
      expect(resp.length).to.equal(456);
      expect(resp.toString('hex')).to.equal(
        "1b4f0e9851971998e732078544c96b36c3d01cedf7caa332359d6f1d8356701441455282d6faeb0b02bb6441924e07a02b5b8d"
        + "31c848b3a4f2189e15ed7e96892cab6127861079b8a5c8483918f182be9bb38e0a5c44bd2121528e5fbd597f8e751edcbc8553"
        + "32339b3c918fe1c2209c49c0bdfa9e155a0f8b02dc2dc0bfa433b9d23b9cfd8d451b286d9839adfe44ec52da1fd8a586b584c1"
        + "2954dc0b99fd6a2f15d9ca7aaa2ddf25152719a607c485699a8453fee7ad2f9307001ceeb146bdb86eda9ee0cf5b30f6ef18bf"
        + "95bd90c1e2d9edf6383ad3ed277f6773feb527fa3f81060dcfe606c0597dfc43786851e6a12183434f3b73c9b7dfd98dac9cc1"
        + "1c581e4b4fb9780479b9e897abd82dbe2e41c4d1eaf9906ee538c8be16a4e321921b96cb7d9b087f27b7a4b44a611cfb433cd5"
        + "c4fbf5f26c98e4662793d3b64912cd0d862a05c21ca704e85f2ed728e6de9d59c336a762e4937ca78aa29153744d2a8ef46849"
        + "1e38d5afd978350ce853ed100dc4fe4b90ce5a663b2eba691acb3195803878dac7a6ed432028d69353a8801e3ccb96187f3554"
        + "97a468b03c417ff07154c333d44b1c14891965082583e350f4de07bfe512fb4fac6fcf52c58ef817cad85be3982ea3a9"
      );
      done();
    });
  });
});
