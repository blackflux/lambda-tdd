const fs = require('fs');
const path = require('path');
const get = require('lodash.get');
const yaml = require('js-yaml');
const expect = require("chai").expect;
const defaults = require("lodash.defaults");
const globSync = require("glob").sync;
const appRoot = require('app-root-path');
const TimeKeeper = require("./modules/time-keeper");
const EnvVarWrapper = require("./modules/env-var-wrapper");
const ExpectService = require("./modules/expect-service");
const HandlerExecutor = require("./modules/handler-executor");
const ensureString = require("./util/ensure-string");

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

  describe("Testing Cassettes", () => {
    it(`Searching for rogue Cassettes`, () => {
      const invalidCassettes = globSync('**/*.spec.json_recording.json', {
        cwd: options.cassetteFolder,
        nodir: true
      }).filter(e => !fs.existsSync(path.join(options.testFolder, e.substring(0, e.length - 15))));
      expect(invalidCassettes, `Rogue Cassette(s): ${invalidCassettes}`).to.deep.equal([]);
    });
  });

  const timeKeeper = TimeKeeper();
  const suiteEnvVarsWrapper = EnvVarWrapper({
    envVars: Object.assign({
      AWS_REGION: "us-east-1",
      AWS_ACCESS_KEY_ID: "XXXXXXXXXXXXXXXXXXXX",
      AWS_SECRET_ACCESS_KEY: "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    }, yaml.safeLoad(fs.readFileSync(options.envVarYml, 'utf8'))),
    allowOverwrite: false
  });
  const expectService = ExpectService();
  return {
    execute: (modifier = "") => {
      const isPattern = typeof modifier === 'string' || modifier instanceof String;
      const testFiles = isPattern ? globSync("**/*.spec.json", {
        cwd: options.testFolder,
        nodir: true,
        ignore: ['**/*.spec.json_recording.json']
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
            const nodeModulesDir = path.resolve(path.join(appRoot.path, 'node_modules')) + path.sep;
            const flush = (test.flush || []).map(e => path.resolve(path.join(nodeModulesDir, e)) + path.sep);
            Object.keys(require.cache).forEach((key) => {
              if (!key.startsWith(nodeModulesDir) || flush.some(f => key.startsWith(f))) {
                delete require.cache[key];
              }
            });

            HandlerExecutor({
              handlerFile: options.handlerFile,
              cassetteFolder: options.cassetteFolder,
              verbose: options.verbose,
              handlerFunction: test.handler,
              event: test.event,
              cassetteFile: `${testFile}_recording.json`,
              lambdaTimeout: test.lambdaTimeout
            }).execute().then((output) => {
              expect(JSON.stringify(Object.keys(test).filter(e => [
                "expect",
                "handler",
                "success",
                "lambdaTimeout",
                "response",
                "timeout",
                "flush",
                "event",
                "env",
                "logs",
                "error",
                "nock",
                "timestamp",
                "body",
                "defaultLogs",
                "errorLogs"
              ].indexOf(e) === -1))).to.equal("[]");
              // test lambda success
              if (test.success) {
                expect(output.err, `Error: ${output.err}`).to.equal(null);
              } else {
                expect(output.err, `Response: ${ensureString(output.response)}`).to.not.equal(null);
              }
              Object.keys(test).filter(k => k.match(/^expect(?:\(.*?\)$)?/)).forEach((k) => {
                const input = test.success ? output.response : output.err;
                const target = k.indexOf("(") !== -1 ? get(input, k.split("(", 2)[1].slice(0, -1)) : input;
                expectService.evaluate(test[k], target);
              });

              if (test.error !== undefined || test.response !== undefined || test.body !== undefined) {
                // eslint-disable-next-line no-console
                console.warn(`Warning: "error", "response" and "body" are deprecated. Use "expect" instead!`);
              }
              expectService.evaluate(test.error, ensureString(output.err));
              expectService.evaluate(test.response, ensureString(output.response));
              expectService.evaluate(test.body, get(output.response, 'body'));

              expectService.evaluate(test.logs, output.logs.logs);
              expectService.evaluate(test.errorLogs, output.logs.errorLogs);
              expectService.evaluate(test.defaultLogs, output.logs.defaultLogs);
              expectService.evaluate(test.nock, ensureString(output.records));
              timeKeeper.unfreeze();
              testEnvVarsWrapper.unapply();
              done();
            }).catch(done.fail);
          });
        });
      });
      return testFiles;
    }
  };
};
