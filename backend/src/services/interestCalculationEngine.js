/**
 * Centralized Financial Calculation Engine for FinLend Pro Interest Business
 * 
 * Features:
 * - Decimal-safe rounding and monetary arithmetic
 * - Flat Interest (Upfront calculation)
 * - Reducing Balance (Standard EMI amortization)
 * - Periodic Interest-Only (Vaddi Vyaparam / Bullet Repayment)
 * - Daily Balance (End-of-day outstanding calculation)
 * - Schedule generator with robust date progression
 * - Configurable payment allocation priority
 */

/**
 * Rounds a number safely to 2 decimal places (Half-Up).
 * @param {number|string} val 
 * @returns {number}
 */
export function roundMoney(val) {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Normalizes interest rate to period rate based on rate_period and repayment_frequency.
 * @param {number} rate - Stated interest rate (e.g. 18 for 18% per annum, or 2 for 2% per month)
 * @param {'ANNUAL'|'MONTHLY'|'WEEKLY'|'DAILY'} ratePeriod - What period the rate is quoted in
 * @param {'DAILY'|'WEEKLY'|'MONTHLY'|'BULLET'} frequency - Repayment frequency
 * @returns {number} Decimal rate per installment period (e.g. 0.015 for 1.5% per month)
 */
export function getPeriodRateDecimal(rate, ratePeriod, frequency) {
  const r = parseFloat(rate) || 0;
  
  // First convert stated rate to annual percentage
  let annualRatePercent = r;
  if (ratePeriod === 'MONTHLY') annualRatePercent = r * 12;
  else if (ratePeriod === 'WEEKLY') annualRatePercent = r * 52;
  else if (ratePeriod === 'DAILY') annualRatePercent = r * 365;

  // Now convert annual percentage to decimal per installment frequency
  if (frequency === 'DAILY') return (annualRatePercent / 365) / 100;
  if (frequency === 'WEEKLY') return (annualRatePercent / 52) / 100;
  if (frequency === 'MONTHLY') return (annualRatePercent / 12) / 100;
  if (frequency === 'BULLET') return (annualRatePercent / 12) / 100;

  return (annualRatePercent / 12) / 100;
}

/**
 * Adds an interval to a given date string (YYYY-MM-DD).
 * Handles month-end boundaries safely (e.g. Jan 31 + 1 month = Feb 28/29).
 * @param {string|Date} dateInput 
 * @param {'DAILY'|'WEEKLY'|'MONTHLY'|'BULLET'} frequency 
 * @param {number} periodsToAdd 
 * @returns {string} YYYY-MM-DD
 */
export function addInterval(dateInput, frequency, periodsToAdd = 1) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);

  if (frequency === 'DAILY') {
    d.setDate(d.getDate() + periodsToAdd);
  } else if (frequency === 'WEEKLY') {
    d.setDate(d.getDate() + (periodsToAdd * 7));
  } else if (frequency === 'MONTHLY') {
    const originalDay = d.getDate();
    d.setMonth(d.getMonth() + periodsToAdd);
    // If month overflowed (e.g. Feb 31 -> March 3), snap to last day of target month
    if (d.getDate() < originalDay) {
      d.setDate(0);
    }
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Generates the complete loan preview and repayment schedule.
 * 
 * @param {Object} params
 * @param {number} params.principal - Loan principal amount (e.g. 50000)
 * @param {number} params.interest_rate - Interest rate (e.g. 18.0)
 * @param {'ANNUAL'|'MONTHLY'|'WEEKLY'|'DAILY'} params.rate_period
 * @param {'FLAT'|'REDUCING_BALANCE'|'INTEREST_ONLY'|'DAILY_BALANCE'} params.calculation_method
 * @param {'DAILY'|'WEEKLY'|'MONTHLY'|'BULLET'} params.repayment_frequency
 * @param {number} params.tenure_periods - Total number of installments
 * @param {string} params.start_date - Disbursement date (YYYY-MM-DD)
 * @param {string} [params.first_due_date] - Optional custom first due date
 * @returns {Object} { installment_amount, total_interest_expected, total_payable, schedules: Array, maturity_date }
 */
export function calculateLoanSchedule({
  principal,
  interest_rate,
  rate_period = 'MONTHLY',
  calculation_method = 'FLAT',
  repayment_frequency = 'MONTHLY',
  tenure_periods = 12,
  start_date = new Date().toISOString().slice(0, 10),
  first_due_date,
}) {
  const P = roundMoney(principal);
  const N = Math.max(1, parseInt(tenure_periods, 10) || 1);
  const r = getPeriodRateDecimal(interest_rate, rate_period, repayment_frequency);
  const startDateStr = String(start_date).slice(0, 10);
  const firstDueDateStr = first_due_date
    ? String(first_due_date).slice(0, 10)
    : (repayment_frequency === 'DAILY' ? startDateStr : addInterval(startDateStr, repayment_frequency, 1));

  const schedules = [];
  let totalInterest = 0;
  let totalPrincipal = 0;
  let installmentAmount = 0;

  if (calculation_method === 'FLAT') {
    // Flat rate: Total interest is fixed upfront = Principal * r * N
    totalInterest = roundMoney(P * r * N);
    const totalPayable = roundMoney(P + totalInterest);
    installmentAmount = roundMoney(totalPayable / N);

    const basePrincipalPerPeriod = roundMoney(P / N);
    const baseInterestPerPeriod = roundMoney(totalInterest / N);

    let runningPrincipalSum = 0;
    let runningInterestSum = 0;

    for (let i = 1; i <= N; i++) {
      const dueDate = i === 1 ? firstDueDateStr : addInterval(firstDueDateStr, repayment_frequency, i - 1);
      
      // Last installment adjustment for perfect rounding match
      let pDue = basePrincipalPerPeriod;
      let iDue = baseInterestPerPeriod;
      if (i === N) {
        pDue = roundMoney(P - runningPrincipalSum);
        iDue = roundMoney(totalInterest - runningInterestSum);
      } else {
        runningPrincipalSum = roundMoney(runningPrincipalSum + pDue);
        runningInterestSum = roundMoney(runningInterestSum + iDue);
      }

      const totDue = roundMoney(pDue + iDue);

      schedules.push({
        installment_number: i,
        due_date: dueDate,
        principal_due: pDue,
        interest_due: iDue,
        penalty_due: 0.00,
        total_due: totDue,
        principal_paid: 0.00,
        interest_paid: 0.00,
        penalty_paid: 0.00,
        total_paid: 0.00,
        status: 'PENDING',
        remaining_balance: roundMoney(P - (runningPrincipalSum + (i === N ? pDue : 0))),
      });
    }

    return {
      installment_amount: installmentAmount,
      total_interest_expected: totalInterest,
      total_payable: totalPayable,
      maturity_date: schedules[schedules.length - 1]?.due_date || firstDueDateStr,
      schedules,
    };
  }

  if (calculation_method === 'REDUCING_BALANCE') {
    // Standard Amortization Formula (EMI)
    // EMI = P * r * (1 + r)^N / ((1 + r)^N - 1)
    if (r <= 0) {
      installmentAmount = roundMoney(P / N);
    } else {
      const pow = Math.pow(1 + r, N);
      installmentAmount = roundMoney((P * r * pow) / (pow - 1));
    }

    let balance = P;
    for (let i = 1; i <= N; i++) {
      const dueDate = i === 1 ? firstDueDateStr : addInterval(firstDueDateStr, repayment_frequency, i - 1);
      let iDue = roundMoney(balance * r);
      let pDue = roundMoney(installmentAmount - iDue);

      if (i === N || pDue > balance) {
        pDue = balance;
        installmentAmount = roundMoney(pDue + iDue);
      }

      balance = roundMoney(balance - pDue);
      totalInterest = roundMoney(totalInterest + iDue);
      totalPrincipal = roundMoney(totalPrincipal + pDue);

      schedules.push({
        installment_number: i,
        due_date: dueDate,
        principal_due: pDue,
        interest_due: iDue,
        penalty_due: 0.00,
        total_due: roundMoney(pDue + iDue),
        principal_paid: 0.00,
        interest_paid: 0.00,
        penalty_paid: 0.00,
        total_paid: 0.00,
        status: 'PENDING',
        remaining_balance: Math.max(0, balance),
      });
    }

    return {
      installment_amount: installmentAmount,
      total_interest_expected: totalInterest,
      total_payable: roundMoney(P + totalInterest),
      maturity_date: schedules[schedules.length - 1]?.due_date || firstDueDateStr,
      schedules,
    };
  }

  if (calculation_method === 'INTEREST_ONLY') {
    // Vaddi / Bullet Repayment: Periodic interest only, full principal at maturity
    const periodicInterest = roundMoney(P * r);
    installmentAmount = periodicInterest;
    totalInterest = roundMoney(periodicInterest * N);

    for (let i = 1; i <= N; i++) {
      const dueDate = i === 1 ? firstDueDateStr : addInterval(firstDueDateStr, repayment_frequency, i - 1);
      const isMaturity = i === N;
      const pDue = isMaturity ? P : 0.00;
      const iDue = periodicInterest;
      const totDue = roundMoney(pDue + iDue);

      schedules.push({
        installment_number: i,
        due_date: dueDate,
        principal_due: pDue,
        interest_due: iDue,
        penalty_due: 0.00,
        total_due: totDue,
        principal_paid: 0.00,
        interest_paid: 0.00,
        penalty_paid: 0.00,
        total_paid: 0.00,
        status: 'PENDING',
        remaining_balance: isMaturity ? 0.00 : P,
      });
    }

    return {
      installment_amount: installmentAmount,
      total_interest_expected: totalInterest,
      total_payable: roundMoney(P + totalInterest),
      maturity_date: schedules[schedules.length - 1]?.due_date || firstDueDateStr,
      schedules,
    };
  }

  if (calculation_method === 'DAILY_BALANCE') {
    // Daily Balance: Each day accrues daily interest.
    const dailyInterest = roundMoney(P * r);
    const principalPerDay = roundMoney(P / N);
    installmentAmount = roundMoney(principalPerDay + dailyInterest);
    totalInterest = roundMoney(dailyInterest * N);

    let runningPrincipalSum = 0;
    for (let i = 1; i <= N; i++) {
      const dueDate = i === 1 ? firstDueDateStr : addInterval(firstDueDateStr, repayment_frequency, i - 1);
      let pDue = principalPerDay;
      if (i === N) {
        pDue = roundMoney(P - runningPrincipalSum);
      } else {
        runningPrincipalSum = roundMoney(runningPrincipalSum + pDue);
      }

      const totDue = roundMoney(pDue + dailyInterest);

      schedules.push({
        installment_number: i,
        due_date: dueDate,
        principal_due: pDue,
        interest_due: dailyInterest,
        penalty_due: 0.00,
        total_due: totDue,
        principal_paid: 0.00,
        interest_paid: 0.00,
        penalty_paid: 0.00,
        total_paid: 0.00,
        status: 'PENDING',
        remaining_balance: roundMoney(P - (runningPrincipalSum + (i === N ? pDue : 0))),
      });
    }

    return {
      installment_amount: installmentAmount,
      total_interest_expected: totalInterest,
      total_payable: roundMoney(P + totalInterest),
      maturity_date: schedules[schedules.length - 1]?.due_date || firstDueDateStr,
      schedules,
    };
  }

  // Fallback to simple installment split
  return {
    installment_amount: roundMoney(P / N),
    total_interest_expected: 0.00,
    total_payable: P,
    maturity_date: firstDueDateStr,
    schedules: [],
  };
}

/**
 * Allocates a received payment amount against due components based on scheme priority.
 * 
 * Standard priority:
 * 1. Late Penalty Due
 * 2. Interest Due
 * 3. Principal Due
 * 4. Excess (Advance)
 * 
 * Principal First priority:
 * 1. Principal Due
 * 2. Interest Due
 * 3. Late Penalty Due
 * 4. Excess
 * 
 * @param {Object} dues - { principal_due, interest_due, penalty_due }
 * @param {number} paymentAmount - Amount paid by subscriber
 * @param {'STANDARD'|'PRINCIPAL_FIRST'} [priority='STANDARD']
 * @returns {Object} { principal_component, interest_component, penalty_component, excess_component }
 */
export function allocatePayment(dues, paymentAmount, priority = 'STANDARD') {
  let remaining = roundMoney(paymentAmount);
  if (remaining <= 0) {
    return {
      principal_component: 0.00,
      interest_component: 0.00,
      penalty_component: 0.00,
      excess_component: 0.00,
    };
  }

  const pDue = roundMoney(dues.principal_due || 0);
  const iDue = roundMoney(dues.interest_due || 0);
  const penDue = roundMoney(dues.penalty_due || 0);

  let pComp = 0.00;
  let iComp = 0.00;
  let penComp = 0.00;

  if (priority === 'PRINCIPAL_FIRST') {
    // 1. Principal
    pComp = Math.min(remaining, pDue);
    remaining = roundMoney(remaining - pComp);

    // 2. Interest
    iComp = Math.min(remaining, iDue);
    remaining = roundMoney(remaining - iComp);

    // 3. Penalty
    penComp = Math.min(remaining, penDue);
    remaining = roundMoney(remaining - penComp);
  } else {
    // Standard: 1. Penalty
    penComp = Math.min(remaining, penDue);
    remaining = roundMoney(remaining - penComp);

    // 2. Interest
    iComp = Math.min(remaining, iDue);
    remaining = roundMoney(remaining - iComp);

    // 3. Principal
    pComp = Math.min(remaining, pDue);
    remaining = roundMoney(remaining - pComp);
  }

  return {
    principal_component: roundMoney(pComp),
    interest_component: roundMoney(iComp),
    penalty_component: roundMoney(penComp),
    excess_component: roundMoney(remaining),
  };
}

