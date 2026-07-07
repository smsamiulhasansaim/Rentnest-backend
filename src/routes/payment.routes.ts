import { Router } from 'express';
import {
  createPayment,
  confirmPayment,
  getMyPayments,
  getPaymentById,
} from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('TENANT'));

router.post('/create', createPayment);
router.post('/confirm', confirmPayment);
router.get('/', getMyPayments);
router.get('/:id', getPaymentById);

export default router;
