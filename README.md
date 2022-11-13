# NodeJS Background Worker

## Introduction

![Demonstration](https://user-images.githubusercontent.com/167421/94376207-f49d8300-0110-11eb-9cdb-6ab7e261f918.gif)

This repository is a demonstration of actioning background processing / jobs using Bull, a Redis-based queue for Node. In this example we create a job queue in Redis, write jobs into said queue, and attach a worker to process said jobs. There are three containers;

- A redis container that persists its data to disk (in `redis-data/`) to ensure jobs live between container teardowns and restarts.
- A service container using Express that hosts a dashboard and an endpoint to create and place jobs into a queue.
- A worker container that attaches a processor function to the queue.

## Instructions

These instructions assumes you already have `docker` and `docker-compose` installed. The steps are as follows:

1. Run the service which will also bring up the redis container and create the queue (should it not already exist yet).

```shell
docker-compose up service
```

2. Hit the jobs endpoint a multitude of times to queue up dummy jobs, ready for processing.

```shell
curl -X POST http://localhost:8080/job
```

3. Open [bull-board dashboard](http://localhost:8080/queues) and see the "waiting" tab is populated with the jobs you spun up. They will remain here until we start the worker and get processed.

4. Start the worker in another tab / terminal.

```shell
docker-compose up worker
```

5. Observe that jobs are picked up from "waiting", moved to "active", progressed over time then moved to "completed". You will also see appropriate logging in the workers output. Jobs have been given an artificial 50% chance to fail, so you can potentially see them be attempted multiple times, and moved to "delayed" as they are exponentially backed off and attempted up to a maximum number of times, before being moved to "failed".

## Further Information

- [Bull Guide](https://optimalbits.github.io/bull/)
- [Bull Reference](https://github.com/OptimalBits/bull/blob/master/REFERENCE.md)
- [Background Jobs in Node.js with Redis](https://devcenter.heroku.com/articles/node-redis-workers)
- [Asynchronous task processing in Node.js with Bull](https://blog.logrocket.com/asynchronous-task-processing-in-node-js-with-bull/)
