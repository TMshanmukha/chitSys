import { Router } from 'express';
import {
  getAuditLogs,
  getDashboardOverview,
  getReportsAnalytics,
  getAdminCommissionsAndProfile,
  recordCommissionWithdrawal,
  updateAdminProfile,
  updateAdminPassword,
} from '../controllers/adminController.js';
import { listGroups, createGroup, getGroupDetails } from '../controllers/groupController.js';
import { listMembers, createMember, enrollMemberInGroup, getMemberPassbook } from '../controllers/memberController.js';
import { listAgents, createAgent, updateAgent, toggleAgentStatus, assignAgentToGroup } from '../controllers/agentController.js';
import { listCollections, recordCollection, getCollectionSummary } from '../controllers/collectionController.js';
import { listAuctions, conductAuction, updateAuctionPayout, getAuctionSummary, getSchemeAuctionBreakdown } from '../controllers/auctionController.js';
import { getRouteTrackingOverview, logAgentStopActivity, populateRouteStopsFromMembers } from '../controllers/trackingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Apply auth and admin-only role guard
router.use(requireAuth);
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

// Dashboard Overview, Audit & Reports
router.get('/overview', getDashboardOverview);
router.get('/summary', getDashboardOverview);
router.get('/audit-logs', getAuditLogs);
router.get('/reports', getReportsAnalytics);

// Admin Commissions, Inflows / Payments Got & Personal Profile
router.get('/commissions', getAdminCommissionsAndProfile);
router.post('/commissions/withdraw', recordCommissionWithdrawal);
router.put('/profile', updateAdminProfile);
router.put('/security/password', updateAdminPassword);


// Chit Groups Management (Daily Chit Route, Monthly Auction Chit, Monthly Double Chit)
router.get('/groups', listGroups);
router.post('/groups', createGroup);
router.get('/groups/:id', getGroupDetails);
router.get('/chit-groups', listGroups);
router.post('/chit-groups', createGroup);
router.get('/chit-groups/:id', getGroupDetails);

// Members Management & Passbook / Statement of Account
router.get('/members', listMembers);
router.post('/members', createMember);
router.post('/members/enroll', enrollMemberInGroup);
router.get('/members/:id/passbook', getMemberPassbook);

// Collection Agents & User Management
router.get('/agents', listAgents);
router.post('/agents', createAgent);
router.put('/agents/:id', updateAgent);
router.put('/agents/:id/status', toggleAgentStatus);
router.post('/agents/assign', assignAgentToGroup);

router.get('/users', listAgents);
router.post('/users', createAgent);
router.put('/users/:id', updateAgent);
router.put('/users/:id/status', toggleAgentStatus);

// Collections Management
router.get('/collections', listCollections);
router.post('/collections', recordCollection);
router.get('/collections/summary', getCollectionSummary);

// Auctions & Dividends Management (ChitBase Monthly & Double Chit Auctions)
router.get('/auctions', listAuctions);
router.post('/auctions', conductAuction);
router.put('/auctions/:id/payout', updateAuctionPayout);
router.get('/auctions/summary', getAuctionSummary);
router.get('/auctions/scheme/:groupId/breakdown', getSchemeAuctionBreakdown);
router.get('/auctions/breakdown/:groupId', getSchemeAuctionBreakdown);

// Route & Agent Tracking (2D Visual Route Map & Waypoints)
router.get('/tracking/overview', getRouteTrackingOverview);
router.post('/tracking/populate', populateRouteStopsFromMembers);
router.post('/tracking/log-activity', logAgentStopActivity);

export default router;
