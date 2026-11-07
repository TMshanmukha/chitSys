import { Router } from 'express';
import { getMyAssignedRoutes, getMemberPendingBreakdown } from '../controllers/agentController.js';
import { recordCollection, listCollections } from '../controllers/collectionController.js';
import { logAgentStopActivity } from '../controllers/trackingController.js';
import { submitAgentDayWork, getMyDaySubmissions,
  getMyUnsubmittedDays, previewAgentDayWork } from '../controllers/daySubmissionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { listLeaves, createLeave, listCoverageHistory } from '../controllers/leaveController.js';
import {
  requestCollectionEdit,
  applyCollectionEdit,
  getMyCollectionEditRequests,
} from '../controllers/collectionEditController.js';

const router = Router();

// Route Guard: Authorized Collection Agents Only
router.use(requireAuth);
router.use(requireRole('COLLECTION_AGENT', 'ADMIN', 'SUPER_ADMIN'));

// Assigned Groups & Members
router.get('/my-routes', getMyAssignedRoutes);
router.get('/members/:id/pending-dues', getMemberPendingBreakdown);

// Record payment from field
router.post('/collections', recordCollection);

// View agent's own collection history
router.get('/collections', listCollections);

// Collection Edit / Correction Flow (Agent wrong amount correction)
router.post('/collections/:id/request-edit', requestCollectionEdit);
router.post('/collections/request-edit', requestCollectionEdit);
router.put('/collections/:id/apply-edit', applyCollectionEdit);
router.get('/collection-edits/my-requests', getMyCollectionEditRequests);

// Log stop activity (closed shop, callback, visited)
router.post('/tracking/log-activity', logAgentStopActivity);

// Day Submit & Shift Closing Handover to Admin
router.get('/day-preview', previewAgentDayWork);
router.post('/day-submit', submitAgentDayWork);
router.post('/day-submissions', submitAgentDayWork);
router.get('/day-submissions', getMyDaySubmissions);
router.get('/day-unsubmitted', getMyUnsubmittedDays);
router.get('/leaves', listLeaves);
router.post('/leaves', createLeave);
router.get('/leaves/coverage-history', listCoverageHistory);

export default router;
