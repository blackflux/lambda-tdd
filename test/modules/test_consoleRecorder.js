/* eslint-disable no-console */
const ConsoleRecorder = require('../../lib/modules/consoleRecorder');
const expect = require("chai").expect;

const testConsole = (silence) => {
  const logs = [];
  const consoleLogOriginal = console.log;
  console.log = (...args) => {
    logs.push(...args);
  };
  const consoleRecorder = ConsoleRecorder({ silence });
  consoleRecorder.start();
  console.log("test-log1");
  console.log("test-log2");
  expect(consoleRecorder.finish()).to.deep.equal(["test-log1", "test-log2"]);
  if (silence === true) {
    expect(logs).to.deep.equal([]);
  } else {
    expect(logs).to.deep.equal(["test-log1", "test-log2"]);
  }
  console.log = consoleLogOriginal;
};

describe("Testing ConsoleRecorder", () => {
  it("Testing Logging Silent", () => {
    testConsole(true);
  });

  it("Testing Logging Verbose", () => {
    testConsole(false);
  });
});
