import winston, { Logger } from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level}: ${stack || message}`;
});

const isProd = process.env.NODE_ENV === 'production';

// Luôn log ra Console
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: combine(colorize({ all: true }), logFormat),
  }),
];

// Chỉ ghi file ở development — Render có ephemeral filesystem nên không ghi được
if (!isProd) {
  transports.push(
    new winston.transports.File({
      filename: path.resolve('logs/app.log'),
    }),
    new winston.transports.File({
      level: 'error',
      filename: path.resolve('logs/error.log'),
    }),
  );
}

const logger: Logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports,
  exitOnError: false,
});

export default logger;
