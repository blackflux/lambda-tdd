const expect = require('chai').expect;
const crypto = require('crypto');
const uuid4 = require('uuid/v4');
const RandomSeeder = require('../../src/modules/random-seeder');

describe('Testing RandomSeeder', () => {
  let seeder;
  beforeEach(() => {
    seeder = RandomSeeder();
    seeder.forceSeed('test');
  });

  afterEach(() => {
    seeder.reset();
  });

  describe('Testing Random Consistent', () => {
    it('Testing First', () => {
      expect(uuid4()).to.deep.equal('afff0cf7-a373-4b2c-9184-d02b35c4b970');
      expect(uuid4()).to.deep.equal('864c731c-49f5-41c8-aca6-5cfee343c576');
    });

    it('Testing Second', () => {
      expect(uuid4()).to.deep.equal('afff0cf7-a373-4b2c-9184-d02b35c4b970');
      expect(uuid4()).to.deep.equal('864c731c-49f5-41c8-aca6-5cfee343c576');
    });
  });

  it('Testing Callback', (done) => {
    crypto.randomBytes(8, (err, resp) => {
      expect(err).to.equal(null);
      expect(resp.toString('hex')).to.equal('616b5d6ef0994787');
      done();
    });
  });

  it('Testing Long Random', (done) => {
    crypto.randomBytes(456, (err, resp) => {
      expect(err).to.equal(null);
      expect(resp.length).to.equal(456);
      expect(resp.toString('hex')).to.equal(
        '7818444aa3c3ba1f94562742e973554bd1f53ad9fc484a434f92f6efde85f61642c2551525cb0a46878d6aadf177ecc3efbb197a2bff13'
        + '1544730af0e598347479297e6deb493d4ca91907160790000a652b3ea623067ef1e8286a456a1bfd598ae85e26d82d201921b718e852'
        + 'd394146f6955f91a9fd265fb08028a8119eed7d5d47c9f91d27dfcf383a99b168a74206dcdf1bcc3c2961d423d44eea81f6233d36533'
        + 'd8afff2aca4c48bcf0828c30f67f0788e4b005f33b64ae08dd88cc41e5487f10974160bc1c97ef51229731ab138bc5899ef6e43dcbf1'
        + 'aa31d1bdac1234ff83700243175adaa2fe4ac8bfd840b1e28325df52b45cc02e500ef9e1d967ca75232f711659e1ce2c4106f9bce8fc'
        + 'a5708fc15f228cdfb0854ddbb80896e2edebc503e1acb051553e6c72eb916c2ada63f7a1483da3ef191083bdbcc174a8e1fc4833279f'
        + 'ce919638c55c88f949cb6a2b639e6b512d8cbdd33bf27d1ff59b3efc4db0918f7c41e07f9aa7d697bc65e39497cc6b196ad9a2f490cd'
        + '8840a9c1bf9e40951e9af02c94e71211dd035b0d9f6434341021268fc8ec9ffc31102c65c3efa903614165742f7c2cfe10ab88cb7ac6'
        + '312f9d4cae93cfdfacb95f39710e429f96d36b98a7f397'
      );
      done();
    });
  });
});
