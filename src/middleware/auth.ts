import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError';
import { verifyToken, JwtPayload } from '../utils/jwt';
import prisma from '../config/db';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('You are not logged in. Please log in to continue.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    if (user.status === 'BANNED') {
      throw new AppError('Your account has been banned. Contact support.', 403);
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(new AppError('Invalid or expired token.', 401));
  }
};

export const authorize = (...roles: Array<'TENANT' | 'LANDLORD' | 'ADMIN'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
};
