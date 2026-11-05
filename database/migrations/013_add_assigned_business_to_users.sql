-- Migration 013: Add assigned_business to users for strict business segregation
-- Super Admin & Admin have access to ALL platforms ('ALL')
-- Collection Agents belong strictly to either 'CHITFUND' or 'INTEREST'

ALTER TABLE `users` 
ADD COLUMN `assigned_business` ENUM('CHITFUND', 'INTEREST', 'ALL') NOT NULL DEFAULT 'CHITFUND'
AFTER `role`;

-- Set administrators to have global access across all business portals
UPDATE `users` SET `assigned_business` = 'ALL' WHERE `role` IN ('SUPER_ADMIN', 'ADMIN');

-- Automatically assign any agent who has loan collections or interest assignments to 'INTEREST'
UPDATE `users` u
JOIN `interest_agent_assignments` iaa ON u.id = iaa.agent_id
SET u.assigned_business = 'INTEREST'
WHERE u.role = 'COLLECTION_AGENT';
