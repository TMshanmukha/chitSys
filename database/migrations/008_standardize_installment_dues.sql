-- Migration 008: Standardize Installment Dues and Preserve Member Dividend Credits
-- Rule: The installment due for any chit scheme is always the full chit installment amount (e.g. ₹500).
-- Dividend earned from reverse auctions is credited to the respective member's passbook,
-- but is NEVER subtracted from the installment due amount.

-- 1. Standardize auctions table next_installment_payable to match the full group installment_amount
UPDATE auctions a
JOIN chit_groups g ON a.group_id = g.id
SET a.next_installment_payable = g.installment_amount
WHERE a.next_installment_payable != g.installment_amount;

-- 2. Standardize member_dividends table net_installment_due to match the full group installment_amount
UPDATE member_dividends md
JOIN chit_groups g ON md.group_id = g.id
SET md.net_installment_due = g.installment_amount
WHERE md.net_installment_due != g.installment_amount;
