const path = require("path");
const globSync = require("glob").sync;
const lambdaTester = require("./../lib/tester")({
  name: "lambda-test",
  envVarYml: path.join(__dirname, "sample", "env.yml"),
  debug: false,
  handlerFile: path.join(__dirname, "sample", "handler.js"),
  cassetteFolder: path.join(__dirname, "sample", "__cassettes"),
  testFolder: path.join(__dirname, "sample")
});

describe("Testing Tester", () => {
  lambdaTester.execute(globSync("**/test_*.json", {
    nodir: true,
    cwd: path.join(__dirname, "sample")
  }).filter(e => !e.startsWith("__cassettes/")));
});
