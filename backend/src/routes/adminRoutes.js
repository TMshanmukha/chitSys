import { Router } from 'express';
import { getAuditLogs, getDashboardOverview } from '../controllers/adminController.js';
import { listGroups, createGroup, getGroupDetails } from '../controllers/groupController.js';
import { listMembers, createMember, enrollMemberInGroup } from '../controllers/memberController.js';
import { listAgents, createAgent, toggleAgentStatus, assignAgentToGroup } from '../controllers/agentController.js';
import { listCollections, recordCollection, getCollectionSummary } from '../controllers/collectionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Apply auth and admin-only role guard
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

// Dashboard Overview & Audit
router.get('/overview', getDashboardOverview);
router.get('/summary', getDashboardOverview);
router.get('/audit-logs', getAuditLogs);

// Chit Groups Management
router.get('/groups', listGroups);
router.post('/groups', createGroup);
router.get('/groups/:id', getGroupDetails);

// Members Management
router.get('/members', listMembers);
router.post('/members', createMember);
router.post('/members/enroll', enrollMemberInGroup);

// Collection Agents Management
router.get('/agents', listAgents);
router.post('/agents', createAgent);
router.put('/agents/:id/status', toggleAgentStatus);
router.post('/agents/assign', assignAgentToGroup);

// Collections Management
router.get('/collections', listCollections);
router.post('/collections', recordCollection);
router.get('/collections/summary', getCollectionSummary);

export default router;
