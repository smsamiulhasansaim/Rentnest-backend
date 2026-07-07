class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errorDetails?: unknown;

  constructor(message: string, statusCode: number, errorDetails?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorDetails = errorDetails;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
