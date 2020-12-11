# performance-sandbox

This repo contains a performance sandbox showing how to implement a backpressure and circuit breaker mechanism in a Fastify app deployed to Kubernetes via Helm charts with Prometheus integration.

## How it works

- it allows simulating the execution of an expensive operation (e.g. a database query) towards a constrainted resource
- it uses a queue with a configurable size to enqueue such operations, limiting the concurrency which with the operations are performed
- it exposes a readiness endpoint which responds with a `429 Too Many Requests` error if the number of tasks in the queue exceeds **2 times** the size of the queue
- it uses a circuit breaker which responds with `503 Service Unavailable` **to requests to the expensive operation endpoint** when the number of tasks in the queue exceeds **4 times the size of the queue**

## Routes

The application exposes the following `GET` routes:

- `/expensive-op` - enqueues a task simulating an expensive operation taking 2 seconds to execute. When the number of operations in the queue exceeds **4 times** the size of the queue, it responds with `503 Service Unavailable` to avoid overloading the constrained resource with an amount of requests it cannot handle
- `/readiness` - a readiness endpoint to be used by K8s. It responds with a `429 Too Many Requests` error if the number of tasks in the queue exceeds **2 times** the size of the queue
- `/liveness` - a liveness endpoint to be used by K8s. It always responds successfully. In a real world scenario, this endpoint would return an error when it detects an **unrecoverable** error condition, e.g. inability to connect toa required resource like a database
- `/metrics` - provided by [`fastify-metrics`](https://www.npmjs.com/package/fastify-metrics), it exports Prometheus metrics

## Getting started

- Install Node.js
- Install load testing tool autocannon: `npm install -g autocannon`
- **Concurrency defauts to 1** (1 expensive operation can be performed at any single time) and can be configured via the `CONCURRENCY` environment variable. In a real world scenario it should be configured to the known concurrency of the constrained resource

## Testing with autocannon

For the purpose of the examples that follow, the only autocannon parameter we'll change is the `-c` (`--connections`) option. 

We also increase the timeout option to 60 seconds to pretend that clients don't timeout: `-t 60`.

This determines how many concurrent requests are being done to the expensive operation endpoint, which is what we need to show the backpressure and circuit breaking mechanism.

While autocannon runs (you can increase the duration of the run using the `-d` option, defaults to 10 seconds) you can:

- hit the `/readiness` endpoint to check if the application is trying to communicate that it should stop receiving requests (backpressure)
- hit the `/expensive-op` endpoint to check if the application is not accepting anymore requests (circuit breaker)

## Running locally

### Setup

- `npm install`
- `npm start`
- `autocannon http://localhost:3000/expensive-op -t 60 -c {value}` 

### Testing

| Concurrency | `GET /readiness`  |  `GET /expensive-op` (autocannon) | `GET /expensive-op` (manual) |
|--- | --- | --- | --- |
| `-c 3` | responds OK because we allow at most (2 * concurrency) tasks (inclusive) in the queue. 1 task is executing (concurrency 1) and 2 are in the queue | responds OK because we're never hitting the circuit breaker limit  | responds OK because we're never hitting the circuit breaker limit  |
| `-c 4` | responds with an error because we're triggering the backpressure mechanism, since we are running 4 concurrent requests, of which 1 is executing and 3 in the queue, which exceeds the (concurrency * 2) limit | (as above)  | (as above) |
| `-c 5` | (as above) | responds always ok because 1 task is executing and 4 are queued, which is equal to the inclusive limit of (concurrency * 4) after which the circuit opens | responds with an error because we're adding 1 too many tasks on the queue |
| `-c 6` | (as above) | responds mostly with errors apart from the items which can make it to the queue without overflowing the circuit breaker limit of (concurrency * 4)  | responds with an error because we're already beyond the circuit breaker limit |


## Running in Kubernetes

### Prerequisites

- Docker
- Kubernetes (Docker Desktop's K8s works fine too)
- Follow Helm and Prometheus [setup instructions](./helm/performance-sandbox/README.md)

### Setup

- `docker build -t performance-sandbox .` - to create and tag the Docker image
- `helm install performance-sandbox helm/performance-sandbox` - to install the Helm chart
- `kubectl get service performance-sandbox` - to see the port on which the `performance-sandbox` service is running

If you change anything in the application, you'll have to recreate the image and upgrade your installation with:

- `helm upgrade performance-sandbox helm/performance-sandbox`

#### Note

If you are running a version of K8s that doesn't share the Docker registry you may have to save and then import the Docker image into K8s.

For instance in `microk8s`:

- `docker save performance-sandbox > performance-sandbox.tar`
- `microk8s ctr image import performance-sandbox.tar`

### Testing

- `kubectl get deployment performance-sandbox-deployment -w` - in a new terminal to see ready the status of pods
- `autocannon http://localhost:{PORT}/expensive-op -c {value}` - hit the service with autocannon and increase the `-c` value to see that pods readiness changes due to the readiness probe returning an error when the load becomes too high

### Troubleshooting in K8s
You should be able to see the metrics posted from Prometheus into the custom metrics API by executing the following command:
```
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/default/pods/*/queue_ratio" | jq .
```

If they are not present a couple of minutes after the helm chart being deployed, it is possible that the adapter is having some problems. In order to troubleshoot
execute (change the pod name):
```
kubectl logs performance-sandbox-prometheus-adapter-6cbf7799b6-dd82l
```
