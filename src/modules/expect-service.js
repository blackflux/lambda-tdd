import chai from 'chai';
import chaiString from 'chai-string';
import cloneDeep from 'lodash.clonedeep';
import objectScan from 'object-scan';
import ensureString from '../util/ensure-string.js';

chai.use(chaiString);
const { expect } = chai;

export default ({ replace = [] } = {}) => {
  const replacer = (value) => replace
    .map(([k, v]) => [new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), v])
    .reduce((p, [k, v]) => p.replace(k, v), value);
  const prepare = (value) => {
    if (typeof value === 'string') {
      return replacer(value);
    }
    const cloned = cloneDeep(value);
    objectScan(['**'], {
      filterFn: ({ parent, property, value: v }) => {
        if (typeof v === 'string') {
          // eslint-disable-next-line no-param-reassign
          parent[property] = replacer(v);
        }
      }
    })(cloned);
    return cloned;
  };

  const handleDynamicExpect = (target, check) => {
    let result = 0;
    Object.keys(check).forEach((key) => {
      const value = check[key];
      const keys = key.split('.');
      const lastKey = keys.pop();
      const targetBefore = keys.reduce((o, e) => o[e], target);
      if (!(value instanceof Object) || value instanceof Array || lastKey.endsWith('()')) {
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
    prepare,
    evaluate: (testsInput, value) => {
      if (testsInput !== undefined) {
        expect(
          Array.isArray(testsInput) && testsInput.length === 1,
          'Define single test as object, not as list.'
        ).to.equal(false);
        const tests = Array.isArray(testsInput) ? testsInput : [testsInput];
        let count = 0;
        tests.forEach((check) => {
          count += handleDynamicExpect(expect(prepare(value)), check);
        });
        expect(count).to.be.at.least(tests.length);
      }
    }
  };
};
