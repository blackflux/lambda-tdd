# Test Framework for AWS Lambda

[![Build Status](https://img.shields.io/travis/simlu/lambda-tdd/master.svg)](https://travis-ci.org/simlu/lambda-tdd)
[![Test Coverage](https://img.shields.io/coveralls/simlu/lambda-tdd/master.svg)](https://coveralls.io/github/simlu/lambda-tdd?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/simlu/lambda-tdd.svg)](https://greenkeeper.io/)
[![Dependencies](https://david-dm.org/simlu/lambda-tdd/status.svg)](https://david-dm.org/simlu/lambda-tdd)
[![NPM](https://img.shields.io/npm/v/lambda-tdd.svg)](https://www.npmjs.com/package/lambda-tdd)
[![Downloads](https://img.shields.io/npm/dt/lambda-tdd.svg)](https://www.npmjs.com/package/lambda-tdd)
[![Semantic-Release](https://github.com/simlu/js-gardener/blob/master/assets/icons/semver.svg)](https://github.com/semantic-release/semantic-release)
[![Gardener](https://github.com/simlu/js-gardener/blob/master/assets/badge.svg)](https://github.com/simlu/js-gardener)
[![Gitter](https://github.com/simlu/js-gardener/blob/master/assets/icons/gitter.svg)](https://gitter.im/simlu/lambda-tdd)

Testing Framework for AWS Lambda. Very useful for integration testing as you can examine how your lambda function executes for certain input and specific environment variables. Tries to model the cloud execution as closely as possible.

## What it does

- Tests are defined as JSON files
- Test are dynamically evaluated using [Chai](https://github.com/chaijs/chai)
- Lambda functions are executed using [Lambda-Wrapper](https://github.com/SC5/lambda-wrapper)
- Supports external request mocking using [Nock](https://github.com/node-nock/nock)
- Allows setting of environment variables on a per test granularity
- Freeze execution to specific timestamp with [Timekeeper](https://github.com/vesln/timekeeper)
- Set lambda timeout (`context.getRemainingTimeInMillis()`)
- Set test timeout
- Specify event input
- Test success and error responses

## Getting Started

To install run 

    $ npm install --save-dev lambda-tdd

### Initialize Test Runner and Execute

```javascript
const lambdaTester = require("lambda-tdd")({ cwd: __dirname });

describe("Testing Tester", () => {
  lambdaTester.execute();
});
```

You can pass an array of test files to the `execute()` function. By default tests are auto detected.

## Test Runner Options

### cwd

Type: `string`<br>
Default: `process.cwd()`

Directory which other defaults are relative to.

### name

Type `string`<br>
Default: `lambda-test`

Name of this test runner for debug purposes.

### verbose

Type `boolean`<br>
Default: `false`

Display console output while running tests. Useful for debugging.

### handlerFile

Type: `string`<br>
Default: `handler.js`

Handler file containing the handler functions (specified in test).

### cassetteFolder

Type: `string`<br>
Default: `__cassettes`

Folder containing nock recordings.

### envVarYml

Type: `string`<br>
Default: `env.yml`

Specify yaml file containing environment variables. No existing environment variables can be overwritten.

### testFolder

Type: `string`<br>
Default: ``

Folder containing test files.

## Test File Format

### handler

Type: `string`<br>
*Required*

The handler inside the handler file, i.e. if `handler.js` contained
```javascript
module.exports.returnEvent = (event, context, cb) => cb(null, event);
```
we would set this to `returnEvent`.

### env

Type `object`<br>
Default: `{}`

Contains environment variables that are set for this test. Existing environment variables can be overwritten.

### timestamp

Type `unix`<br>
Default: Unfrozen

Set unix timestamp that test executing will see. Time does not progress if this option is set.

### timeout

Type `integer`<br>
Default: Mocha Default Timeout

Set custom timeout in ms for lambda execution. Handy e.g. when recording nock requests.

### event

Type `object`<br>
Default: undefined

Event object that is passed to lambda handler.

### lambdaTimeout

Type `integer`<br>
Default: 300000

Set initial lambda timeout in ms. Exposed in lambda function through `context.getRemainingTimeInMillis()`.
The timeout is not enforced, but progresses as expected unless `timestamp` option is used.

### success

Type `boolean`<br>
*Required*

True iff execution is expected to succeed, i.e. no error is passed into callback.

### response

Type `array`<br>
Default: `[]`

Dynamic expect logic executed against the response string. More details below.

### error

Type `array`<br>
Default: `[]`

Dynamic expect logic executed against the error string. More details below.

### body

Type `array`<br>
Default: `[]`

Dynamic expect logic executed against the response.body string. More details below.

### logs

Type `array`<br>
Default: `[]`

Dynamic expect logic executed against the `console.log` output array. More details below.

### nock

Type `array`<br>
Default: `[]`

Dynamic expect logic executed against the nock recording. More details below.
Note that the nock recording must already exists for this check to evaluate correctly.

## Dynamic Expect Logic

Uses [Chai Assertion Library](http://chaijs.com/api/bdd/) syntax written as json. Lets assume we have an output array `[1, 2]` we want to validate. We can write
```javascript
expect([1,2]).to.contain(1);
expect([1,2]).to.contain(2);
```
as the following json
```json
[{
  "to.contain": 1
}, {
  "to": {
    "contain": 2
  }
}]
```
Note that targets are either arrays or strings, but never objects (design limitation).

## Test File Examples

You can find some examples of JSON test files [here](https://github.com/simlu/lambda-tdd/tree/master/test/sample).
