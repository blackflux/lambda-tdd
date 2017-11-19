module.exports.returnEvent = (event, context, cb) => cb(null, event);
module.exports.returnEnv = (event, context, cb) => cb(null, process.env);
module.exports.returnUnix = (event, context, cb) => cb(null, { unix: Math.floor(new Date() / 1000) });
module.exports.returnTimeout = (event, context, cb) => cb(null, { timeout: context.getRemainingTimeInMillis() });
