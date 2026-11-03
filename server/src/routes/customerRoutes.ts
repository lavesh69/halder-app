import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authenticateUser } from '../middleware/auth';
import { requireCustomer } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

// Require authentication and customer role for all routes in this router
router.use(authenticateUser);
router.use(requireCustomer);

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  bio: z.string().max(500).optional(),
  dateOfBirth: z.string().max(20).optional(),
  gender: z.string().max(20).optional(),
});

const avatarSchema = z.object({
  avatar: z.string().min(10),
});

const addressSchema = z.object({
  label: z.string().max(50).optional(),
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  houseBuilding: z.string().min(1).max(200),
  streetLocality: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(4).max(12),
  landmark: z.string().max(200).optional(),
  isDefault: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const updateAddressSchema = addressSchema.partial();

// Profile endpoints
router.get('/me', CustomerController.getMe);
router.patch('/me', validateBody(updateProfileSchema), CustomerController.updateMe);
router.post('/me/avatar', validateBody(avatarSchema), CustomerController.updateAvatar);
router.delete('/me/avatar', CustomerController.removeAvatar);

// Address endpoints
router.get('/me/addresses', CustomerController.listAddresses);
router.post('/me/addresses', validateBody(addressSchema), CustomerController.createAddress);
router.put('/me/addresses/:id', validateBody(updateAddressSchema), CustomerController.updateAddress);
router.delete('/me/addresses/:id', CustomerController.deleteAddress);
router.patch('/me/addresses/:id/default', CustomerController.setDefaultAddress);

// Settings endpoints
router.get('/me/settings', CustomerController.getSettings);
router.patch('/me/settings', CustomerController.updateSettings);

export default router;
