'use strict'

const path = require('path')
const util = require('util')
const { ServiceUnavailable, TooManyRequests } = require('http-errors')
const fastq = require('fastq')

const expensiveOp = (t, cb) => setTimeout(cb, t)
const CONCURRENCY = +process.env.CONCURRENCY || 1

module.exports = async function (fastify, opts) {
  await fastify.register(require('fastify-metrics'), {
    enableRouteMetrics: false,
    enableDefaultMetrics: false,
    endpoint: '/metrics',
  })

  const expensiveOpQueue = fastq(expensiveOp, CONCURRENCY)

  const queueRatioGauge = new fastify.metrics.client.Gauge({
    name: 'queue_ratio',
    help: 'ratio between queue length and queue concurrency',
    collect() {
      this.set(getQueueRatio())
    },
  })

  const pushToQueueAsync = util.promisify(
    expensiveOpQueue.push.bind(expensiveOpQueue)
  )

  function getQueueRatio() {
    return expensiveOpQueue.length() / CONCURRENCY
  }

  function shouldAllowRequest() {
    const queueRatio = getQueueRatio()
    queueRatioGauge.set(queueRatio)
    return queueRatio < 4
  }

  function isReady() {
    return getQueueRatio() <= 2
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
}
