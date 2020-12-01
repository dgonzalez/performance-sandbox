# performance sandbox

this repo contains a performance playground for a fastify app

## setup

- `npm install`
- `npm start`

## routes

- `/:delay` returns a response after `delay` milliseconds
- `/under-pressure` returns the data from `fastify.memoryUsage()`

## autocannon

- `npm install -g autocannon`
- `autocannon http://localhost:3000/1000`

tune autocannon options like -c and -p to increase the load

while autocannon is running manually invoke the `/under-pressure` endpoint to see the data, especially `eventLoopDelay`
