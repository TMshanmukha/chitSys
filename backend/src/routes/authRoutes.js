import { Router } from 'express';
import { login, me, logout } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public login endpoint with rate limiting
router.post('/login', authRateLimiter, login);

// Protected session check
router.get('/me', requireAuth, me);

// Logout endpoint (clears cookie & token regardless of expiration)
router.post('/logout', logout);

export default router;
