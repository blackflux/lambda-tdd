const request = require("request");
const path = require("path");
const expect = require("chai").expect;
const lambdaTester = require("./../src/tester")({
  verbose: process.argv.slice(2).indexOf("--verbose") !== -1,
  cwd: path.join(__dirname, "example"),
  modifiers: {
    wrap: input => `{${input}}`
  }
});

describe("Testing Tester", () => {
  it("Empty Folder", () => {
    const testFiles = lambdaTester.execute();
    expect(testFiles.length).to.be.greaterThan(1);
  });

  it("Explicit Test File", () => {
    const testFiles = lambdaTester.execute(["echo_event.spec.json"]);
    expect(testFiles).to.deep.equal(["echo_event.spec.json"]);
  });

  it("Test File Regex", () => {
    const testFiles = lambdaTester.execute("echo_event\\.spec\\.json");
    expect(testFiles).to.deep.equal(["echo_event.spec.json"]);
  });

  it("Testing outgoing request", (done) => {
    request.get("http://google.com", (err, res, body) => {
      expect(err).to.equal(null);
      // maximum of 60 seconds diff
      expect(Math.abs(new Date(res.headers.date).valueOf() - Date.now())).to.be.at.most(60 * 1000);
      done();
    });
  });
});
