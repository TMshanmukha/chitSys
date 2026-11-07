import { formatDate } from './dateUtils';

/**
 * Clean phone number and open WhatsApp web/app link
 */
export function sendWhatsAppMessage(phone, text) {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone) {
    alert('No valid phone number available for this subscriber.');
    return;
  }
  const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/**
 * 1. Collection Receipt Message for WhatsApp (Admin & Agent)
 */
export function getReceiptWhatsAppText(receipt) {
  const receiptNo = receipt.receiptNumber || receipt.receipt_number || 'N/A';
  const memberName = receipt.memberName || receipt.member_name || 'Subscriber';
  const groupName = receipt.groupName || receipt.group_name || 'Chit Scheme';
  const groupCode = receipt.groupCode || receipt.group_code || '';
  const amount = Number(receipt.amount || 0).toLocaleString('en-IN');
  const method = receipt.paymentMethod || receipt.payment_method || 'CASH';
  const agent = receipt.agentName || receipt.agent_name || 'Office Admin';
  const dateStr = receipt.date || receipt.collection_date ? formatDate(receipt.date || receipt.collection_date) : 'Today';

  return `*CHITFUND PRO - PAYMENT RECEIPT*
Receipt #: ${receiptNo}
Date: ${dateStr}
Subscriber: ${memberName}
Chit Scheme: ${groupName} ${groupCode ? `(${groupCode})` : ''}
Amount Paid: ₹${amount}
Payment Mode: ${method}
Collected By: ${agent}

Thank you for your payment!`;
}

/**
 * 2. Member Chart Installment Reminder Message for WhatsApp
 */
export function getChartReminderWhatsAppText(member, group, totalPeriods, periodLabel = 'Periods') {
  const groupName = group?.group_name || 'Chit Scheme';
  const groupCode = group?.group_code || '';
  const memberName = member.full_name || 'Subscriber';
  const ticket = member.ticket_number || 'N/A';
  const installment = Number(group?.installment_amount || 0).toLocaleString('en-IN');
  const totalPaid = Number(member.totalPaid || 0).toLocaleString('en-IN');
  const amountRemaining = Number(member.amountRemaining || 0).toLocaleString('en-IN');
  const periodsPaid = member.daysPaid ?? 0;
  const periodsPending = member.daysLeft ?? 0;

  return `*CHITFUND PRO - INSTALLMENT PAYMENT REMINDER*
Chit Scheme: ${groupName} ${groupCode ? `(${groupCode})` : ''}
Subscriber: ${memberName}
Ticket #: ${ticket}
Installment Due: ₹${installment}
Total Paid: ₹${totalPaid} (${periodsPaid} / ${totalPeriods} ${periodLabel})
Pending Amount: ₹${amountRemaining} (${periodsPending} ${periodLabel} pending)

Please clear your pending chit installment at the earliest.
Thank you for banking with us!`;
}

/**
 * 3. Member Passbook & Statement Message for WhatsApp
 */
export function getPassbookWhatsAppText(member, passbookData, specificGroup = null) {
  const memberName = member?.full_name || 'Subscriber';
  const memberCode = member?.member_code || '';
  const phone = member?.phone || '';
  const summary = passbookData?.summary || {};
  const totalPaid = Number(summary.totalPaid || 0).toLocaleString('en-IN');
  const dividends = Number(summary.totalDividendsEarned || 0).toLocaleString('en-IN');
  const prizeWon = Number(summary.totalPrizeMoneyWon || 0).toLocaleString('en-IN');
  const netPosition = Number(summary.netPosition || 0).toLocaleString('en-IN');
  const groupsCount = passbookData?.enrolledGroups?.length || (specificGroup ? 1 : 0);
  const receiptsCount = passbookData?.collections?.length || 0;

  const groupInfo = specificGroup
    ? `Chit Scheme: ${specificGroup.group_name} (${specificGroup.group_code || ''})\n`
    : `Active Enrolled Schemes: ${groupsCount}\n`;

  return `*CHITFUND PRO - SUBSCRIBER STATEMENT / PASSBOOK*
Subscriber: ${memberName} ${memberCode ? `(${memberCode})` : ''}
Phone: ${phone}
${groupInfo}Total Amount Contributed: ₹${totalPaid}
Dividends Earned: ₹${dividends}
Prize Money Lifted: ₹${prizeWon}
Net Account Balance: ₹${netPosition}
Verified Receipts Issued: ${receiptsCount}

Official account passbook record issued by ChitFund Pro. For statement inquiries, please contact management.`;
}

