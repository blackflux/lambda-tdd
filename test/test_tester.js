const path = require("path");
const lambdaTester = require("./../lib/tester")({
  cwd: path.join(__dirname, "sample")
});

describe("Testing Tester", () => {
  lambdaTester.execute();
});
