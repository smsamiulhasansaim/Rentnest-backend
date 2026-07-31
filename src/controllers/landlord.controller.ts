import { Request, Response } from 'express';
import prisma from '../config/db';
import asyncHandler from '../utils/asyncHandler';
import AppError from '../utils/AppError';

// PROPERTY MANAGEMENT

export const getMyProperties = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;

  const properties = await prisma.property.findMany({
    where: { 
      landlordId,
      status: { in: ['AVAILABLE', 'BOOKED', 'INACTIVE'] }
    },
    include: {
      category: true,
      reviews: {
        include: { 
          tenant: { 
            select: { 
              id: true, 
              name: true,
              email: true 
            } 
          } 
        },
        orderBy: { createdAt: 'desc' }
      },
      rentalRequests: {
        where: { status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] } },
        select: {
          id: true,
          status: true,
          createdAt: true,
          tenant: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    message: 'Properties fetched successfully',
    errorDetails: null,
    data: properties,
  });
});

export const getPropertyById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const landlordId = req.user!.id;

  const property = await prisma.property.findFirst({
    where: { 
      id,
      landlordId 
    },
    include: {
      category: true,
      reviews: {
        include: { 
          tenant: { 
            select: { 
              id: true, 
              name: true,
              email: true 
            } 
          } 
        },
        orderBy: { createdAt: 'desc' }
      },
      rentalRequests: {
        include: {
          tenant: {
            select: { id: true, name: true, email: true, phone: true }
          },
          payment: {
            select: { id: true, amount: true, status: true, paidAt: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    },
  });

  if (!property) {
    throw new AppError('Property not found or you do not own it.', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Property fetched successfully',
    errorDetails: null,
    data: property,
  });
});

export const createProperty = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;
  const { 
    title, 
    description, 
    address, 
    city, 
    price, 
    bedrooms, 
    bathrooms, 
    amenities, 
    images, 
    categoryId 
  } = req.body;

  // Validate category
  const category = await prisma.category.findUnique({ 
    where: { id: categoryId } 
  });
  
  if (!category) {
    throw new AppError('Category not found. Please select a valid category.', 404);
  }

  // Parse amenities if string
  const parsedAmenities = typeof amenities === 'string' 
    ? JSON.parse(amenities) 
    : amenities || [];

  // Parse images if string
  const parsedImages = typeof images === 'string' 
    ? JSON.parse(images) 
    : images || [];

  // Validate price
  if (Number(price) <= 0) {
    throw new AppError('Price must be greater than 0.', 400);
  }

  // Create property
  const property = await prisma.property.create({
    data: {
      title: title.trim(),
      description: description?.trim() || '',
      address: address.trim(),
      city: city.trim(),
      price: Number(price),
      bedrooms: Number(bedrooms) || 0,
      bathrooms: Number(bathrooms) || 0,
      amenities: parsedAmenities,
      images: parsedImages,
      categoryId,
      landlordId,
      status: 'AVAILABLE'
    },
    include: {
      category: true,
      reviews: true
    }
  });

  res.status(201).json({
    success: true,
    message: 'Property listed successfully',
    errorDetails: null,
    data: property,
  });
});

export const updateProperty = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const landlordId = req.user!.id;
  const { 
    title, 
    description, 
    address, 
    city, 
    price, 
    bedrooms, 
    bathrooms, 
    amenities, 
    images, 
    categoryId,
    status 
  } = req.body;

  // Check ownership
  const existingProperty = await prisma.property.findFirst({
    where: { id, landlordId }
  });

  if (!existingProperty) {
    throw new AppError('Property not found or you do not own it.', 404);
  }

  // Validate category if provided
  if (categoryId) {
    const category = await prisma.category.findUnique({ 
      where: { id: categoryId } 
    });
    if (!category) {
      throw new AppError('Category not found.', 404);
    }
  }

  // Parse data
  const parsedAmenities = typeof amenities === 'string' 
    ? JSON.parse(amenities) 
    : amenities;

  const parsedImages = typeof images === 'string' 
    ? JSON.parse(images) 
    : images;

  // Update property
  const updatedProperty = await prisma.property.update({
    where: { id },
    data: {
      title: title?.trim(),
      description: description?.trim(),
      address: address?.trim(),
      city: city?.trim(),
      price: price ? Number(price) : undefined,
      bedrooms: bedrooms !== undefined ? Number(bedrooms) : undefined,
      bathrooms: bathrooms !== undefined ? Number(bathrooms) : undefined,
      amenities: parsedAmenities,
      images: parsedImages,
      categoryId,
      status: status as any,
    },
    include: {
      category: true,
      reviews: {
        include: { 
          tenant: { 
            select: { id: true, name: true } 
          } 
        }
      }
    }
  });

  res.status(200).json({
    success: true,
    message: 'Property updated successfully',
    errorDetails: null,
    data: updatedProperty,
  });
});

export const deleteProperty = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const landlordId = req.user!.id;

  // Check ownership and get related data
  const property = await prisma.property.findFirst({
    where: { id, landlordId },
    include: {
      rentalRequests: {
        where: { 
          status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] } 
        }
      },
      reviews: true
    }
  });

  if (!property) {
    throw new AppError('Property not found or you do not own it.', 404);
  }

  // Check for active rentals
  if (property.rentalRequests.length > 0) {
    throw new AppError(
      'Cannot delete property with active or pending rental requests. Please resolve all requests first.',
      400
    );
  }

  // Delete in transaction
  await prisma.$transaction(async (tx) => {
    // Delete reviews
    if (property.reviews.length > 0) {
      await tx.review.deleteMany({
        where: { propertyId: id }
      });
    }

    // Delete payments and rental requests
    const rentalRequests = await tx.rentalRequest.findMany({
      where: { propertyId: id },
      select: { id: true }
    });

    if (rentalRequests.length > 0) {
      const rentalIds = rentalRequests.map(r => r.id);
      
      // Delete payments
      await tx.payment.deleteMany({
        where: { rentalRequestId: { in: rentalIds } }
      });

      // Delete rental requests
      await tx.rentalRequest.deleteMany({
        where: { propertyId: id }
      });
    }

    // Delete property
    await tx.property.delete({
      where: { id }
    });
  });

  res.status(200).json({
    success: true,
    message: 'Property deleted successfully',
    errorDetails: null,
    data: null,
  });
});

// RENTAL REQUEST MANAGEMENT
export const getMyListingRequests = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;

  const requests = await prisma.rentalRequest.findMany({
    where: { 
      property: { landlordId } 
    },
    include: {
      tenant: { 
        select: { 
          id: true, 
          name: true, 
          email: true, 
          phone: true 
        } 
      },
      property: { 
        select: { 
          id: true, 
          title: true, 
          city: true, 
          price: true,
          images: true,
          status: true
        } 
      },
      payment: {
        select: {
          id: true,
          amount: true,
          status: true,
          paidAt: true,
          provider: true
        }
      }
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

export const getRentalRequestById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const landlordId = req.user!.id;

  const request = await prisma.rentalRequest.findFirst({
    where: { 
      id,
      property: { landlordId }
    },
    include: {
      tenant: { 
        select: { 
          id: true, 
          name: true, 
          email: true, 
          phone: true,
          avatar: true
        } 
      },
      property: { 
        select: { 
          id: true, 
          title: true, 
          city: true, 
          price: true,
          address: true,
          description: true,
          images: true,
          status: true,
          bedrooms: true,
          bathrooms: true,
          amenities: true
        } 
      },
      payment: {
        select: {
          id: true,
          transactionId: true,
          amount: true,
          status: true,
          provider: true,
          paidAt: true,
          createdAt: true
        }
      }
    }
  });

  if (!request) {
    throw new AppError('Rental request not found or you do not have access.', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Rental request fetched successfully',
    errorDetails: null,
    data: request,
  });
});

export const respondToRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const landlordId = req.user!.id;
  const { status } = req.body; // APPROVED or REJECTED

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    throw new AppError('Status must be APPROVED or REJECTED.', 400);
  }

  // Get request with property
  const request = await prisma.rentalRequest.findFirst({
    where: { 
      id,
      property: { landlordId }
    },
    include: { 
      property: true,
      tenant: true
    }
  });

  if (!request) {
    throw new AppError('Rental request not found or you do not have access.', 404);
  }

  if (request.status !== 'PENDING') {
    throw new AppError(`This request has already been ${request.status.toLowerCase()}.`, 400);
  }

  // Update request status
  const updated = await prisma.rentalRequest.update({
    where: { id },
    data: { status },
    include: {
      tenant: { 
        select: { id: true, name: true, email: true } 
      },
      property: { 
        select: { id: true, title: true, city: true, price: true } 
      }
    }
  });

  // Update property status if APPROVED
  if (status === 'APPROVED') {
    await prisma.property.update({
      where: { id: request.propertyId },
      data: { status: 'BOOKED' }
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
  const { id } = req.params;
  const landlordId = req.user!.id;

  // Get request with property
  const request = await prisma.rentalRequest.findFirst({
    where: { 
      id,
      property: { landlordId }
    },
    include: { 
      property: true,
      payment: true
    }
  });

  if (!request) {
    throw new AppError('Rental request not found or you do not have access.', 404);
  }

  if (request.status !== 'ACTIVE') {
    throw new AppError('Only active (paid) rentals can be marked as completed.', 400);
  }

  // Update rental status to COMPLETED
  const updated = await prisma.rentalRequest.update({
    where: { id },
    data: { status: 'COMPLETED' },
    include: {
      tenant: { 
        select: { id: true, name: true, email: true } 
      },
      property: { 
        select: { id: true, title: true, city: true, price: true } 
      },
      payment: true
    }
  });

  // Make property available again
  await prisma.property.update({
    where: { id: request.propertyId },
    data: { status: 'AVAILABLE' }
  });

  res.status(200).json({
    success: true,
    message: 'Rental completed successfully. Tenant can now leave a review.',
    errorDetails: null,
    data: updated,
  });
});

// DASHBOARD STATS
export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;

  // Get all properties
  const properties = await prisma.property.findMany({
    where: { landlordId },
    include: {
      rentalRequests: {
        include: {
          payment: true
        }
      },
      reviews: true
    }
  });

  const totalProperties = properties.length;
  const availableProperties = properties.filter(p => p.status === 'AVAILABLE').length;
  const bookedProperties = properties.filter(p => p.status === 'BOOKED').length;

  // Rental stats
  const allRentals = await prisma.rentalRequest.findMany({
    where: { property: { landlordId } },
    include: { payment: true }
  });

  const pendingRequests = allRentals.filter(r => r.status === 'PENDING').length;
  const activeRentals = allRentals.filter(r => r.status === 'ACTIVE').length;
  const completedRentals = allRentals.filter(r => r.status === 'COMPLETED').length;
  const rejectedRentals = allRentals.filter(r => r.status === 'REJECTED').length;

  // Calculate earnings
  const totalEarnings = allRentals
    .filter(r => r.status === 'COMPLETED' && r.payment?.status === 'COMPLETED')
    .reduce((sum, r) => sum + Number(r.property?.price || 0), 0);

  // Recent activity
  const recentRentals = await prisma.rentalRequest.findMany({
    where: { property: { landlordId } },
    include: {
      tenant: { select: { id: true, name: true, email: true } },
      property: { select: { id: true, title: true, city: true, price: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const stats = {
    properties: {
      total: totalProperties,
      available: availableProperties,
      booked: bookedProperties,
    },
    rentals: {
      pending: pendingRequests,
      active: activeRentals,
      completed: completedRentals,
      rejected: rejectedRentals,
      total: allRentals.length,
    },
    earnings: {
      total: totalEarnings,
    },
    recentActivity: recentRentals,
  };

  res.status(200).json({
    success: true,
    message: 'Dashboard stats fetched successfully',
    errorDetails: null,
    data: stats,
  });
});

// PROPERTY STATUS MANAGEMENT

export const updatePropertyStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const landlordId = req.user!.id;
  const { status } = req.body;

  if (!status || !['AVAILABLE', 'BOOKED', 'INACTIVE'].includes(status)) {
    throw new AppError('Status must be AVAILABLE, BOOKED, or INACTIVE.', 400);
  }

  // Check ownership
  const property = await prisma.property.findFirst({
    where: { id, landlordId }
  });

  if (!property) {
    throw new AppError('Property not found or you do not own it.', 404);
  }

  // Update status
  const updated = await prisma.property.update({
    where: { id },
    data: { status },
    include: {
      category: true,
      reviews: true
    }
  });

  res.status(200).json({
    success: true,
    message: `Property status updated to ${status}`,
    errorDetails: null,
    data: updated,
  });
});

// BULK OPERATIONS

export const bulkDeleteProperties = asyncHandler(async (req: Request, res: Response) => {
  const landlordId = req.user!.id;
  const { propertyIds } = req.body;

  if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
    throw new AppError('Please provide an array of property IDs.', 400);
  }

  // Check all properties belong to landlord
  const properties = await prisma.property.findMany({
    where: { 
      id: { in: propertyIds },
      landlordId 
    },
    include: {
      rentalRequests: {
        where: { 
          status: { in: ['PENDING', 'APPROVED', 'ACTIVE'] } 
        }
      }
    }
  });

  if (properties.length !== propertyIds.length) {
    throw new AppError('Some properties not found or you do not own them.', 404);
  }

  // Check for active rentals
  const propertiesWithActiveRentals = properties.filter(p => p.rentalRequests.length > 0);
  if (propertiesWithActiveRentals.length > 0) {
    throw new AppError(
      `Cannot delete ${propertiesWithActiveRentals.length} properties with active rentals.`,
      400
    );
  }

  const deletedIds = properties.map(p => p.id);

  // Delete in transaction
  await prisma.$transaction(async (tx) => {
    // Delete reviews
    await tx.review.deleteMany({
      where: { propertyId: { in: deletedIds } }
    });

    // Get all rental requests
    const rentalRequests = await tx.rentalRequest.findMany({
      where: { propertyId: { in: deletedIds } },
      select: { id: true }
    });

    if (rentalRequests.length > 0) {
      const rentalIds = rentalRequests.map(r => r.id);
      
      await tx.payment.deleteMany({
        where: { rentalRequestId: { in: rentalIds } }
      });

      await tx.rentalRequest.deleteMany({
        where: { propertyId: { in: deletedIds } }
      });
    }

    await tx.property.deleteMany({
      where: { id: { in: deletedIds } }
    });
  });

  res.status(200).json({
    success: true,
    message: `${deletedIds.length} properties deleted successfully`,
    errorDetails: null,
    data: { deletedCount: deletedIds.length },
  });
});