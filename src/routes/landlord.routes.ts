import { Router } from 'express';
import {
  getMyProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getMyListingRequests,
  getRentalRequestById,
  respondToRequest,
  completeRental,
  getDashboardStats,
  updatePropertyStatus,
  bulkDeleteProperties,
} from '../controllers/landlord.controller';
import { authenticate, authorize } from '../middleware/auth';
import validate from '../middleware/validate';
import {
  createPropertySchema,
  updatePropertySchema,
} from '../validations/property.validation';
import { updateRentalStatusSchema } from '../validations/rental.validation';

const router = Router();

// All routes require authentication and LANDLORD role
router.use(authenticate, authorize('LANDLORD'));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Property Management
router.get('/properties', getMyProperties);
router.get('/properties/:id', getPropertyById);
router.post('/properties', validate(createPropertySchema), createProperty);
router.put('/properties/:id', validate(updatePropertySchema), updateProperty);
router.delete('/properties/:id', deleteProperty);
router.patch('/properties/:id/status', updatePropertyStatus);
router.post('/properties/bulk-delete', bulkDeleteProperties);

// Rental Request Management
router.get('/requests', getMyListingRequests);
router.get('/requests/:id', getRentalRequestById);
router.patch('/requests/:id', validate(updateRentalStatusSchema), respondToRequest);
router.patch('/requests/:id/complete', completeRental);

export default router;