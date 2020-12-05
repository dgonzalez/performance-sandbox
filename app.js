'use strict'

const path = require('path')
const util = require('util')
const { ServiceUnavailable, TooManyRequests } = require('http-errors')
const fastq = require('fastq')

const expensiveOp = (t, cb) => setTimeout(cb, t)
const CONCURRENCY = +process.env.CONCURRENCY || 1

module.exports = async function (fastify, opts) {
  const expensiveOpQueue = fastq(expensiveOp, CONCURRENCY)

  const pushToQueueAsync = util.promisify(
    expensiveOpQueue.push.bind(expensiveOpQueue)
  )

  function shouldAllowRequest() {
    return expensiveOpQueue.length() < CONCURRENCY * 4
  }

  function isReady() {
    return expensiveOpQueue.length() <= CONCURRENCY * 2
  }

  fastify.get('/expensive-op', {
    async onRequest() {
      // 🔥 HOTSPOT: circuit breaker
      if (!shouldAllowRequest()) {
        throw new ServiceUnavailable()
      }
    },
    handler: async function () {
      const now = Date.now()

      await pushToQueueAsync(2000)

      return { durationMs: Date.now() - now }
    },
  })

  fastify.get('/liveness', async () => {
    // 🔥 HOTSPOT: liveness always returns ok unless
    // there are unrecoverable errors
    return 'OK'
  })

  fastify.get('/readiness', async () => {
    if (isReady()) {
      return 'OK'
    }

    throw new TooManyRequests('Unable to accept new requests')
  })

  fastify.register(require('fastify-metrics'), {
    endpoint: '/metrics',
  })
}
