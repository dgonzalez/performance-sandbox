"use strict";

const path = require("path");
const AutoLoad = require("fastify-autoload");

module.exports = async function (fastify, opts) {
  // TODO Hold into this for a moment:
  // await fastify.register(require("under-pressure"), {
  //   exposeStatusRoute: true,
  // });

  let requestCount = 0

  fastify.get("/liveness", async () => {
    console.log("liveness called")
    return "OK"
  })

  fastify.get("/requestCounter", async () => {
    console.log("request counter called")
    requestCount++
    setTimeout(() => {requestCount = 0}, 30000)
    return `requestCount = ${requestCount}`
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
