import { pool } from '../config/db.js';
import { createNotification } from './notificationController.js';

export async function listLeaves(req, res, next) {
  try {
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const [leaves] = await pool.query(
      `SELECT l.id,l.agent_id,l.leave_date,l.reason,l.status,l.reviewed_by,l.reviewed_at,
              u.full_name AS agent_name, reviewer.full_name AS reviewer_name,
              (SELECT COUNT(*) FROM agent_leave_coverages c WHERE c.leave_id=l.id) AS covered_groups
       FROM agent_leaves l JOIN users u ON u.id=l.agent_id
       LEFT JOIN users reviewer ON reviewer.id=l.reviewed_by
       ${isAdmin ? '' : 'WHERE l.agent_id=?'}
       ORDER BY l.leave_date DESC,l.id DESC`, isAdmin ? [] : [req.user.id]);
    const [coverage] = await pool.query(
      `SELECT c.leave_id,c.group_id,c.covering_agent_id,g.group_name,u.full_name AS covering_agent_name
       FROM agent_leave_coverages c JOIN chit_groups g ON g.id=c.group_id JOIN users u ON u.id=c.covering_agent_id
       JOIN agent_leaves l ON l.id=c.leave_id ${isAdmin ? '' : 'WHERE (c.covering_agent_id=? OR l.agent_id=?)'}`,
      isAdmin ? [] : [req.user.id,req.user.id]);
    res.json({ success: true, leaves, coverage });
  } catch (error) { next(error); }
}

export async function listCoverageHistory(req, res, next) {
  try {
    const isAdmin = ['ADMIN','SUPER_ADMIN'].includes(req.user.role);
    const { start_date, end_date, agent_id } = req.query;
    const clauses = ["l.status='APPROVED'"];
    const params = [];
    if (!isAdmin) { clauses.push('(l.agent_id=? OR c.covering_agent_id=?)'); params.push(req.user.id,req.user.id); }
    if (start_date) { clauses.push('l.leave_date>=?'); params.push(start_date); }
    if (end_date) { clauses.push('l.leave_date<=?'); params.push(end_date); }
    if (isAdmin && agent_id) { clauses.push('l.agent_id=?'); params.push(agent_id); }
    const [rows] = await pool.query(
      `SELECT l.id AS leave_id,l.leave_date,l.agent_id AS absent_agent_id,absent.full_name AS absent_agent_name,
              c.group_id,g.group_name,g.group_code,c.covering_agent_id,coverer.full_name AS covering_agent_name,
              COUNT(DISTINCT gm.member_id) AS total_tasks,
              COUNT(DISTINCT CASE WHEN col.total_paid>=g.installment_amount THEN gm.member_id END) AS completed_tasks,
              GROUP_CONCAT(DISTINCT CASE WHEN col.total_paid>=g.installment_amount THEN CONCAT(m.full_name,' — ',col.handler_names) END ORDER BY m.full_name SEPARATOR '||') AS completed_by,
              GROUP_CONCAT(DISTINCT CASE WHEN col.total_paid<g.installment_amount OR col.total_paid IS NULL THEN CONCAT(m.id,':',m.full_name,':',COALESCE(col.total_paid,0),':',GREATEST(g.installment_amount-COALESCE(col.total_paid,0),0),':',COALESCE(col.handler_names,'')) END ORDER BY m.full_name SEPARATOR '||') AS pending_tasks
       FROM agent_leaves l JOIN users absent ON absent.id=l.agent_id
       JOIN agent_leave_coverages c ON c.leave_id=l.id
       JOIN users coverer ON coverer.id=c.covering_agent_id
       JOIN chit_groups g ON g.id=c.group_id
       LEFT JOIN group_memberships gm ON gm.group_id=g.id AND gm.status='ACTIVE'
       LEFT JOIN members m ON m.id=gm.member_id
       LEFT JOIN (
         SELECT c.group_id,c.member_id,c.collection_date,
                 SUM(c.amount) AS total_paid,
                 SUM(CASE WHEN (c.payment_method = 'CASH' OR c.payment_method IS NULL) THEN c.amount ELSE 0 END) AS cash_paid,
                 SUM(CASE WHEN (c.payment_method != 'CASH' AND c.payment_method IS NOT NULL) THEN c.amount ELSE 0 END) AS upi_paid,
                GROUP_CONCAT(DISTINCT CONCAT(handler.full_name, IF(handler.role IN ('ADMIN','SUPER_ADMIN'), ' (Admin)', ' (Agent)')) ORDER BY handler.full_name SEPARATOR ', ') AS handler_names
         FROM collections c LEFT JOIN users handler ON handler.id=c.agent_id
         WHERE c.verification_status!='CANCELLED'
         GROUP BY c.group_id,c.member_id,c.collection_date
       ) col ON col.group_id=g.id AND col.member_id=gm.member_id AND col.collection_date=l.leave_date
       WHERE ${clauses.join(' AND ')}
       GROUP BY l.id,l.leave_date,l.agent_id,absent.full_name,c.group_id,g.group_name,g.group_code,g.installment_amount,c.covering_agent_id,coverer.full_name
       ORDER BY l.leave_date DESC,l.id DESC,g.group_name ASC`, params);
    res.json({success:true,history:rows.map(row=>({...row,
      completed_tasks:Number(row.completed_tasks||0),total_tasks:Number(row.total_tasks||0),
      completed_by:row.completed_by?row.completed_by.split('||'):[],
      pending_tasks:row.pending_tasks?row.pending_tasks.split('||').map(task=>{const [memberId,memberName,amount,remaining,...handlers]=task.split(':');return {member_id:Number(memberId),member_name:memberName,paid_so_far:Number(amount||0),remaining_due:Number(remaining||0),recorded_by:handlers.join(':')}}):[]
    }))});
  } catch(error) { next(error); }
}

export async function createLeave(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { start_date, end_date, dates, reason = '', agent_id } = req.body;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role);
    const targetAgentId = (isAdmin && agent_id) ? Number(agent_id) : req.user.id;
    const chosen = Array.isArray(dates) ? dates : [];
    if (start_date && end_date) {
      const start = new Date(`${start_date}T00:00:00Z`), end = new Date(`${end_date}T00:00:00Z`);
      if (Number.isNaN(+start) || Number.isNaN(+end) || end < start || (end-start)/86400000 > 365) return res.status(400).json({success:false,message:'Choose a valid leave range of up to one year.'});
      for (let d = start; d <= end; d = new Date(+d + 86400000)) chosen.push(d.toISOString().slice(0,10));
    }
    const uniqueDates = [...new Set(chosen)].sort();
    if (!uniqueDates.length || uniqueDates.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d))) return res.status(400).json({success:false,message:'Choose one or more valid leave dates.'});
    await conn.beginTransaction();
    for (const date of uniqueDates) {
      await conn.execute(`INSERT INTO agent_leaves (agent_id,leave_date,reason,status) VALUES (?,?,?,'PENDING') ON DUPLICATE KEY UPDATE reason=IF(status='REJECTED',VALUES(reason),reason),status=IF(status='REJECTED','PENDING',status)`, [targetAgentId,date,String(reason).slice(0,500)]);
    }
    await conn.commit();
    const [agentRows] = await pool.query('SELECT full_name FROM users WHERE id=?', [targetAgentId]);
    const requesterName = agentRows[0]?.full_name || req.user.full_name;
    await createNotification({targetRole:'ADMIN',title:'Agent leave approval requested',message:`${requesterName} requested leave for ${uniqueDates.join(', ')}.`,type:'GENERAL',link:'/admin/leaves'});
    res.status(201).json({success:true,message:`Leave request submitted for ${uniqueDates.length} day(s).`});
  } catch(error) { await conn.rollback(); next(error); } finally { conn.release(); }
}

export async function reviewLeave(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params, { decision, assignments = [] } = req.body;
    if (!['APPROVED','REJECTED'].includes(decision)) return res.status(400).json({success:false,message:'Choose approve or reject.'});
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM agent_leaves WHERE id=? FOR UPDATE',[id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({success:false,message:'Leave request not found.'}); }
    const leave = rows[0];
    if (leave.status !== 'PENDING' && !(leave.status === 'APPROVED' && decision === 'APPROVED')) { await conn.rollback(); return res.status(409).json({success:false,message:'This request has already been reviewed.'}); }
    if (decision === 'APPROVED') {
      const [groups] = await conn.execute('SELECT group_id FROM agent_group_assignments WHERE agent_id=? AND is_active=1',[leave.agent_id]);
      const groupIds = new Set(groups.map(g=>Number(g.group_id)));
      const assigned = new Set();
      for (const item of assignments) {
        const groupId=Number(item.group_id), agentId=Number(item.covering_agent_id);
        if (!groupIds.has(groupId) || assigned.has(groupId) || agentId===leave.agent_id) throw Object.assign(new Error('Assign each absent route to a different active agent.'),{status:400});
        const [agents] = await conn.execute("SELECT id, role, full_name FROM users WHERE id=? AND role IN ('COLLECTION_AGENT', 'ADMIN', 'SUPER_ADMIN') AND is_active=1",[agentId]);
        if (!agents.length) throw Object.assign(new Error('Choose an active collection agent or administrator for coverage.'),{status:400});
        assigned.add(groupId);
      }
      if (assigned.size !== groupIds.size) throw Object.assign(new Error('Assign every route belonging to the absent agent before approving leave.'),{status:400});
      await conn.execute('DELETE FROM agent_leave_coverages WHERE leave_id=?',[id]);
      for (const item of assignments) await conn.execute('INSERT INTO agent_leave_coverages (leave_id,group_id,covering_agent_id,created_by) VALUES (?,?,?,?)',[id,Number(item.group_id),Number(item.covering_agent_id),req.user.id]);
    }
    await conn.execute('UPDATE agent_leaves SET status=?,reviewed_by=?,reviewed_at=NOW() WHERE id=?',[decision,req.user.id,id]);
    await conn.commit();
    if (leave.status === 'PENDING') await createNotification({userId:leave.agent_id,title:`Leave request ${decision.toLowerCase()}`,message:`Your leave request for ${String(leave.leave_date).slice(0,10)} was ${decision.toLowerCase()}.`,type:'GENERAL',link:'/agent/dashboard'});
    if (decision === 'APPROVED') {
      for (const item of assignments) {
        await createNotification({userId:Number(item.covering_agent_id),title:'Temporary route coverage assigned',message:`You have an absent agent's route coverage on ${String(leave.leave_date).slice(0,10)}. Open your tasks to review the member roster.`,type:'COLLECTION',link:'/agent/dashboard'});
      }
    }
    res.json({success:true,message:leave.status === 'APPROVED' ? 'Coverage updated.' : `Leave ${decision.toLowerCase()}.`});
  } catch(error) { await conn.rollback(); if(error.status) return res.status(error.status).json({success:false,message:error.message}); next(error); } finally { conn.release(); }
}
