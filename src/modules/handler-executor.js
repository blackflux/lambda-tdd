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
      consoleRecorder.start();
      nockBack.setMode('record');
      nockBack.fixtures = options.cassetteFolder;
      nockBack(options.cassetteFile, {
        before: (r) => {
          records.push(r);
          if (options.ignoreCassetteRequestBody === true) {
            Object.assign(r, { body: '*' });
          }
          return r;
        },
        afterRecord: recordings => (options.stripHeaders === true ? recordings.map((r) => {
          const res = Object.assign({}, r);
          delete res.rawHeaders;
          return res;
        }) : recordings)
      }, (nockDone) => {
        const startTimestamp = process.hrtime();
        const startTime = (startTimestamp[0] * 1000) + (startTimestamp[1] / 1000000);
        runner.run(options.event, Object.assign({}, options.context, {
          getRemainingTimeInMillis: () => {
            const curTimeStamp = process.hrtime();
            const curTime = (curTimeStamp[0] * 1000) + (curTimeStamp[1] / 1000000);
            return (options.lambdaTimeout || 300000) - (curTime - startTime);
          }
        }), (err, response) => {
          const pendingMocks = nock.pendingMocks();
          nockDone();
          resolve({
            records,
            err,
            response,
            logs: consoleRecorder.finish(),
            pendingMocks
          });
        });
      });
    })
  };
};
