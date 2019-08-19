const path = require('path');
const expect = require('chai').expect;
const request = require('request');
const sfs = require('smart-fs');
const tmp = require('tmp');
const LambdaTester = require('../src/index');

const lambdaTesterParams = {
  verbose: process.argv.slice(2).indexOf('--verbose') !== -1,
  cwd: path.join(__dirname, 'mock'),
  testFolder: path.join(__dirname, 'mock', 'handler', 'api'),
  cassetteFolder: path.join(__dirname, 'mock', 'handler', '__cassettes', 'api'),
  modifiers: {
    wrap: (input) => `{${input}}`
  }
};
const lambdaTester = LambdaTester(lambdaTesterParams);

describe('Testing Tester', () => {
  it('Empty Folder', () => {
    const testFiles = lambdaTester.execute();
    expect(testFiles.length).to.be.greaterThan(1);
  });

  it('Explicit Test File', () => {
    const testFiles = lambdaTester.execute(['echo_event.spec.json']);
    expect(testFiles).to.deep.equal(['echo_event.spec.json']);
  });

  it('Test File Regex', () => {
    const testFiles = lambdaTester.execute('echo_event\\.spec\\.json');
    expect(testFiles).to.deep.equal(['echo_event.spec.json']);
  });

  it('Testing outgoing request', (done) => {
    request.get('http://google.com', (err, res, body) => {
      expect(err).to.equal(null);
      // maximum of 60 seconds diff
      expect(Math.abs(new Date(res.headers.date).valueOf() - Date.now())).to.be.at.most(60 * 1000);
      done();
    });
  });

  it('Testing enabled=false', () => {
    const testFiles = LambdaTester({ ...lambdaTesterParams, enabled: false }).execute();
    expect(testFiles).to.deep.equal([]);
  });

  describe('Testing env.recording.yml', () => {
    let tmpDir;
    let testerArgs;
    before(() => {
      tmp.setGracefulCleanup();
    });
    beforeEach(() => {
      tmpDir = tmp.dirSync({ unsafeCleanup: true });
      sfs.smartWrite(path.join(tmpDir.name, 'handler.js'), ['module.exports.type = async () => process.env.TYPE;']);
      sfs.smartWrite(path.join(tmpDir.name, 'env.yml'), { TYPE: 'cassette' });
      testerArgs = {
        verbose: process.argv.slice(2).indexOf('--verbose') !== -1,
        cwd: tmpDir.name,
        testFolder: path.join(tmpDir.name, 'handler'),
        cassetteFolder: path.join(tmpDir.name, 'handler', '__cassettes')
      };
    });

    it('Testing without env.recording.yml', () => {
      sfs.smartWrite(path.join(tmpDir.name, 'handler', 'api', 'test.spec.json'), {
        handler: 'type',
        success: true,
        expect: {
          'to.equal()': 'cassette'
        }
      });
      expect(LambdaTester(testerArgs).execute()).to.deep.equal(['api/test.spec.json']);
    });

    it('Testing env.recording.yml without recording', () => {
      sfs.smartWrite(path.join(tmpDir.name, 'env.recording.yml'), { TYPE: 'recording' });
      sfs.smartWrite(path.join(tmpDir.name, 'handler', 'api', 'test.spec.json'), {
        handler: 'type',
        success: true,
        expect: {
          'to.equal()': 'recording'
        }
      });
      expect(LambdaTester(testerArgs).execute()).to.deep.equal(['api/test.spec.json']);
    });

    it('Testing env.recording.yml with recording', () => {
      sfs.smartWrite(path.join(tmpDir.name, 'env.recording.yml'), { TYPE: 'recording' });
      sfs.smartWrite(path.join(tmpDir.name, 'handler', '__cassettes', 'api', 'test.spec.json_recording.json'), []);
      sfs.smartWrite(path.join(tmpDir.name, 'handler', 'api', 'test.spec.json'), {
        handler: 'type',
        success: true,
        expect: {
          'to.equal()': 'cassette'
        }
      });
      expect(LambdaTester(testerArgs).execute()).to.deep.equal(['api/test.spec.json']);
    });

    it('Testing rogue cassette', () => {
      sfs.smartWrite(path.join(tmpDir.name, 'handler', '__cassettes', 'api', 'test.spec.json_recording.json'), []);
      expect(() => LambdaTester(testerArgs).execute()).to.throw('Rogue Cassette(s): api/test.spec.json_recording.json');
    });

    it('Testing for invalid test file', () => {
      sfs.smartWrite(path.join(tmpDir.name, 'handler', 'test.js'), []);
      expect(() => LambdaTester(testerArgs).execute()).to.throw(`Unexpected File: ${tmpDir.name}/handler/test.js`);
    });
  });
});
