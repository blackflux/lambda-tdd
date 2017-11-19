/* eslint-disable no-console */
const ConsoleRecorder = require('../../lib/modules/consoleRecorder');
const expect = require("chai").expect;

const testConsole = (verbose) => {
  const logs = [];
  const consoleLogOriginal = console.log;
  console.log = (...args) => {
    logs.push(...args);
  };
  const consoleRecorder = ConsoleRecorder({ verbose });
  consoleRecorder.start();
  console.log("test-log1");
  console.log("test-log2");
  expect(consoleRecorder.finish()).to.deep.equal(["test-log1", "test-log2"]);
  if (verbose === true) {
    expect(logs).to.deep.equal(["test-log1", "test-log2"]);
  } else {
    expect(logs).to.deep.equal([]);
  }
  console.log = consoleLogOriginal;
};

describe("Testing ConsoleRecorder", () => {
  it("Testing Logging Silent", () => {
    testConsole(false);
  });

  it("Testing Logging Verbose", () => {
    testConsole(true);
  });
});
