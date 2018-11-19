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
      expect(uuid4()).to.deep.equal('378a4723-f163-49f0-ad56-0a24e20a7bd4');
      expect(uuid4()).to.deep.equal('32e20f7f-35e3-4bc3-a624-f3ee96de02be');
    });

    it('Testing Second', () => {
      expect(uuid4()).to.deep.equal('378a4723-f163-49f0-ad56-0a24e20a7bd4');
      expect(uuid4()).to.deep.equal('32e20f7f-35e3-4bc3-a624-f3ee96de02be');
    });
  });

  it('Testing Callback', (done) => {
    crypto.randomBytes(8, (err, resp) => {
      expect(err).to.equal(null);
      expect(resp.toString('hex')).to.equal('238d8757e911d43d');
      done();
    });
  });

  it('Testing Long Random', (done) => {
    crypto.randomBytes(456, (err, resp) => {
      expect(err).to.equal(null);
      expect(resp.length).to.equal(456);
      expect(resp.toString('hex')).to.equal(
        'e69fa0efe8d53f5241d8660aa8330725f56283abbfbf8bdad345cecff1d9bdffce7cfec5f0764e9d8b51d3ba09195910fe263408bfab'
        + '6cfef03211a7fba8f7d6bc3fd10c430c3a7acc922dd053c9790584bc5d366486b572b4a27d785d7f714e986247cb3e816ac85ed0f023'
        + '31c4cae323441d309897662a881a7067e8f67acd6c5de85a44102c04e629a70a2ba242a1f2b961e79d1a925263686e045d6d859dfb3f'
        + 'a649ed5c51705e568697b95b3e492697bd2f34b5b5fafef013ff36fca537dab6292113a34540fe0c2d4d3bc8e0596cf031bca658eb04'
        + '9c2525ed44cb49fc57f31b5e4fa41d069858f49510e2acbc75230ef4a01b424fc54c1e1739062d2f3f354d0170fb4f03b55f6a6c7bfb'
        + '92b660cad9f6d9b59f22a17d7f635ef16df4350e083e72a27481628ac6a8294f8a7dc1f9135ffd19ba749f431bc1b7b1f65cc2f69a8d'
        + 'da8454f46a338467412652ffa56bb110ce8ed932b5b74a95d6c18aa92b2f5f414a2688ada322dba1b7a100ed4bace368b9ad4c8f4aab'
        + '98e3fc34d7457bae690f5cd69458cad85fb00291e25fd34ef19d5a9ab14f30df4f539fb3013e56897983ba16368f997a5baca7313589'
        + '1eb0870aa56728ecac278aa31a953a2fc23cf7a666b4b8ea'
      );
      done();
    });
  });
});
