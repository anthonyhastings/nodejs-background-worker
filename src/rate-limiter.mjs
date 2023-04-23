const MAX_REQUESTS = 5;
const TIME_FRAME_IN_MS = 30000;

const requestCounts = new Map();

export const RateLimitMiddleware = (req, res, next) => {
  const { ip } = req;
  const now = Date.now();

  const requestTimesWithinTimeFrame = (requestCounts.get(ip) ?? []).filter(
    (requestTime) => requestTime > now - TIME_FRAME_IN_MS
  );

  if (requestTimesWithinTimeFrame.length >= MAX_REQUESTS) {
    const resetTimeInSeconds = Math.ceil(
      (requestTimesWithinTimeFrame[0] + TIME_FRAME_IN_MS - now) / 1000
    );

    res.setHeader('Retry-After', resetTimeInSeconds);
    return res.status(429).json({ error: 'Too many requests' });
  }

  requestCounts.set(ip, [...requestTimesWithinTimeFrame, now]);
  return next();
};
