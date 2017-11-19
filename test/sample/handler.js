module.exports.returnEvent = (event, context, callback) => callback(null, event);
module.exports.returnEnv = (event, context, callback) => callback(null, process.env);
