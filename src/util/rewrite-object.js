const dynamicApply = require("./dynamic-apply");

const rewrite = (input) => {
  if (input !== null && typeof input === "object") {
    return Array.isArray(input)
      ? input.map(e => rewrite(e))
      : Object.keys(input)
        .reduce((prev, cur) => {
          const apply = cur.split("|");
          let target = rewrite(input[cur]);
          if (apply.length > 1) {
            target = apply.slice(1).reduce((p, c) => dynamicApply(c.split("."), p), target);
          }
          return Object.assign(prev, { [apply[0]]: target });
        }, {});
  }
  return input;
};

module.exports = rewrite;
