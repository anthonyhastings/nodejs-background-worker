import winston from 'winston';

// Creating a Winston logger instance that can be used by both
// the service and the worker.
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
