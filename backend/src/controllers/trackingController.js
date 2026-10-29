import { pool } from '../config/db.js';
import { recordAuditLog } from '../services/authService.js';
import { createNotification } from './notificationController.js';

export async function getRouteTrackingOverview(req, res, next) {
  try {
    const { routeCategory, groupId, agentId } = req.query;

    let groupQuery = `
      SELECT 
        g.id, g.group_code, g.group_name, g.chit_type, g.frequency, g.route_category,
        g.location_name, g.installment_amount, g.total_pool_amount,
        u.id as agent_id, u.full_name as agent_name, u.phone as agent_phone, u.username as agent_username
      FROM chit_groups g
      LEFT JOIN agent_group_assignments aga ON g.id = aga.group_id AND aga.is_active = 1
      LEFT JOIN users u ON aga.agent_id = u.id
      WHERE g.status = 'ACTIVE'
    `;
    const params = [];

    if (routeCategory) {
      groupQuery += ' AND g.route_category = ?';
      params.push(routeCategory.toUpperCase());
    }
    if (groupId) {
      groupQuery += ' AND g.id = ?';
      params.push(groupId);
    }
    if (agentId) {
      groupQuery += ' AND u.id = ?';
      params.push(agentId);
    }

    groupQuery += ' ORDER BY g.route_category ASC, g.id ASC';

    const [groups] = await pool.query(groupQuery, params);

    // If no groups found, return empty
    if (groups.length === 0) {
      return res.status(200).json({ success: true, data: { routes: [], summary: {} } });
    }

    const groupIds = groups.map((g) => g.id);

    // Fetch all active enrolled members for these groups (Every member is a Route Node!)
    const [enrolledMembers] = await pool.query(
      `SELECT gm.group_id, gm.ticket_number, gm.member_id, gm.status as membership_status, gm.joined_date,
              m.member_code, m.full_name as member_name, m.phone as member_phone, m.alternate_phone,
              m.address as member_address, m.kyc_type, m.kyc_number, m.is_active as member_is_active
       FROM group_memberships gm
       JOIN members m ON gm.member_id = m.id
       WHERE gm.group_id IN (?) AND gm.status = 'ACTIVE'
       ORDER BY gm.group_id ASC, gm.ticket_number ASC`,
      [groupIds]
    );

    // Also fetch route stops (template waypoints) as fallback
    const [templateStops] = await pool.query(
      `SELECT rs.*, m.member_code, m.full_name as member_name, m.phone as member_phone, m.alternate_phone,
              m.address as member_address, m.kyc_type, m.kyc_number
       FROM route_stops rs
       LEFT JOIN members m ON rs.member_id = m.id
       WHERE rs.group_id IN (?)
       ORDER BY rs.group_id ASC, rs.stop_order ASC`,
      [groupIds]
    );

    // Fetch collections on these groups for their respective active cycles:
    // - Daily groups: c.collection_date = CURDATE() (Day-by-Day tracking)
    // - Monthly groups: current calendar month YEAR(c.collection_date) = YEAR(CURDATE()) AND MONTH(c.collection_date) = MONTH(CURDATE()) (Month-by-Month tracking)
    const [cycleCollections] = await pool.query(
      `SELECT c.id, c.group_id, c.member_id, c.amount, c.payment_method, c.receipt_number, c.collection_date, c.collection_time, c.notes,
              c.agent_id, u.full_name as agent_name, g.frequency as group_frequency
       FROM collections c
       JOIN chit_groups g ON c.group_id = g.id
       JOIN users u ON c.agent_id = u.id
       WHERE c.group_id IN (?) 
         AND c.verification_status != 'CANCELLED'
         AND (
           (g.frequency = 'DAILY' AND c.collection_date = CURDATE())
           OR
           (g.frequency = 'MONTHLY' AND YEAR(c.collection_date) = YEAR(CURDATE()) AND MONTH(c.collection_date) = MONTH(CURDATE()))
         )
       ORDER BY c.collection_time ASC`,
      [groupIds]
    );

    // Fetch tracking logs & notes recorded by agents for their respective active cycles
    const [trackingLogs] = await pool.query(
      `SELECT atl.*, g.frequency as group_frequency
       FROM agent_tracking_logs atl
       JOIN chit_groups g ON atl.group_id = g.id
       WHERE atl.group_id IN (?)
         AND (
           (g.frequency = 'DAILY' AND atl.tracking_date = CURDATE())
           OR
           (g.frequency = 'MONTHLY' AND YEAR(atl.tracking_date) = YEAR(CURDATE()) AND MONTH(atl.tracking_date) = MONTH(CURDATE()))
         )
       ORDER BY atl.id DESC`,
      [groupIds]
    );

    // Assemble rich 2D tracking payload for each route
    let grandTotalStops = 0;
    let grandVisitedStops = 0;
    let grandCashCollected = 0;
    let grandOnlineCollected = 0;

    let dailyTotalStops = 0;
    let dailyVisitedStops = 0;
    let dailyCashCollected = 0;
    let dailyOnlineCollected = 0;

    let monthlyTotalStops = 0;
    let monthlyVisitedStops = 0;
    let monthlyCashCollected = 0;
    let monthlyOnlineCollected = 0;

    const routes = groups.map((grp) => {
      const isDaily = grp.frequency === 'DAILY';
      const cycleType = grp.frequency; // 'DAILY' | 'MONTHLY'
      const cycleMode = isDaily ? 'DAY_BY_DAY' : 'MONTH_BY_MONTH';
      const cycleLabel = isDaily ? 'Day-by-Day (Daily Chit)' : 'Month-by-Month (Monthly Chit)';
      const cyclePeriod = isDaily ? 'Today' : 'Current Month';

      const groupMembers = enrolledMembers.filter((m) => m.group_id === grp.id);
      const groupTemplateStops = templateStops.filter((s) => s.group_id === grp.id);
      const groupColls = cycleCollections.filter((c) => c.group_id === grp.id);
      const groupLogs = trackingLogs.filter((l) => l.group_id === grp.id);

      let cashCollected = 0;
      let onlineCollected = 0;
      let paidCount = 0;
      let lastVisitedStopIndex = -1;
      let lastActivityTime = null;

      // Determine raw nodes: prioritize enrolled members if any exist; otherwise fallback to template stops
      const rawNodes = groupMembers.length > 0
        ? groupMembers.map((m) => ({
            id: m.member_id,
            memberId: m.member_id,
            memberCode: m.member_code || `MEM-${m.member_id}`,
            stopOrder: m.ticket_number,
            stopName: `Ticket #${m.ticket_number}`,
            memberName: m.member_name,
            memberPhone: m.member_phone,
            alternatePhone: m.alternate_phone || '',
            memberAddress: m.member_address || '',
            kycType: m.kyc_type || 'Aadhaar Card',
            kycNumber: m.kyc_number || 'Verified',
            joinedDate: m.joined_date,
            membershipStatus: m.membership_status || 'ACTIVE',
            expectedAmount: parseFloat(grp.installment_amount),
          }))
        : groupTemplateStops.map((s) => ({
            id: s.id,
            memberId: s.member_id,
            memberCode: s.member_code || `STP-${s.id}`,
            stopOrder: s.stop_order,
            stopName: `Ticket #${s.stop_order}`,
            memberName: s.member_name || `Chit Node #${s.stop_order}`,
            memberPhone: s.member_phone,
            alternatePhone: s.alternate_phone || '',
            memberAddress: s.member_address || s.landmark || '',
            kycType: s.kyc_type || 'Government ID',
            kycNumber: s.kyc_number || 'Verified',
            joinedDate: null,
            membershipStatus: 'ACTIVE',
            expectedAmount: parseFloat(s.expected_amount || grp.installment_amount),
          }));

      const totalStops = rawNodes.length;

      // Map each node to its live status (PAID: Green, NOT_PAID: Red)
      const mappedStops = rawNodes.map((node, idx) => {
        // Calculate S-curve 2D coordinates smoothly across canvas (800x360)
        const progress = totalStops > 1 ? idx / (totalStops - 1) : 0.5;
        const coordX = Math.round(80 + progress * 640);
        const coordY = Math.round(180 + Math.sin(progress * Math.PI * 2) * 85);

        // Find if this member paid in their respective active cycle (Today for daily, current month for monthly)
        const coll = groupColls.find((c) => node.memberId && c.member_id === node.memberId);
        // Find if agent left a specific tracking log/note for this member in this cycle
        const log = groupLogs.find((l) => 
          (l.member_id && node.memberId && l.member_id === node.memberId) ||
          (l.stop_id === node.stopOrder)
        );

        const isPaid = Boolean(coll) || (log && log.status === 'PAID');

        let status = 'NOT_PAID'; // NOT PAID (Red)
        let nodeColor = 'RED'; // 'GREEN' | 'RED'
        let statusText = isDaily ? 'Not Paid (Today)' : 'Not Paid (This Month)';
        let notes = log?.notes || (isDaily ? 'Awaiting today installment' : 'Awaiting monthly installment');
        let collectionDetails = null;

        if (isPaid) {
          status = 'PAID';
          nodeColor = 'GREEN';
          statusText = isDaily ? 'Paid for Today' : 'Paid for Current Month';
          paidCount++;
          lastVisitedStopIndex = idx;
          lastActivityTime = coll?.collection_time || log?.last_ping_time;
          if (coll) {
            if (coll.payment_method === 'CASH') cashCollected += parseFloat(coll.amount);
            else onlineCollected += parseFloat(coll.amount);
            collectionDetails = {
              receiptNumber: coll.receipt_number,
              amount: parseFloat(coll.amount),
              paymentMethod: coll.payment_method,
              date: coll.collection_date,
              time: coll.collection_time,
            };
          }
          notes = coll?.notes || log?.notes || (isDaily ? 'Paid for today' : 'Paid for current monthly cycle');
        } else {
          status = 'NOT_PAID';
          nodeColor = 'RED';
          statusText = isDaily ? 'Not Paid (Today)' : 'Not Paid (This Month)';
          notes = log?.notes || (isDaily ? 'Awaiting today installment' : 'Awaiting monthly installment');
          if (log) {
            lastActivityTime = log.last_ping_time;
          }
        }

        return {
          id: node.id,
          memberId: node.memberId,
          memberCode: node.memberCode,
          stopOrder: node.stopOrder,
          stopName: node.stopName,
          chitCode: grp.group_code,
          chitName: grp.group_name,
          chitType: grp.chit_type,
          frequency: grp.frequency,
          cycleType,
          cycleMode,
          cyclePeriod,
          locationName: grp.location_name,
          memberName: node.memberName,
          memberPhone: node.memberPhone,
          alternatePhone: node.alternatePhone,
          memberAddress: node.memberAddress,
          kycType: node.kycType,
          kycNumber: node.kycNumber,
          joinedDate: node.joinedDate,
          membershipStatus: node.membershipStatus,
          expectedAmount: node.expectedAmount,
          coordX,
          coordY,
          status,
          nodeColor,
          statusText,
          notes,
          collectionDetails,
        };
      });

      const progressPercent = totalStops > 0 ? Math.round((paidCount / totalStops) * 100) : 0;

      // Determine Agent 2D Position on route path
      let agentPosition = { x: 80, y: 180, currentStopOrder: 1, isIdle: totalStops === 0 };
      if (totalStops > 0) {
        if (lastVisitedStopIndex === -1) {
          // Agent at beginning of route
          agentPosition = {
            x: mappedStops[0].coordX,
            y: mappedStops[0].coordY,
            currentStopOrder: 1,
            isIdle: false,
          };
        } else if (lastVisitedStopIndex >= totalStops - 1) {
          // Agent completed all collections
          agentPosition = {
            x: mappedStops[totalStops - 1].coordX,
            y: mappedStops[totalStops - 1].coordY,
            currentStopOrder: totalStops,
            isIdle: true,
          };
        } else {
          // Agent at current position
          const currentStop = mappedStops[lastVisitedStopIndex];
          const nextStop = mappedStops[lastVisitedStopIndex + 1];
          agentPosition = {
            x: Math.round((currentStop.coordX + nextStop.coordX) / 2),
            y: Math.round((currentStop.coordY + nextStop.coordY) / 2),
            currentStopOrder: nextStop.stopOrder,
            isIdle: false,
          };
        }
      }

      grandTotalStops += totalStops;
      grandVisitedStops += paidCount;
      grandCashCollected += cashCollected;
      grandOnlineCollected += onlineCollected;

      if (isDaily) {
        dailyTotalStops += totalStops;
        dailyVisitedStops += paidCount;
        dailyCashCollected += cashCollected;
        dailyOnlineCollected += onlineCollected;
      } else {
        monthlyTotalStops += totalStops;
        monthlyVisitedStops += paidCount;
        monthlyCashCollected += cashCollected;
        monthlyOnlineCollected += onlineCollected;
      }

      return {
        id: grp.id,
        groupCode: grp.group_code,
        groupName: grp.group_name,
        chitType: grp.chit_type,
        frequency: grp.frequency,
        cycleType,
        cycleMode,
        cycleLabel,
        cyclePeriod,
        routeCategory: grp.route_category,
        locationName: grp.location_name,
        installmentAmount: parseFloat(grp.installment_amount),
        totalPoolAmount: parseFloat(grp.total_pool_amount),
        agent: grp.agent_id ? {
          id: grp.agent_id,
          name: grp.agent_name,
          phone: grp.agent_phone,
          username: grp.agent_username,
        } : null,
        stats: {
          totalStops,
          visitedStops: paidCount,
          pendingStops: totalStops - paidCount,
          progressPercent,
          cashCollected,
          onlineCollected,
          totalCollected: cashCollected + onlineCollected,
          lastActivityTime,
        },
        agentPosition,
        stops: mappedStops,
      };
    });

    const grandProgressPercent = grandTotalStops > 0
      ? Math.round((grandVisitedStops / grandTotalStops) * 100)
      : 0;

    const dailyRoutes = routes.filter((r) => r.frequency === 'DAILY');
    const monthlyRoutes = routes.filter((r) => r.frequency === 'MONTHLY');

    res.status(200).json({
      success: true,
      data: {
        summary: {
          activeRoutesCount: routes.length,
          grandTotalStops,
          grandVisitedStops,
          grandPendingStops: grandTotalStops - grandVisitedStops,
          grandProgressPercent,
          grandCashCollected,
          grandOnlineCollected,
          grandTotalCollected: grandCashCollected + grandOnlineCollected,
          // Explicit Day-by-Day (Daily) vs Month-by-Month (Monthly) segregation
          daily: {
            routesCount: dailyRoutes.length,
            totalStops: dailyTotalStops,
            visitedStops: dailyVisitedStops,
            pendingStops: dailyTotalStops - dailyVisitedStops,
            progressPercent: dailyTotalStops > 0 ? Math.round((dailyVisitedStops / dailyTotalStops) * 100) : 0,
            cashCollected: dailyCashCollected,
            onlineCollected: dailyOnlineCollected,
            totalCollected: dailyCashCollected + dailyOnlineCollected,
          },
          monthly: {
            routesCount: monthlyRoutes.length,
            totalStops: monthlyTotalStops,
            visitedStops: monthlyVisitedStops,
            pendingStops: monthlyTotalStops - monthlyVisitedStops,
            progressPercent: monthlyTotalStops > 0 ? Math.round((monthlyVisitedStops / monthlyTotalStops) * 100) : 0,
            cashCollected: monthlyCashCollected,
            onlineCollected: monthlyOnlineCollected,
            totalCollected: monthlyCashCollected + monthlyOnlineCollected,
          },
        },
        routes,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logAgentStopActivity(req, res, next) {
  try {
    const { groupId, memberId, stopId, status, notes } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, message: 'Group ID is required.' });
    }

    const agentId = req.user.id;
    const targetStatus = status || 'NOT_PAID';
    const targetMemberId = memberId || stopId || null;

    await pool.execute(
      `INSERT INTO agent_tracking_logs (agent_id, group_id, member_id, stop_id, tracking_date, status, last_ping_time, notes)
       VALUES (?, ?, ?, ?, CURDATE(), ?, CURTIME(), ?)`,
      [agentId, groupId, targetMemberId, stopId || targetMemberId, targetStatus, notes || null]
    );

    if (targetStatus === 'PAID') {
      createNotification({
        targetRole: 'ADMIN',
        title: '💰 Route Stop Collected',
        message: `${req.user.full_name || 'Agent'} logged payment collection for Stop #${stopId || targetMemberId}.`,
        type: 'COLLECTION',
        link: '/admin/tracking',
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      message: 'Route stop progress updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function populateRouteStopsFromMembers(req, res, next) {
  try {
    const { groupId } = req.body;
    if (!groupId) {
      return res.status(400).json({ success: false, message: 'Group ID is required.' });
    }

    // Fetch enrolled members
    const [members] = await pool.execute(
      `SELECT gm.ticket_number, m.id as member_id, m.full_name, m.address, g.location_name, g.installment_amount
       FROM group_memberships gm
       JOIN members m ON gm.member_id = m.id
       JOIN chit_groups g ON gm.group_id = g.id
       WHERE gm.group_id = ?
       ORDER BY gm.ticket_number ASC`,
      [groupId]
    );

    if (members.length === 0) {
      return res.status(400).json({ success: false, message: 'No enrolled members found for this group to generate route stops.' });
    }

    // Delete existing stops for this group to avoid conflicts
    await pool.execute('DELETE FROM route_stops WHERE group_id = ?', [groupId]);

    const count = members.length;
    for (let i = 0; i < count; i++) {
      const m = members[i];
      const progress = i / Math.max(1, count - 1);
      // Generate clean coordinate points across 80-720 X and wavy Y (120-280)
      const coordX = Math.round(80 + progress * 640);
      const coordY = Math.round(180 + Math.sin(progress * Math.PI * 2) * 80);

      await pool.execute(
        `INSERT INTO route_stops (group_id, member_id, stop_order, stop_name, landmark, expected_amount, coord_x, coord_y)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          groupId,
          m.member_id,
          m.ticket_number,
          `${m.full_name} (${m.address || m.location_name})`,
          `Stop #${m.ticket_number}`,
          m.installment_amount,
          coordX,
          coordY,
        ]
      );
    }

    await recordAuditLog({
      userId: req.user.id,
      action: 'POPULATE_ROUTE_STOPS',
      resource: 'ROUTE_STOPS',
      details: { groupId, stopsCreated: count },
    });

    res.status(200).json({
      success: true,
      message: `Generated ${count} sequential route stops for 2D tracking.`,
    });
  } catch (error) {
    next(error);
  }
}
