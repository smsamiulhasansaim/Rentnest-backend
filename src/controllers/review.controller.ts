import { Request, Response } from 'express';
import prisma from '../config/db';
import asyncHandler from '../utils/asyncHandler';
import AppError from '../utils/AppError';

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.id;
  const { propertyId, rating, comment } = req.body;

  // Ensure tenant has a COMPLETED rental for this property
  const completedRental = await prisma.rentalRequest.findFirst({
    where: { propertyId, tenantId, status: 'COMPLETED' },
  });

  if (!completedRental) {
    throw new AppError(
      'You can only review a property after completing a rental there.',
      403
    );
  }

  const review = await prisma.review.create({
    data: { propertyId, tenantId, rating, comment },
  });

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully',
    errorDetails: null,
    data: review,
  });
});
