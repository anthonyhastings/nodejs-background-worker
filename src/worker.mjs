/* eslint-disable no-await-in-loop */
import * as dotenv from 'dotenv';
import { Worker } from 'bullmq';
import { logger } from './logger.mjs';

dotenv.config();

// An artificial sleep method to simulate a wait.
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// Defines a processing function for jobs in the queue.
// The function is async so it returns a promise.
const processingFunc = async (job) => {
  logger.info(`Processing Job ID #${job.id}`, { data: job.data });
  await job.log('Beginning processing...');

  // Making jobs fail 50% of the time. Failure is denoted by throwing an error
  // which rejects the processing functions promise.
  if (Math.random() < 0.5) {
    logger.error(`Failed to process Job ID #${job.id}`);
    throw new Error(`Job ${job.id} failed!`);
  }

  // Simulating a long running job and updating the jobs progress value.
  // This can be seen on the bull-board UI in the 'active' jobs section.
  let progress = 0;
  while (progress < 100) {
    await sleep(80);
    progress += 1;
    await job.log('Making progress...');
    await job.updateProgress(progress);
  }

  // Success is denoted by resolving the processing functions promise. Data returned
  // while resolving is stored against the job and can be seen in redis or the
  // services GET `/jobs/:id` endpoint as `returnValue`.
  await job.log('Success!');
  logger.info(`Successfully processed Job ID #${job.id}`);
  return { emailSent: true, sentAt: new Date().getTime() };
};

// Instantiate the worker, connect to redis and attach to the queue name.
const emailVerificationWorker = new Worker(
  'email-verification',
  processingFunc,
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
  }
);

// Logging to the console every time a job is completed successfully.
emailVerificationWorker.on('completed', (job, returnValue) => {
  logger.info(`Job with id ${job.id} has been completed.`, returnValue);
});
