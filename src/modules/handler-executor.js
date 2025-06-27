import { RequestRecorder } from 'node-tdd';
import rewriteObject from '../util/rewrite-object.js';

export default async (options) => {
  const handlers = await import(options.handlerFile);
  const handler = handlers[options.handlerFunction];
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
  let response;
  let err = null;
  try {
    response = await handler(event, {
      ...options.context,
      getRemainingTimeInMillis: () => {
        const curTimeStamp = process.hrtime();
        const curTime = (curTimeStamp[0] * 1000) + (curTimeStamp[1] / 1000000);
        return (options.lambdaTimeout || 300000) - (curTime - startTime);
      }
    });
  } catch (error) {
    err = error;
  }
  await requestRecorder.release();
  return { ...requestRecorder.get(), err, response };
};
