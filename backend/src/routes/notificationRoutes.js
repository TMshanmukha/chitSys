import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAll,
} from '../controllers/notificationController.js';

const router = express.Router();

// All notification routes require authentication
router.use(requireAuth);

router.get('/', getNotifications);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/clear-all', clearAll);
router.patch('/:id/read', markAsRead);

export default router;
