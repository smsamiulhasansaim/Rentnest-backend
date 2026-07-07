import { Router } from 'express';
import {
  createProperty,
  updateProperty,
  deleteProperty,
  getMyListingRequests,
  respondToRequest,
  completeRental,
} from '../controllers/landlord.controller';
import { authenticate, authorize } from '../middleware/auth';
import validate from '../middleware/validate';
import {
  createPropertySchema,
  updatePropertySchema,
} from '../validations/property.validation';
import { updateRentalStatusSchema } from '../validations/rental.validation';

const router = Router();

router.use(authenticate, authorize('LANDLORD'));

router.post('/properties', validate(createPropertySchema), createProperty);
router.put('/properties/:id', validate(updatePropertySchema), updateProperty);
router.delete('/properties/:id', deleteProperty);

router.get('/requests', getMyListingRequests);
router.patch('/requests/:id', validate(updateRentalStatusSchema), respondToRequest);
router.patch('/requests/:id/complete', completeRental);

export default router;
