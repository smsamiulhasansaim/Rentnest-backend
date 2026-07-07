import { Request, Response } from 'express';
import prisma from '../config/db';
import asyncHandler from '../utils/asyncHandler';
import AppError from '../utils/AppError';

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    message: 'Users fetched successfully',
    errorDetails: null,
    data: users,
  });
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body; // ACTIVE or BANNED

  if (!['ACTIVE', 'BANNED'].includes(status)) {
    throw new AppError('Status must be ACTIVE or BANNED.', 422);
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status },
  });

  res.status(200).json({
    success: true,
    message: `User ${status === 'BANNED' ? 'banned' : 'unbanned'} successfully`,
    errorDetails: null,
    data: { id: user.id, status: user.status },
  });
});

export const getAllPropertiesAdmin = asyncHandler(async (req: Request, res: Response) => {
  const properties = await prisma.property.findMany({
    include: { landlord: { select: { id: true, name: true, email: true } }, category: true },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    message: 'All properties fetched successfully',
    errorDetails: null,
    data: properties,
  });
});

export const getAllRentalsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const rentals = await prisma.rentalRequest.findMany({
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, title: true, city: true } },
      payment: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    message: 'All rental requests fetched successfully',
    errorDetails: null,
    data: rentals,
  });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) {
    throw new AppError('Category name must be at least 2 characters.', 422);
  }

  const category = await prisma.category.create({ data: { name } });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    errorDetails: null,
    data: category,
  });
});
