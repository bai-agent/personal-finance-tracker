/**
 * Google Apps Script - Main Controller
 * Personal Finance Tracker for Bailey & Katie
 * 8 Accounts: CBA (4 - AUD), Starling (3 - GBP), Capital One (1 - GBP)
 */

var SHEET_ID = '1jIDRs9Vbm97RYbSf40jsTth6J8-WKcBgccX5EvpMTZ4';

var TABS = {
  TRANSACTIONS: 'Transactions',
  ACCOUNTS: 'Accounts',
  WAGES: 'Wages',
  BILLS: 'Recurring Bills',
  SAVINGS: 'Savings & Goals',
  PROJECTIONS: 'Projections',
  HISTORY: 'Monthly History',
  DASHBOARD: 'Dashboard',
  EXCHANGE: 'Exchange Rates'
};

var ACCOUNTS_LIST = [
  { name: 'BW Personal (Commonwealth)', type: 'Checking', bank: 'CBA', user: 'Bailey', purpose: 'Wages', currency: 'AUD' },
  { name: 'Katie Personal (Commonwealth)', type: 'Checking', bank: 'CBA', user: 'Katie', purpose: 'Wages', currency: 'AUD' },
  { name: 'Joint (Commonwealth)', type: 'Checking', bank: 'CBA', user: 'Joint', purpose: 'Recurring Bills', currency: 'AUD' },
  { name: 'Joint Saver (Commonwealth)', type: 'Savings', bank: 'CBA', user: 'Joint', purpose: 'Savings', currency: 'AUD' },
  { name: 'BW Personal (Starling)', type: 'Checking', bank: 'Starling', user: 'Bailey', purpose: 'Spending', currency: 'GBP' },
  { name: 'Katie Personal (Starling)', type: 'Checking', bank: 'Starling', user: 'Katie', purpose: 'Spending', currency: 'GBP' },
  { name: 'Joint (Starling)', type: 'Checking', bank: 'Starling', user: 'Joint', purpose: 'Food & Spending', currency: 'GBP' },
  { name: 'Credit Card (Capital One)', type: 'Credit', bank: 'Capital One', user: 'Joint', purpose: 'Credit', currency: 'GBP' }
];

// ==================== WEB APP ENDPOINT ====================

function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || 'all';
    var days = parseInt(params.days) || 7;
    var month = params.month || null;
    var accounts = params.accounts ? params.accounts.split(',') : null;
    var result;

    switch (action) {
      case 'all':
        result = getAllData(ss, days);
        break;
      case 'transactions':
        result = getTransactionData(ss, days, month, accounts);
        break;
      case 'transactions_all':
        result = getTransactionData(ss, 0, month, accounts);
        break;
      case 'accounts':
        result = { data: readSheet(ss, TABS.ACCOUNTS), timestamp: now() };
        break;
      case 'exchange':
        result = { rate: getExchangeRate(ss), timestamp: now() };
        break;
      default:
        var tabName = TABS[action.toUpperCase()] || action;
        result = { data: readSheet(ss, tabName), timestamp: now() };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message, stack: err.stack }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function now() { return new Date().toISOString(); }

// ==================== DATA RETRIEVAL ====================

function getAllData(ss, days) {
  var txns = getTransactionData(ss, days, null, null);
  return {
    accounts: readSheet(ss, TABS.ACCOUNTS),
    transactions: txns.data,
    transactionsMeta: txns.meta,
    wages: readSheet(ss, TABS.WAGES),
    bills: readSheet(ss, TABS.BILLS),
    savings: readSheet(ss, TABS.SAVINGS),
    projections: readSheet(ss, TABS.PROJECTIONS),
    history: readSheet(ss, TABS.HISTORY),
    dashboard: readSheet(ss, TABS.DASHBOARD),
    exchangeRate: getExchangeRate(ss),
    timestamp: now()
  };
}

function getTransactionData(ss, days, month, accountFilter) {
  var sheet = ss.getSheetByName(TABS.TRANSACTIONS);
  if (!sheet || sheet.getLastRow() <= 1) return { data: [], meta: { total: 0 } };

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var allData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  var dateIdx = headers.indexOf('Date');
  var accountIdx = headers.indexOf('Account');

  var filtered = allData;

  // Filter by date
  if (month) {
    // month format: "2026-02"
    filtered = filtered.filter(function(row) {
      var d = new Date(row[dateIdx]);
      var m = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      return m === month;
    });
  } else if (days > 0) {
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    filtered = filtered.filter(function(row) {
      return new Date(row[dateIdx]) >= cutoff;
    });
  }

  // Filter by accounts
  if (accountFilter && accountFilter.length > 0) {
    filtered = filtered.filter(function(row) {
      return accountFilter.indexOf(row[accountIdx]) >= 0;
    });
  }

  // Convert to objects
  var result = filtered.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });

  return {
    data: result,
    meta: {
      total: allData.length,
      filtered: result.length,
      days: days,
      month: month
    }
  };
}

function getExchangeRate(ss) {
  var sheet = ss.getSheetByName(TABS.EXCHANGE);
  if (!sheet || sheet.getLastRow() <= 1) return { gbpToAud: 1.95, audToGbp: 0.513, date: now(), source: 'default' };

  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(lastRow, 1, 1, 4).getValues()[0];
  return {
    gbpToAud: data[1] || 1.95,
    audToGbp: data[2] || 0.513,
    date: data[0] ? new Date(data[0]).toISOString() : now(),
    source: data[3] || 'manual'
  };
}

function readSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

// ==================== INITIALIZATION ====================

function initializeSpreadsheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // Ledger - the main unified statement
  createSheet(ss, TABS.TRANSACTIONS, [
    'Date', 'Description', 'Amount', 'Balance After', 'Category',
    'Account', 'Bank', 'User', 'Currency', 'Type', 'ID', 'Notes'
  ]);

  // Accounts
  var accountsSheet = createSheet(ss, TABS.ACCOUNTS, [
    'Account Name', 'Type', 'Bank', 'User', 'Purpose',
    'Current Balance', 'Previous Balance', 'Change', 'Currency', 'Last Updated'
  ]);
  if (accountsSheet.getLastRow() <= 1) {
    var rows = ACCOUNTS_LIST.map(function(a) {
      return [a.name, a.type, a.bank, a.user, a.purpose, 0, 0, 0, a.currency, new Date()];
    });
    accountsSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  // Exchange Rates
  var exSheet = createSheet(ss, TABS.EXCHANGE, ['Date', 'GBP to AUD', 'AUD to GBP', 'Source']);
  if (exSheet.getLastRow() <= 1) {
    exSheet.appendRow([new Date(), 1.95, 0.513, 'default']);
  }

  // Other tabs
  createSheet(ss, TABS.WAGES, ['Date', 'Day of Week', 'User', 'Amount', 'Currency', 'Account', 'Notes']);
  createSheet(ss, TABS.BILLS, ['Bill Name', 'Amount', 'Currency', 'Frequency', 'Category', 'Account', 'Last Paid Date', 'Next Due Date', 'Status', 'Notes']);
  createSheet(ss, TABS.SAVINGS, ['Goal Name', 'Description', 'Target Amount', 'Current Amount', 'Monthly Contribution', 'Target Date', 'Priority', 'Progress %']);
  createSheet(ss, TABS.PROJECTIONS, ['Month', 'Projected Income', 'Projected Bills', 'Projected Spending', 'Projected Savings', 'Net Position', 'Type']);
  createSheet(ss, TABS.HISTORY, ['Month', 'Total Income', 'Bailey Income', 'Katie Income', 'Total Bills', 'Total Spending', 'Bailey Spending', 'Katie Spending', 'Joint Spending', 'Total Saved', 'Net Position', 'Type']);
  createSheet(ss, TABS.DASHBOARD, ['Metric', 'Value', 'Change', 'Last Updated', 'Notes']);

  // Remove default Sheet1
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  setupTriggers();
  formatSheets(ss);

  return '✅ Spreadsheet initialized with Ledger + Exchange Rates tabs';
}

function createSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() < 1 || sheet.getRange(1, 1).getValue() === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f0f4f8');
  }
  return sheet;
}

function formatSheets(ss) {
  var txSheet = ss.getSheetByName(TABS.TRANSACTIONS);
  if (txSheet) {
    txSheet.getRange('C2:D10000').setNumberFormat('#,##0.00');
  }
  var acc = ss.getSheetByName(TABS.ACCOUNTS);
  if (acc) acc.getRange('F2:H100').setNumberFormat('#,##0.00');
}

// ==================== TRIGGERS ====================

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dailyProcessing').timeBased().everyDays(1).atHour(9).create();
  ScriptApp.newTrigger('updateExchangeRate').timeBased().everyDays(1).atHour(8).create();
}

// ==================== EXCHANGE RATE ====================

function updateExchangeRate() {
  try {
    // Use Google Finance or a free API
    var url = 'https://api.exchangerate-api.com/v4/latest/GBP';
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var data = JSON.parse(response.getContentText());
    var gbpToAud = data.rates.AUD || 1.95;
    var audToGbp = 1 / gbpToAud;

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(TABS.EXCHANGE);
    if (!sheet) return;
    sheet.appendRow([new Date(), gbpToAud, audToGbp, 'exchangerate-api.com']);
  } catch (e) {
    Logger.log('Exchange rate update failed: ' + e.message);
  }
}

// ==================== LEDGER OPERATIONS ====================

function addTransaction(date, description, amount, account, category, notes) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var txSheet = ss.getSheetByName(TABS.TRANSACTIONS);
  if (!txSheet) return;

  var acct = ACCOUNTS_LIST.filter(function(a) { return a.name === account; })[0];
  var currency = acct ? acct.currency : 'AUD';
  var bank = acct ? acct.bank : '';
  var user = acct ? acct.user : '';
  var type = amount > 0 ? 'income' : 'expense';

  // Calculate balance after
  var balanceAfter = getLastBalance(txSheet, account) + amount;

  // Auto-categorize if not provided
  if (!category) category = categorize(description, amount);

  txSheet.appendRow([
    new Date(date), description, amount, balanceAfter, category,
    account, bank, user, currency, type,
    'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    notes || ''
  ]);

  // Update account balance
  updateAccountBalance(ss, account, balanceAfter);

  return balanceAfter;
}

function getLastBalance(txSheet, account) {
  if (txSheet.getLastRow() <= 1) return 0;
  var data = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 12).getValues();
  // Find last entry for this account (column 5 = Account, column 3 = Balance After)
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][5] === account) return data[i][3] || 0;
  }
  return 0;
}

function updateAccountBalance(ss, accountName, newBalance) {
  var sheet = ss.getSheetByName(TABS.ACCOUNTS);
  if (!sheet || sheet.getLastRow() <= 1) return;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] === accountName) {
      var row = i + 2;
      var prev = sheet.getRange(row, 6).getValue() || 0;
      sheet.getRange(row, 7).setValue(prev); // Previous balance
      sheet.getRange(row, 6).setValue(newBalance); // Current balance
      sheet.getRange(row, 8).setValue(newBalance - prev); // Change
      sheet.getRange(row, 10).setValue(new Date()); // Last updated
      break;
    }
  }
}

// ==================== CATEGORIZATION ====================

function categorize(description, amount) {
  var desc = description.toLowerCase();
  if (amount > 0) {
    if (['salary', 'wage', 'pay', 'income'].some(function(k) { return desc.indexOf(k) >= 0; })) return 'Income';
    if (['transfer'].some(function(k) { return desc.indexOf(k) >= 0; })) return 'Transfer';
    return 'Income';
  }

  var map = {
    'Housing': ['rent', 'mortgage', 'property'],
    'Utilities': ['electricity', 'gas', 'water', 'internet', 'phone', 'mobile', 'optus', 'telstra', 'vodafone'],
    'Food & Dining': ['restaurant', 'cafe', 'takeaway', 'grocery', 'supermarket', 'woolworths', 'coles', 'aldi', 'uber eats', 'deliveroo', 'menulog'],
    'Transportation': ['fuel', 'petrol', 'uber', 'taxi', 'train', 'bus', 'parking', 'shell', 'bp', 'opal', 'toll'],
    'Entertainment': ['cinema', 'movie', 'netflix', 'spotify', 'gym', 'disney', 'stan', 'binge', 'youtube'],
    'Shopping': ['amazon', 'target', 'kmart', 'clothing', 'fashion', 'big w', 'jb hi-fi'],
    'Healthcare': ['doctor', 'medical', 'pharmacy', 'hospital', 'dental', 'chemist'],
    'Insurance': ['insurance', 'cover', 'policy', 'nrma', 'allianz'],
    'Transfer': ['transfer', 'bpay']
  };

  for (var cat in map) {
    if (map[cat].some(function(k) { return desc.indexOf(k) >= 0; })) return cat;
  }
  return 'Miscellaneous';
}

// ==================== WAGE TRACKING ====================

function addWageEntry(date, user, amount, account) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(TABS.WAGES);
  if (!sheet) return;
  var d = new Date(date);
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var acct = ACCOUNTS_LIST.filter(function(a) { return a.name === account; })[0];
  sheet.appendRow([d, days[d.getDay()], user, amount, acct ? acct.currency : 'AUD', account, 'Auto-detected']);
}

// ==================== DAILY PROCESSING ====================

function dailyProcessing() {
  updateMonthlyHistory();
  updateDashboardMetrics();
  checkUpcomingBills();
}

function updateMonthlyHistory() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var txSheet = ss.getSheetByName(TABS.TRANSACTIONS);
  var historySheet = ss.getSheetByName(TABS.HISTORY);
  if (!txSheet || !historySheet || txSheet.getLastRow() <= 1) return;

  var data = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 12).getValues();

  var monthly = {};
  data.forEach(function(row) {
    var date = new Date(row[0]);
    if (isNaN(date.getTime())) return;
    var key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    if (!monthly[key]) {
      monthly[key] = { totalIncome: 0, baileyIncome: 0, katieIncome: 0, totalBills: 0, totalSpending: 0, baileySpending: 0, katieSpending: 0, jointSpending: 0, totalSaved: 0 };
    }
    var amount = row[2] || 0;
    var user = row[7] || '';
    var account = row[5] || '';
    if (amount > 0) {
      monthly[key].totalIncome += amount;
      if (user === 'Bailey') monthly[key].baileyIncome += amount;
      if (user === 'Katie') monthly[key].katieIncome += amount;
    } else {
      var abs = Math.abs(amount);
      if (account.indexOf('Joint') >= 0 && account.indexOf('Commonwealth') >= 0 && account.indexOf('Saver') < 0) {
        monthly[key].totalBills += abs;
      } else if (account.indexOf('Saver') >= 0) {
        monthly[key].totalSaved += abs;
      } else {
        monthly[key].totalSpending += abs;
        if (user === 'Bailey') monthly[key].baileySpending += abs;
        else if (user === 'Katie') monthly[key].katieSpending += abs;
        else monthly[key].jointSpending += abs;
      }
    }
  });

  historySheet.getRange(2, 1, historySheet.getMaxRows() - 1, 12).clearContent();
  var months = Object.keys(monthly).sort();
  var rows = months.map(function(m) {
    var d = monthly[m];
    return [m, d.totalIncome, d.baileyIncome, d.katieIncome, d.totalBills, d.totalSpending, d.baileySpending, d.katieSpending, d.jointSpending, d.totalSaved, d.totalIncome - d.totalBills - d.totalSpending, 'Actual'];
  });
  if (rows.length > 0) historySheet.getRange(2, 1, rows.length, 12).setValues(rows);
}

function updateDashboardMetrics() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var dashboard = ss.getSheetByName(TABS.DASHBOARD);
  if (!dashboard) return;

  var accounts = readSheet(ss, TABS.ACCOUNTS);
  var netWorth = accounts.reduce(function(s, a) { return s + (parseFloat(a['Current Balance']) || 0); }, 0);

  var metrics = [
    ['Net Worth', netWorth, '', new Date(), 'All accounts combined'],
    ['Exchange Rate (GBP→AUD)', getExchangeRate(ss).gbpToAud, '', new Date(), 'Daily rate']
  ];

  dashboard.getRange(2, 1, dashboard.getMaxRows() - 1, 5).clearContent();
  dashboard.getRange(2, 1, metrics.length, 5).setValues(metrics);
}

function checkUpcomingBills() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(TABS.BILLS);
  if (!sheet || sheet.getLastRow() <= 1) return;
  var bills = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  var now = new Date();
  bills.forEach(function(bill, idx) {
    var nextDue = new Date(bill[7]);
    var daysUntil = (nextDue - now) / (1000 * 60 * 60 * 24);
    var status = 'Active';
    if (daysUntil < 0) status = 'Overdue';
    else if (daysUntil <= 3) status = 'Due Soon';
    else if (daysUntil <= 7) status = 'Upcoming';
    sheet.getRange(idx + 2, 9).setValue(status);
  });
}

// ==================== MONTHS LIST (for frontend) ====================

function getAvailableMonths() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var txSheet = ss.getSheetByName(TABS.TRANSACTIONS);
  if (!txSheet || txSheet.getLastRow() <= 1) return [];
  var dates = txSheet.getRange(2, 1, txSheet.getLastRow() - 1, 1).getValues();
  var months = {};
  dates.forEach(function(row) {
    var d = new Date(row[0]);
    if (!isNaN(d.getTime())) {
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      months[key] = true;
    }
  });
  return Object.keys(months).sort();
}
