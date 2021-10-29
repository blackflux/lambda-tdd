// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    // eslint-disable-next-line @blackflux/rules/prevent-typeof-object
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '<circular*>';
      }
      seen.add(value);
    }
    return value;
  };
};

module.exports = (e) => {
  if (typeof e === 'string' || e instanceof String) {
    return e;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return JSON.stringify(e, getCircularReplacer());
};
