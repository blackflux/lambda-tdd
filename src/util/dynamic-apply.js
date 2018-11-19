const assert = require('assert');
const get = require('lodash.get');

module.exports = (path, target, modifiers) => {
  assert(typeof modifiers === 'object' && !Array.isArray(modifiers));
  if (path.startsWith('[') && path.endsWith(']')) {
    return get(target, path.slice(1, -1));
  }
  const pathSplit = path.split('.');
  return pathSplit.slice(1)
    // eslint-disable-next-line global-require, import/no-dynamic-require
    .reduce((prev, cur) => prev[cur], modifiers[pathSplit[0]] || global[pathSplit[0]] || require(pathSplit[0]))(target);
};
