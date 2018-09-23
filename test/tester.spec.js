const fs = require("fs");
const path = require("path");
const expect = require("chai").expect;
const request = require("request");
const tmp = require("tmp");
const LambdaTester = require("./../src/tester");

const lambdaTester = LambdaTester({
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

  describe("Testing env.recording.yml", () => {
    let tmpDir;
    let testerArgs;
    before(() => {
      tmp.setGracefulCleanup();
    });
    beforeEach(() => {
      tmpDir = tmp.dirSync({ unsafeCleanup: true });
      fs.writeFileSync(path.join(tmpDir.name, "handler.js"), `module.exports.type = async () => process.env.TYPE;`);
      fs.writeFileSync(path.join(tmpDir.name, "env.yml"), "TYPE: cassette");
      testerArgs = {
        verbose: process.argv.slice(2).indexOf("--verbose") !== -1,
        cwd: tmpDir.name
      };
    });

    it("Testing without env.recording.yml", () => {
      fs.writeFileSync(path.join(tmpDir.name, "test.spec.json"), JSON.stringify({
        handler: "type",
        success: true,
        expect: {
          "to.equal()": "cassette"
        }
      }, null, 2));
      expect(LambdaTester(testerArgs).execute()).to.deep.equal(['test.spec.json']);
    });

    it("Testing env.recording.yml without recording", () => {
      fs.writeFileSync(path.join(tmpDir.name, "env.recording.yml"), "TYPE: recording");
      fs.writeFileSync(path.join(tmpDir.name, "test.spec.json"), JSON.stringify({
        handler: "type",
        success: true,
        expect: {
          "to.equal()": "recording"
        }
      }, null, 2));
      expect(LambdaTester(testerArgs).execute()).to.deep.equal(['test.spec.json']);
    });

    it("Testing env.recording.yml with recording", () => {
      fs.writeFileSync(path.join(tmpDir.name, "env.recording.yml"), "TYPE: recording");
      fs.mkdirSync(path.join(tmpDir.name, "__cassettes"));
      fs.writeFileSync(path.join(tmpDir.name, "__cassettes", "test.spec.json_recording.json"), "[]");
      fs.writeFileSync(path.join(tmpDir.name, "test.spec.json"), JSON.stringify({
        handler: "type",
        success: true,
        expect: {
          "to.equal()": "cassette"
        }
      }, null, 2));
      expect(LambdaTester(testerArgs).execute()).to.deep.equal(['test.spec.json']);
    });
  });
});
