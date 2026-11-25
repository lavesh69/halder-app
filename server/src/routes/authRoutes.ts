import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateUser } from '../middleware/auth';
import { loginLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, dots, and hyphens',
  }).optional(),
  name: z.string().min(2).max(100),
  email: z.string().email().max(120),
  phone: z.string().min(6).max(30).optional().or(z.literal('')),
  password: z.string().min(6).max(128).optional(),
  role: z.enum(['customer', 'farmer']),
  farmName: z.string().max(120).optional(),
  location: z.string().max(200).optional(),
});

const loginSchema = z.object({
  usernameOrEmail: z.string().min(3).max(120).optional(),
  emailOrPhone: z.string().min(3).max(120).optional(),
  username: z.string().min(3).max(120).optional(),
  phone: z.string().min(3).max(120).optional(),
  identifier: z.string().min(3).max(120).optional(),
  password: z.string().min(1, 'Password is required').max(128),
  role: z.enum(['customer', 'farmer', 'admin']).optional(),
}).refine((data) => data.usernameOrEmail || data.emailOrPhone || data.username || data.phone || data.identifier, {
  message: 'Username, email, or phone number is required',
});

const googleSchema = z.object({
  idToken: z.string().min(10),
  role: z.enum(['customer', 'farmer', 'admin']).optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(120),
});

const resetPasswordSchema = z.object({
  email: z.string().email().max(120),
  code: z.string().min(4).max(10),
  newPassword: z.string().min(6).max(128),
  resetToken: z.string().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

const deleteAccountSchema = z.object({
  password: z.string().max(128).optional(),
});

router.all('/send-otp', (req, res) => {
  res.status(410).json({
    success: false,
    message: 'SMS OTP service has been removed. Please sign in directly with Email/Password or Google.',
  });
});
router.all('/verify-otp', (req, res) => {
  res.status(410).json({
    success: false,
    message: 'SMS OTP service has been removed. Please sign in directly with Email/Password or Google.',
  });
});
router.post('/register', loginLimiter, validateBody(registerSchema), AuthController.register);
router.post('/login', loginLimiter, validateBody(loginSchema), AuthController.login);
router.post('/google', loginLimiter, validateBody(googleSchema), AuthController.googleLogin);
router.post('/forgot-password', loginLimiter, validateBody(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', loginLimiter, validateBody(resetPasswordSchema), AuthController.resetPassword);
router.post('/logout', AuthController.logout);
router.get('/me', authenticateUser, AuthController.getMe);
router.post('/change-password', authenticateUser, validateBody(changePasswordSchema), AuthController.changePassword);
router.post('/delete-account', authenticateUser, validateBody(deleteAccountSchema), AuthController.deleteMe);
router.delete('/me', authenticateUser, validateBody(deleteAccountSchema), AuthController.deleteMe);

export default router;
