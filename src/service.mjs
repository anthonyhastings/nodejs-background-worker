import * as dotenv from 'dotenv';
import express from 'express';
import expressWinston from 'express-winston';
import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import { faker } from '@faker-js/faker';
import logger from './logger.mjs';

dotenv.config();

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

// Connect to an existing queue (if found), or, create a new queue in Redis.
const emailVerificationQueue = new Queue('email-verification', {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

// Create express application for bull-board that subscribes to specific queues
// then attach the application to a top-level route.
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/queues');
app.use('/queues', serverAdapter.getRouter());
createBullBoard({
  queues: [new BullMQAdapter(emailVerificationQueue)],
  serverAdapter,
});

// Adding a POST endpoint to make a place a dummy job into the Bull queue.
// The job has exponential backoff should it fail, and can be retried twenty times.
app.post('/job', async (_request, response) => {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const email = faker.internet.email(firstName, lastName);

  const job = await emailVerificationQueue.add(
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
app.get('/job/:id', async (request, response) => {
  const job = await emailVerificationQueue.getJob(request.params.id);

  if (job === null) {
    response.status(404).end();
  } else {
    response.json({ job });
  }
});

// Making the Express application listen for connections.
app.listen(5000, function onListening() {
  logger.info(`Listening on port ${this.address().port}.`);
});
