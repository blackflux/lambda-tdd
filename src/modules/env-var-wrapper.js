const assert = require('assert');

const setEnvVar = (key, value) => {
  if ([null, undefined].includes(value)) {
    delete process.env[key];
  } else {
    assert(typeof value === 'string');
    process.env[key] = value;
  }
};

module.exports = (envVars, allowOverwrite) => {
  const envVarsOverwritten = {};
  return {
    apply: () => {
      envVarsOverwritten.length = 0;
      Object.entries(envVars).forEach(([key, value]) => {
        const envVar = key.replace(/^\^/, '');
        if (allowOverwrite === true || key.startsWith('^')) {
          envVarsOverwritten[envVar] = process.env[envVar];
        } else {
          assert(process.env[envVar] === undefined, `Environment Variable Set: ${envVar}`);
        }
        setEnvVar(envVar, value);
      });
    },
    unapply: () => {
      Object.keys(envVars).forEach((key) => {
        const envVar = key.replace(/^\^/, '');
        assert(typeof process.env[envVar] === 'string', `Environment Variable Set: ${envVar}`);
        setEnvVar(envVar, envVarsOverwritten[envVar]);
      });
    }
  };
};
