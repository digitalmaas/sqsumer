'use strict'

const Promise = require('bluebird')
const SqsConsumer = require('./Sqsumer')

function getSqsMock () {
  const sqs = {}
  sqs.deleteMessage = jest.fn().mockImplementation(() => ({ promise: sqs.deletePromise }))
  sqs.deletePromise = jest.fn().mockImplementation(() => Promise.resolve())
  sqs.receiveMessage = jest.fn().mockImplementation(() => ({ promise: sqs.receivePromise }))
  sqs.receivePromise = jest.fn().mockImplementation(() => Promise.resolve())
  sqs.getDeleteLastArg = () => {
    const calls = sqs.deleteMessage.mock.calls
    return calls[calls.length - 1][0]
  }
  sqs.getReceiveLastArg = () => {
    const calls = sqs.receiveMessage.mock.calls
    return calls[calls.length - 1][0]
  }
  return sqs
}

/// /////////////////////////

describe('Sqsumer', () => {

  it('should initialise with queue URL and SQS client', () => {
    const url = 'address'
    const sqs = {}
    const Q = new SqsConsumer(url, sqs)
    expect(Q.queueUrl).toEqual(url)
    expect(Q.sqs).toBe(sqs)
  })

  it('should fail to initialise without queue URL', () => {
    expect(() => new SqsConsumer()).toThrow(/url/i)
  })

  it('should fail to initialise without SQS client', () => {
    expect(() => new SqsConsumer('http://example.com')).toThrow(/client/i)
  })

  it('should have default empty handler', () => {
    expect.assertions(1)
    const Q = new SqsConsumer('http://example.com', {})
    return Q.handler().then(data => expect(data).toBeUndefined())
  })

  it('should set messages per iteration', () => {
    expect(new SqsConsumer('http://example.com', {}, 0).maxMessages).toEqual(10)
    expect(new SqsConsumer('http://example.com', {}, 11).maxMessages).toEqual(10)
    expect(new SqsConsumer('http://example.com', {}, 5).maxMessages).toEqual(5)
  })

  it('should correctly update item handler', () => {
    expect.assertions(1)
    const Q = new SqsConsumer('http://example.com', {})
    Q.item(item => new Promise(resolve => { resolve('test') }))
    return Q.handler().then(data => {
      expect(data).toBe('test')
    })
  })

  it('should successfully handle multiple messages', () => {
    expect.assertions(8)
    const address = 'sqs-address'
    const sqs = getSqsMock()
    sqs.receivePromise.mockImplementationOnce(() => Promise.resolve({ Messages: [
      { ReceiptHandle: 'succeed-01' },
      { ReceiptHandle: 'succeed-02' },
      { ReceiptHandle: 'fail-03' },
      { ReceiptHandle: 'succeed-04' },
      { ReceiptHandle: 'fail-05' },
      { ReceiptHandle: 'succeed-06' }
    ] }))
    return new SqsConsumer(address, sqs)
      .item(message => Promise[message.ReceiptHandle.includes('succeed') ? 'resolve' : 'reject']())
      .work(() => false)
      .then(stats => {
        expect(stats).toBeDefined()
        expect(stats.iterations).toEqual(2)
        expect(stats.processed).toEqual(6)
        expect(stats.succeeded).toEqual(4)
        expect(stats.failed).toEqual(2)
        expect(sqs.receiveMessage).toHaveBeenCalledTimes(2)
        expect(sqs.getReceiveLastArg().QueueUrl).toEqual(address)
        expect(sqs.deleteMessage).toHaveBeenCalledTimes(4)
      })
  })

  it('should successfully handle multiple messages in multiple iterations', () => {
    expect.assertions(9)
    const address = 'sqs-address'
    const sqs = getSqsMock()
    sqs.receivePromise.mockImplementationOnce(() => Promise.resolve({ Messages: [
      { ReceiptHandle: 'succeed-01' },
      { ReceiptHandle: 'succeed-02' },
      { ReceiptHandle: 'fail-03' },
      { ReceiptHandle: 'succeed-04' }
    ] }))
    sqs.receivePromise.mockImplementationOnce(() => Promise.resolve({ Messages: [
      { ReceiptHandle: 'succeed-05' },
      { ReceiptHandle: 'fail-06' }
    ] }))
    return new SqsConsumer(address, sqs)
      .item(message => Promise[message.ReceiptHandle.includes('succeed') ? 'resolve' : 'reject']())
      .work(() => false)
      .then(stats => {
        expect(stats).toBeDefined()
        expect(stats.iterations).toEqual(3)
        expect(stats.processed).toEqual(6)
        expect(stats.succeeded).toEqual(4)
        expect(stats.failed).toEqual(2)
        expect(sqs.receiveMessage).toHaveBeenCalledTimes(3)
        expect(sqs.getReceiveLastArg().QueueUrl).toEqual(address)
        expect(sqs.deleteMessage).toHaveBeenCalledTimes(4)
        expect(sqs.getDeleteLastArg().ReceiptHandle).toEqual('succeed-05')
      })
  })

  it('should successfully handle messages without promises', () => {
    expect.assertions(9)
    const address = 'sqs-address'
    const sqs = getSqsMock()
    sqs.receivePromise.mockImplementationOnce(() => Promise.resolve({ Messages: [
      { ReceiptHandle: 'succeed-01' },
      { ReceiptHandle: 'succeed-02' },
      { ReceiptHandle: 'fail-03' },
      { ReceiptHandle: 'succeed-04' }
    ] }))
    sqs.receivePromise.mockImplementationOnce(() => Promise.resolve({ Messages: [
      { ReceiptHandle: 'succeed-05' },
      { ReceiptHandle: 'fail-06' }
    ] }))
    return new SqsConsumer(address, sqs)
      .item(message => { if (message.ReceiptHandle.includes('fail')) throw new Error() })
      .work(() => false)
      .then(stats => {
        expect(stats).toBeDefined()
        expect(stats.iterations).toEqual(3)
        expect(stats.processed).toEqual(6)
        expect(stats.succeeded).toEqual(4)
        expect(stats.failed).toEqual(2)
        expect(sqs.receiveMessage).toHaveBeenCalledTimes(3)
        expect(sqs.getReceiveLastArg().QueueUrl).toEqual(address)
        expect(sqs.deleteMessage).toHaveBeenCalledTimes(4)
        expect(sqs.getDeleteLastArg().ReceiptHandle).toEqual('succeed-05')
      })
  })

  it('should stop when conditions says so', () => {
    expect.assertions(12)
    const sqs = getSqsMock()
    let workStats = null
    return new SqsConsumer('sqs-address', sqs)
      .work(stats => {
        workStats = stats
        return true
      })
      .then(stats => {
        expect(workStats).not.toBeNull()
        expect(workStats.iterations).toEqual(0)
        expect(workStats.processed).toEqual(0)
        expect(workStats.succeeded).toEqual(0)
        expect(workStats.failed).toEqual(0)
        expect(stats).toBeDefined()
        expect(stats.iterations).toEqual(0)
        expect(stats.processed).toEqual(0)
        expect(stats.succeeded).toEqual(0)
        expect(stats.failed).toEqual(0)
        expect(sqs.receiveMessage).not.toHaveBeenCalled()
        expect(sqs.deleteMessage).not.toHaveBeenCalled()
      })
  })

  it('should stop when conditions says so, after successful iteration', () => {
    expect.assertions(6)
    const sqs = getSqsMock()
    let iterationFlag = false
    sqs.receivePromise.mockImplementationOnce(() => {
      iterationFlag = true
      return Promise.resolve({ Messages: [
        { ReceiptHandle: 'succeed-01' },
        { ReceiptHandle: 'succeed-02' }
      ] })
    })
    return new SqsConsumer('sqs-address', sqs)
      .work(() => Promise.resolve(iterationFlag))
      .then(stats => {
        expect(stats.iterations).toEqual(1)
        expect(stats.processed).toEqual(2)
        expect(stats.succeeded).toEqual(2)
        expect(stats.failed).toEqual(0)
        expect(sqs.receiveMessage).toHaveBeenCalledTimes(1)
        expect(sqs.deleteMessage).toHaveBeenCalledTimes(2)
      })
  })

})
