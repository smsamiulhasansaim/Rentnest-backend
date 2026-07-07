import { Router } from 'express';
import {
  getAllUsers,
  updateUserStatus,
  getAllPropertiesAdmin,
  getAllRentalsAdmin,
  createCategory,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/users', getAllUsers);
router.patch('/users/:id', updateUserStatus);
router.get('/properties', getAllPropertiesAdmin);
router.get('/rentals', getAllRentalsAdmin);
router.post('/categories', createCategory);

export default router;
