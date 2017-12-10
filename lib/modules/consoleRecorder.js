/* eslint-disable no-console */
module.exports = (options) => {
  const consoleLogOriginal = console.log;
  const consoleInfoOriginal = console.info;
  const consoleErrorOriginal = console.error;
  const consoleWarnOriginal = console.warn;
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
      console.info = console.log;
      console.error = (...args) => {
        if (options.verbose === true) {
          consoleErrorOriginal.apply(consoleErrorOriginal, args);
        }
        logs.push(...args);
        errorLogs.push(...args);
      };
      console.warn = console.error;
    },
    finish: () => {
      console.log = consoleLogOriginal;
      console.info = consoleInfoOriginal;
      console.error = consoleErrorOriginal;
      console.warn = consoleWarnOriginal;
      return { logs, defaultLogs, errorLogs };
    }
  };
};
