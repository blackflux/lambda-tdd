const path = require('path');
const zlib = require('zlib');
const expect = require('chai').expect;
const minimist = require('minimist');
const request = require('request-promise');
const sfs = require('smart-fs');
const tmp = require('tmp');
const LambdaTester = require('../src/index');
const handler = require('./mock/handler');

const lambdaTesterParams = {
  handler,
  verbose: minimist(process.argv.slice(2)).verbose === true,
  timeout: minimist(process.argv.slice(2)).timeout,
  nockHeal: minimist(process.argv.slice(2))['nock-heal'],
  testHeal: minimist(process.argv.slice(2))['test-heal'],
  cwd: path.join(__dirname, 'mock'),
  testFolder: path.join(__dirname, 'mock', 'handler', 'api'),
  cassetteFolder: path.join(__dirname, 'mock', 'handler', '__cassettes', 'api'),
  modifiers: {
    join: (input) => input.join(','),
    wrap: (input) => `{${input}}`,
    toBase64: (input) => input.toString('base64'),
    toGzip: (input) => zlib.gzipSync(input, { level: 9 }),
    jsonStringify: (input) => JSON.stringify(input)
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

  it('Testing File with timeout overwrite', () => {
    const testFiles = LambdaTester({ ...lambdaTesterParams, timeout: 10000 }).execute(['echo_event.spec.json']);
    expect(testFiles).to.deep.equal(['echo_event.spec.json']);
  });

  it('Testing outgoing request', (done) => {
    request.get('http://google.com', (err, res, body) => {
      expect(err).to.equal(null);
      // maximum of 60 seconds diff
      expect(Math.abs(new Date(res.headers.date) / 1 - Date.now())).to.be.at.most(60 * 1000);
      done();
    });
  });

  it('Testing enabled=false', () => {
    const testFiles = LambdaTester({ ...lambdaTesterParams, enabled: false }).execute();
    expect(testFiles).to.deep.equal([]);
  });

  it('Testing with default modifiers', () => {
    const params = { ...lambdaTesterParams };
    delete params.modifiers;
    const testFiles = LambdaTester(params)
      .execute(['custom_modifiers.spec.json']);
    expect(testFiles).to.deep.equal(['custom_modifiers.spec.json']);
  });

  describe('Testing env-vars.recording.yml', () => {
    let tmpDir;
    let testerArgs;
    before(() => {
      tmp.setGracefulCleanup();
    });
    beforeEach(() => {
      tmpDir = tmp.dirSync({ unsafeCleanup: true });
      const handlerFile = path.join(tmpDir.name, 'handler.js');
      sfs.smartWrite(handlerFile, ['module.exports.type = async () => process.env.TYPE;']);
      sfs.smartWrite(path.join(tmpDir.name, 'env-vars.yml'), { TYPE: 'cassette' });
      testerArgs = {
        // eslint-disable-next-line global-require,import/no-dynamic-require
        handler: require(handlerFile),
        verbose: minimist(process.argv.slice(2)).verbose === true,
        cwd: tmpDir.name,
        testFolder: path.join(tmpDir.name, 'handler'),
        cassetteFolder: path.join(tmpDir.name, 'handler', '__cassettes')
      };
    });

    it('Testing without env-vars.recording.yml', () => {
      sfs.smartWrite(path.join(tmpDir.name, 'handler', 'api', 'test.spec.json'), {
        handler: 'type',
        success: true,
        expect: {
          'to.equal()': 'cassette'
        }
      });
      expect(LambdaTester(testerArgs).execute()).to.deep.equal(['api/test.spec.json']);
    });

    it('Testing env-vars.recording.yml without recording', () => {
      sfs.smartWrite(path.join(tmpDir.name, 'env-vars.recording.yml'), { TYPE: 'recording' });
      sfs.smartWrite(path.join(tmpDir.name, 'handler', 'api', 'test.spec.json'), {
        handler: 'type',
        success: true,
        expect: {
          'to.equal()': 'recording'
        }
      });
      expect(LambdaTester(testerArgs).execute()).to.deep.equal(['api/test.spec.json']);
    });

    it('Testing env-vars.recording.yml with recording', () => {
      sfs.smartWrite(path.join(tmpDir.name, 'env-vars.recording.yml'), { TYPE: 'recording' });
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

    it('Testing testHeal', async () => {
      const testFile = path.join(tmpDir.name, 'handler', 'api', 'test.spec.json');
      sfs.smartWrite(testFile, {
        handler: 'type',
        success: true,
        expect: {
          'to.deep.equal()': 'different value'
        }
      });
      expect(await LambdaTester({
        ...testerArgs,
        testHeal: true
      }).execute()).to.deep.equal(['api/test.spec.json']);
    });
  });
});
