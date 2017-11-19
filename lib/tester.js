const fs = require('fs');
const path = require('path');
const get = require('lodash.get');
const yaml = require('js-yaml');
const expect = require("chai").expect;
const TimeKeeper = require("./modules/timeKeeper");
const EnvVarWrapper = require("./modules/envVarWrapper");
const ExpectService = require("./modules/expectService");
const HandlerExecutor = require("./modules/handlerExecutor");

module.exports = (options) => {
  const timeKeeper = TimeKeeper();
  const suiteEnvVarsWrapper = EnvVarWrapper({
    envVars: yaml.safeLoad(fs.readFileSync(options.envVarYml, 'utf8')),
    allowOverwrite: false
  });
  const expectService = ExpectService();
  return {
    execute: (testFiles) => {
      describe(`Testing Lambda Functions: ${options.name}`, () => {
        before(() => suiteEnvVarsWrapper.apply());
        after(() => suiteEnvVarsWrapper.unapply());

        testFiles.forEach((testFile) => {
          // eslint-disable-next-line func-names
          it(`Test ${testFile}`, function (done) {
            const test = JSON.parse(fs.readFileSync(path.join(options.testFolder, testFile), 'utf8'));
            const testEnvVarsWrapper = EnvVarWrapper({
              envVars: test.env || {},
              allowOverwrite: true
            });
            testEnvVarsWrapper.apply();
            if (test.timestamp !== undefined) {
              timeKeeper.freeze(test.timestamp);
            }
            if (test.timeout !== undefined) {
              this.timeout(test.timeout);
            }

            // re-init function code here to ensures env vars are accessible outside lambda handler
            Object.keys(require.cache).forEach(key => delete require.cache[key]);

            HandlerExecutor({
              handlerFile: options.handlerFile,
              cassetteFolder: options.cassetteFolder,
              verbose: options.verbose,
              handlerFunction: test.handler,
              event: test.event,
              cassetteFile: `${testFile}_recording.json`,
              lambdaTimeout: test.lambdaTimeout
            }).execute().then((output) => {
              // test lambda success
              if (test.success) {
                expect(output.err, `Error: ${output.err}`).to.equal(null);
              } else {
                expect(output.err, `Response: ${JSON.stringify(output.response)}`).to.not.equal(null);
              }
              expectService.evaluate(test.error, JSON.stringify(output.err));
              expectService.evaluate(test.response, JSON.stringify(output.response));
              expectService.evaluate(test.body, get(output.response, 'body'));
              expectService.evaluate(test.logs, output.logs);
              expectService.evaluate(test.nock, JSON.stringify(output.records));
              timeKeeper.unfreeze();
              testEnvVarsWrapper.unapply();
              done();
            });
          });
        });
      });
    }
  };
};
