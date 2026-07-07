import { Request, Response } from 'express';
import prisma from '../config/db';
import asyncHandler from '../utils/asyncHandler';
import AppError from '../utils/AppError';

export const createRentalRequest = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.id;
  const { propertyId, moveInDate, message } = req.body;

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new AppError('Property not found.', 404);
  if (property.status !== 'AVAILABLE') {
    throw new AppError('This property is not available for rent right now.', 400);
  }

  const existing = await prisma.rentalRequest.findFirst({
    where: { propertyId, tenantId, status: 'PENDING' },
  });
  if (existing) {
    throw new AppError('You already have a pending request for this property.', 409);
  }

  const rentalRequest = await prisma.rentalRequest.create({
    data: {
      propertyId,
      tenantId,
      moveInDate: new Date(moveInDate),
      message,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Rental request submitted successfully',
    errorDetails: null,
    data: rentalRequest,
  });
});

export const getMyRentalRequests = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.id;

  const requests = await prisma.rentalRequest.findMany({
    where: { tenantId },
    include: {
      property: { select: { id: true, title: true, city: true, price: true, images: true } },
      payment: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    message: 'Your rental requests fetched successfully',
    errorDetails: null,
    data: requests,
  });
});

export const getRentalRequestById = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.id;

  const request = await prisma.rentalRequest.findUnique({
    where: { id: req.params.id },
    include: { property: true, payment: true },
  });

  if (!request) throw new AppError('Rental request not found.', 404);
  if (request.tenantId !== tenantId && req.user!.role !== 'ADMIN') {
    throw new AppError('You do not have access to this rental request.', 403);
  }

  res.status(200).json({
    success: true,
    message: 'Rental request fetched successfully',
    errorDetails: null,
    data: request,
  });
});
