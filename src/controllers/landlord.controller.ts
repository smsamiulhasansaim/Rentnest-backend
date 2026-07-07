import { Request, Response } from 'express';
import prisma from '../config/db';
import asyncHandler from '../utils/asyncHandler';
import AppError from '../utils/AppError';

export const createProperty = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;
  const { title, description, address, city, price, bedrooms, bathrooms, amenities, images, categoryId } =
    req.body;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new AppError('Category not found.', 404);
  }

  const property = await prisma.property.create({
    data: {
      title,
      description,
      address,
      city,
      price,
      bedrooms: bedrooms ?? 0,
      bathrooms: bathrooms ?? 0,
      amenities: amenities ?? [],
      images: images ?? [],
      categoryId,
      landlordId,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Property listing created successfully',
    errorDetails: null,
    data: property,
  });
});

const ensureOwnership = async (propertyId: string, landlordId: string) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new AppError('Property not found.', 404);
  if (property.landlordId !== landlordId) {
    throw new AppError('You do not own this property.', 403);
  }
  return property;
};

export const updateProperty = asyncHandler(async (req: Request, res: Response) => {
  await ensureOwnership(req.params.id, req.user!.id);

  const property = await prisma.property.update({
    where: { id: req.params.id },
    data: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Property updated successfully',
    errorDetails: null,
    data: property,
  });
});

export const deleteProperty = asyncHandler(async (req: Request, res: Response) => {
  await ensureOwnership(req.params.id, req.user!.id);

  await prisma.property.delete({ where: { id: req.params.id } });

  res.status(200).json({
    success: true,
    message: 'Property removed successfully',
    errorDetails: null,
    data: null,
  });
});

export const getMyListingRequests = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;

  const requests = await prisma.rentalRequest.findMany({
    where: { property: { landlordId } },
    include: {
      tenant: { select: { id: true, name: true, email: true, phone: true } },
      property: { select: { id: true, title: true, city: true, price: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    message: 'Rental requests fetched successfully',
    errorDetails: null,
    data: requests,
  });
});

export const respondToRequest = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;
  const { status } = req.body; // APPROVED or REJECTED

  const request = await prisma.rentalRequest.findUnique({
    where: { id: req.params.id },
    include: { property: true },
  });

  if (!request) throw new AppError('Rental request not found.', 404);
  if (request.property.landlordId !== landlordId) {
    throw new AppError('You do not have access to this rental request.', 403);
  }
  if (request.status !== 'PENDING') {
    throw new AppError('This request has already been processed.', 400);
  }

  const updated = await prisma.rentalRequest.update({
    where: { id: req.params.id },
    data: { status },
  });

  if (status === 'APPROVED') {
    await prisma.property.update({
      where: { id: request.propertyId },
      data: { status: 'BOOKED' },
    });
  }

  res.status(200).json({
    success: true,
    message: `Rental request ${status.toLowerCase()} successfully`,
    errorDetails: null,
    data: updated,
  });
});

export const completeRental = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;

  const request = await prisma.rentalRequest.findUnique({
    where: { id: req.params.id },
    include: { property: true },
  });

  if (!request) throw new AppError('Rental request not found.', 404);
  if (request.property.landlordId !== landlordId) {
    throw new AppError('You do not have access to this rental request.', 403);
  }
  if (request.status !== 'ACTIVE') {
    throw new AppError('Only an active (paid) rental can be marked as completed.', 400);
  }

  const updated = await prisma.rentalRequest.update({
    where: { id: req.params.id },
    data: { status: 'COMPLETED' },
  });

  await prisma.property.update({
    where: { id: request.propertyId },
    data: { status: 'AVAILABLE' },
  });

  res.status(200).json({
    success: true,
    message: 'Rental marked as completed. Tenant can now leave a review.',
    errorDetails: null,
    data: updated,
  });
});