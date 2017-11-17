/* eslint-disable no-console */
const get = require('lodash.get');
const grunt = require('grunt');
const expect = require("chai").expect;
const wrapper = require('lambda-wrapper');
const tk = require('timekeeper');
const nockBack = require('nock').back;

// configure
nockBack.setMode('record');

const TimeKeeper = () => ({
  freeze: (timestamp) => {
    expect(tk.isKeepingTime()).to.equal(false);
    tk.freeze(new Date(timestamp * 1000));
  },
  unfreeze: () => {
    if (tk.isKeepingTime()) {
      tk.reset();
    }
  }
});

const EnvVarWrapper = (options) => {
  const setEnvVar = (key, value) => {
    if ([null, undefined].indexOf(value) !== -1) {
      delete process.env[key];
    } else {
      expect(typeof value).to.equal('string');
      process.env[key] = value;
    }
  };
  const envVarsOverwritten = {};
  return {
    apply: () => {
      envVarsOverwritten.length = 0;
      Object.keys(options.envVars).forEach((envVar) => {
        if (options.allowOverwrite !== true) {
          expect(process.env).to.not.have.property(envVar);
        } else {
          envVarsOverwritten[envVar] = process.env[envVar];
        }
        setEnvVar(envVar, options.envVars[envVar]);
      });
    },
    unapply: () => {
      Object.keys(options.envVars).forEach((envVar) => {
        expect(process.env).to.have.property(envVar);
        setEnvVar(envVar, envVarsOverwritten[envVar]);
      });
    }
  };
};

const ConsoleRecorder = (options) => {
  const consoleLogOriginal = console.log;
  const logs = [];
  return {
    start: () => {
      logs.length = 0;
      console.log = (...args) => {
        if (!options.silence) {
          consoleLogOriginal.apply(consoleLogOriginal, args);
        }
        logs.push(...args);
      };
    },
    finish: () => {
      console.log = consoleLogOriginal;
      return logs;
    }
  };
};

const ExpectService = () => {
  const handleDynamicExpect = (target, check) => {
    let result = 0;
    Object.keys(check).forEach((key) => {
      const value = check[key];
      const keys = key.split(".");
      const lastKey = keys.pop();
      const targetBefore = keys.reduce((o, e) => o[e], target);
      if (typeof value !== 'object' || value instanceof Array) {
        const isRegex = typeof value === 'string' && value.indexOf("^") === 0;
        targetBefore[lastKey](isRegex ? new RegExp(value, "i") : value);
        result += 1;
      } else {
        result += handleDynamicExpect(targetBefore[lastKey], value);
      }
    });
    return result;
  };

  return {
    evaluate: (tests, value) => {
      if (tests !== undefined) {
        let count = 0;
        tests.forEach((check) => {
          // eslint-disable-next-line jasmine/expect-matcher
          count += handleDynamicExpect(expect(value), check);
        });
        expect(count).to.be.at.least(tests.length);
      }
    }
  };
};

const HandlerExecutor = (options) => {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const runner = wrapper.wrap({ handler: require(options.handlerFile)[options.handlerFunction] });
  const records = [];
  const consoleRecorder = ConsoleRecorder({ silence: !options.debug });

  return {
    execute: () => new Promise((resolve) => {
      consoleRecorder.start();
      nockBack.fixtures = options.cassetteFolder;
      nockBack(options.cassetteFile, {
        before: (r) => {
          records.push(r);
          return r;
        }
      }, (nockDone) => {
        const startTimestamp = process.hrtime();
        const startTime = (startTimestamp[0] * 1000) + (startTimestamp[1] / 1000000);
        runner.run(options.event, {
          getRemainingTimeInMillis: () => {
            const curTimeStamp = process.hrtime();
            const curTime = (curTimeStamp[0] * 1000) + (curTimeStamp[1] / 1000000);
            return (options.lambdaTimeout || 300000) - (curTime - startTime);
          }
        }, (err, response) => {
          nockDone();
          resolve({
            records,
            err,
            response,
            logs: consoleRecorder.finish()
          });
        });
      });
    })
  };
};

module.exports = (options) => {
  const timeKeeper = TimeKeeper();
  const suiteEnvVarsWrapper = EnvVarWrapper({
    envVars: grunt.file.readYAML(options.envVarYml),
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
            const test = grunt.file.readJSON(`${options.testFolder}${testFile}`);
            if (test.timeout !== undefined) {
              this.timeout(test.timeout);
            }
            if (test.timestamp !== undefined) {
              timeKeeper.freeze(test.timestamp);
            }
            const testEnvVarsWrapper = EnvVarWrapper({
              envVars: test.env || {},
              allowOverwrite: true
            });
            testEnvVarsWrapper.apply();

            // re-init function code here to ensures env vars are accessible outside lambda handler
            Object.keys(require.cache).forEach(key => delete require.cache[key]);

            HandlerExecutor({
              handlerFile: options.handlerFile,
              cassetteFolder: options.cassetteFolder,
              debug: options.debug,
              handlerFunction: test.handler,
              event: test.event,
              cassetteFile: `${testFile}_recording.json`,
              lambdaTimeout: test.lambdaTimeout
            }).execute().then((output) => {
              testEnvVarsWrapper.unapply();
              timeKeeper.unfreeze();
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
              done();
            });
          });
        });
      });
    }
  };
};
