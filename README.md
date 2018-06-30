# Test Framework for AWS Lambda

[![Build Status](https://img.shields.io/travis/simlu/lambda-tdd/master.svg)](https://travis-ci.org/simlu/lambda-tdd)
[![Test Coverage](https://img.shields.io/coveralls/simlu/lambda-tdd/master.svg)](https://coveralls.io/github/simlu/lambda-tdd?branch=master)
[![Greenkeeper Badge](https://badges.greenkeeper.io/simlu/lambda-tdd.svg)](https://greenkeeper.io/)
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

## Example Projects

Example project using [js-gardener](https://github.com/simlu/js-gardener) and [lambda-tdd](https://github.com/simlu/lambda-tdd) can be found [here](https://github.com/simlu/lambda-example).

## Getting Started

To install run

    $ npm install --save-dev lambda-tdd

### Initialize Test Runner and Execute
<!-- eslint-disable import/no-extraneous-dependencies, import/no-unresolved -->
```javascript
const lambdaTester = require("lambda-tdd")({
  cwd: __dirname,
  verbose: process.argv.slice(2).indexOf("--verbose") !== -1
});

describe("Testing Tester", () => {
  lambdaTester.execute((process.argv.slice(2)
    .find(e => e.startsWith("--filter=")) || "")
    .substring(9));
});
```

You can pass an array of test files to the `execute()` function or a regular expression pattern. By default tests are auto detected. If a pattern is passed in only matching tests are executed.

The example above allows for use of a `--filter=REGEX` parameter to only execute specific tests.

*Note:* If you are running e.g. `npm t` to run your tests you need to specify the filter option with [quadruple dashes](https://github.com/npm/npm/pull/5518). Example:

    $ npm t -- --filter=REGEX


### Test File Example

```json
{
  "handler": "geoIp",
  "env": {
    "GOOGLE_PROJECT_ID": "123456789"
  },
  "event": {
    "ip": "173.244.44.10"
  },
  "nock": [{
    "to": {
      "match": "^.*?\"http://ip-api\\.(com|ca):80\".*?$"
    }
  }],
  "body": [{
    "to.contain": "\"United States\""
  }],
  "timestamp": 1511072994,
  "success": true,
  "lambdaTimeout": 5000,
  "timeout": 5000
}
```

More examples can be found [here](https://github.com/simlu/lambda-tdd/tree/master/test/sample).

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

Environment variables set by default are `AWS_REGION`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` since these always get set by the AWS Lambda environment.

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

### expect, expect(...)

Type `array`
Default: `[]`

Handle evaluation of response or error (uses success flag). Can define target path, e.g. `expect(some.path)`. Can also apply function with e.g. `expect(body|JSON.parse)`.
More details on dynamic expect handling below.

### response (DEPRECATED)

Type `array`<br>
Default: `[]`

Deprecated. Use "expect" instead.
Dynamic expect logic executed against the response string. More details on dynamic expect handling below.

### error (DEPRECATED)

Type `array`<br>
Default: `[]`

Deprecated. Use "expect" instead.
Dynamic expect logic executed against the error string. More details on dynamic expect handling below.

### body (DEPRECATED)

Type `array`<br>
Default: `[]`

Deprecated. Use "expect" instead.
Dynamic expect logic executed against the response.body string. More details on dynamic expect handling below.

### logs

Type `array`<br>
Default: `[]`

Dynamic expect logic executed against the `console.log/info` and `console.error/warn` output array. You can use `errorLogs` and `defaultLogs` to access them independently. More details on dynamic expect handling below.

### defaultLogs

Type `array`<br>
Default: `[]`

See `logs`.

### errorLogs

Type `array`<br>
Default: `[]`

See `logs`.

### nock

Type `array`<br>
Default: `[]`

Dynamic expect logic executed against the nock recording. More details on dynamic expect handling below.
Note that the nock recording must already exist for this check to evaluate correctly.

_Important:_ If you are running into issues with replaying a cassette file you recorded previously, try editing the cassette and stripping information that might change. Also make sure cassette files **never expose secret tokens or passwords**!

### flush

Type `array`<br>
Default: `[]`

List of node modules that are required to be flushed before test run. Useful if you need to re-initialize a module
that automatically picks up environment variables on initialization (e.g. aws-sdk).

The package itself is always flushed between test runs.

This can not be used for natively compiled modules.

## Dynamic Expect Logic

Uses [Chai Assertion Library](http://chaijs.com/api/bdd/) syntax written as json. Lets assume we have an output array `[1, 2]` we want to validate. We can write
```javascript
expect([1, 2]).to.contain(1);
expect([1, 2]).to.contain(2);
```
as the following json
```json
[{
  "to.contain()": 1
}, {
  "to": {
    "contain()": 2
  }
}]
```

Regular expression are supported if the target is a string matching a regular expression.

## Limitations

- Does currently not play nicely with native modules. This is because native modules [can not be invalidated](https://github.com/nodejs/node/issues/5016).

## Contribution / What's next

*Currently nothing planned*
