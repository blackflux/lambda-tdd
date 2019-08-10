const fs = require('fs');
const path = require('path');
const wrapper = require('lambda-wrapper');
const nock = require('nock');
const ConsoleRecorder = require('./console-recorder');

const nockBack = nock.back;

module.exports = (options) => {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const runner = wrapper.wrap({ handler: require(options.handlerFile)[options.handlerFunction] });
  const records = [];
  const consoleRecorder = ConsoleRecorder({ verbose: options.verbose });

  return {
    execute: () => new Promise((resolve) => {
      const cassetteFile = path.join(options.cassetteFolder, options.cassetteFile);
      const hasCassette = fs.existsSync(cassetteFile);
      // eslint-disable-next-line no-underscore-dangle
      const pendingMocks = hasCassette ? nock.load(cassetteFile).map((e) => e.interceptors[0]._key) : [];
      const outOfOrderErrors = [];

      consoleRecorder.start();
      nockBack.setMode(hasCassette ? 'lockdown' : 'record');
      nockBack.fixtures = options.cassetteFolder;
      nockBack(options.cassetteFile, {
        before: (r) => {
          records.push(r);
          if (options.ignoreCassetteRequestBody === true) {
            Object.assign(r, { body: '*' });
          }
          return r;
        },
        after: (scope) => {
          scope.on('request', (req, interceptor) => {
            // eslint-disable-next-line no-underscore-dangle
            const matchedKey = interceptor.scope.interceptors[0]._key;
            if (matchedKey === pendingMocks[0]) {
              pendingMocks.splice(0, 1);
            } else {
              pendingMocks.splice(pendingMocks.indexOf(matchedKey), 1);
              outOfOrderErrors.push(matchedKey);
            }
          });
        },
        afterRecord: (recordings) => (options.stripHeaders === true ? recordings.map((r) => {
          const res = { ...r };
          delete res.rawHeaders;
          return res;
        }) : recordings)
      }, (nockDone) => {
        const startTimestamp = process.hrtime();
        const startTime = (startTimestamp[0] * 1000) + (startTimestamp[1] / 1000000);
        runner.run(options.event, {
          ...options.context,
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
            logs: consoleRecorder.finish(),
            pendingMocks,
            outOfOrderErrors
          });
        });
      });
    })
  };
};
