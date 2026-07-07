import { z } from 'zod';

export const createPropertySchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    address: z.string().min(3),
    city: z.string().min(2),
    price: z.number().positive('Price must be greater than 0'),
    bedrooms: z.number().int().nonnegative().optional(),
    bathrooms: z.number().int().nonnegative().optional(),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    categoryId: z.string().uuid('Invalid category id'),
  }),
});

export const updatePropertySchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    address: z.string().min(3).optional(),
    city: z.string().min(2).optional(),
    price: z.number().positive().optional(),
    bedrooms: z.number().int().nonnegative().optional(),
    bathrooms: z.number().int().nonnegative().optional(),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    status: z.enum(['AVAILABLE', 'BOOKED', 'INACTIVE']).optional(),
    categoryId: z.string().uuid().optional(),
  }),
  params: z.object({
    id: z.string().min(1, 'Property id is required'),
  }),
});
