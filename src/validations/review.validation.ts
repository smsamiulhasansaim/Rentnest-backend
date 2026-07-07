import { z } from 'zod';

export const createReviewSchema = z.object({
  body: z.object({
    propertyId: z.string().min(1, 'propertyId is required'),
    rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
    comment: z.string().min(3, 'Comment must be at least 3 characters'),
  }),
});
