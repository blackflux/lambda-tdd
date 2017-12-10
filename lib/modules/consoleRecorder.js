/* eslint-disable no-console */
module.exports = (options) => {
  const consoleLogOriginal = console.log;
  const consoleErrorOriginal = console.error;
  const logs = [];
  const defaultLogs = [];
  const errorLogs = [];
  return {
    start: () => {
      logs.length = 0;
      defaultLogs.length = 0;
      errorLogs.length = 0;
      console.log = (...args) => {
        if (options.verbose === true) {
          consoleLogOriginal.apply(consoleLogOriginal, args);
        }
        logs.push(...args);
        defaultLogs.push(...args);
      };
      console.error = (...args) => {
        if (options.verbose === true) {
          consoleErrorOriginal.apply(consoleErrorOriginal, args);
        }
        logs.push(...args);
        errorLogs.push(...args);
      };
    },
    finish: () => {
      console.log = consoleLogOriginal;
      console.error = consoleErrorOriginal;
      return { logs, defaultLogs, errorLogs };
    }
  };
};
