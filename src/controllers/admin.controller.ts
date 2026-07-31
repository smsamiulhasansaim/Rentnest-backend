import { Request, Response } from 'express';
import prisma from '../config/db';
import asyncHandler from '../utils/asyncHandler';
import AppError from '../utils/AppError';

//  DASHBOARD STATS 
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const [totalUsers, totalProperties, totalRentals, totalRevenue, recentActivities] = await Promise.all([
    prisma.user.count(),
    prisma.property.count(),
    prisma.rentalRequest.count(),
    prisma.payment.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    }),
    prisma.rentalRequest.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        property: { select: { id: true, title: true, city: true, price: true } },
        payment: true,
      },
    }),
  ]);

  const [tenants, landlords] = await Promise.all([
    prisma.user.count({ where: { role: 'TENANT' } }),
    prisma.user.count({ where: { role: 'LANDLORD' } }),
  ]);

  const [available, booked] = await Promise.all([
    prisma.property.count({ where: { status: 'AVAILABLE' } }),
    prisma.property.count({ where: { status: 'BOOKED' } }),
  ]);

  const [pending, active, completed] = await Promise.all([
    prisma.rentalRequest.count({ where: { status: 'PENDING' } }),
    prisma.rentalRequest.count({ where: { status: 'ACTIVE' } }),
    prisma.rentalRequest.count({ where: { status: 'COMPLETED' } }),
  ]);

  res.status(200).json({
    success: true,
    message: 'Dashboard stats fetched successfully',
    errorDetails: null,
    data: {
      users: { total: totalUsers, tenants, landlords },
      properties: { total: totalProperties, available, booked },
      rentals: { total: totalRentals, pending, active, completed },
      revenue: totalRevenue._sum.amount || 0,
      recentActivities,
    },
  });
});

//  USERS 
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
  const { status } = req.body;

  if (!['ACTIVE', 'BANNED'].includes(status)) {
    throw new AppError('Status must be ACTIVE or BANNED.', 422);
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status },
    select: { id: true, status: true },
  });

  res.status(200).json({
    success: true,
    message: `User ${status === 'BANNED' ? 'banned' : 'unbanned'} successfully`,
    errorDetails: null,
    data: user,
  });
});

// PROPERTIES (Admin)
export const getAllPropertiesAdmin = asyncHandler(async (req: Request, res: Response) => {
  const properties = await prisma.property.findMany({
    include: {
      landlord: { select: { id: true, name: true, email: true } },
      category: true,
      _count: { select: { reviews: true, rentalRequests: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    message: 'All properties fetched successfully',
    errorDetails: null,
    data: properties,
  });
});

// RENTALS (Admin)
export const getAllRentalsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const rentals = await prisma.rentalRequest.findMany({
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, title: true, city: true, price: true } },
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

// CATEGORIES (CRUD)
export const getAllCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { properties: true } },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Categories fetched successfully',
    errorDetails: null,
    data: categories,
  });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || name.trim().length < 2) {
    throw new AppError('Category name must be at least 2 characters.', 422);
  }

  const existing = await prisma.category.findFirst({
    where: { name: { equals: name.trim(), mode: 'insensitive' } },
  });

  if (existing) {
    throw new AppError('Category already exists.', 409);
  }

  const category = await prisma.category.create({
    data: { name: name.trim() },
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    errorDetails: null,
    data: category,
  });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim().length < 2) {
    throw new AppError('Category name must be at least 2 characters.', 422);
  }

  const existing = await prisma.category.findFirst({
    where: {
      name: { equals: name.trim(), mode: 'insensitive' },
      NOT: { id },
    },
  });

  if (existing) {
    throw new AppError('Category name already exists.', 409);
  }

  const category = await prisma.category.update({
    where: { id },
    data: { name: name.trim() },
  });

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    errorDetails: null,
    data: category,
  });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: { select: { properties: true } },
    },
  });

  if (!category) {
    throw new AppError('Category not found.', 404);
  }

  if (category._count.properties > 0) {
    throw new AppError('Cannot delete category with associated properties.', 400);
  }

  await prisma.category.delete({ where: { id } });

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
    errorDetails: null,
    data: null,
  });
});

// DELETE PROPERTY (ADMIN FORCE)
export const deletePropertyAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      rentalRequests: true,
      reviews: true,
    },
  });

  if (!property) {
    throw new AppError('Property not found.', 404);
  }

  // Admin can delete ANY property regardless of status
  // Force delete - remove all related data

  await prisma.$transaction(async (tx) => {
    // Delete reviews
    if (property.reviews.length > 0) {
      await tx.review.deleteMany({
        where: { propertyId: id },
      });
    }

    // Get rental requests
    const rentalRequests = await tx.rentalRequest.findMany({
      where: { propertyId: id },
      select: { id: true },
    });

    if (rentalRequests.length > 0) {
      const rentalIds = rentalRequests.map(r => r.id);

      // Delete payments
      await tx.payment.deleteMany({
        where: { rentalRequestId: { in: rentalIds } },
      });

      // Delete rental requests
      await tx.rentalRequest.deleteMany({
        where: { propertyId: id },
      });
    }

    // Delete property
    await tx.property.delete({
      where: { id },
    });
  });

  res.status(200).json({
    success: true,
    message: 'Property deleted successfully by admin',
    errorDetails: null,
    data: null,
  });
});