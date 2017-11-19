/* eslint-disable no-console */
module.exports = (options) => {
  const consoleLogOriginal = console.log;
  const logs = [];
  return {
    start: () => {
      logs.length = 0;
      console.log = (...args) => {
        if (!options.silence) {
          consoleLogOriginal.apply(consoleLogOriginal, args);
        }
        logs.push(...args);
      };
    },
    finish: () => {
      console.log = consoleLogOriginal;
      return logs;
    }
  };
};
