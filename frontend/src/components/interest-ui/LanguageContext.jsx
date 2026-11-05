import React, { createContext, useContext, useState, useEffect } from 'react';

const DICTIONARY = {
  en: {
    home: 'Home',
    collect: 'Collect',
    customers: 'Customers',
    reports: 'Reports',
    more: 'More',
    newLoan: 'New Loan',
    collectMoney: 'Collect Money',
    toCollectToday: 'To Collect Today',
    collectedToday: 'Collected Today',
    pending: 'Pending',
    paid: 'Paid',
    overdue: 'Overdue',
    todaysDue: "Today's Due List",
    searchBorrower: 'Search borrower by name or phone...',
    amountGiven: 'Amount Given',
    balanceLeft: 'Balance Left',
    dueToday: 'Due Today',
    interest: 'Interest',
    payEvery: 'Pay Every',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    monthlyVaddi: 'Monthly Vaddi',
    forHowLong: 'For How Long',
    days: 'Days',
    weeks: 'Weeks',
    months: 'Months',
    giveLoan: 'Give Loan',
    cash: 'Cash',
    upi: 'UPI / Online',
    bank: 'Bank Transfer',
    sendWhatsAppReceipt: 'Send WhatsApp Receipt',
    printReceipt: 'Print Receipt',
    done: 'Done',
    passbook: 'Passbook',
    totalGivenOut: 'Total Given Out',
    interestEarned: 'Interest Earned',
    collectedLast7Days: 'Collected Last 7 Days',
    loanTypes: 'Loan Types',
    agents: 'Agents',
    settings: 'Settings',
    language: 'Language',
    switchToChitFund: 'Switch to ChitFund Pro',
    logout: 'Logout',
    all: 'All',
    active: 'Active',
    closed: 'Closed',
    addCustomer: 'Add Customer',
    call: 'Call',
    whatsApp: 'WhatsApp',
    amountTaken: 'Amount Taken',
    totalPaid: 'Total Paid',
    balanceToClose: 'Balance to Close',
    paymentTimeline: 'Payment Timeline',
    handoverToAdmin: 'Hand over to Admin',
    cashInHand: 'Cash in Hand',
  },
  te: {
    home: 'హోమ్',
    collect: 'వసూలు',
    customers: 'ఖాతాదారులు',
    reports: 'నివేదికలు',
    more: 'మరిన్ని',
    newLoan: '+ కొత్త రుణం',
    collectMoney: '₹ డబ్బు వసూలు',
    toCollectToday: 'ఈరోజు రావలసినవి',
    collectedToday: 'ఈరోజు వసూలైనవి',
    pending: 'బాకీ మొత్తం',
    paid: 'చెల్లించినవి',
    overdue: 'గడువు దాటినవి',
    todaysDue: 'ఈరోజు వసూలు జాబితా',
    searchBorrower: 'ఖాతాదారుని పేరు లేదా ఫోన్ నంబర్...',
    amountGiven: 'ఇచ్చిన మొత్తం',
    balanceLeft: 'మిగిలిన బ్యాలెన్స్',
    dueToday: 'ఈరోజు చెల్లించాల్సింది',
    interest: 'వడ్డీ',
    payEvery: 'చెల్లింపు విధానం',
    daily: 'రోజువారీ',
    weekly: 'వారపు',
    monthly: 'నెలవారీ',
    monthlyVaddi: 'నెలవారీ వడ్డీ (వడ్డీ వ్యాపారం)',
    forHowLong: 'ఎన్ని రోజులు / నెలలు',
    days: 'రోజులు',
    weeks: 'వారాలు',
    months: 'నెలలు',
    giveLoan: 'రుణం ఇవ్వండి',
    cash: 'నగదు',
    upi: 'యూపీఐ / ఆన్‌లైన్',
    bank: 'బ్యాంక్',
    sendWhatsAppReceipt: 'వాట్సాప్ రసీదు పంపండి',
    printReceipt: 'రసీదు ప్రింట్ చేయండి',
    done: 'పూర్తయింది',
    passbook: 'పాస్‌బుక్',
    totalGivenOut: 'మొత్తం ఇచ్చిన రుణాలు',
    interestEarned: 'వచ్చిన వడ్డీ ఆదాయం',
    collectedLast7Days: 'గత 7 రోజుల వసూళ్లు',
    loanTypes: 'రుణాల రకాలు',
    agents: 'ఏజెంట్లు',
    settings: 'సెట్టింగ్స్',
    language: 'భాష (Language)',
    switchToChitFund: 'చిట్‌ఫండ్ ప్రో కి మారండి',
    logout: 'లాగౌట్',
    all: 'అన్నీ',
    active: 'యాక్టివ్',
    closed: 'క్లోజ్ అయినవి',
    addCustomer: 'కొత్త ఖాతాదారుడు',
    call: 'కాల్ చేయండి',
    whatsApp: 'వాట్సాప్',
    amountTaken: 'తీసుకున్న మొత్తం',
    totalPaid: 'చెల్లించిన మొత్తం',
    balanceToClose: 'ఖాతా ముగింపు మొత్తం',
    paymentTimeline: 'చెల్లింపుల వివరాలు',
    handoverToAdmin: 'అడ్మిన్‌కు నగదు ఇవ్వండి',
    cashInHand: 'చేతిలో ఉన్న నగదు',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('finlend_lang') || 'en';
    } catch (_) {
      return 'en';
    }
  });

  const toggleLanguage = () => {
    const next = lang === 'en' ? 'te' : 'en';
    setLang(next);
    try {
      localStorage.setItem('finlend_lang', next);
    } catch (_) {}
  };

  const t = (key) => {
    return DICTIONARY[lang]?.[key] || DICTIONARY.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      lang: 'en',
      setLang: () => {},
      toggleLanguage: () => {},
      t: (key) => DICTIONARY.en[key] || key,
    };
  }
  return ctx;
}
