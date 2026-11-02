import { Router } from 'express';
import { getMyAssignedRoutes } from '../controllers/agentController.js';
import { recordCollection, listCollections } from '../controllers/collectionController.js';
import { logAgentStopActivity } from '../controllers/trackingController.js';
import { submitAgentDayWork, getMyDaySubmissions, previewAgentDayWork } from '../controllers/daySubmissionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { listLeaves, createLeave, listCoverageHistory } from '../controllers/leaveController.js';

const router = Router();

// Route Guard: Authorized Collection Agents Only
router.use(requireAuth);
router.use(requireRole('COLLECTION_AGENT', 'ADMIN', 'SUPER_ADMIN'));

// Assigned Groups & Members
router.get('/my-routes', getMyAssignedRoutes);

// Record payment from field
router.post('/collections', recordCollection);

// View agent's own collection history
router.get('/collections', listCollections);

// Log stop activity (closed shop, callback, visited)
router.post('/tracking/log-activity', logAgentStopActivity);

// Day Submit & Shift Closing Handover to Admin
router.get('/day-preview', previewAgentDayWork);
router.post('/day-submit', submitAgentDayWork);
router.get('/day-submissions', getMyDaySubmissions);
router.get('/leaves', listLeaves);
router.post('/leaves', createLeave);
router.get('/leaves/coverage-history', listCoverageHistory);

export default router;
