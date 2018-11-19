const defaults = require('lodash.defaults');
const expect = require('chai').expect;

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
      Object.keys(options.envVars).forEach((envVarRaw) => {
        const envVar = envVarRaw.replace(/^\^/, '');
        if (options.allowOverwrite === true || envVarRaw.startsWith('^')) {
          envVarsOverwritten[envVar] = process.env[envVar];
        } else {
          expect(process.env).to.not.have.property(envVar);
        }
        setEnvVar(envVar, options.envVars[envVarRaw]);
      });
    },
    unapply: () => {
      Object.keys(options.envVars).forEach((envVarRaw) => {
        const envVar = envVarRaw.replace(/^\^/, '');
        expect(process.env).to.have.property(envVar);
        setEnvVar(envVar, envVarsOverwritten[envVar]);
      });
    }
  };
};
