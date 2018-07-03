module.exports = (path, target) => path.slice(1)
  // eslint-disable-next-line global-require, import/no-dynamic-require
  .reduce((p, c) => p[c], global[path[0]] || require(path[0]))(target);
