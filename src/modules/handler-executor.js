const assert = require('assert');
const wrapper = require('lambda-wrapper');
const { RequestRecorder } = require('node-tdd');
const rewriteObject = require('../util/rewrite-object');

module.exports = (options) => {
  assert(options.handlerFunction in options.handler);
  const runner = wrapper.wrap({ handler: options.handler[options.handlerFunction] });

  return {
    execute: async () => {
      const requestRecorder = RequestRecorder({
        cassetteFolder: options.cassetteFolder,
        stripHeaders: options.stripHeaders || false,
        strict: false,
        heal: options.nockHeal,
        modifiers: options.modifiers,
        reqHeaderOverwrite: options.reqHeaderOverwrite
      });
      await requestRecorder.inject(options.cassetteFile);

      const startTimestamp = process.hrtime();
      const startTime = (startTimestamp[0] * 1000) + (startTimestamp[1] / 1000000);
      const event = rewriteObject(options.event, options.modifiers);
      const [err, response] = await new Promise((resolve) => runner.run(event, {
        ...options.context,
        getRemainingTimeInMillis: () => {
          const curTimeStamp = process.hrtime();
          const curTime = (curTimeStamp[0] * 1000) + (curTimeStamp[1] / 1000000);
          return (options.lambdaTimeout || 300000) - (curTime - startTime);
        }
      }, (...args) => resolve(args)));
      await requestRecorder.release();
      return { ...requestRecorder.get(), err, response };
    }
  };
};
