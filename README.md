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

## Example

Assuming you're using AWS Lambda:

```js
const SQS = require('aws-sdk/clients/sqs') // who needs it all?
const sqs = new SQS()

const Sqsumer = require('sqsumer')
const actualWork = require('./actualWork')

module.exports.handler = (event, context, done) => {
  new Sqsumer('https://sqs.eu-west-1.amazonaws.com …', sqs)
    .item(message => actualWork(message))
    .work(() => context.getRemainingTimeInMillis() < 500)
    .then(stats => {
      done(null, stats)
    })
}
```


[dmaas-badge]: https://img.shields.io/badge/sponsored%20by-digitalmaas-green.svg?colorB=00CD98&style=flat-square
[dmaas-url]: https://digitalmaas.com/
[version-badge]: https://img.shields.io/npm/v/sqsumer.svg?style=flat-square
[downloads-badge]: https://img.shields.io/npm/dm/sqsumer.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/serverless-plugin-browserifier
[standardjs-badge]: https://img.shields.io/badge/code_style-standardjs-brightgreen.svg?style=flat-square
[standardjs-url]: https://standardjs.com/
[lawos]: https://github.com/sbstjn/lawos
[aws-sdk]: https://aws.amazon.com/sdk-for-node-js/
[bluebird]: http://bluebirdjs.com