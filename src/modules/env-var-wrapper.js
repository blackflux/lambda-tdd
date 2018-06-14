const defaults = require("lodash.defaults");
const expect = require("chai").expect;

module.exports = (options) => {
  defaults(options, { envVars: {} });
  const setEnvVar = (key, value) => {
    if ([null, undefined].indexOf(value) !== -1) {
      delete process.env[key];
    } else {
      expect(typeof value).to.equal('string');
      process.env[key] = value;
    }
  };
  const envVarsOverwritten = {};
  return {
    apply: () => {
      envVarsOverwritten.length = 0;
      Object.keys(options.envVars).forEach((envVar) => {
        if (options.allowOverwrite !== true) {
          expect(process.env).to.not.have.property(envVar);
        } else {
          envVarsOverwritten[envVar] = process.env[envVar];
        }
        setEnvVar(envVar, options.envVars[envVar]);
      });
    },
    unapply: () => {
      Object.keys(options.envVars).forEach((envVar) => {
        expect(process.env).to.have.property(envVar);
        setEnvVar(envVar, envVarsOverwritten[envVar]);
      });
    }
  };
};
