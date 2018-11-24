const request = require('request');
const uuid4 = require('uuid/v4');

module.exports.returnEvent = (event, context, cb) => cb(null, event);
module.exports.returnContext = (event, context, cb) => cb(null, context);
module.exports.returnError = (event, context, cb) => cb('error');
module.exports.returnEnv = (event, context, cb) => cb(null, process.env);
module.exports.returnUnix = (event, context, cb) => cb(null, { unix: Math.floor(new Date() / 1000) });
module.exports.returnRandom = (event, context, cb) => cb(null, { random1: uuid4(), random2: uuid4() });
module.exports.returnTimeout = (event, context, cb) => cb(null, { timeout: context.getRemainingTimeInMillis() });
module.exports.returnExternal = (event, context, cb) => request
  .get('http://ip-api.com/json', { json: true }, (err, res, body) => cb(err, body));
module.exports.logger = (event, context, cb) => {
  // eslint-disable-next-line no-console
  console.log('Some Log Message');
  cb(null);
};
