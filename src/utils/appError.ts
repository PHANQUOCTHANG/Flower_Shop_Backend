class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  details?: string[];

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    errorData: { details?: string[] } = {}
  ) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode.toString().startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.details = errorData.details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
