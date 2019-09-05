const assert = require('assert');
const zlib = require('zlib');
const get = require('lodash.get');

const apply = (path, target, modifiers) => {
  assert(modifiers instanceof Object && !Array.isArray(modifiers));
  if (path.startsWith('[') && path.endsWith(']')) {
    return get(target, path.slice(1, -1));
  }
  const pathSplit = path.split('.');
  return pathSplit.slice(1)
    // eslint-disable-next-line global-require, import/no-dynamic-require
    .reduce((prev, cur) => prev[cur], modifiers[pathSplit[0]] || global[pathSplit[0]] || require(pathSplit[0]))(target);
};

module.exports = (path, target, modifiers) => apply(path, target, {
  toBase64: (input) => input.toString('base64'),
  toGzip: (input) => zlib.gzipSync(input, { level: 9 }),
  ...modifiers
});
