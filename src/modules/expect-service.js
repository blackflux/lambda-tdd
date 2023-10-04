import assert from 'assert';
import chai from 'chai';
import chaiString from 'chai-string';
import clonedeepwith from 'lodash.clonedeepwith';
import objectScan from 'object-scan';
import ensureString from '../util/ensure-string.js';

chai.use(chaiString);
const { expect } = chai;

const cloneWithSymbols = (obj) => clonedeepwith(obj, (value, property, parent, stack) => {
  if (typeof property === 'symbol') {
    const descriptor = Object.getOwnPropertyDescriptor(parent, property);
    const clonedParent = stack.get(parent);

    // clone the symbol
    Object.defineProperty(clonedParent, property, descriptor);

    // add symbol as string
    let name = `_${property.toString()}`;
    while (name in parent) {
      name = `_${name}`;
    }
    clonedParent[name] = descriptor;
  }
});

export default ({ replace = [] } = {}) => {
  const replacer = (value) => replace
    .map(([k, v]) => [new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), v])
    .reduce((p, [k, v]) => p.replace(k, v), value);
  const prepare = (value) => {
    if (typeof value === 'string') {
      return replacer(value);
    }
    if (![Object, Array].includes(value?.constructor)) {
      return value;
    }
    const cloned = cloneWithSymbols(value);
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
        const k = lastKey.replace('()', '');
        const chaiTarget = targetBefore[k];
        if (typeof chaiTarget === 'function') {
          targetBefore[k](isRegex ? new RegExp(value, 'i') : value, ensureString(target));
        } else {
          assert(value === null, 'Ignored value should be null');
        }
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
