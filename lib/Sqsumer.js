'use strict'

const Promise = require('bluebird')

module.exports = class Sqsumer {
  //
  constructor (queueUrl, sqs, messagesPerIteration) {
    if (!(queueUrl)) {
      throw new Error('Missing URL for SQS Queue')
    }
    if (!(sqs)) {
      throw new Error('Missing SQS client instance')
    }
    if (messagesPerIteration >= 1 && messagesPerIteration <= 10) {
      this.maxMessages = messagesPerIteration
    } else {
      this.maxMessages = 10
    }
    this.queueUrl = queueUrl
    this.sqs = sqs
    this.handler = () => Promise.resolve()
    this.metrics = {
      iterations: 0,
      processed: 0,
      succeeded: 0,
      failed: 0
    }
  }

  _delete (id) {
    const params = {
      QueueUrl: this.queueUrl,
      ReceiptHandle: id
    }
    return this.sqs.deleteMessage(params).promise()
  }

  _handleItem (item) {
    return Promise.try(() => this.handler(item)).return(item)
  }

  _load () {
    const params = {
      MaxNumberOfMessages: this.maxMessages,
      MessageAttributeNames: ['All'],
      QueueUrl: this.queueUrl
    }
    return this.sqs.receiveMessage(params).promise().then(res => {
      this.metrics.iterations += 1
      return (res && res.Messages && res.Messages.length)
        ? res.Messages
        : this._quit()
    })
  }

  _process (list) {
    return Promise.all(list.map(item => {
      this.metrics.processed += 1
      return this._handleItem(item).reflect()
    }))
    .each(inspection => {
      if (inspection.isFulfilled()) {
        this.metrics.succeeded += 1
        return this._delete(inspection.value().ReceiptHandle).catch(() => null)
      }
      this.metrics.failed += 1
    })
  }

  _quit () {
    return Promise.reject(new Error())
  }

  _work (conditionWrapper) {
    return conditionWrapper()
      .then(stop => (stop)
        ? this._quit()
        : this._load()
          .then(list => this._process(list))
          .then(() => this._work(conditionWrapper)))
  }

  work (condition) {
    const wrapper = Promise.method(() => condition(this.metrics))
    return this._work(wrapper).then(() => this.metrics, () => this.metrics)
  }

  item (func) {
    this.handler = Promise.method(func)
    return this
  }
}
