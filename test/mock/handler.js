import crypto from 'crypto';
import axios from 'axios';

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
export const returnExternal = (event, context, cb) => axios
  .get('http://ip-api.com/json')
  .then((r) => cb(null, r));
export const returnChainedExternal = async (event, context, cb) => {
  const json = (await axios.get('http://ip-api.com/json', { headers: { accept: 'application/json' } })).data;
  const xmlCsv = await Promise.all([
    axios.get('http://ip-api.com/xml', { headers: { accept: 'application/json' } }),
    axios.get('http://ip-api.com/csv', { headers: { accept: 'application/json' } })
  ]).then((r) => r.map(({ data }) => data));
  const php = (await axios.get('http://ip-api.com/php', { headers: { accept: 'application/json' } })).data;
  cb(null, [json, xmlCsv, php]);
};
export const logger = (event, context, cb) => {
  // eslint-disable-next-line no-console
  console.log('Some Log Message');
  cb(null);
};
export const getSeed = (event, context, cb) => {
  cb(null, { seed: process.env.TEST_SEED });
};
