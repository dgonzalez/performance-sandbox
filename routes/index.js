"use strict";

const util = require("util");
const { ServiceUnavailable } = require("http-errors");
const fastq = require("fastq");
const CircuitBreaker = require("opossum");

const asyncTimeout = (t = 1) =>
  new Promise((resolve) => setTimeout(resolve, t));

const syncTimeout = (t, cb) => setTimeout(cb, t);

module.exports = async function (fastify, opts) {
  const opossumOptions = {
    timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    resetTimeout: 30000, // After 30 seconds, try again.
  };

  const fastQWorkers = 10;

  const queue = fastq(syncTimeout, fastQWorkers);
  const pushAsync = util.promisify(queue.push.bind(queue));

  const delayHandler = async function (request) {
    const { delay } = request.params;

    await pushAsync(delay);

    return { delay };
  };

  const breaker = new CircuitBreaker(delayHandler, opossumOptions);

  breaker.on("failure", function (error, _, [, reply]) {
    reply.send(new ServiceUnavailable(error.message));
  });

  fastify.get("/:delay", breaker.fire.bind(breaker));

  fastify.get("/under-pressure", async () => fastify.memoryUsage());
  fastify.get("/fastq", async () => ({
    concurrency: queue.concurrency,
    idle: queue.idle(),
    length: queue.length(),
  }));
};
