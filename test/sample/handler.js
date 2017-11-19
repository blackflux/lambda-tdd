module.exports.returnEvent = (event, context, callback) => callback(null, event);
module.exports.returnEnv = (event, context, callback) => callback(null, process.env);
module.exports.returnUnix = (event, context, callback) => callback(null, { unix: Math.floor(new Date() / 1000) });
