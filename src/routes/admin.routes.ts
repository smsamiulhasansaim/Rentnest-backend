import { Router } from 'express';
import {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  getAllPropertiesAdmin,
  getAllRentalsAdmin,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import validate from '../middleware/validate';
import { createCategorySchema, updateCategorySchema } from '../validations/category.validation';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.patch('/users/:id', updateUserStatus);

// Properties
router.get('/properties', getAllPropertiesAdmin);

// Rentals
router.get('/rentals', getAllRentalsAdmin);

// Categories
router.get('/categories', getAllCategories);
router.post('/categories', validate(createCategorySchema), createCategory);
router.put('/categories/:id', validate(updateCategorySchema), updateCategory);
router.delete('/categories/:id', deleteCategory);

export default router;