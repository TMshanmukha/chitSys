import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  attachInterestProfile,
  requireInterestRole,
  requireInterestPermission,
} from '../middleware/interestAuthMiddleware.js';
import {
  getDashboardMetrics,
  getSchemes,
  createScheme,
  previewSchemeCalculation,
  getCustomers,
  getCustomerById,
  createCustomer,
  getLoans,
  getLoanById,
  createLoan,
  getAgentAssignedCustomers,
  recordCollection,
  getCollectionReport,
  getAgentSummary,
} from '../controllers/interestController.js';
import {
  listUsers,
  createUser,
  getUserById,
  updateUser,
  toggleUserActive,
  resetPassword,
  assignCustomers,
  getUserActivity,
  changeOwnPassword,
} from '../controllers/interestUserController.js';
import {
  previewInterestDayWork,
  submitInterestDayWork,
  getMyInterestDaySubmissions,
  listInterestDaySubmissionsForAdmin,
  approveInterestDaySubmission,
  rejectInterestDaySubmission,
  unlockInterestDaySubmission,
} from '../controllers/interestDaySubmissionController.js';

const router = express.Router();

// 1. Require authenticated session & attach FinLend profile for all routes
router.use(requireAuth);
router.use(attachInterestProfile);

// 2. Financial calculation preview (Shared)
router.post('/schemes/preview', previewSchemeCalculation);

// 3. Dashboard Metrics (Owner, Manager, Viewer)
router.get('/dashboard', requireInterestPermission('can_view_reports'), getDashboardMetrics);

// 4. Schemes Management
router.get('/schemes', getSchemes);
router.post('/schemes', requireInterestRole('OWNER', 'MANAGER'), createScheme);

// 5. Customer Management
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);
router.post('/customers', requireInterestPermission('can_edit_customers'), createCustomer);

// 6. Loan Accounts Management
router.get('/loans', getLoans);
router.get('/loans/:id', getLoanById);
router.post('/loans', requireInterestPermission('can_disburse_loans'), createLoan);

// 7. Collections & Field Agent Workflows
router.get('/agent/assigned-customers', getAgentAssignedCustomers);
router.get('/agent/summary', getAgentSummary);
router.post('/collections', requireInterestPermission('can_collect'), recordCollection);
router.get('/reports/collections', requireInterestPermission('can_view_reports'), getCollectionReport);

// 8. User Management System (Owner & Manager)
router.get('/users', requireInterestRole('OWNER', 'MANAGER'), listUsers);
router.post('/users', requireInterestRole('OWNER'), createUser);
router.get('/users/:id', requireInterestRole('OWNER', 'MANAGER'), getUserById);
router.put('/users/:id', requireInterestRole('OWNER'), updateUser);
router.patch('/users/:id/active', requireInterestRole('OWNER'), toggleUserActive);
router.post('/users/:id/reset-password', requireInterestRole('OWNER'), resetPassword);
router.put('/users/:id/assign-customers', requireInterestRole('OWNER', 'MANAGER'), assignCustomers);
router.get('/users/:id/activity', requireInterestRole('OWNER', 'MANAGER'), getUserActivity);
router.post('/users/change-password', changeOwnPassword);

// 9. Day Closings & Shift Submissions (Field Agents & Admin Approval)
router.get('/day-preview', previewInterestDayWork);
router.post('/day-submit', submitInterestDayWork);
router.get('/day-submissions/my', getMyInterestDaySubmissions);
router.get('/day-submissions', requireInterestRole('OWNER', 'MANAGER'), listInterestDaySubmissionsForAdmin);
router.post('/day-submissions/:id/approve', requireInterestRole('OWNER', 'MANAGER'), approveInterestDaySubmission);
router.post('/day-submissions/:id/reject', requireInterestRole('OWNER', 'MANAGER'), rejectInterestDaySubmission);
router.post('/day-submissions/:id/unlock', requireInterestRole('OWNER', 'MANAGER'), unlockInterestDaySubmission);

export default router;
