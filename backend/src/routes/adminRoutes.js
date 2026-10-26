import { Router } from 'express';
import { getAuditLogs, getSystemSummary } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Apply auth and admin-only role guard
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

router.get('/audit-logs', getAuditLogs);
router.get('/summary', getSystemSummary);

export default router;
