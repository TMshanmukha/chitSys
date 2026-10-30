import * as adminCtrl from '../controllers/adminController.js';
import * as groupCtrl from '../controllers/groupController.js';
import * as memberCtrl from '../controllers/memberController.js';
import * as agentCtrl from '../controllers/agentController.js';
import * as auctionCtrl from '../controllers/auctionController.js';
import * as trackingCtrl from '../controllers/trackingController.js';
import * as collectionCtrl from '../controllers/collectionController.js';
import * as notifCtrl from '../controllers/notificationController.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.data = body;
      return this;
    }
  };
  return res;
}

async function runTest(name, fn, req = { query: {}, params: {}, user: { id: 1, role: 'SUPER_ADMIN' } }) {
  const res = createMockRes();
  let nextErr = null;
  const next = (err) => { nextErr = err; };
  try {
    await fn(req, res, next);
    if (nextErr) {
      console.error(`❌ [${name}] Next called with error:`, nextErr);
      return false;
    } else {
      let preview;
      if (res.data?.data) {
        if (Array.isArray(res.data.data)) {
          preview = `Array(${res.data.data.length})`;
        } else if (typeof res.data.data === 'object' && res.data.data !== null) {
          preview = Object.keys(res.data.data);
        } else {
          preview = res.data.data;
        }
      } else {
        preview = res.data ? Object.keys(res.data) : null;
      }
      console.log(`✅ [${name}] Success (status ${res.statusCode}), data:`, preview);
      return true;
    }
  } catch (err) {
    console.error(`❌ [${name}] Threw exception:`, err);
    return false;
  }
}

async function main() {
  console.log('Testing ALL READ ENDPOINTS on EMPTY database...\n');
  let allPassed = true;

  // Admin Controller
  allPassed = (await runTest('adminCtrl.getDashboardOverview', adminCtrl.getDashboardOverview)) && allPassed;
  allPassed = (await runTest('adminCtrl.getAuditLogs', adminCtrl.getAuditLogs)) && allPassed;
  allPassed = (await runTest('adminCtrl.getAdminCommissionsAndProfile', adminCtrl.getAdminCommissionsAndProfile)) && allPassed;
  allPassed = (await runTest('adminCtrl.getReportsAnalytics', adminCtrl.getReportsAnalytics)) && allPassed;
  allPassed = (await runTest('adminCtrl.getAgentsDailyPerformance', adminCtrl.getAgentsDailyPerformance)) && allPassed;

  // Group Controller
  allPassed = (await runTest('groupCtrl.listGroups', groupCtrl.listGroups)) && allPassed;

  // Member Controller
  allPassed = (await runTest('memberCtrl.listMembers', memberCtrl.listMembers)) && allPassed;

  // Agent Controller
  allPassed = (await runTest('agentCtrl.listAgents', agentCtrl.listAgents)) && allPassed;

  // Auction Controller
  allPassed = (await runTest('auctionCtrl.getAuctionSummary', auctionCtrl.getAuctionSummary)) && allPassed;
  allPassed = (await runTest('auctionCtrl.listAuctions', auctionCtrl.listAuctions)) && allPassed;
  allPassed = (await runTest('auctionCtrl.getSchemeAuctionBreakdown (empty/missing group test)', auctionCtrl.getSchemeAuctionBreakdown, { params: { groupId: '1' }, query: {}, user: { id: 1, role: 'SUPER_ADMIN' } })) && allPassed;

  // Collection Controller
  allPassed = (await runTest('collectionCtrl.getCollectionSummary', collectionCtrl.getCollectionSummary)) && allPassed;
  allPassed = (await runTest('collectionCtrl.listCollections', collectionCtrl.listCollections)) && allPassed;

  // Tracking Controller
  allPassed = (await runTest('trackingCtrl.getRouteTrackingOverview', trackingCtrl.getRouteTrackingOverview)) && allPassed;

  // Notification Controller
  allPassed = (await runTest('notifCtrl.getNotifications', notifCtrl.getNotifications)) && allPassed;

  console.log('\n==================================');
  if (allPassed) {
    console.log('🎉 ALL EMPTY DATABASE READ CHECKS PASSED WITH 0 ERRORS!');
  } else {
    console.log('⚠️ SOME ENDPOINTS ENCOUNTERED ERRORS ON EMPTY DATABASE!');
  }
  console.log('==================================');
  process.exit(allPassed ? 0 : 1);
}

main().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
