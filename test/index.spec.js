import path from 'path';
import zlib from 'zlib';
import minimist from 'minimist';
import fs from 'smart-fs';
import tmp from 'tmp';
import { expect } from 'chai';
import axios from 'axios';
import { describe } from 'node-tdd';
import LambdaTester from '../src/index.js';

const lambdaTesterParams = {
  verbose: minimist(process.argv.slice(2)).verbose === true,
  timeout: minimist(process.argv.slice(2)).timeout,
  nockHeal: minimist(process.argv.slice(2))['nock-heal'],
  testHeal: minimist(process.argv.slice(2))['test-heal'],
  cwd: path.join(fs.dirname(import.meta.url), 'mock'),
  testFolder: path.join(fs.dirname(import.meta.url), 'mock', 'handler', 'api'),
  cassetteFolder: path.join(fs.dirname(import.meta.url), 'mock', 'handler', '__cassettes', 'api'),
  modifiers: {
    join: (input) => input.join(','),
    wrap: (input) => `{${input}}`,
    toBase64: (input) => input.toString('base64'),
    toGzip: (input) => zlib.gzipSync(input, { level: 9 }),
    jsonStringify: (input) => JSON.stringify(input)
  }
};
const lambdaTester = LambdaTester(lambdaTesterParams);

describe('Testing Tester', { timeout: 10000 }, () => {
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

  it('Testing outgoing request', async () => {
    const r = await axios.get('http://google.com');
    expect(r.status).to.equal(200);
    expect(Math.abs(new Date(r.headers.date).valueOf() - Date.now()))
      .to.be.at.most(60 * 1000);
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
      fs.smartWrite(path.join(tmpDir.name, 'handler.js'), ['module.exports.type = async () => process.env.TYPE;']);
      fs.smartWrite(path.join(tmpDir.name, 'env-vars.yml'), { TYPE: 'cassette' });
      testerArgs = {
        verbose: minimist(process.argv.slice(2)).verbose === true,
        cwd: tmpDir.name,
        testFolder: path.join(tmpDir.name, 'handler'),
        cassetteFolder: path.join(tmpDir.name, 'handler', '__cassettes')
      };
    });

    it('Testing without env-vars.recording.yml', () => {
      fs.smartWrite(path.join(tmpDir.name, 'handler', 'api', 'test.spec.json'), {
        handler: 'type',
        success: true,
        expect: {
          'to.equal()': 'cassette'
        }
      });
      expect(LambdaTester(testerArgs).execute()).to.deep.equal(['api/test.spec.json']);
    });

    it('Testing env-vars.recording.yml without recording', () => {
      fs.smartWrite(path.join(tmpDir.name, 'env-vars.recording.yml'), { TYPE: 'recording' });
      fs.smartWrite(path.join(tmpDir.name, 'handler', 'api', 'test.spec.json'), {
        handler: 'type',
        success: true,
        expect: {
          'to.equal()': 'recording'
        }
      });
      expect(LambdaTester(testerArgs).execute()).to.deep.equal(['api/test.spec.json']);
    });

    it('Testing env-vars.recording.yml with recording', () => {
      fs.smartWrite(path.join(tmpDir.name, 'env-vars.recording.yml'), { TYPE: 'recording' });
      fs.smartWrite(path.join(tmpDir.name, 'handler', '__cassettes', 'api', 'test.spec.json_recording.json'), []);
      fs.smartWrite(path.join(tmpDir.name, 'handler', 'api', 'test.spec.json'), {
        handler: 'type',
        success: true,
        expect: {
          'to.equal()': 'cassette'
        }
      });
      expect(LambdaTester(testerArgs).execute()).to.deep.equal(['api/test.spec.json']);
    });

    it('Testing rogue cassette', () => {
      fs.smartWrite(path.join(tmpDir.name, 'handler', '__cassettes', 'api', 'test.spec.json_recording.json'), []);
      expect(() => LambdaTester(testerArgs).execute()).to.throw('Rogue Cassette(s): api/test.spec.json_recording.json');
    });

    it('Testing for invalid test file', () => {
      fs.smartWrite(path.join(tmpDir.name, 'handler', 'test.js'), []);
      expect(() => LambdaTester(testerArgs).execute()).to.throw(`Unexpected File: ${tmpDir.name}/handler/test.js`);
    });

    it('Testing testHeal', async () => {
      const testFile = path.join(tmpDir.name, 'handler', 'api', 'test.spec.json');
      fs.smartWrite(testFile, {
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
