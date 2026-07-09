import pino from 'pino';

// pino-pretty (dev dependency only) gives human-readable console output in
// development; production gets raw newline-delimited JSON, which is what a
// real log aggregator (Datadog, CloudWatch, etc.) would actually want.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'production'
      ? undefined
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
});
