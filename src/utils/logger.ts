import winston, { Logger } from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level}: ${stack || message}`;
});

const isProd = process.env.NODE_ENV === 'production';

const logger: Logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Tự log stack nếu là Error
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize({ all: true }), logFormat),
    }),

    // Log toàn bộ
    new winston.transports.File({
      filename: path.resolve('logs/app.log'),
    }),

    // Chỉ log error
    new winston.transports.File({
      level: 'error',
      filename: path.resolve('logs/error.log'),
    }),
  ],
  exitOnError: false,
});

export default logger;
