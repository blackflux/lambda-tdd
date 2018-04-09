const path = require("path");
const expect = require("chai").expect;
const lambdaTester = require("./../src/tester")({
  cwd: path.join(__dirname, "example")
});

describe("Testing Tester", () => {
  describe("Empty Folder", () => {
    const testFiles = lambdaTester.execute();
    expect(testFiles.length).to.be.greaterThan(1);
  });

  describe("Explicit Test File", () => {
    const testFiles = lambdaTester.execute(["echo_event.spec.json"]);
    expect(testFiles).to.deep.equal(["echo_event.spec.json"]);
  });

  describe("Test File Regex", () => {
    const testFiles = lambdaTester.execute("echo_event\\.spec\\.json");
    expect(testFiles).to.deep.equal(["echo_event.spec.json"]);
  });
});
