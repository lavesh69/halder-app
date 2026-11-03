import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateUser } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(120),
  phone: z.string().min(10).max(15),
  password: z.string().min(6).max(128).optional(),
  role: z.enum(['customer', 'farmer']),
  farmName: z.string().max(120).optional(),
  location: z.string().max(200).optional(),
});

const loginSchema = z.object({
  emailOrPhone: z.string().min(3).max(120),
  password: z.string().max(128).optional(),
  role: z.enum(['customer', 'farmer']).optional(),
});

const googleSchema = z.object({
  idToken: z.string().min(10),
  role: z.enum(['customer', 'farmer', 'admin']).optional(),
});

const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().min(4).max(6),
  role: z.enum(['customer', 'farmer']).optional(),
  name: z.string().max(100).optional(),
});

router.post('/send-otp', authLimiter, validateBody(sendOtpSchema), AuthController.sendOtp);
router.post('/verify-otp', authLimiter, validateBody(verifyOtpSchema), AuthController.verifyOtp);
router.post('/register', authLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', authLimiter, validateBody(loginSchema), AuthController.login);
router.post('/google', authLimiter, validateBody(googleSchema), AuthController.googleLogin);
router.post('/logout', AuthController.logout);
router.get('/me', authenticateUser, AuthController.getMe);
router.post('/change-password', authenticateUser, AuthController.changePassword);
router.post('/delete-account', authenticateUser, AuthController.deleteMe);
router.delete('/me', authenticateUser, AuthController.deleteMe);

export default router;
