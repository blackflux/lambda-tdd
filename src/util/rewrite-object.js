const rewrite = (input) => {
  if (typeof input === "object") {
    return Array.isArray(input)
      ? input.map(e => rewrite(e))
      : Object.keys(input)
        .reduce((prev, cur) => {
          let target = rewrite(input[cur]);
          const meta = cur.split("|");
          if (meta.length === 2) {
            target = meta[1].split(".").reduce((p, c) => p[c], global)(target);
          }
          return Object.assign(prev, { [meta[0]]: target });
        }, {});
  }
  return input;
};

module.exports = rewrite;
