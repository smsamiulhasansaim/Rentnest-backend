import { z } from 'zod';

export const createRentalRequestSchema = z.object({
  body: z.object({
    propertyId: z.string().min(1, 'propertyId is required'),
    moveInDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'moveInDate must be a valid date',
    }),
    message: z.string().optional(),
  }),
});

export const updateRentalStatusSchema = z.object({
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED'], {
      errorMap: () => ({ message: 'Status must be APPROVED or REJECTED' }),
    }),
  }),
  params: z.object({
    id: z.string().min(1, 'Rental request id is required'),
  }),
});