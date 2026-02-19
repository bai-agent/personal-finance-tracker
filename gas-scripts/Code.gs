/**
 * Google Apps Script - Main Controller
 * Personal Finance Tracker for Bailey & Katie
 * 8 Accounts: CBA (4), Starling (3), Capital One (1)
 */

const CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  
  SHEETS: {
    TRANSACTIONS: 'Transactions',
    ACCOUNTS: 'Accounts',
    WAGES: 'Wages',
    BILLS: 'Recurring Bills',
    SAVINGS: 'Savings & Goals',
    PROJECTIONS: 'Projections',
    HISTORY: 'Monthly History',
    DASHBOARD: 'Dashboard'
  },
  
  ACCOUNTS: [
    { name: 'BW Personal (Commonwealth)', type: 'Checking', bank: 'CBA', user: 'Bailey', purpose: 'Wages' },
    { name: 'Katie Personal (Commonwealth)', type: 'Checking', bank: 'CBA', user: 'Katie', purpose: 'Wages' },
    { name: 'Joint (Commonwealth)', type: 'Checking', bank: 'CBA', user: 'Joint', purpose: 'Recurring Bills' },
    { name: 'Joint Saver (Commonwealth)', type: 'Savings', bank: 'CBA', user: 'Joint', purpose: 'Savings' },
    { name: 'BW Personal (Starling)', type: 'Checking', bank: 'Starling', user: 'Bailey', purpose: 'Spending' },
    { name: 'Katie Personal (Starling)', type: 'Checking', bank: 'Starling', user: 'Katie', purpose: 'Spending' },
    { name: 'Joint (Starling)', type: 'Checking', bank: 'Starling', user: 'Joint', purpose: 'Food & Spending' },
    { name: 'Credit Card (Capital One)', type: 'Credit', bank: 'Capital One', user: 'Joint', purpose: 'Credit' }
  ]
};

// ==================== INITIALIZATION ====================

function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Transactions tab
  createSheet(ss, CONFIG.SHEETS.TRANSACTIONS, [
    'Date', 'Description', 'Amount', 'Category', 'Account', 'Bank', 'User', 'Type', 'ID', 'Notes'
  ]);
  
  // Create Accounts tab
  const accountsSheet = createSheet(ss, CONFIG.SHEETS.ACCOUNTS, [
    'Account Name', 'Type', 'Bank', 'User', 'Purpose', 'Current Balance', 'Previous Balance', 'Change', 'Last Updated'
  ]);
  if (accountsSheet.getLastRow() <= 1) {
    const rows = CONFIG.ACCOUNTS.map(a => [a.name, a.type, a.bank, a.user, a.purpose, 0, 0, 0, new Date()]);
    accountsSheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  // Create Wages tab
  createSheet(ss, CONFIG.SHEETS.WAGES, [
    'Date', 'Day of Week', 'User', 'Amount', 'Account', 'Notes'
  ]);
  
  // Create Recurring Bills tab
  createSheet(ss, CONFIG.SHEETS.BILLS, [
    'Bill Name', 'Amount', 'Frequency', 'Category', 'Account', 'Last Paid Date', 'Next Due Date', 'Status', 'Notes'
  ]);
  
  // Create Savings & Goals tab
  createSheet(ss, CONFIG.SHEETS.SAVINGS, [
    'Goal Name', 'Description', 'Target Amount', 'Current Amount', 'Monthly Contribution', 'Target Date', 'Priority', 'Progress %'
  ]);
  
  // Create Projections tab
  createSheet(ss, CONFIG.SHEETS.PROJECTIONS, [
    'Month', 'Projected Income', 'Projected Bills', 'Projected Spending', 'Projected Savings', 'Net Position', 'Type'
  ]);
  
  // Create Monthly History tab
  createSheet(ss, CONFIG.SHEETS.HISTORY, [
    'Month', 'Total Income', 'Bailey Income', 'Katie Income', 'Total Bills', 'Total Spending', 'Bailey Spending', 'Katie Spending', 'Joint Spending', 'Total Saved', 'Net Position', 'Type'
  ]);
  
  // Create Dashboard tab
  createSheet(ss, CONFIG.SHEETS.DASHBOARD, [
    'Metric', 'Value', 'Change', 'Last Updated', 'Notes'
  ]);
  
  // Remove default Sheet1 if other sheets exist
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
  
  setupTriggers();
  formatSheets(ss);
  
  return '✅ Spreadsheet initialized with all tabs';
}

function createSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() < 1 || sheet.getRange(1, 1).getValue() === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#f0f4f8');
  }
  return sheet;
}

function formatSheets(ss) {
  // Currency formatting for Transactions
  const txn = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (txn) txn.getRange('C2:C1000').setNumberFormat('$#,##0.00');
  
  // Currency formatting for Accounts
  const acc = ss.getSheetByName(CONFIG.SHEETS.ACCOUNTS);
  if (acc) acc.getRange('F2:H100').setNumberFormat('$#,##0.00');
  
  // Currency formatting for Wages
  const wages = ss.getSheetByName(CONFIG.SHEETS.WAGES);
  if (wages) wages.getRange('D2:D1000').setNumberFormat('$#,##0.00');
  
  // Currency formatting for Bills
  const bills = ss.getSheetByName(CONFIG.SHEETS.BILLS);
  if (bills) bills.getRange('B2:B100').setNumberFormat('$#,##0.00');
  
  // Currency formatting for Savings
  const savings = ss.getSheetByName(CONFIG.SHEETS.SAVINGS);
  if (savings) {
    savings.getRange('C2:E100').setNumberFormat('$#,##0.00');
    savings.getRange('H2:H100').setNumberFormat('0.0%');
  }
  
  // Currency formatting for History & Projections
  const history = ss.getSheetByName(CONFIG.SHEETS.HISTORY);
  if (history) history.getRange('B2:K100').setNumberFormat('$#,##0.00');
  
  const proj = ss.getSheetByName(CONFIG.SHEETS.PROJECTIONS);
  if (proj) proj.getRange('B2:F100').setNumberFormat('$#,##0.00');
}

// ==================== TRIGGERS ====================

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onEdit').onEdit().create();
  ScriptApp.newTrigger('dailyProcessing').timeBased().everyDays(1).atHour(9).create();
}

// ==================== EDIT HANDLER ====================

function onEdit(e) {
  if (!e || !e.range) return;
  const sheetName = e.source.getActiveSheet().getName();
  
  if (sheetName === CONFIG.SHEETS.TRANSACTIONS) {
    processNewTransaction(e);
  }
  if (sheetName === CONFIG.SHEETS.ACCOUNTS) {
    recalculateAccountChanges(e);
  }
  
  updateDashboardMetrics();
}

function processNewTransaction(e) {
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();
  if (row <= 1) return;
  
  const data = sheet.getRange(row, 1, 1, 10).getValues()[0];
  const [date, desc, amount, category, account, bank, user, type, id] = data;
  
  // Auto-categorize
  if (!category && desc) {
    sheet.getRange(row, 4).setValue(categorize(desc, amount));
  }
  // Auto-set type
  if (!type && amount) {
    sheet.getRange(row, 8).setValue(amount > 0 ? 'income' : 'expense');
  }
  // Auto-generate ID
  if (!id) {
    sheet.getRange(row, 9).setValue('txn_' + Date.now());
  }
  
  // Detect wage deposits and auto-add to Wages tab
  if (amount > 500 && (desc.toLowerCase().includes('salary') || desc.toLowerCase().includes('pay') || desc.toLowerCase().includes('wage'))) {
    addWageEntry(date, user || 'Unknown', amount, account);
  }
  
  // Detect potential recurring bills
  detectRecurringBill(desc, amount, date, account);
}

function recalculateAccountChanges(e) {
  const sheet = e.source.getActiveSheet();
  const row = e.range.getRow();
  if (row <= 1 || e.range.getColumn() !== 6) return; // Only trigger on balance column
  
  const current = sheet.getRange(row, 6).getValue();
  const previous = sheet.getRange(row, 7).getValue() || 0;
  sheet.getRange(row, 8).setValue(current - previous);
  sheet.getRange(row, 9).setValue(new Date());
}

// ==================== WAGE TRACKING ====================

function addWageEntry(date, user, amount, account) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.WAGES);
  if (!sheet) return;
  
  const d = new Date(date);
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
  
  sheet.appendRow([d, dayOfWeek, user, amount, account, 'Auto-detected from transaction']);
}

function getWageAnalysis(user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.WAGES);
  if (!sheet || sheet.getLastRow() <= 1) return null;
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  const userWages = data.filter(row => row[2] === user);
  
  if (userWages.length === 0) return null;
  
  const amounts = userWages.map(row => row[3]);
  const avgWage = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  
  // Find most common pay day
  const days = userWages.map(row => row[1]);
  const dayCount = {};
  days.forEach(day => dayCount[day] = (dayCount[day] || 0) + 1);
  const usualPayDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
  
  // Calculate next expected pay (assuming fortnightly)
  const lastPayDate = new Date(Math.max(...userWages.map(row => new Date(row[0]).getTime())));
  const nextPay = new Date(lastPayDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  
  return {
    averageWage: avgWage,
    usualPayDay,
    nextExpectedPay: nextPay,
    expectedAmount: avgWage,
    totalEntries: userWages.length,
    history: userWages
  };
}

// ==================== BILL DETECTION & TRACKING ====================

function detectRecurringBill(description, amount, date, account) {
  if (amount >= 0) return; // Only expenses
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const billsSheet = ss.getSheetByName(CONFIG.SHEETS.BILLS);
  if (!billsSheet) return;
  
  // Check if this looks like a recurring bill
  const billKeywords = ['rent', 'electricity', 'gas', 'water', 'internet', 'phone', 'insurance', 
                        'netflix', 'spotify', 'gym', 'subscription', 'membership', 'direct debit'];
  const desc = description.toLowerCase();
  
  if (!billKeywords.some(k => desc.includes(k))) return;
  
  // Check if bill already exists
  const existingBills = billsSheet.getLastRow() > 1 
    ? billsSheet.getRange(2, 1, billsSheet.getLastRow() - 1, 9).getValues() 
    : [];
  
  const exists = existingBills.some(row => 
    row[0].toLowerCase().includes(desc.substring(0, 8)) || 
    desc.includes(row[0].toLowerCase().substring(0, 8))
  );
  
  if (exists) {
    // Update last paid date for existing bill
    const matchIdx = existingBills.findIndex(row => 
      row[0].toLowerCase().includes(desc.substring(0, 8)) || 
      desc.includes(row[0].toLowerCase().substring(0, 8))
    );
    if (matchIdx >= 0) {
      billsSheet.getRange(matchIdx + 2, 6).setValue(new Date(date)); // Last paid
      // Estimate next due (monthly)
      const nextDue = new Date(date);
      nextDue.setMonth(nextDue.getMonth() + 1);
      billsSheet.getRange(matchIdx + 2, 7).setValue(nextDue);
      billsSheet.getRange(matchIdx + 2, 8).setValue('Paid');
    }
  } else {
    // Add new recurring bill
    const nextDue = new Date(date);
    nextDue.setMonth(nextDue.getMonth() + 1);
    const category = categorize(description, amount);
    
    billsSheet.appendRow([
      description, Math.abs(amount), 'Monthly', category, account,
      new Date(date), nextDue, 'Active', 'Auto-detected'
    ]);
  }
}

// ==================== MONTHLY HISTORY ====================

function updateMonthlyHistory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const txnSheet = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  const historySheet = ss.getSheetByName(CONFIG.SHEETS.HISTORY);
  if (!txnSheet || !historySheet || txnSheet.getLastRow() <= 1) return;
  
  const transactions = txnSheet.getRange(2, 1, txnSheet.getLastRow() - 1, 10).getValues();
  
  // Group by month
  const monthly = {};
  transactions.forEach(row => {
    const date = new Date(row[0]);
    if (isNaN(date.getTime())) return;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthly[monthKey]) {
      monthly[monthKey] = { 
        totalIncome: 0, baileyIncome: 0, katieIncome: 0,
        totalBills: 0, totalSpending: 0, 
        baileySpending: 0, katieSpending: 0, jointSpending: 0,
        totalSaved: 0
      };
    }
    
    const amount = row[2] || 0;
    const user = row[6] || '';
    const account = row[4] || '';
    
    if (amount > 0) {
      monthly[monthKey].totalIncome += amount;
      if (user === 'Bailey') monthly[monthKey].baileyIncome += amount;
      if (user === 'Katie') monthly[monthKey].katieIncome += amount;
    } else {
      const absAmount = Math.abs(amount);
      if (account.includes('Joint') && account.includes('Commonwealth') && !account.includes('Saver')) {
        monthly[monthKey].totalBills += absAmount;
      } else if (account.includes('Saver')) {
        monthly[monthKey].totalSaved += absAmount;
      } else {
        monthly[monthKey].totalSpending += absAmount;
        if (user === 'Bailey') monthly[monthKey].baileySpending += absAmount;
        else if (user === 'Katie') monthly[monthKey].katieSpending += absAmount;
        else monthly[monthKey].jointSpending += absAmount;
      }
    }
  });
  
  // Write to history sheet
  historySheet.getRange(2, 1, historySheet.getMaxRows() - 1, 12).clearContent();
  
  const sortedMonths = Object.keys(monthly).sort();
  const historyData = sortedMonths.map(month => {
    const m = monthly[month];
    const net = m.totalIncome - m.totalBills - m.totalSpending;
    return [
      month, m.totalIncome, m.baileyIncome, m.katieIncome,
      m.totalBills, m.totalSpending, m.baileySpending, m.katieSpending, m.jointSpending,
      m.totalSaved, net, 'Actual'
    ];
  });
  
  if (historyData.length > 0) {
    historySheet.getRange(2, 1, historyData.length, 12).setValues(historyData);
  }
  
  // Add projections (next 3 months based on averages)
  if (historyData.length >= 1) {
    addProjections(ss, monthly, sortedMonths);
  }
}

function addProjections(ss, monthly, sortedMonths) {
  const projSheet = ss.getSheetByName(CONFIG.SHEETS.PROJECTIONS);
  const historySheet = ss.getSheetByName(CONFIG.SHEETS.HISTORY);
  if (!projSheet) return;
  
  // Calculate rolling averages from last 3 months
  const recentMonths = sortedMonths.slice(-3);
  const avg = { income: 0, bills: 0, spending: 0, saved: 0 };
  
  recentMonths.forEach(month => {
    const m = monthly[month];
    avg.income += m.totalIncome;
    avg.bills += m.totalBills;
    avg.spending += m.totalSpending;
    avg.saved += m.totalSaved;
  });
  
  const n = recentMonths.length;
  avg.income /= n;
  avg.bills /= n;
  avg.spending /= n;
  avg.saved /= n;
  
  // Generate projections for next 6 months
  projSheet.getRange(2, 1, projSheet.getMaxRows() - 1, 7).clearContent();
  
  const lastMonth = sortedMonths[sortedMonths.length - 1];
  const [lastYear, lastMonthNum] = lastMonth.split('-').map(Number);
  
  const projections = [];
  for (let i = 1; i <= 6; i++) {
    const projDate = new Date(lastYear, lastMonthNum - 1 + i, 1);
    const monthKey = `${projDate.getFullYear()}-${String(projDate.getMonth() + 1).padStart(2, '0')}`;
    const net = avg.income - avg.bills - avg.spending;
    
    projections.push([
      monthKey, avg.income, avg.bills, avg.spending, avg.saved, net, 'Projected'
    ]);
  }
  
  if (projections.length > 0) {
    projSheet.getRange(2, 1, projections.length, 7).setValues(projections);
  }
  
  // Also append projections to history sheet
  const historyLastRow = historySheet.getLastRow();
  const projHistoryData = projections.map(p => [
    p[0], p[1], p[1] * 0.5, p[1] * 0.5, // Split income 50/50 as estimate
    p[2], p[3], p[3] * 0.3, p[3] * 0.3, p[3] * 0.4, // Split spending
    p[4], p[5], 'Projected'
  ]);
  
  if (projHistoryData.length > 0) {
    historySheet.getRange(historyLastRow + 1, 1, projHistoryData.length, 12).setValues(projHistoryData);
  }
}

// ==================== DASHBOARD METRICS ====================

function updateDashboardMetrics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);
  if (!dashboard) return;
  
  const accounts = getAccountBalances(ss);
  const txnMetrics = getTransactionMetrics(ss);
  const wageAnalysis = {
    bailey: getWageAnalysis('Bailey'),
    katie: getWageAnalysis('Katie')
  };
  
  const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
  const savingsRate = txnMetrics.income > 0 ? (txnMetrics.income - txnMetrics.expenses) / txnMetrics.income : 0;
  
  const metrics = [
    ['Net Worth', netWorth, '', new Date(), 'All accounts combined'],
    ['Monthly Income', txnMetrics.income, '', new Date(), 'Last 30 days'],
    ['Monthly Expenses', txnMetrics.expenses, '', new Date(), 'Last 30 days'],
    ['Savings Rate', savingsRate, '', new Date(), 'Income - expenses / income'],
    ['Bailey Avg Wage', wageAnalysis.bailey?.averageWage || 0, '', new Date(), wageAnalysis.bailey?.usualPayDay || 'Unknown'],
    ['Katie Avg Wage', wageAnalysis.katie?.averageWage || 0, '', new Date(), wageAnalysis.katie?.usualPayDay || 'Unknown'],
    ['Total Savings', accounts.filter(a => a.type === 'Savings').reduce((s, a) => s + a.balance, 0), '', new Date(), 'Joint Saver balance'],
    ['Credit Balance', accounts.filter(a => a.type === 'Credit').reduce((s, a) => s + a.balance, 0), '', new Date(), 'Capital One']
  ];
  
  dashboard.getRange(2, 1, dashboard.getMaxRows() - 1, 5).clearContent();
  dashboard.getRange(2, 1, metrics.length, 5).setValues(metrics);
}

function getAccountBalances(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.ACCOUNTS);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  return data.map(row => ({
    name: row[0], type: row[1], bank: row[2], user: row[3],
    purpose: row[4], balance: row[5] || 0
  }));
}

function getTransactionMetrics(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  if (!sheet || sheet.getLastRow() <= 1) return { income: 0, expenses: 0 };
  
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const recent = data.filter(row => row[0] && new Date(row[0]) >= thirtyDaysAgo);
  
  return {
    income: recent.filter(r => r[2] > 0).reduce((s, r) => s + r[2], 0),
    expenses: Math.abs(recent.filter(r => r[2] < 0).reduce((s, r) => s + r[2], 0))
  };
}

// ==================== CATEGORIZATION ====================

function categorize(description, amount) {
  const desc = description.toLowerCase();
  if (amount > 0) {
    if (['salary', 'wage', 'pay', 'income'].some(k => desc.includes(k))) return 'Income';
    return 'Income';
  }
  
  const map = {
    'Housing': ['rent', 'mortgage', 'property'],
    'Utilities': ['electricity', 'gas', 'water', 'internet', 'phone', 'mobile'],
    'Food & Dining': ['restaurant', 'cafe', 'takeaway', 'grocery', 'supermarket', 'woolworths', 'coles', 'aldi'],
    'Transportation': ['fuel', 'petrol', 'uber', 'taxi', 'train', 'bus', 'parking', 'shell', 'bp'],
    'Entertainment': ['cinema', 'movie', 'netflix', 'spotify', 'gym', 'disney'],
    'Shopping': ['amazon', 'target', 'kmart', 'clothing', 'fashion'],
    'Healthcare': ['doctor', 'medical', 'pharmacy', 'hospital', 'dental'],
    'Insurance': ['insurance', 'cover', 'policy']
  };
  
  for (const [cat, keywords] of Object.entries(map)) {
    if (keywords.some(k => desc.includes(k))) return cat;
  }
  return 'Miscellaneous';
}

// ==================== DAILY PROCESSING ====================

function dailyProcessing() {
  updateMonthlyHistory();
  updateDashboardMetrics();
  checkUpcomingBills();
  updateGoalProgress();
}

function checkUpcomingBills() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.BILLS);
  if (!sheet || sheet.getLastRow() <= 1) return;
  
  const bills = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  const now = new Date();
  
  bills.forEach((bill, idx) => {
    const nextDue = new Date(bill[6]);
    const daysUntil = (nextDue - now) / (1000 * 60 * 60 * 24);
    
    let status = 'Active';
    if (daysUntil < 0) status = 'Overdue';
    else if (daysUntil <= 3) status = 'Due Soon';
    else if (daysUntil <= 7) status = 'Upcoming';
    
    sheet.getRange(idx + 2, 8).setValue(status);
  });
}

function updateGoalProgress() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SAVINGS);
  if (!sheet || sheet.getLastRow() <= 1) return;
  
  const goals = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  goals.forEach((goal, idx) => {
    const target = goal[2] || 1;
    const current = goal[3] || 0;
    const progress = current / target;
    sheet.getRange(idx + 2, 8).setValue(progress);
  });
}

// ==================== WEB APP ENDPOINT ====================

function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById('1KIzq9VaJWqyFSIUk8J0GB43Yp1sYVY86K3M30_q73xc');
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'all';
    var result;
    
    if (action === 'all') {
      result = {
        accounts: getSheetDataById(ss, CONFIG.SHEETS.ACCOUNTS),
        transactions: getSheetDataById(ss, CONFIG.SHEETS.TRANSACTIONS),
        wages: getSheetDataById(ss, CONFIG.SHEETS.WAGES),
        bills: getSheetDataById(ss, CONFIG.SHEETS.BILLS),
        savings: getSheetDataById(ss, CONFIG.SHEETS.SAVINGS),
        projections: getSheetDataById(ss, CONFIG.SHEETS.PROJECTIONS),
        history: getSheetDataById(ss, CONFIG.SHEETS.HISTORY),
        dashboard: getSheetDataById(ss, CONFIG.SHEETS.DASHBOARD),
        timestamp: new Date().toISOString()
      };
    } else {
      var sheetName = CONFIG.SHEETS[action.toUpperCase()] || action;
      result = {
        data: getSheetDataById(ss, sheetName),
        timestamp: new Date().toISOString()
      };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetDataById(ss, name) {
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

// ==================== DATA EXPORT ====================

function exportDataForBAI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return JSON.stringify({
    accounts: getSheetData(ss, CONFIG.SHEETS.ACCOUNTS),
    transactions: getSheetData(ss, CONFIG.SHEETS.TRANSACTIONS),
    wages: getSheetData(ss, CONFIG.SHEETS.WAGES),
    bills: getSheetData(ss, CONFIG.SHEETS.BILLS),
    savings: getSheetData(ss, CONFIG.SHEETS.SAVINGS),
    projections: getSheetData(ss, CONFIG.SHEETS.PROJECTIONS),
    history: getSheetData(ss, CONFIG.SHEETS.HISTORY),
    dashboard: getSheetData(ss, CONFIG.SHEETS.DASHBOARD),
    exportTimestamp: new Date().toISOString()
  });
}

function getSheetData(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}