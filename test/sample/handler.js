const request = require("request");

module.exports.returnEvent = (event, context, cb) => cb(null, event);
module.exports.returnError = (event, context, cb) => cb("error");
module.exports.returnEnv = (event, context, cb) => cb(null, process.env);
module.exports.returnUnix = (event, context, cb) => cb(null, { unix: Math.floor(new Date() / 1000) });
module.exports.returnTimeout = (event, context, cb) => cb(null, { timeout: context.getRemainingTimeInMillis() });
module.exports.returnExternal = (event, context, cb) => request
  .get("http://ip-api.com/json", { json: true }, (err, res, body) => cb(err, body));
