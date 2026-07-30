import { Router } from 'express';
import express from 'express';
import {
  createPayment,
  confirmPayment,
  getMyPayments,
  getPaymentById,
  stripeWebhook,
} from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Protected routes
router.use(authenticate);

router.post('/create', authorize('TENANT'), createPayment);
router.post('/confirm', authorize('TENANT'), confirmPayment);
router.get('/', authorize('TENANT'), getMyPayments);
router.get('/:id', getPaymentById);

export default router;