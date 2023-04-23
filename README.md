# NodeJS Background Worker / Message Queue

## Introduction

![Demonstration](https://user-images.githubusercontent.com/167421/94376207-f49d8300-0110-11eb-9cdb-6ab7e261f918.gif)

This repository is a demonstration of using background processing / message queues using BullMQ, a Redis-based queue for NodeJS. In this example we create message queues in Redis, write jobs into these queues, and attach workers to process those jobs. There are three container types in play;

- A "redis" container that persists its data to disk (in `redis-data/`) to ensure jobs live between container teardowns and restarts.
- A "service" container which is an Express that has endpoints to create and place jobs into a message queue.
- A "worker" container that attaches to a message queue and processes messages.

## Instructions

These instructions assumes you already have `docker` and `docker compose` installed. The steps are as follows:

1. Run the service command which alsos spin up the redis container and creates the message queue within Redis (should it not already exist yet).

```shell
docker compose up service
```

2. Hit the `/rate-limited-queue/bulk-add` endpoint to queue up dummy jobs that are ready for processing.

```shell
curl -X POST http://localhost:8080/rate-limited-queue/bulk-add
```

3. Open the [bull-board dashboard](http://localhost:8080/queues) and see the "waiting" tab is populated with the jobs you spun up. They will remain here until we start the worker and they get processed.

4. Start the worker in another tab / terminal.

```shell
docker compose up rate-limited-queue-worker
```

5. Observe that jobs are picked up from "waiting", moved to "active", progressed over time then moved to "completed". You will also see appropriate logging in both the server and the workers output. Jobs demonstrate encountering rate limiting with an external API. This results in the worker telling the queue to pause job processing for an allotted amount of time.

## Further Information

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Background Jobs in Node.js with Redis](https://devcenter.heroku.com/articles/node-redis-workers)
- [Asynchronous task processing in Node.js with Bull](https://blog.logrocket.com/asynchronous-task-processing-in-node-js-with-bull/)
- [NestJS Queues via BullMQ](https://docs.nestjs.com/techniques/queues)
