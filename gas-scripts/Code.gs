/**
 * Google Apps Script - Main Controller
 * Personal Finance Tracker for Bailey & Katie
 * Integrates with OpenClaw BAI for intelligent analysis
 */

// Configuration
const CONFIG = {
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
  OPENCLAW_WEBHOOK_URL: 'http://localhost:18789/wake',
  BAI_CONTEXT_PATH: '/Users/bai/.openclaw/workspace/bai-brain/memory/personal/projects/finances/',
  
  // Sheet names
  SHEETS: {
    TRANSACTIONS: 'Transactions',
    ACCOUNTS: 'Accounts', 
    BILLS: 'Bills',
    GOALS: 'Goals',
    CATEGORIES: 'Categories',
    DASHBOARD: 'Dashboard'
  },
  
  // Email settings for notifications
  EMAIL: {
    BAILEY: 'your.email@gmail.com', // Update with Bailey's email
    KATIE: 'katie.email@gmail.com'  // Update with Katie's email
  }
};

/**
 * Initialize the spreadsheet with required sheets and data structure
 */
function initializeSpreadsheet() {
  console.log('🚀 Initializing Personal Finance Tracker spreadsheet...');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    // Create required sheets
    createRequiredSheets(ss);
    
    // Set up data validation and formatting
    setupDataValidation(ss);
    
    // Initialize with sample data
    initializeSampleData(ss);
    
    // Set up triggers
    setupTriggers();
    
    console.log('✅ Spreadsheet initialized successfully');
    return 'Spreadsheet initialized successfully';
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw new Error(`Initialization failed: ${error.message}`);
  }
}

/**
 * Create all required sheets with proper structure
 */
function createRequiredSheets(ss) {
  // Transactions sheet
  createOrUpdateSheet(ss, CONFIG.SHEETS.TRANSACTIONS, [
    ['Date', 'Description', 'Amount', 'Category', 'Account', 'Type', 'ID', 'Notes']
  ]);
  
  // Accounts sheet  
  createOrUpdateSheet(ss, CONFIG.SHEETS.ACCOUNTS, [
    ['Account Name', 'Type', 'Current Balance', 'Previous Balance', 'Change', 'Last Update']
  ]);
  
  // Bills sheet
  createOrUpdateSheet(ss, CONFIG.SHEETS.BILLS, [
    ['Bill Name', 'Amount', 'Due Date', 'Status', 'Category', 'Account', 'Frequency', 'Notes']
  ]);
  
  // Goals sheet
  createOrUpdateSheet(ss, CONFIG.SHEETS.GOALS, [
    ['Goal Name', 'Description', 'Target Amount', 'Current Amount', 'Target Date', 'Category', 'Priority']
  ]);
  
  // Categories sheet
  createOrUpdateSheet(ss, CONFIG.SHEETS.CATEGORIES, [
    ['Category', 'Type', 'Budget', 'Spent This Month', 'Color', 'Keywords']
  ]);
  
  // Dashboard sheet (calculated values)
  createOrUpdateSheet(ss, CONFIG.SHEETS.DASHBOARD, [
    ['Metric', 'Value', 'Change', 'Last Updated', 'Notes']
  ]);
}

/**
 * Create or update a sheet with headers
 */
function createOrUpdateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    console.log(`📄 Created sheet: ${sheetName}`);
  }
  
  // Set headers
  if (headers && headers.length > 0) {
    const range = sheet.getRange(1, 1, 1, headers[0].length);
    range.setValues(headers);
    range.setFontWeight('bold');
    range.setBackground('#f8fafc');
  }
  
  return sheet;
}

/**
 * Set up data validation and formatting
 */
function setupDataValidation(ss) {
  const transactionsSheet = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  const accountsSheet = ss.getSheetByName(CONFIG.SHEETS.ACCOUNTS);
  
  // Transaction categories validation
  const categories = [
    'Income', 'Housing', 'Transportation', 'Food & Dining', 
    'Utilities', 'Healthcare', 'Entertainment', 'Shopping',
    'Personal Care', 'Education', 'Savings & Investments', 'Miscellaneous'
  ];
  
  const categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(categories)
    .build();
    
  transactionsSheet.getRange('D2:D1000').setDataValidation(categoryRule);
  
  // Account types validation
  const accountTypes = ['Checking', 'Savings', 'Credit', 'Investment'];
  const accountTypeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(accountTypes)
    .build();
    
  accountsSheet.getRange('B2:B100').setDataValidation(accountTypeRule);
  
  // Currency formatting
  transactionsSheet.getRange('C2:C1000').setNumberFormat('$#,##0.00');
  accountsSheet.getRange('C2:F100').setNumberFormat('$#,##0.00');
}

/**
 * Initialize with sample data
 */
function initializeSampleData(ss) {
  // Sample accounts
  const accountsSheet = ss.getSheetByName(CONFIG.SHEETS.ACCOUNTS);
  const accountData = [
    ['Joint Checking', 'Checking', 5420.50, 5270.50, 150.00, new Date()],
    ['Emergency Fund', 'Savings', 12800.75, 12300.75, 500.00, new Date()],
    ['Vacation Fund', 'Savings', 3200.00, 3000.00, 200.00, new Date()],
    ['Credit Card', 'Credit', -1250.30, -1175.30, -75.00, new Date()]
  ];
  
  if (accountsSheet.getLastRow() <= 1) {
    accountsSheet.getRange(2, 1, accountData.length, accountData[0].length).setValues(accountData);
  }
  
  // Sample goals
  const goalsSheet = ss.getSheetByName(CONFIG.SHEETS.GOALS);
  const goalData = [
    ['Emergency Fund', 'Save 6 months of expenses', 20000, 12800.75, new Date(Date.now() + 180*24*60*60*1000), 'savings', 'high'],
    ['Vacation Fund', 'Europe trip next year', 8000, 3200, new Date(Date.now() + 300*24*60*60*1000), 'lifestyle', 'medium'],
    ['House Deposit', 'Save for house down payment', 80000, 15000, new Date(Date.now() + 730*24*60*60*1000), 'investment', 'high']
  ];
  
  if (goalsSheet.getLastRow() <= 1) {
    goalsSheet.getRange(2, 1, goalData.length, goalData[0].length).setValues(goalData);
  }
  
  // Sample bills
  const billsSheet = ss.getSheetByName(CONFIG.SHEETS.BILLS);
  const billData = [
    ['Rent', 2200, new Date(Date.now() + 10*24*60*60*1000), 'pending', 'Housing', 'Joint Checking', 'monthly', ''],
    ['Electricity', 180.50, new Date(Date.now() + 5*24*60*60*1000), 'pending', 'Utilities', 'Joint Checking', 'monthly', ''],
    ['Internet', 89.99, new Date(Date.now() + 15*24*60*60*1000), 'pending', 'Utilities', 'Joint Checking', 'monthly', '']
  ];
  
  if (billsSheet.getLastRow() <= 1) {
    billsSheet.getRange(2, 1, billData.length, billData[0].length).setValues(billData);
  }
}

/**
 * Set up triggers for automatic processing
 */
function setupTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEdit' || 
        trigger.getHandlerFunction() === 'onFormSubmit' ||
        trigger.getHandlerFunction() === 'dailyProcessing') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Set up edit trigger
  ScriptApp.newTrigger('onEdit')
    .onEdit()
    .create();
    
  // Set up daily processing trigger
  ScriptApp.newTrigger('dailyProcessing')
    .timeBased()
    .everyDays(1)
    .atHour(9) // 9 AM
    .create();
    
  console.log('✅ Triggers set up successfully');
}

/**
 * Handle spreadsheet edits
 */
function onEdit(e) {
  if (!e || !e.range) return;
  
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  
  try {
    // Process transaction additions
    if (sheet.getName() === CONFIG.SHEETS.TRANSACTIONS) {
      processTransactionEdit(sheet, range);
    }
    
    // Process account balance updates
    if (sheet.getName() === CONFIG.SHEETS.ACCOUNTS) {
      processAccountEdit(sheet, range);
    }
    
    // Recalculate dashboard
    updateDashboard();
    
    // Notify BAI of changes
    notifyBAI({
      type: 'data-update',
      sheet: sheet.getName(),
      range: range.getA1Notation(),
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Error in onEdit:', error);
  }
}

/**
 * Process transaction edits
 */
function processTransactionEdit(sheet, range) {
  const row = range.getRow();
  if (row <= 1) return; // Skip header row
  
  const data = sheet.getRange(row, 1, 1, 8).getValues()[0];
  const [date, description, amount, category, account, type, id, notes] = data;
  
  // Auto-categorize if category is empty
  if (!category && description) {
    const autoCategory = categorizTransaction(description, amount);
    sheet.getRange(row, 4).setValue(autoCategory);
  }
  
  // Set transaction type if empty
  if (!type && amount) {
    const transactionType = amount > 0 ? 'income' : 'expense';
    sheet.getRange(row, 6).setValue(transactionType);
  }
  
  // Generate ID if empty
  if (!id) {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sheet.getRange(row, 7).setValue(transactionId);
  }
  
  console.log(`📊 Processed transaction: ${description} - ${amount}`);
}

/**
 * Process account balance edits
 */
function processAccountEdit(sheet, range) {
  const row = range.getRow();
  const col = range.getColumn();
  
  if (row <= 1 || col !== 3) return; // Only process balance column
  
  const accountName = sheet.getRange(row, 1).getValue();
  const currentBalance = sheet.getRange(row, 3).getValue();
  const previousBalance = sheet.getRange(row, 4).getValue() || 0;
  
  // Calculate change
  const change = currentBalance - previousBalance;
  sheet.getRange(row, 5).setValue(change);
  sheet.getRange(row, 6).setValue(new Date());
  
  console.log(`💰 Updated ${accountName}: ${previousBalance} → ${currentBalance} (${change >= 0 ? '+' : ''}${change})`);
}

/**
 * Automatic transaction categorization
 */
function categorizTransaction(description, amount) {
  const desc = description.toLowerCase();
  
  // Income keywords
  if (amount > 0) {
    const incomeKeywords = ['salary', 'wage', 'pay', 'income', 'transfer in', 'deposit'];
    if (incomeKeywords.some(keyword => desc.includes(keyword))) {
      return 'Income';
    }
  }
  
  // Expense categories
  const categoryKeywords = {
    'Housing': ['rent', 'mortgage', 'property', 'real estate'],
    'Transportation': ['fuel', 'petrol', 'uber', 'taxi', 'train', 'bus', 'parking'],
    'Food & Dining': ['restaurant', 'cafe', 'takeaway', 'grocery', 'supermarket', 'mcdonald'],
    'Utilities': ['electricity', 'gas', 'water', 'internet', 'phone', 'mobile'],
    'Healthcare': ['doctor', 'medical', 'pharmacy', 'hospital', 'dental'],
    'Entertainment': ['cinema', 'movie', 'netflix', 'spotify', 'gym'],
    'Shopping': ['shopping', 'amazon', 'target', 'kmart', 'clothing']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      return category;
    }
  }
  
  return 'Miscellaneous';
}

/**
 * Update dashboard calculations
 */
function updateDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboardSheet = ss.getSheetByName(CONFIG.SHEETS.DASHBOARD);
  const transactionsSheet = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  const accountsSheet = ss.getSheetByName(CONFIG.SHEETS.ACCOUNTS);
  const goalsSheet = ss.getSheetByName(CONFIG.SHEETS.GOALS);
  
  // Calculate metrics
  const metrics = calculateFinancialMetrics(transactionsSheet, accountsSheet, goalsSheet);
  
  // Update dashboard sheet
  const dashboardData = [
    ['Net Worth', metrics.netWorth, metrics.netWorthChange, new Date(), 'Total assets minus liabilities'],
    ['Monthly Income', metrics.monthlyIncome, metrics.incomeChange, new Date(), 'Last 30 days income'],
    ['Monthly Expenses', metrics.monthlyExpenses, metrics.expenseChange, new Date(), 'Last 30 days expenses'],
    ['Savings Rate', `${(metrics.savingsRate * 100).toFixed(1)}%`, metrics.savingsRateChange, new Date(), 'Income - expenses / income'],
    ['Emergency Fund Months', metrics.emergencyFundMonths, 0, new Date(), 'Months of expenses covered'],
    ['Goal Progress Average', `${(metrics.avgGoalProgress * 100).toFixed(1)}%`, 0, new Date(), 'Average progress across all goals']
  ];
  
  // Clear existing data and add new
  dashboardSheet.clear();
  dashboardSheet.getRange(1, 1, 1, 5).setValues([['Metric', 'Value', 'Change', 'Last Updated', 'Notes']]);
  dashboardSheet.getRange(2, 1, dashboardData.length, 5).setValues(dashboardData);
  
  console.log('📈 Dashboard updated with latest metrics');
  return metrics;
}

/**
 * Calculate financial metrics
 */
function calculateFinancialMetrics(transactionsSheet, accountsSheet, goalsSheet) {
  // Get account balances
  const accounts = accountsSheet.getRange(2, 1, accountsSheet.getLastRow() - 1, 6).getValues();
  const netWorth = accounts.reduce((total, account) => {
    const [name, type, balance] = account;
    return total + (balance || 0);
  }, 0);
  
  // Get recent transactions (last 30 days)
  const transactions = transactionsSheet.getRange(2, 1, transactionsSheet.getLastRow() - 1, 8).getValues();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const recentTransactions = transactions.filter(t => t[0] && new Date(t[0]) >= thirtyDaysAgo);
  
  const monthlyIncome = recentTransactions
    .filter(t => t[2] > 0)
    .reduce((sum, t) => sum + t[2], 0);
    
  const monthlyExpenses = Math.abs(recentTransactions
    .filter(t => t[2] < 0)
    .reduce((sum, t) => sum + t[2], 0));
  
  const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0;
  
  // Emergency fund calculation
  const savingsAccounts = accounts.filter(acc => acc[1] === 'Savings');
  const emergencyFund = savingsAccounts.reduce((sum, acc) => sum + acc[2], 0);
  const emergencyFundMonths = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;
  
  // Goal progress
  const goals = goalsSheet.getRange(2, 1, goalsSheet.getLastRow() - 1, 7).getValues();
  const avgGoalProgress = goals.length > 0 ? 
    goals.reduce((sum, goal) => sum + (goal[3] / goal[2]), 0) / goals.length : 0;
  
  return {
    netWorth,
    netWorthChange: 0, // Would calculate from historical data
    monthlyIncome,
    incomeChange: 0,
    monthlyExpenses,
    expenseChange: 0,
    savingsRate,
    savingsRateChange: 0,
    emergencyFundMonths,
    avgGoalProgress
  };
}

/**
 * Daily processing routine
 */
function dailyProcessing() {
  console.log('📅 Running daily processing...');
  
  try {
    // Update dashboard
    const metrics = updateDashboard();
    
    // Check for upcoming bills
    checkUpcomingBills();
    
    // Update goal progress
    updateGoalProgress();
    
    // Generate insights
    const insights = generateFinancialInsights(metrics);
    
    // Notify BAI with daily summary
    notifyBAI({
      type: 'daily-summary',
      metrics: metrics,
      insights: insights,
      timestamp: new Date()
    });
    
    console.log('✅ Daily processing completed');
    
  } catch (error) {
    console.error('❌ Daily processing failed:', error);
  }
}

/**
 * Check for upcoming bills
 */
function checkUpcomingBills() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const billsSheet = ss.getSheetByName(CONFIG.SHEETS.BILLS);
  const bills = billsSheet.getRange(2, 1, billsSheet.getLastRow() - 1, 8).getValues();
  
  const upcomingBills = bills.filter(bill => {
    const dueDate = new Date(bill[2]);
    const daysUntilDue = (dueDate - new Date()) / (1000 * 60 * 60 * 24);
    return daysUntilDue >= 0 && daysUntilDue <= 7 && bill[3] === 'pending';
  });
  
  if (upcomingBills.length > 0) {
    console.log(`⚠️ ${upcomingBills.length} bills due in the next 7 days`);
    
    // Could send email notifications here
    upcomingBills.forEach(bill => {
      console.log(`📋 ${bill[0]}: $${bill[1]} due ${bill[2]}`);
    });
  }
  
  return upcomingBills;
}

/**
 * Update goal progress
 */
function updateGoalProgress() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const goalsSheet = ss.getSheetByName(CONFIG.SHEETS.GOALS);
  const accountsSheet = ss.getSheetByName(CONFIG.SHEETS.ACCOUNTS);
  
  // This could automatically update goal progress based on account balances
  // For now, just log current status
  const goals = goalsSheet.getRange(2, 1, goalsSheet.getLastRow() - 1, 7).getValues();
  
  goals.forEach(goal => {
    const progress = (goal[3] / goal[2]) * 100;
    console.log(`🎯 ${goal[0]}: ${progress.toFixed(1)}% complete`);
  });
}

/**
 * Generate financial insights
 */
function generateFinancialInsights(metrics) {
  const insights = [];
  
  // Savings rate insight
  if (metrics.savingsRate < 0.1) {
    insights.push({
      type: 'warning',
      title: 'Low Savings Rate',
      description: `Current savings rate is ${(metrics.savingsRate * 100).toFixed(1)}%. Consider reducing expenses or increasing income.`
    });
  }
  
  // Emergency fund insight
  if (metrics.emergencyFundMonths < 3) {
    insights.push({
      type: 'alert',
      title: 'Emergency Fund Low',
      description: `Emergency fund covers only ${metrics.emergencyFundMonths.toFixed(1)} months of expenses. Aim for 6 months.`
    });
  }
  
  // Net worth insight
  if (metrics.netWorth > 0) {
    insights.push({
      type: 'positive',
      title: 'Positive Net Worth',
      description: `Great job! Your net worth is $${metrics.netWorth.toFixed(2)}.`
    });
  }
  
  return insights;
}

/**
 * Notify BAI via webhook
 */
function notifyBAI(data) {
  try {
    const payload = {
      source: 'finance-tracker-gas',
      timestamp: new Date().toISOString(),
      data: data,
      spreadsheetId: CONFIG.SPREADSHEET_ID
    };
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(payload)
    };
    
    // Note: This will only work if OpenClaw is accessible from Google's servers
    // For local development, this would need a tunnel or alternative notification method
    const response = UrlFetchApp.fetch(CONFIG.OPENCLAW_WEBHOOK_URL, options);
    
    if (response.getResponseCode() === 200) {
      console.log('✅ BAI notified successfully');
    } else {
      console.warn(`⚠️ BAI notification failed: ${response.getResponseCode()}`);
    }
    
  } catch (error) {
    console.warn('⚠️ Could not notify BAI:', error.message);
    // This is expected in many cases due to network restrictions
  }
}

/**
 * Export data for BAI memory sync
 */
function exportDataForBAI() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const exportData = {
    accounts: getSheetData(ss, CONFIG.SHEETS.ACCOUNTS),
    transactions: getSheetData(ss, CONFIG.SHEETS.TRANSACTIONS),
    bills: getSheetData(ss, CONFIG.SHEETS.BILLS),
    goals: getSheetData(ss, CONFIG.SHEETS.GOALS),
    dashboard: getSheetData(ss, CONFIG.SHEETS.DASHBOARD),
    exportTimestamp: new Date().toISOString()
  };
  
  return JSON.stringify(exportData);
}

/**
 * Get sheet data as array
 */
function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  
  return data.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}