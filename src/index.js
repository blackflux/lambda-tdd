/* eslint-disable mocha/no-setup-in-describe */
import fs from 'smart-fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import get from 'lodash.get';
import yaml from 'js-yaml';
import Joi from 'joi-strict';
import { expect } from 'chai';
import glob from 'glob';
import {
  EnvManager,
  TimeKeeper,
  LogRecorder,
  RandomSeeder
} from 'node-tdd';
import ExpectService from './modules/expect-service.js';
import HandlerExecutor from './modules/handler-executor.js';
import ensureString from './util/ensure-string.js';
import dynamicApply from './util/dynamic-apply.cjs';

const { sync: globSync } = glob;

// eslint-disable-next-line mocha/no-exports
export default (options) => {
  Joi.assert(options, Joi.object().keys({
    cwd: Joi.string().optional(),
    name: Joi.string().optional(),
    verbose: Joi.boolean().optional(),
    timeout: Joi.number().min(0).integer().optional(),
    nockHeal: Joi.alternatives(Joi.boolean(), Joi.string()).optional(),
    testHeal: Joi.boolean().optional(),
    enabled: Joi.boolean().optional(),
    handlerFile: Joi.string().optional(),
    cassetteFolder: Joi.string().optional(),
    envVarYml: Joi.string().optional(),
    envVarYmlRecording: Joi.string().optional(),
    testFolder: Joi.string().optional(),
    modifiers: Joi.object().optional(),
    reqHeaderOverwrite: Joi.object().optional(),
    stripHeaders: Joi.boolean().optional()
  }));

  const cwd = get(options, 'cwd', process.cwd());
  const name = get(options, 'name', 'lambda-test');
  const verbose = get(options, 'verbose', false);
  const timeout = get(options, 'timeout');
  const nockHeal = get(options, 'nockHeal', false);
  const testHeal = get(options, 'testHeal', false);
  const enabled = get(options, 'enabled', true);
  const handlerFile = get(options, 'handlerFile', path.join(cwd, 'handler.js'));
  const cassetteFolder = get(options, 'cassetteFolder', path.join(cwd, '__cassettes'));
  const envVarYml = get(options, 'envVarYml', path.join(cwd, 'env-vars.yml'));
  const envVarYmlRecording = get(options, 'envVarYmlRecording', path.join(cwd, 'env-vars.recording.yml'));
  const testFolder = get(options, 'testFolder', cwd);
  const modifiers = get(options, 'modifiers', {
    toBase64: (input) => input.toString('base64'),
    toGzip: (input) => zlib.gzipSync(input, { level: 9 }),
    jsonStringify: (input) => JSON.stringify(input)
  });
  const reqHeaderOverwrite = get(options, 'reqHeaderOverwrite', {});
  const stripHeaders = get(options, 'stripHeaders', false);

  if (fs.existsSync(cassetteFolder)) {
    const invalidCassettes = fs.walkDir(cassetteFolder)
      .filter((e) => !fs.existsSync(path.join(testFolder, e.substring(0, e.length - 15))));
    if (invalidCassettes.length !== 0) {
      throw new Error(`Rogue Cassette(s): ${invalidCassettes.join(', ')}`);
    }
  }

  fs.walkDir(testFolder)
    .map((f) => path.join(testFolder, f))
    .filter((f) => {
      const relative = path.relative(cassetteFolder, f);
      return !relative || relative.startsWith('..') || path.isAbsolute(relative);
    })
    .forEach((filePath) => {
      if (!filePath.endsWith('.spec.json')) {
        throw new Error(`Unexpected File: ${filePath}`);
      }
    });

  let timeKeeper = null;
  let randomSeeder = null;
  const suiteEnvVarsWrapper = EnvManager({
    envVars: {
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'XXXXXXXXXXXXXXXXXXXX',
      AWS_SECRET_ACCESS_KEY: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      ...yaml.load(fs.readFileSync(envVarYml, 'utf8'))
    },
    allowOverwrite: false
  });
  const suiteEnvVarsWrapperRecording = fs.existsSync(envVarYmlRecording) ? EnvManager({
    envVars: yaml.load(fs.readFileSync(envVarYmlRecording, 'utf8')),
    allowOverwrite: true
  }) : null;
  return {
    execute: (modifier = '') => {
      if (enabled !== true) {
        return [];
      }

      const isPattern = typeof modifier === 'string' || modifier instanceof String;
      const testFiles = isPattern ? globSync('**/*.spec.json', {
        cwd: testFolder,
        nodir: true,
        ignore: ['**/*.spec.json_recording.json']
      }).filter((e) => new RegExp(modifier, '').test(e)) : modifier;

      describe(`Testing Lambda Functions: ${name}`, () => {
        before(() => suiteEnvVarsWrapper.apply());
        after(() => suiteEnvVarsWrapper.unapply());

        testFiles.forEach((testFile) => {
          const testSeed = crypto.randomBytes(16).toString('hex');
          // eslint-disable-next-line func-names
          it(`Test ${testFile}`, async function () {
            const test = JSON.parse(fs.readFileSync(path.join(testFolder, testFile), 'utf8'));
            const cassetteFile = `${testFile}_recording.json`;
            const isNewRecording = !fs.existsSync(path.join(cassetteFolder, cassetteFile));
            if (suiteEnvVarsWrapperRecording !== null && isNewRecording) {
              suiteEnvVarsWrapperRecording.apply();
            }
            const testEnvVarsWrapper = EnvManager({ envVars: test.envVars || {}, allowOverwrite: true });
            testEnvVarsWrapper.apply();
            if (test.timestamp !== undefined) {
              timeKeeper = TimeKeeper({ timestamp: test.timestamp });
              timeKeeper.inject();
            }
            if (test.seed !== undefined) {
              randomSeeder = RandomSeeder({ seed: test.seed, reseed: test.reseed || false });
              randomSeeder.inject();
            }
            const timeoutMax = Math.max(
              test.timeout !== undefined ? test.timeout : 0,
              timeout !== undefined ? timeout : 0
            );
            if (timeoutMax > 0) {
              this.timeout(timeoutMax);
            }
            const logRecorder = LogRecorder({ verbose, logger: console });
            logRecorder.inject();

            process.env.TEST_SEED = testSeed;
            const expectService = ExpectService({
              replace: [
                [cwd, '<root>'],
                [process.env.TEST_SEED, '<seed>']
              ]
            });

            try {
              const output = await HandlerExecutor({
                handlerFile,
                cassetteFolder,
                verbose,
                nockHeal,
                handlerFunction: test.handler,
                event: test.event,
                context: test.context || {},
                cassetteFile,
                lambdaTimeout: test.lambdaTimeout,
                modifiers,
                reqHeaderOverwrite,
                stripHeaders: get(test, 'stripHeaders', stripHeaders)
              });
              const logs = {
                logs: logRecorder.levels()
                  .reduce((p, level) => Object.assign(p, { [level]: logRecorder.get(level) }), logRecorder.get())
              };

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
                'envVars',
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
                  let target;
                  if (k.startsWith('expect')) {
                    target = test.success ? output.response : output.err;
                  } else {
                    target = logs[k.split('(')[0]];
                  }
                  if (k.indexOf('(') !== -1) {
                    const apply = k.split('(', 2)[1].slice(0, -1).split('|');
                    target = apply[0] === '' ? target : get(target, apply[0]);
                    if (apply.length > 1) {
                      target = apply.slice(1).reduce((p, c) => dynamicApply(c, p, modifiers), target);
                    }
                  }
                  if (testHeal !== false && 'to.deep.equal()' in test[k]) {
                    test[k]['to.deep.equal()'] = target;
                    fs.smartWrite(path.join(testFolder, testFile), test);
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
                output.unmatchedRecordings.every((r) => get(test, 'allowedUnmatchedRecordings', []).includes(r)),
                `Unmatched Recording(s): ${JSON.stringify(output.unmatchedRecordings)}`
              ).to.equal(true);
              expect(
                output.outOfOrderErrors.every((r) => get(test, 'allowedOutOfOrderRecordings', []).includes(r)),
                `Out of Order Recording(s): ${JSON.stringify(output.outOfOrderErrors)}`
              ).to.equal(true);
              return Promise.resolve();
            } finally {
              // "close" test run
              logRecorder.release();
              if (randomSeeder !== null) {
                randomSeeder.release();
                randomSeeder = null;
              }
              if (timeKeeper !== null) {
                timeKeeper.release();
                timeKeeper = null;
              }
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
