import crypto from 'crypto';
import request from 'request-promise';

export const returnEvent = (event, context, cb) => cb(null, event);
export const returnContext = (event, context, cb) => cb(null, context);
export const returnError = (event, context, cb) => cb('error');
export const returnEnv = (event, context, cb) => cb(null, process.env);
export const returnUnix = (event, context, cb) => cb(null, { unix: Math.floor(new Date() / 1000) });
export const returnRandom = (event, context, cb) => cb(null, {
  random1: crypto.randomUUID(),
  random2: crypto.randomUUID()
});
export const returnTimeout = (event, context, cb) => cb(null, { timeout: context.getRemainingTimeInMillis() });
export const returnExternal = (event, context, cb) => request
  .get('http://ip-api.com/json', { json: true })
  .then((r) => cb(null, r));
export const returnChainedExternal = async (event, context, cb) => {
  const json = await request.get('http://ip-api.com/json', { json: true });
  const xmlCsv = await Promise.all([
    request.get('http://ip-api.com/xml', { json: true }),
    request.get('http://ip-api.com/csv', { json: true })
  ]);
  const php = await request.get('http://ip-api.com/php', { json: true });
  cb(null, [json, xmlCsv, php]);
};
export const logger = (event, context, cb) => {
  // eslint-disable-next-line no-console
  console.log('Some Log Message');
  cb(null);
};
