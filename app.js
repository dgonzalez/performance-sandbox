"use strict";

<<<<<<< Updated upstream
const path = require("path");
const AutoLoad = require("fastify-autoload");
=======
const path = require('path')
const util = require('util')
const { ServiceUnavailable, TooManyRequests } = require('http-errors')
const fastq = require('fastq')
const { get } = require('http')

const expensiveOp = (t, cb) => setTimeout(cb, t)
const CONCURRENCY = +process.env.CONCURRENCY || 1
>>>>>>> Stashed changes

module.exports = async function (fastify, opts) {
  // TODO Hold into this for a moment:
  // await fastify.register(require("under-pressure"), {
  //   exposeStatusRoute: true,
  // });

  let requestCount = 0

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
    console.log(`setting queue gauge to ${getQueueRatio()}`)
    queueRatioGauge.set(queueRatio)
    return queueRatio < 4
  }

  function isReady() {
    return getQueueRatio() <= 2
  }

  fastify.get('/expensive-op', {
    async onRequest() {
      console.log('expensive endpoint called but circuit breaker is open')
      // 🔥 HOTSPOT: circuit breaker
      if (!shouldAllowRequest()) {
        throw new ServiceUnavailable()
      }
    },
    handler: async function () {
      console.log('expensive endpoint called')
      const now = Date.now()

      await pushToQueueAsync(2000)

      return { durationMs: Date.now() - now }
    },
  })

  fastify.get("/readiness", async () => {
    console.log("readiness called")
    if (requestCount > 5) {
      throw new Error("kaboom!")
    }
    return "OK"
  })

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    options: Object.assign({}, opts),
  });

  fastify.register(require("fastify-metrics"), {endpoint: "/metrics"})
};
