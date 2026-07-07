import { Request, Response } from 'express';
import prisma from '../config/db';
import asyncHandler from '../utils/asyncHandler';
import AppError from '../utils/AppError';

export const getAllProperties = asyncHandler(async (req: Request, res: Response) => {
  const { city, minPrice, maxPrice, categoryId, bedrooms, page = '1', limit = '10' } =
    req.query as Record<string, string>;

  const where: any = { status: 'AVAILABLE' };

  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (categoryId) where.categoryId = categoryId;
  if (bedrooms) where.bedrooms = Number(bedrooms);
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = Number(minPrice);
    if (maxPrice) where.price.lte = Number(maxPrice);
  }

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.max(Number(limit), 1);

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { category: true, landlord: { select: { id: true, name: true } } },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.property.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Properties fetched successfully',
    errorDetails: null,
    data: properties,
    meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
});

export const getPropertyById = asyncHandler(async (req: Request, res: Response) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      landlord: { select: { id: true, name: true, email: true, phone: true } },
      reviews: { include: { tenant: { select: { id: true, name: true } } } },
    },
  });

  if (!property) {
    throw new AppError('Property not found.', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Property fetched successfully',
    errorDetails: null,
    data: property,
  });
});

export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  res.status(200).json({
    success: true,
    message: 'Categories fetched successfully',
    errorDetails: null,
    data: categories,
  });
});
