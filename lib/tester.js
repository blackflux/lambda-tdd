const fs = require('fs');
const path = require('path');
const get = require('lodash.get');
const yaml = require('js-yaml');
const expect = require("chai").expect;
const defaults = require("lodash.defaults");
const globSync = require("glob").sync;
const TimeKeeper = require("./modules/timeKeeper");
const EnvVarWrapper = require("./modules/envVarWrapper");
const ExpectService = require("./modules/expectService");
const HandlerExecutor = require("./modules/handlerExecutor");

module.exports = (options) => {
  defaults(options, { cwd: process.cwd() });
  defaults(options, {
    name: "lambda-test",
    verbose: false,
    handlerFile: path.join(options.cwd, "handler.js"),
    cassetteFolder: path.join(options.cwd, "__cassettes"),
    envVarYml: path.join(options.cwd, "env.yml"),
    testFolder: options.cwd
  });

  const timeKeeper = TimeKeeper();
  const suiteEnvVarsWrapper = EnvVarWrapper({
    envVars: yaml.safeLoad(fs.readFileSync(options.envVarYml, 'utf8')),
    allowOverwrite: false
  });
  const expectService = ExpectService();
  return {
    execute: (modifier = "") => {
      const isPattern = typeof modifier === 'string' || modifier instanceof String;
      const testFiles = isPattern ? globSync("**/test_*.json", {
        cwd: options.testFolder,
        nodir: true,
        ignore: ['**/test_*.json_recording.json']
      }).filter(e => new RegExp(modifier, '').test(e)) : modifier;

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
      return testFiles;
    }
  };
};
