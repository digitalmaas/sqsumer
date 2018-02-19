Sqsumer - AWS SQS worker
========================

[![NPM version][version-badge]][npm-url]
[![digitalmaas][dmaas-badge]][dmaas-url]
[![NPM downloads][downloads-badge]][npm-url]
[![standardjs][standardjs-badge]][standardjs-url]

Library to process messages from an Amazon SQS queue with an AWS Lambda worker function or your favorite other JavaScript environment. Based of _Sebastian Müller_'s work on [lawos][lawos].

## Install

Sqsumer depends on [AWS SDK for JavaScript in Node.js][aws-sdk] and [bluebird][bluebird].

```bash
$ > npm install bluebird aws-sdk sqsumer --save
```

## API

### 🔷 constructor

#### Syntax
> `new Sqsumer(queueUrl, sqs[, `_`messagesPerIteration`_`])`

#### Parameters

1. **queueUrl**
    - Address of the target SQS queue
1. **sqs**
    - Instance of SQS client from AWS SDK
1. **messagesPerIteration**
    - Maximum number of messages received per iteration (`[1, 10]`, default `10`)

#### Return Value
An Sqsumer instance.

     

### 🔷 item

#### Syntax
> `instance.item(workerCallback)`

#### Parameters

1. **workerCallback**
    - Function that processes each received message.
        + **Parameters**
            1. _message_
                * A message from the target queue.
        + **Returns**
            * If it is a common function, it will be wrapped in a promise, where a return value will resolve it and a throw will rejected it. It can also return a promise, which will work as expected. If the promise is resolved, the message will be removed from the queue; otherwise, no action will be taken.

#### Return Value
A reference to of its instance, so calls can be chained.

     

### 🔷 work

#### Syntax
> `instance.work(stopConditionCallback)`

#### Parameters

1. **stopConditionCallback**
    - Function that is invoked in the end of each iteration.
        + **Parameters**
            1. _metrics_
                * Latest metrics from the current worker session.
        + **Returns**
            * If it is a common function, it will be wrapped in a promise, where a return value will resolve it and a throw will rejected it. It can also return a promise, which will work as expected. If the promise is resolved, the return value will be evaluated: if truthy, worker session ends; if falsy, worker session continues. If the promise is rejected, the worker session ends.

#### Return Value
A promise, which will be resolved with the worker session metrics.

## Example

Assuming you're using AWS Lambda:

```javascript
const SQS = require('aws-sdk/clients/sqs') // who needs it all?
const sqs = new SQS()

const Sqsumer = require('sqsumer')
const actualWork = require('./actualWork')

module.exports.handler = (event, context, done) => {
  new Sqsumer('https://sqs.eu-west-1.amazonaws.com …', sqs)
    .item(message => actualWork(message))
    .work(() => context.getRemainingTimeInMillis() < 1000)
    .then(metrics => {
      done(null, metrics)
    })
}
```

## License

MIT License.    
For the complete information, please refer to the [license](./LICENSE) file.


[dmaas-badge]: https://img.shields.io/badge/sponsored%20by-digitalmaas-green.svg?colorB=00CD98&style=flat-square
[dmaas-url]: https://digitalmaas.com/
[version-badge]: https://img.shields.io/npm/v/sqsumer.svg?style=flat-square
[downloads-badge]: https://img.shields.io/npm/dm/sqsumer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/sqsumer
[standardjs-badge]: https://img.shields.io/badge/code_style-standardjs-brightgreen.svg?style=flat-square
[standardjs-url]: https://standardjs.com/
[lawos]: https://github.com/sbstjn/lawos
[aws-sdk]: https://aws.amazon.com/sdk-for-node-js/
[bluebird]: http://bluebirdjs.com