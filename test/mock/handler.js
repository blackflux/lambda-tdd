const request = require('request-promise');
const uuid4 = require('uuid/v4');

module.exports.returnEvent = (event, context, cb) => cb(null, event);
module.exports.returnContext = (event, context, cb) => cb(null, context);
module.exports.returnError = (event, context, cb) => cb('error');
module.exports.returnEnv = (event, context, cb) => cb(null, process.env);
module.exports.returnUnix = (event, context, cb) => cb(null, { unix: Math.floor(new Date() / 1000) });
module.exports.returnRandom = (event, context, cb) => cb(null, { random1: uuid4(), random2: uuid4() });
module.exports.returnTimeout = (event, context, cb) => cb(null, { timeout: context.getRemainingTimeInMillis() });
module.exports.returnExternal = (event, context, cb) => request
  .get('http://ip-api.com/json', { json: true }).then(r => cb(null, r));
module.exports.returnChainedExternal = async (event, context, cb) => {
  const json = await request
    .get('http://ip-api.com/json', { json: true });
  const xmlCsv = await Promise.all([
    request
      .get('http://ip-api.com/xml', { json: true }),
    request
      .get('http://ip-api.com/csv', { json: true })
  ]);
  const php = await request
    .get('http://ip-api.com/php', { json: true });
  cb(null, [json, xmlCsv, php]);
};
module.exports.logger = (event, context, cb) => {
  // eslint-disable-next-line no-console
  console.log('Some Log Message');
  cb(null);
};
