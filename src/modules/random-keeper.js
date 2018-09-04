const assert = require("assert");
const crypto = require('crypto');

module.exports = () => {
  let original = null;

  return {
    freeze: (seed) => {
      assert(typeof seed === "string");
      assert(original === null);

      original = crypto.randomBytes;
      let executionCount = 0;

      crypto.randomBytes = (size, cb) => {
        executionCount += 1;

        let result = crypto.createHash('sha256').update(seed).update(String(executionCount)).digest();
        while (result.length < size) {
          result = Buffer.concat([result, crypto.createHash('sha256').update(result).digest()]);
        }

        result = result.slice(0, size);
        return cb ? cb(null, result) : result;
      };
    },
    unfreeze: () => {
      if (original !== null) {
        crypto.randomBytes = original;
        original = null;
      }
    }
  };
};
