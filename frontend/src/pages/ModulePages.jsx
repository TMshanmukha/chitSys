import React from 'react';
import ComingSoonPage from '../components/ComingSoonPage';

export function ChitGroupsPage() {
  return (
    <ComingSoonPage
      title="Chit Groups Management"
      moduleCode="CHIT_GROUPS"
      description="Configure daily and monthly chit schemes, set total pool amounts, define duration schedules, and assign collection agents to specific group locations."
      roadmapSteps={[
        'Define Daily and Monthly scheme rules with installment amounts',
        'Assign route locations and geographic collection sectors',
        'Enroll verified members and map ticket numbers',
        'Monitor group progression, auction dividends, and cycle status',
      ]}
      databasePreview="CREATE TABLE chit_groups (id, group_code, group_name, frequency ENUM('DAILY', 'MONTHLY'), installment_amount DECIMAL, total_pool_amount DECIMAL...)"
    />
  );
}

export function AgentsPage() {
  return (
    <ComingSoonPage
      title="Collection Agents & Route Assignments"
      moduleCode="AGENTS"
      description="Manage field collection agents, assign them to designated chit groups and physical locations, and monitor daily collection performance."
      roadmapSteps={[
        'Create new Collection Agent credentials with secure passwords or PINs',
        'Assign agents to specific daily/monthly chit group routes',
        'Review individual agent collection tallies and cash handovers',
        'Activate or deactivate field agent login permissions instantly',
      ]}
      databasePreview="CREATE TABLE agent_group_assignments (id, agent_id FK, group_id FK, assigned_date, is_active...)"
    />
  );
}

export function MembersPage() {
  return (
    <ComingSoonPage
      title="Chit Fund Members Directory"
      moduleCode="MEMBERS"
      description="Maintain a centralized participant database with contact records and KYC documentation. Note: In this system, chit members do not have login access."
      roadmapSteps={[
        'Record member contact details, physical address, and phone numbers',
        'Attach member identification and KYC documents',
        'Track member participation across multiple concurrent chit groups',
        'View complete payment history and pending installment balances',
      ]}
      databasePreview="CREATE TABLE members (id, member_code UK, full_name, phone, kyc_document_number, is_active...)"
    />
  );
}

export function CollectionsPage() {
  return (
    <ComingSoonPage
      title="Collections & Cash/Digital Payment Logging"
      moduleCode="COLLECTIONS"
      description="Record and verify daily and monthly chit installment payments collected via cash, UPI, bank transfer, or cheque."
      roadmapSteps={[
        'Accept real-time payment entries submitted by authorized agents',
        'Distinguish between physical cash collections and digital UPI payments',
        'Issue unique, traceable receipt numbers for every transaction',
        'Perform daily cash handover verification and settlement approvals',
      ]}
      databasePreview="CREATE TABLE collections (id, receipt_number UK, group_id FK, member_id FK, agent_id FK, amount DECIMAL, payment_method ENUM('CASH', 'UPI')...)"
    />
  );
}

export function ReportsPage() {
  return (
    <ComingSoonPage
      title="Financial & Reconciliation Reports"
      moduleCode="REPORTS"
      description="Generate comprehensive business reports filtering by date, agent, chit group, and payment method with export capabilities."
      roadmapSteps={[
        'Daily route collection summaries and discrepancy reports',
        'Cash versus digital UPI reconciliation reports',
        'Member installment delinquency and pending due statements',
        'Upcoming payout forecasts and client dividend summaries',
      ]}
      databasePreview="CREATE TABLE cash_handovers (id, agent_id FK, handover_date, expected_cash_amount DECIMAL, received_cash_amount DECIMAL, variance DECIMAL...)"
    />
  );
}

export function UsersPage() {
  return (
    <ComingSoonPage
      title="User Management & Sub-Admin Roles"
      moduleCode="USERS"
      description="Provision administrative accounts and define role-based access permissions for business managers and staff."
      roadmapSteps={[
        'Create and invite Sub-Administrator accounts',
        'Configure granular permissions for group creation vs collection approvals',
        'Audit login history and IP access records',
        'Manage account activation states and credential resets',
      ]}
      databasePreview="CREATE TABLE role_permissions (id, role ENUM('SUPER_ADMIN', 'ADMIN', 'COLLECTION_AGENT'), permission_key, description...)"
    />
  );
}

export function SettingsPage() {
  return (
    <ComingSoonPage
      title="System Settings & Security Policies"
      moduleCode="SETTINGS"
      description="Configure business operating parameters, JWT session timeouts, authentication rate limits, and audit trail retention."
      roadmapSteps={[
        'Configure session timeouts and security header policies',
        'Set up automated database backup schedules',
        'Define business receipt numbering prefix conventions',
        'Review server diagnostics and environment variables',
      ]}
      databasePreview="Database Engine: MySQL 9.3 | Authentication: JWT (HttpOnly Cookie) | Password Hash: Bcrypt/Argon2id"
    />
  );
}
