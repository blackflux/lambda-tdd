const fs = require('smart-fs');
const path = require('path');
const expect = require('chai').expect;
const { describe } = require('node-tdd');
const HandlerExecutor = require('../../src/modules/handler-executor');

describe('Testing HandlerExecutor', { useTmpDir: true }, () => {
  let tmpDir;
  let handlerFile;
  beforeEach(({ dir }) => {
    tmpDir = dir;
    handlerFile = path.join(tmpDir, 'handler.js');
    fs.smartWrite(handlerFile, [
      "const https = require('https');",
      'module.exports.call = (event, context, cb) => https',
      "  .get('https://google.com', (r) => { r.on('data', () => {}); r.on('end', cb); });"
    ]);
  });

  it('Testing header stripped', async () => {
    await HandlerExecutor({
      handlerFile: handlerFile.slice(0, -3),
      handlerFunction: 'call',
      cassetteFolder: tmpDir,
      cassetteFile: 'recoding.json',
      stripHeaders: true,
      verbose: true,
      nockHeal: false
    })
      .execute();
    const data = fs.smartRead(path.join(tmpDir, 'recoding.json'));
    expect(data[0].rawHeaders).to.equal(undefined);
  });

  it('Testing header not stripped', async () => {
    await HandlerExecutor({
      handlerFile: handlerFile.slice(0, -3),
      handlerFunction: 'call',
      cassetteFolder: tmpDir,
      cassetteFile: 'recoding.json',
      stripHeaders: false,
      verbose: true,
      nockHeal: false
    })
      .execute();
    const data = fs.smartRead(path.join(tmpDir, 'recoding.json'));
    expect(data[0].rawHeaders).to.not.equal(undefined);
  });
});
