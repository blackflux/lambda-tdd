const expect = require('chai').expect;
const ensureString = require('./../util/ensure-string');

module.exports = () => {
  const handleDynamicExpect = (target, check) => {
    let result = 0;
    Object.keys(check).forEach((key) => {
      const value = check[key];
      const keys = key.split('.');
      const lastKey = keys.pop();
      const targetBefore = keys.reduce((o, e) => o[e], target);
      if (typeof value !== 'object' || value instanceof Array || lastKey.endsWith('()')) {
        const isRegex = typeof value === 'string' && value.indexOf('^') === 0;
        targetBefore[lastKey.replace('()', '')](isRegex ? new RegExp(value, 'i') : value, ensureString(target));
        result += 1;
      } else {
        result += handleDynamicExpect(targetBefore[lastKey], value);
      }
    });
    return result;
  };

  return {
    evaluate: (testsInput, value) => {
      if (testsInput !== undefined) {
        expect(
          Array.isArray(testsInput) && testsInput.length === 1,
          'Define single test as object, not as list.'
        ).to.equal(false);
        const tests = Array.isArray(testsInput) ? testsInput : [testsInput];
        let count = 0;
        tests.forEach((check) => {
          // eslint-disable-next-line jasmine/expect-matcher
          count += handleDynamicExpect(expect(value), check);
        });
        expect(count).to.be.at.least(tests.length);
      }
    }
  };
};
