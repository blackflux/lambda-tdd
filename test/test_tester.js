const path = require("path");
const globSync = require("glob").sync;
const lambdaTester = require("./../lib/tester")({
  cwd: path.join(__dirname, "sample")
});

describe("Testing Tester", () => {
  lambdaTester.execute(globSync("**/test_*.json", {
    cwd: path.join(__dirname, "sample"),
    nodir: true
  }).filter(e => !e.startsWith("__cassettes/")));
});
