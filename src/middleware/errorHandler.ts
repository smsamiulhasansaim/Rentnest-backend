import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import AppError from '../utils/AppError';

// 404 handler - place after all routes
export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errorDetails: null,
  });
};

// Central error handler - place last, after notFound
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Something went wrong';
  let errorDetails: unknown = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorDetails = err.errorDetails ?? null;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    if (err.code === 'P2002') {
      message = `Duplicate value for field: ${(err.meta?.target as string[])?.join(', ')}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Requested resource not found';
    } else {
      message = 'Database request error';
    }
    errorDetails = { code: err.code };
  } else if (err instanceof Error) {
    message = err.message;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorDetails,
  });
};
