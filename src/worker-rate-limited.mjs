// /* eslint-disable no-await-in-loop */
import * as dotenv from 'dotenv';
import { Worker } from 'bullmq';
import { logger } from './logger.mjs';
import { sleep } from './sleep.mjs';

dotenv.config();

let rateLimitedQueueWorker;

// Defines an async processing function for jobs in the queue.
const processingFunc = async (job) => {
  const initialMessage = `Processing Job ID #${job.id}`;
  logger.info(initialMessage);
  await job.log(initialMessage);

  await sleep(1500);

  let response;
  try {
    response = await fetch(
      `http://${process.env.SERVICE_HOST}:${process.env.SERVICE_PORT}/rate-limited-queue/offboard`
    );
  } catch (err) {
    const errorMessage = `Fetch failed`;
    logger.info(errorMessage, err);
    await job.log(errorMessage);
    throw err;
  }

  if (response.ok) {
    const successMessage = `Completed Job ID #${job.id}`;
    logger.info(successMessage);
    await job.log(successMessage);

    const data = await response.json();
    return { ...data, offboardedAt: new Date().getTime() };
  }

  // Rate limit the queue for a specified number of milliseconds.
  // Throw an error to mark this specific job as failed and inactive (ready for pickup).
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    await rateLimitedQueueWorker.rateLimit(retryAfter * 1000);

    const rateLimitingMessage = `Rate-limited: Pausing queue for ${retryAfter} seconds.`;
    logger.info(rateLimitingMessage);
    await job.log(rateLimitingMessage);

    throw Worker.RateLimitError();
  }

  const errorMessage = `Unhandled error ${response.status}`;
  logger.info(errorMessage);
  await job.log(errorMessage);
  throw new Error(`Unhandled error ${response.status}`, {
    cause: response,
  });
};

// Instantiate a worker, connect it to redis and attach to the named queue.
rateLimitedQueueWorker = new Worker('rate-limited-queue', processingFunc, {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});
