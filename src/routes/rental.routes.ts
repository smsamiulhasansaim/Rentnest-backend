import { Router } from 'express';
import {
  createRentalRequest,
  getMyRentalRequests,
  getRentalRequestById,
} from '../controllers/rental.controller';
import { authenticate, authorize } from '../middleware/auth';
import validate from '../middleware/validate';
import { createRentalRequestSchema } from '../validations/rental.validation';

const router = Router();

router.use(authenticate);

router.post('/', authorize('TENANT'), validate(createRentalRequestSchema), createRentalRequest);
router.get('/', authorize('TENANT'), getMyRentalRequests);
router.get('/:id', getRentalRequestById);

export default router;
