import dynamicApply from './dynamic-apply.cjs';

const rewrite = (input, modifiers) => {
  if (input !== null && input instanceof Object) {
    return Array.isArray(input)
      ? input.map((e) => rewrite(e, modifiers))
      : Object.keys(input)
        .reduce((prev, cur) => {
          const apply = cur.split('|');
          let target = rewrite(input[cur], modifiers);
          if (apply.length > 1) {
            target = apply.slice(1).reduce((p, c) => dynamicApply(c, p, modifiers), target);
          }
          return Object.assign(prev, { [apply[0]]: target });
        }, {});
  }
  return input;
};

export default rewrite;
