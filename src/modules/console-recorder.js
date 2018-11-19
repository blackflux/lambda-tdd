const pick = require('lodash.pick');

/* eslint-disable no-console */
module.exports = (options) => {
  const consoleOriginal = pick(console, ['log', 'info', 'error', 'warn']);
  const logs = [];
  const defaultLogs = [];
  const errorLogs = [];
  return {
    start: () => {
      logs.length = 0;
      defaultLogs.length = 0;
      errorLogs.length = 0;
      Object.keys(consoleOriginal).forEach((logLevel) => {
        console[logLevel] = (...args) => {
          if (options.verbose === true) {
            consoleOriginal[logLevel](...args);
          }
          logs.push(...args);
          if (['log', 'info'].indexOf(logLevel) !== -1) {
            defaultLogs.push(...args);
          } else {
            errorLogs.push(...args);
          }
        };
      });
    },
    finish: () => {
      Object.assign(console, consoleOriginal);
      return { logs, defaultLogs, errorLogs };
    }
  };
};
