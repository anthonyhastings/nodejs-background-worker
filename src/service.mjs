import * as dotenv from 'dotenv';
import express from 'express';
import expressWinston from 'express-winston';
import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import { faker } from '@faker-js/faker';
import { logger } from './logger.mjs';
import { RateLimitMiddleware } from './rate-limiter.mjs';

dotenv.config();

// Connect to an existing queue (if found), or, create a new queue in Redis.
const standardQueue = new Queue('standard-queue', {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// Connect to an existing queue (if found), or, create a new queue in Redis.
const rateLimitedQueue = new Queue('rate-limited-queue', {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// Creating an Express application.
const app = express();

// Adding logger middleware (Winston) and ignoring routes related to bull-board.
app.use(
  expressWinston.logger({
    expressFormat: true,
    ignoreRoute: (request) => request.path.startsWith('/queues'),
    meta: false,
    winstonInstance: logger,
  })
);

// Create express application for bull-board that subscribes to specific queues
// then attach the application to a top-level route.
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/queues');
app.use('/queues', serverAdapter.getRouter());
createBullBoard({
  queues: [
    new BullMQAdapter(standardQueue),
    new BullMQAdapter(rateLimitedQueue),
  ],
  serverAdapter,
});

// Adding a POST endpoint to make a place a dummy job into the Bull queue.
// The job has exponential backoff should it fail, and can be retried twenty times.
app.post('/standard-queue/job', async (_request, response) => {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const email = faker.internet.email(firstName, lastName);

  const job = await standardQueue.add(
    'example job name',
    { firstName, lastName, email },
    {
      attempts: 10,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    }
  );

  response.status(200).json({ job });
});

// Adding a GET endpoint to look up information on a particular job by ID.
app.get('/standard-queue/job/:id', async (request, response) => {
  const job = await standardQueue.getJob(request.params.id);

  if (job === null) {
    response.status(404).end();
  } else {
    response.json({ job });
  }
});

// Adding a POST endpoint to make a place a dummy job into the Bull queue.
// The job has exponential backoff should it fail, and can be retried twenty times.
app.post('/rate-limited-queue/bulk-add', async (_request, response) => {
  const jobData = Array(20)
    .fill()
    .map(() => {
      const firstName = faker.name.firstName();
      const lastName = faker.name.lastName();
      const email = faker.internet.email(firstName, lastName);

      return {
        name: 'example job name',
        data: { firstName, lastName, email },
        opts: {
          attempts: 10,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      };
    });

  const jobs = await rateLimitedQueue.addBulk(jobData);

  response.status(200).json({ jobs });
});

// Adding a GET endpoint to look up information on a particular job by ID.
app.get('/rate-limited-queue/job/:id', async (request, response) => {
  const job = await rateLimitedQueue.getJob(request.params.id);

  if (job === null) {
    response.status(404).end();
  } else {
    response.json({ job });
  }
});

// Adding rate limited for subsequent routes.
app.use(RateLimitMiddleware);

// An example endpoint that is rate limited.
app.get('/rate-limited-queue/offboard', async (_request, response) => {
  response.json({ success: true });
});

// Making the Express application listen for connections.
app.listen(5000, function onListening() {
  logger.info(`Listening on port ${this.address().port}.`);
});
