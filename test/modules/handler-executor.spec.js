const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;
const tmp = require('tmp');
const HandlerExecutor = require('../../src/modules/handler-executor');

describe('Testing HandlerExecutor', () => {
  let tmpDir;
  let handlerFile;
  before(() => {
    tmp.setGracefulCleanup();
  });
  beforeEach(() => {
    tmpDir = tmp.dirSync({ unsafeCleanup: true });
    handlerFile = path.join(tmpDir.name, 'handler.js');
    fs.writeFileSync(handlerFile, (
      "const https = require('https');\n"
      + 'module.exports.call = (event, context, cb) => https'
      + '.get("http://google.com", (r) => { r.on(\'data\', () => {}); r.on(\'end\', cb); });'
    ));
  });

  it('Testing header stripped', (done) => {
    HandlerExecutor({
      handlerFile: handlerFile.slice(0, -3),
      handlerFunction: 'call',
      cassetteFolder: tmpDir.name,
      cassetteFile: 'recoding.json',
      stripHeaders: true,
      verbose: true
    })
      .execute()
      .then(() => {
        const data = fs.readFileSync(path.join(tmpDir.name, 'recoding.json'), 'utf8');
        expect(data).to.not.contain('rawHeaders');
        done();
      })
      .catch(done.fail);
  });

  it('Testing header not stripped', (done) => {
    HandlerExecutor({
      handlerFile: handlerFile.slice(0, -3),
      handlerFunction: 'call',
      cassetteFolder: tmpDir.name,
      cassetteFile: 'recoding.json',
      stripHeaders: false,
      verbose: true
    })
      .execute()
      .then(() => {
        const data = fs.readFileSync(path.join(tmpDir.name, 'recoding.json'), 'utf8');
        expect(data).to.contain('rawHeaders');
        done();
      })
      .catch(done.fail);
  });
});
