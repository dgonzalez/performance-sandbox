"use strict";

const asyncTimeout = (t) => new Promise((resolve) => setTimeout(resolve, t));

module.exports = async function (fastify, opts) {
  fastify.get("/:delay", async function (request) {
    const { delay } = request.params;

    await asyncTimeout(delay);

    return { delay };
  });

  fastify.get("/under-pressure", async () => fastify.memoryUsage());
};
