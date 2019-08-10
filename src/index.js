const fs = require('fs');
const path = require('path');
const get = require('lodash.get');
const yaml = require('js-yaml');
const expect = require('chai').expect;
const defaults = require('lodash.defaults');
const globSync = require('glob').sync;
const appRoot = require('app-root-path');
const sfs = require('smart-fs');
const TimeKeeper = require('./modules/time-keeper');
const RandomSeeder = require('./modules/random-seeder');
const EnvVarWrapper = require('./modules/env-var-wrapper');
const ExpectService = require('./modules/expect-service');
const HandlerExecutor = require('./modules/handler-executor');
const ensureString = require('./util/ensure-string');
const rewriteObject = require('./util/rewrite-object');
const dynamicApply = require('./util/dynamic-apply');

module.exports = (options) => {
  defaults(options, { cwd: process.cwd() });
  defaults(options, {
    name: 'lambda-test',
    verbose: false,
    enabled: true,
    handlerFile: path.join(options.cwd, 'handler.js'),
    cassetteFolder: path.join(options.cwd, '__cassettes'),
    ignoreCassetteRequestBody: false,
    envVarYml: path.join(options.cwd, 'env.yml'),
    envVarYmlRecording: path.join(options.cwd, 'env.recording.yml'),
    testFolder: options.cwd,
    flush: ['aws-sdk'],
    modifiers: {}
  });

  if (fs.existsSync(options.cassetteFolder)) {
    const invalidCassettes = sfs.walkDir(options.cassetteFolder)
      .filter((e) => !fs.existsSync(path.join(options.testFolder, e.substring(0, e.length - 15))));
    if (invalidCassettes.length !== 0) {
      throw new Error(`Rogue Cassette(s): ${invalidCassettes.join(', ')}`);
    }
  }

  sfs.walkDir(options.testFolder)
    .map((f) => path.join(options.testFolder, f))
    .filter((f) => {
      const relative = path.relative(options.cassetteFolder, f);
      return !relative || relative.startsWith('..') || path.isAbsolute(relative);
    })
    .forEach((filePath) => {
      if (!filePath.endsWith('.spec.json')) {
        throw new Error(`Unexpected File: ${filePath}`);
      }
    });

  const timeKeeper = TimeKeeper();
  const randomSeeder = RandomSeeder();
  const suiteEnvVarsWrapper = EnvVarWrapper({
    envVars: {
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'XXXXXXXXXXXXXXXXXXXX',
      AWS_SECRET_ACCESS_KEY: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      ...yaml.safeLoad(fs.readFileSync(options.envVarYml, 'utf8'))
    },
    allowOverwrite: false
  });
  const suiteEnvVarsWrapperRecording = fs.existsSync(options.envVarYmlRecording) ? EnvVarWrapper({
    envVars: yaml.safeLoad(fs.readFileSync(options.envVarYmlRecording, 'utf8')),
    allowOverwrite: true
  }) : null;
  const expectService = ExpectService();
  return {
    execute: (modifier = '') => {
      if (options.enabled !== true) {
        return [];
      }

      const isPattern = typeof modifier === 'string' || modifier instanceof String;
      const testFiles = isPattern ? globSync('**/*.spec.json', {
        cwd: options.testFolder,
        nodir: true,
        ignore: ['**/*.spec.json_recording.json']
      }).filter((e) => new RegExp(modifier, '').test(e)) : modifier;

      describe(`Testing Lambda Functions: ${options.name}`, () => {
        before(() => suiteEnvVarsWrapper.apply());
        after(() => suiteEnvVarsWrapper.unapply());

        testFiles.forEach((testFile) => {
          // eslint-disable-next-line func-names
          it(`Test ${testFile}`, async function () {
            const test = JSON.parse(fs.readFileSync(path.join(options.testFolder, testFile), 'utf8'));
            const cassetteFile = `${testFile}_recording.json`;
            const isNewRecording = !fs.existsSync(path.join(options.cassetteFolder, cassetteFile));
            if (suiteEnvVarsWrapperRecording !== null && isNewRecording) {
              suiteEnvVarsWrapperRecording.apply();
            }
            const testEnvVarsWrapper = EnvVarWrapper({
              envVars: test.env || {},
              allowOverwrite: true
            });
            testEnvVarsWrapper.apply();
            if (test.timestamp !== undefined) {
              timeKeeper.freeze(test.timestamp);
            }
            if (test.seed !== undefined) {
              randomSeeder.forceSeed(test.seed, test.reseed || false);
            }
            if (test.timeout !== undefined) {
              this.timeout(test.timeout);
            }

            // re-init function code here to ensures env vars are accessible outside lambda handler
            const nodeModulesDir = path.resolve(path.join(appRoot.path, 'node_modules')) + path.sep;
            const flush = options.flush.map((e) => `${path.sep}node_modules${path.sep}${e}${path.sep}`);
            const nodeModulesPrefixLength = nodeModulesDir.length - 'node_modules'.length - 2;
            Object.keys(require.cache).forEach((key) => {
              if (!key.startsWith(nodeModulesDir) || flush.some((f) => key.indexOf(f) >= nodeModulesPrefixLength)) {
                delete require.cache[key];
              }
            });

            try {
              const output = await HandlerExecutor({
                handlerFile: options.handlerFile,
                cassetteFolder: options.cassetteFolder,
                ignoreCassetteRequestBody: options.ignoreCassetteRequestBody,
                verbose: options.verbose,
                handlerFunction: test.handler,
                event: rewriteObject(test.event, options.modifiers),
                context: test.context || {},
                cassetteFile,
                lambdaTimeout: test.lambdaTimeout,
                stripHeaders: get(test, 'stripHeaders', options.stripHeaders)
              }).execute();

              // evaluate test configuration
              expect(JSON.stringify(Object.keys(test).filter((e) => [
                'expect',
                'handler',
                'success',
                'lambdaTimeout',
                'response',
                'timeout',
                'event',
                'context',
                'env',
                'logs',
                'error',
                'nock',
                'timestamp',
                'seed',
                'reseed',
                'body',
                'defaultLogs',
                'errorLogs',
                'stripHeaders',
                'allowedUnmatchedRecordings',
                'allowedOutOfOrderRecordings'
              ].indexOf(e) === -1 && !e.match(/^(?:expect|logs|errorLogs|defaultLogs)\(.+\)$/g)))).to.equal('[]');

              // test output
              if (test.success) {
                expect(output.err, `Error: ${get(output.err, 'stack', output.err)}`).to.equal(null);
              } else {
                expect(output.err, `Response: ${ensureString(output.response)}`).to.not.equal(null);
              }
              Object
                .keys(test)
                .filter((k) => k.match(/^(?:expect|logs|errorLogs|defaultLogs)(?:\(.*?\)$)?/))
                .forEach((k) => {
                  let target = null;
                  if (k.startsWith('expect')) {
                    target = test.success ? output.response : output.err;
                  } else {
                    target = output.logs[k.split('(')[0]];
                  }
                  if (k.indexOf('(') !== -1) {
                    const apply = k.split('(', 2)[1].slice(0, -1).split('|');
                    target = get(target, apply[0]);
                    if (apply.length > 1) {
                      target = apply.slice(1).reduce((p, c) => dynamicApply(c, p, options.modifiers), target);
                    }
                  }
                  expectService.evaluate(test[k], target);
                });

              if (test.error !== undefined || test.response !== undefined || test.body !== undefined) {
                // eslint-disable-next-line no-console
                console.warn('Warning: "error", "response" and "body" are deprecated. Use "expect" instead!');
              }
              expectService.evaluate(test.error, ensureString(output.err));
              expectService.evaluate(test.response, ensureString(output.response));
              expectService.evaluate(test.body, get(output.response, 'body'));
              expectService.evaluate(test.nock, ensureString(output.records));
              expect(
                output.pendingMocks.every((r) => get(test, 'allowedUnmatchedRecordings', []).includes(r)),
                `Unmatched Recording(s): ${JSON.stringify(output.pendingMocks)}`
              ).to.equal(true);
              expect(
                output.outOfOrderErrors.every((r) => get(test, 'allowedOutOfOrderRecordings', []).includes(r)),
                `Out of Order Recording(s): ${JSON.stringify(output.outOfOrderErrors)}`
              ).to.equal(true);
              return Promise.resolve();
            } finally {
              // "close" test run
              randomSeeder.reset();
              timeKeeper.unfreeze();
              testEnvVarsWrapper.unapply();
              if (suiteEnvVarsWrapperRecording !== null && isNewRecording) {
                suiteEnvVarsWrapperRecording.unapply();
              }
            }
          });
        });
      });
      return testFiles;
    }
  };
};
