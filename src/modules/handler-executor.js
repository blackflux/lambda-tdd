const wrapper = require('lambda-wrapper');
const { RequestRecorder } = require('node-tdd');


module.exports = (options) => {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const runner = wrapper.wrap({ handler: require(options.handlerFile)[options.handlerFunction] });

  return {
    execute: async () => {
      const requestRecorder = RequestRecorder({
        cassetteFolder: options.cassetteFolder,
        stripHeaders: options.stripHeaders || false,
        strict: false,
        heal: options.nockHeal
      });
      await requestRecorder.inject(options.cassetteFile);

      const startTimestamp = process.hrtime();
      const startTime = (startTimestamp[0] * 1000) + (startTimestamp[1] / 1000000);
      const [err, response] = await new Promise((resolve) => runner.run(options.event, {
        ...options.context,
        getRemainingTimeInMillis: () => {
          const curTimeStamp = process.hrtime();
          const curTime = (curTimeStamp[0] * 1000) + (curTimeStamp[1] / 1000000);
          return (options.lambdaTimeout || 300000) - (curTime - startTime);
        }
      }, (...args) => resolve(args)));
      requestRecorder.release();
      return { ...requestRecorder.get(), err, response };
    }
  };
};
