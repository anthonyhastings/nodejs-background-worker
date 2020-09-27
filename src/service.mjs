import express from 'express';
import expressWinston from 'express-winston';
import Queue from 'bull';
import bullBoard from 'bull-board';
import faker from 'faker';
import logger from './logger.mjs';

// Connect to an existing queue (if found), or, create a new queue in Redis.
const emailVerificationQueue = new Queue(
  'email-verification',
  process.env.REDIS_URL
);

// Inform bull-board which queues it's UI should provide information on.
bullBoard.setQueues([emailVerificationQueue]);

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

// Attaching bull-board middleware to a top-level route.
app.use('/queues', bullBoard.UI);

// Adding a POST endpoint to make a place a dummy job into the Bull queue.
// The job has exponential backoff should it fail, and can be retried twenty times.
app.post('/job', async (request, response) => {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const email = faker.internet.email(firstName, lastName);
  const job = await emailVerificationQueue.add(
    { firstName, lastName, email },
    {
      attempts: 20,
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
