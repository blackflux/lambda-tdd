const assert = require("assert");
const crypto = require('crypto');

module.exports = () => {
  let original = null;

  return {
    forceSeed: (seed) => {
      assert(typeof seed === "string");
      assert(original === null);

      original = crypto.randomBytes;
      const executionCount = {};

      crypto.randomBytes = (size, cb) => {
        executionCount[size] = (executionCount[size] || 0) + 1;

        let result = crypto
          .createHash('sha256')
          .update(seed)
          .update(String(size))
          .update(String(executionCount[size]))
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
