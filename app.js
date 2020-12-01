"use strict";

const path = require("path");
const AutoLoad = require("fastify-autoload");

module.exports = async function (fastify, opts) {
  await fastify.register(require("under-pressure"), {
    exposeStatusRoute: true,
  });

  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    options: Object.assign({}, opts),
  });
};
