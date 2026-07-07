import { Router } from 'express';
import {
  getAllProperties,
  getPropertyById,
  getAllCategories,
} from '../controllers/property.controller';

const router = Router();

router.get('/properties', getAllProperties);
router.get('/properties/:id', getPropertyById);
router.get('/categories', getAllCategories);

export default router;
