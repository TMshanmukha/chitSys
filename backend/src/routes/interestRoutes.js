import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
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
} from '../controllers/interestController.js';

const router = express.Router();

// Require authenticated session for all interest routes
router.use(requireAuth);

// Public/Shared Interest calculation preview (Used in scheme builder and loan originator)
router.post('/schemes/preview', previewSchemeCalculation);

// Dashboard Metrics (Admin & Collection Manager)
router.get('/dashboard', requireRole('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'), getDashboardMetrics);

// Schemes Management
router.get('/schemes', getSchemes);
router.post('/schemes', requireRole('SUPER_ADMIN', 'ADMIN'), createScheme);

// Customer Management
router.get('/customers', getCustomers);
router.get('/customers/:id', getCustomerById);
router.post('/customers', requireRole('SUPER_ADMIN', 'ADMIN', 'COLLECTION_AGENT'), createCustomer);

// Loan Accounts Management
router.get('/loans', getLoans);
router.get('/loans/:id', getLoanById);
router.post('/loans', requireRole('SUPER_ADMIN', 'ADMIN'), createLoan);

// Collections & Field Agent Workflows
router.get('/agent/assigned-customers', getAgentAssignedCustomers);
router.post('/collections', recordCollection);
router.get('/reports/collections', requireRole('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER'), getCollectionReport);

export default router;
