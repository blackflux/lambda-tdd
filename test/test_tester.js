const path = require("path");
const expect = require("chai").expect;
const lambdaTester = require("./../lib/tester")({
  cwd: path.join(__dirname, "sample")
});

describe("Testing Tester", () => {
  describe("Empty Folder", () => {
    const testFiles = lambdaTester.execute();
    expect(testFiles.length).to.be.greaterThan(1);
  });

  describe("Explicit Test File", () => {
    const testFiles = lambdaTester.execute(["test_echo_event.json"]);
    expect(testFiles).to.deep.equal(["test_echo_event.json"]);
  });

  describe("Test File Regex", () => {
    const testFiles = lambdaTester.execute("test_echo_event\\.json");
    expect(testFiles).to.deep.equal(["test_echo_event.json"]);
  });
});
