import path from 'path';
import fs from 'smart-fs';
import { describe } from 'node-tdd';
import { expect } from 'chai';
import HandlerExecutor from '../../src/modules/handler-executor.js';

describe('Testing HandlerExecutor', { useTmpDir: true }, () => {
  let tmpDir;
  let handlerFile;

  beforeEach(({ dir }) => {
    tmpDir = dir;
    handlerFile = path.join(tmpDir, 'handler.js');
    fs.smartWrite(handlerFile, [
      "const https = require('https');",
      'module.exports.call = (event, context) => new Promise((cb) => https',
      "  .get('https://google.com', (r) => { r.on('data', () => {}); r.on('end', cb); }));"
    ]);
  });

  it('Testing header stripped', async () => {
    await HandlerExecutor({
      handlerFile,
      handlerFunction: 'call',
      cassetteFolder: tmpDir,
      cassetteFile: 'recoding.json',
      stripHeaders: true,
      verbose: true,
      nockHeal: false,
      modifiers: {},
      reqHeaderOverwrite: {}
    });
    const data = fs.smartRead(path.join(tmpDir, 'recoding.json'));
    expect(data[0].rawHeaders).to.equal(undefined);
  });

  it('Testing header not stripped', async () => {
    await HandlerExecutor({
      handlerFile,
      handlerFunction: 'call',
      cassetteFolder: tmpDir,
      cassetteFile: 'recoding.json',
      stripHeaders: false,
      verbose: true,
      nockHeal: false,
      modifiers: {},
      reqHeaderOverwrite: {}
    });
    const data = fs.smartRead(path.join(tmpDir, 'recoding.json'));
    expect(data[0].rawHeaders).to.not.equal(undefined);
  });
});
