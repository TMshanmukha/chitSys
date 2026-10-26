import { Router } from 'express';
import { getMyAssignedRoutes } from '../controllers/agentController.js';
import { recordCollection, listCollections } from '../controllers/collectionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Route Guard: Authorized Collection Agents Only
router.use(requireAuth);
router.use(requireRole('COLLECTION_AGENT'));

// Assigned Groups & Members
router.get('/my-routes', getMyAssignedRoutes);

// Record payment from field
router.post('/collections', recordCollection);

// View agent's own collection history
router.get('/collections', listCollections);

export default router;
