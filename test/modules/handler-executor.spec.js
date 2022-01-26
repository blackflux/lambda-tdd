const fs = require('smart-fs');
const path = require('path');
const expect = require('chai').expect;
const { describe } = require('node-tdd');
const HandlerExecutor = require('../../src/modules/handler-executor');

describe('Testing HandlerExecutor', { useTmpDir: true }, () => {
  let tmpDir;
  let handler;
  beforeEach(({ dir }) => {
    tmpDir = dir;
    const handlerFile = path.join(tmpDir, 'handler.js');
    fs.smartWrite(handlerFile, [
      "const https = require('https');",
      'module.exports.call = (event, context, cb) => https',
      "  .get('https://google.com', (r) => { r.on('data', () => {}); r.on('end', cb); });"
    ]);
    // eslint-disable-next-line import/no-dynamic-require,global-require
    handler = require(handlerFile);
  });

  it('Testing header stripped', async () => {
    await HandlerExecutor({
      handler,
      handlerFunction: 'call',
      cassetteFolder: tmpDir,
      cassetteFile: 'recoding.json',
      stripHeaders: true,
      verbose: true,
      nockHeal: false,
      modifiers: {},
      reqHeaderOverwrite: {}
    })
      .execute();
    const data = fs.smartRead(path.join(tmpDir, 'recoding.json'));
    expect(data[0].rawHeaders).to.equal(undefined);
  });

  it('Testing header not stripped', async () => {
    await HandlerExecutor({
      handler,
      handlerFunction: 'call',
      cassetteFolder: tmpDir,
      cassetteFile: 'recoding.json',
      stripHeaders: false,
      verbose: true,
      nockHeal: false,
      modifiers: {},
      reqHeaderOverwrite: {}
    })
      .execute();
    const data = fs.smartRead(path.join(tmpDir, 'recoding.json'));
    expect(data[0].rawHeaders).to.not.equal(undefined);
  });
});
