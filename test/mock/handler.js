import crypto from 'crypto';
import axios from 'axios';

export const returnEvent = (event, context) => event;
export const returnContext = (event, context) => context;
export const returnError = (event, context) => {
  // eslint-disable-next-line no-throw-literal
  throw 'error';
};
export const returnEnv = (event, context) => process.env;
export const returnUnix = (event, context) => ({ unix: Math.floor(new Date() / 1000) });
export const returnRandom = (event, context) => ({
  random1: crypto.randomUUID(),
  random2: crypto.randomUUID()
});
export const returnTimeout = (event, context) => ({ timeout: context.getRemainingTimeInMillis() });
export const returnExternal = (event, context) => axios
  .get('http://ip-api.com/json');
export const returnChainedExternal = async (event, context) => {
  const json = (await axios.get('http://ip-api.com/json', { headers: { accept: 'application/json' } })).data;
  const xmlCsv = await Promise.all([
    axios.get('http://ip-api.com/xml', { headers: { accept: 'application/json' } }),
    axios.get('http://ip-api.com/csv', { headers: { accept: 'application/json' } })
  ]).then((r) => r.map(({ data }) => data));
  const php = (await axios.get('http://ip-api.com/php', { headers: { accept: 'application/json' } })).data;
  return [json, xmlCsv, php];
};
export const logger = (event, context) => {
  // eslint-disable-next-line no-console
  console.log('Some Log Message');
};
export const getSeed = (event, context) => ({ seed: process.env.TEST_SEED });
export const getObjWithSymbol = (event, context) => {
  const result = {
    '_Symbol(my-symbol)': 'some-other-value'
  };
  Object.defineProperty(
    result,
    Symbol('my-symbol'),
    { value: 'symbol-value', enumerable: false, writable: false }
  );
  return result;
};
