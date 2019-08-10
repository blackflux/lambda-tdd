const assert = require('assert');
const crypto = require('crypto');
const get = require('lodash.get');

module.exports = () => {
  let original = null;

  return {
    forceSeed: (seed, reseed = false) => {
      assert(typeof seed === 'string');
      assert(typeof reseed === 'boolean');
      assert(original === null);

      original = crypto.randomBytes;
      const executionCounts = {};

      crypto.randomBytes = (size, cb) => {
        // randomization is seeded "per key"
        const stack = new Error().stack.split('\n');
        const subStack = stack.slice(stack.findIndex((e) => e.indexOf('/node_modules/') !== -1));
        const stackOrigin = get(subStack, [subStack.findIndex((e) => e.indexOf('/node_modules/') === -1) - 1], '');
        const originFile = get(stackOrigin.match(/^.*?\([^)]+?\/node_modules\/([^)]+):\d+:\d+\)$/), [1], '');
        const key = `${originFile}@${size}`;

        executionCounts[key] = reseed === true ? null : (executionCounts[key] || 0) + 1;
        let result = crypto
          .createHash('sha256')
          .update(seed)
          .update(key)
          .update(String(executionCounts[key]))
          .digest();
        while (result.length < size) {
          result = Buffer.concat([result, crypto.createHash('sha256').update(result).digest()]);
        }

        result = result.slice(0, size);
        return cb ? cb(null, result) : result;
      };
    },
    reset: () => {
      if (original !== null) {
        crypto.randomBytes = original;
        original = null;
      }
    }
  };
};
