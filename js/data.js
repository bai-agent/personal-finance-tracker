// Data Management and API Integration

class DataManager {
  constructor() {
    this.cache = new Map();
    this.lastFetch = new Map();
    this.refreshInterval = CONFIG.REFRESH_INTERVALS.NORMAL;
    this.isOnline = navigator.onLine;
    this.dataSource = 'loading'; // 'live', 'mock', 'loading'
    
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  // Fetch all data from Google Apps Script webapp
  async fetchFromGAS() {
    const url = CONFIG.GAS_WEBAPP.URL;
    if (!url || url === 'YOUR_WEBAPP_URL_HERE') {
      console.warn('GAS webapp URL not configured, using mock data');
      this.initializeMockData();
      return false;
    }

    try {
      console.log('📡 Fetching data from Google Sheets...');
      const response = await fetch(url + '?action=all');
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const raw = await response.json();
      
      if (raw.error) throw new Error(raw.error);
      
      // Transform GAS data into the format the dashboard expects
      this.transformAndCache(raw);
      this.dataSource = 'live';
      console.log('✅ Live data loaded from Google Sheets');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to fetch from GAS:', error);
      // Fall back to mock data if we have nothing cached
      if (this.cache.size === 0) {
        this.initializeMockData();
      }
      return false;
    }
  }

  // Transform raw GAS response into dashboard-compatible format
  transformAndCache(raw) {
    // --- Accounts ---
    const accounts = (raw.accounts || []).map((a, i) => ({
      id: `account_${i}`,
      name: a['Account Name'] || a.name || `Account ${i}`,
      type: this.mapAccountType(a['Type'] || a.type || 'checking'),
      bank: a['Bank'] || '',
      user: a['User'] || '',
      purpose: a['Purpose'] || '',
      balance: parseFloat(a['Current Balance']) || 0,
      previousBalance: parseFloat(a['Previous Balance']) || 0,
      change: parseFloat(a['Change']) || 0,
      lastUpdate: a['Last Updated'] ? new Date(a['Last Updated']) : new Date()
    }));

    // --- Transactions ---
    const transactions = (raw.transactions || []).map((t, i) => ({
      id: t['ID'] || `txn_${i}`,
      description: t['Description'] || '',
      amount: parseFloat(t['Amount']) || 0,
      date: t['Date'] ? new Date(t['Date']) : new Date(),
      category: t['Category'] || 'Miscellaneous',
      account: t['Account'] || '',
      bank: t['Bank'] || '',
      user: t['User'] || '',
      type: (parseFloat(t['Amount']) || 0) > 0 ? 'income' : 'expense',
      notes: t['Notes'] || ''
    })).sort((a, b) => b.date - a.date);

    // --- Bills ---
    const bills = (raw.bills || []).map((b, i) => ({
      id: `bill_${i}`,
      name: b['Bill Name'] || '',
      amount: Math.abs(parseFloat(b['Amount'])) || 0,
      frequency: b['Frequency'] || 'Monthly',
      category: b['Category'] || '',
      account: b['Account'] || '',
      dueDate: b['Next Due Date'] ? new Date(b['Next Due Date']) : new Date(),
      lastPaid: b['Last Paid Date'] ? new Date(b['Last Paid Date']) : null,
      status: (b['Status'] || 'pending').toLowerCase(),
      notes: b['Notes'] || ''
    }));

    // --- Goals (Savings) ---
    const goals = (raw.savings || []).map((g, i) => ({
      id: `goal_${i}`,
      name: g['Goal Name'] || '',
      description: g['Description'] || '',
      targetAmount: parseFloat(g['Target Amount']) || 0,
      currentAmount: parseFloat(g['Current Amount']) || 0,
      monthlyContribution: parseFloat(g['Monthly Contribution']) || 0,
      targetDate: g['Target Date'] ? new Date(g['Target Date']) : null,
      priority: g['Priority'] || 'medium',
      category: 'savings'
    }));

    // --- Wages ---
    const wages = (raw.wages || []).map((w, i) => ({
      id: `wage_${i}`,
      date: w['Date'] ? new Date(w['Date']) : new Date(),
      dayOfWeek: w['Day of Week'] || '',
      user: w['User'] || '',
      amount: parseFloat(w['Amount']) || 0,
      account: w['Account'] || '',
      notes: w['Notes'] || ''
    }));

    // --- Dashboard metrics ---
    const dashboardMetrics = {};
    (raw.dashboard || []).forEach(m => {
      if (m['Metric']) dashboardMetrics[m['Metric']] = parseFloat(m['Value']) || 0;
    });

    // --- Insights (generated from data) ---
    const insights = this.generateInsights(accounts, transactions, bills, goals);

    // Cache everything
    this.updateCache('accounts', accounts);
    this.updateCache('transactions', transactions);
    this.updateCache('bills', bills);
    this.updateCache('goals', goals);
    this.updateCache('wages', wages);
    this.updateCache('dashboardMetrics', dashboardMetrics);
    this.updateCache('insights', insights);
    this.updateCache('rawHistory', raw.history || []);
    this.updateCache('rawProjections', raw.projections || []);
  }

  mapAccountType(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('saving')) return 'savings';
    if (t.includes('credit')) return 'credit';
    if (t.includes('invest')) return 'investment';
    return 'checking';
  }

  generateInsights(accounts, transactions, bills, goals) {
    const insights = [];
    
    // Check for upcoming bills
    const now = new Date();
    const urgentBills = bills.filter(b => {
      const days = (b.dueDate - now) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 7;
    });
    if (urgentBills.length > 0) {
      insights.push({
        id: 'insight_bills',
        type: 'warning',
        title: `${urgentBills.length} Bill${urgentBills.length > 1 ? 's' : ''} Due This Week`,
        description: urgentBills.map(b => `${b.name}: $${b.amount.toFixed(2)}`).join(', '),
        priority: 'high',
        timestamp: now
      });
    }

    // Savings rate insight
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const recentTxns = transactions.filter(t => t.date >= thirtyDaysAgo);
    const income = recentTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = Math.abs(recentTxns.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));
    
    if (income > 0) {
      const rate = ((income - expenses) / income * 100).toFixed(1);
      insights.push({
        id: 'insight_savings',
        type: rate >= 20 ? 'recommendation' : 'warning',
        title: `Savings Rate: ${rate}%`,
        description: rate >= 20 
          ? 'Great job! You\'re saving over 20% of your income.'
          : 'Your savings rate is below 20%. Consider reviewing discretionary spending.',
        priority: rate >= 20 ? 'low' : 'medium',
        timestamp: now
      });
    }

    // Goal progress
    goals.forEach(g => {
      if (g.targetAmount > 0) {
        const pct = (g.currentAmount / g.targetAmount * 100).toFixed(0);
        if (pct >= 75) {
          insights.push({
            id: `insight_goal_${g.id}`,
            type: 'recommendation',
            title: `${g.name}: ${pct}% Complete! 🎉`,
            description: `Only $${(g.targetAmount - g.currentAmount).toFixed(2)} to go.`,
            priority: 'low',
            timestamp: now
          });
        }
      }
    });

    // If no data at all
    if (transactions.length === 0 && accounts.every(a => a.balance === 0)) {
      insights.push({
        id: 'insight_getstarted',
        type: 'recommendation',
        title: 'Getting Started',
        description: 'Upload your first bank statement screenshot to #finances on Discord and BAI will process it!',
        priority: 'medium',
        timestamp: now
      });
    }

    return insights;
  }

  // Initialize with mock data (fallback)
  initializeMockData() {
    this.dataSource = 'mock';
    console.log('📋 Using mock data (Google Sheets not available)');

    const mockData = {
      accounts: [
        { id: 'bw_cba', name: 'BW Personal (Commonwealth)', type: 'checking', bank: 'CBA', user: 'Bailey', purpose: 'Wages', balance: 0, change: 0, lastUpdate: new Date() },
        { id: 'katie_cba', name: 'Katie Personal (Commonwealth)', type: 'checking', bank: 'CBA', user: 'Katie', purpose: 'Wages', balance: 0, change: 0, lastUpdate: new Date() },
        { id: 'joint_cba', name: 'Joint (Commonwealth)', type: 'checking', bank: 'CBA', user: 'Joint', purpose: 'Recurring Bills', balance: 0, change: 0, lastUpdate: new Date() },
        { id: 'saver_cba', name: 'Joint Saver (Commonwealth)', type: 'savings', bank: 'CBA', user: 'Joint', purpose: 'Savings', balance: 0, change: 0, lastUpdate: new Date() },
        { id: 'bw_starling', name: 'BW Personal (Starling)', type: 'checking', bank: 'Starling', user: 'Bailey', purpose: 'Spending', balance: 0, change: 0, lastUpdate: new Date() },
        { id: 'katie_starling', name: 'Katie Personal (Starling)', type: 'checking', bank: 'Starling', user: 'Katie', purpose: 'Spending', balance: 0, change: 0, lastUpdate: new Date() },
        { id: 'joint_starling', name: 'Joint (Starling)', type: 'checking', bank: 'Starling', user: 'Joint', purpose: 'Food & Spending', balance: 0, change: 0, lastUpdate: new Date() },
        { id: 'cc_capone', name: 'Credit Card (Capital One)', type: 'credit', bank: 'Capital One', user: 'Joint', purpose: 'Credit', balance: 0, change: 0, lastUpdate: new Date() }
      ],
      transactions: [],
      bills: [],
      goals: [],
      insights: [{
        id: 'insight_getstarted',
        type: 'recommendation',
        title: 'Getting Started',
        description: 'Upload your first bank statement screenshot to #finances on Discord and BAI will process it!',
        priority: 'medium',
        timestamp: new Date()
      }]
    };

    Object.keys(mockData).forEach(key => {
      this.cache.set(key, mockData[key]);
      this.lastFetch.set(key, new Date());
    });
  }

  // Check if cached data is still fresh
  isCacheFresh(dataType, maxAge = this.refreshInterval) {
    const lastFetch = this.lastFetch.get(dataType);
    if (!lastFetch) return false;
    return (Date.now() - lastFetch.getTime()) < maxAge;
  }

  // Get data from cache or fetch fresh
  async getData(dataType, forceRefresh = false) {
    try {
      if (!forceRefresh && this.isCacheFresh(dataType)) {
        return Utils.handleSuccess(this.cache.get(dataType));
      }

      // Try fetching from GAS if cache is stale
      if (this.isOnline && (forceRefresh || !this.isCacheFresh(dataType))) {
        await this.fetchFromGAS();
      }

      const cachedData = this.cache.get(dataType);
      if (cachedData) {
        return Utils.handleSuccess(cachedData);
      }

      return Utils.handleError(new Error('No data available'));
    } catch (error) {
      return Utils.handleError(error, `fetching ${dataType}`);
    }
  }

  async getAccounts(forceRefresh = false) { return this.getData('accounts', forceRefresh); }
  async getTransactions(forceRefresh = false) { return this.getData('transactions', forceRefresh); }
  async getBills(forceRefresh = false) { return this.getData('bills', forceRefresh); }
  async getGoals(forceRefresh = false) { return this.getData('goals', forceRefresh); }
  async getInsights(forceRefresh = false) { return this.getData('insights', forceRefresh); }

  async getDashboardData(forceRefresh = false) {
    try {
      const [accounts, transactions, bills, goals] = await Promise.all([
        this.getAccounts(forceRefresh),
        this.getTransactions(forceRefresh),
        this.getBills(forceRefresh),
        this.getGoals(forceRefresh)
      ]);

      if (!accounts.success || !transactions.success) {
        throw new Error('Failed to fetch required data');
      }

      const summary = this.calculateDashboardSummary(
        accounts.data,
        transactions.data,
        bills.data || [],
        goals.data || []
      );

      return Utils.handleSuccess(summary);
    } catch (error) {
      return Utils.handleError(error, 'fetching dashboard data');
    }
  }

  calculateDashboardSummary(accounts, transactions, bills, goals) {
    const netWorth = accounts.reduce((total, account) => total + account.balance, 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTransactions = transactions.filter(t => t.date >= thirtyDaysAgo);
    
    const monthlyIncome = recentTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpenses = Math.abs(recentTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));

    const savingsRate = Utils.calculateSavingsRate(monthlyIncome, monthlyExpenses);

    const upcomingBills = bills.filter(bill => {
      const daysUntilDue = (bill.dueDate - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntilDue <= 30 && daysUntilDue >= 0;
    });

    const totalGoalProgress = goals.length > 0
      ? goals.reduce((total, goal) => total + (goal.currentAmount / (goal.targetAmount || 1)), 0) / goals.length
      : 0;

    const healthScore = this.calculateHealthScore({
      netWorth, monthlyIncome, monthlyExpenses, savingsRate, accounts, goals
    });

    return {
      netWorth, monthlyIncome, monthlyExpenses, savingsRate,
      upcomingBills, totalGoalProgress, healthScore,
      dataSource: this.dataSource,
      lastUpdate: new Date()
    };
  }

  calculateHealthScore({ netWorth, monthlyIncome, monthlyExpenses, savingsRate, accounts, goals }) {
    let score = 0;
    const factors = [];

    // Emergency fund (25 pts)
    const savingsBalance = accounts.filter(a => a.type === 'savings').reduce((s, a) => s + a.balance, 0);
    const monthsOfExpenses = monthlyExpenses > 0 ? savingsBalance / monthlyExpenses : 0;
    const emergencyScore = Math.min(25, (monthsOfExpenses / 6) * 25);
    score += emergencyScore;
    factors.push({ name: 'Emergency Fund', score: Math.round(emergencyScore), maxScore: 25 });

    // Savings rate (25 pts)
    const savingsScore = savingsRate >= 0 ? Math.min(25, (savingsRate / 0.2) * 25) : 0;
    score += savingsScore;
    factors.push({ name: 'Savings Rate', score: Math.round(savingsScore), maxScore: 25 });

    // Debt management (25 pts)
    const totalDebt = Math.abs(accounts.filter(a => a.type === 'credit').reduce((s, a) => s + a.balance, 0));
    const debtRatio = monthlyIncome > 0 ? totalDebt / monthlyIncome : 0;
    const debtScore = debtRatio === 0 ? 25 : debtRatio <= 0.3 ? (1 - debtRatio / 0.3) * 25 : 0;
    score += debtScore;
    factors.push({ name: 'Debt Management', score: Math.round(debtScore), maxScore: 25 });

    // Goal progress (25 pts)
    const avgGoalProgress = goals.length > 0
      ? goals.reduce((s, g) => s + (g.currentAmount / (g.targetAmount || 1)), 0) / goals.length
      : 0;
    const goalScore = Math.min(25, avgGoalProgress * 25);
    score += goalScore;
    factors.push({ name: 'Goal Progress', score: Math.round(goalScore), maxScore: 25 });

    return { score: Math.round(score), factors, maxScore: 100 };
  }

  updateCache(dataType, data) {
    this.cache.set(dataType, data);
    this.lastFetch.set(dataType, new Date());
  }

  clearCache(dataType = null) {
    if (dataType) {
      this.cache.delete(dataType);
      this.lastFetch.delete(dataType);
    } else {
      this.cache.clear();
      this.lastFetch.clear();
    }
  }

  async syncWithGoogleSheets() {
    try {
      Utils.showLoading();
      this.clearCache();
      const success = await this.fetchFromGAS();
      Utils.hideLoading();
      
      return success
        ? Utils.handleSuccess(null, 'Data synced from Google Sheets')
        : Utils.handleSuccess(null, 'Using cached/mock data (sync unavailable)');
    } catch (error) {
      Utils.hideLoading();
      return Utils.handleError(error, 'syncing with Google Sheets');
    }
  }

  exportData(format = 'json') {
    const exportData = {
      accounts: this.cache.get('accounts'),
      transactions: this.cache.get('transactions'),
      bills: this.cache.get('bills'),
      goals: this.cache.get('goals'),
      exportDate: new Date().toISOString()
    };

    if (format === 'csv') {
      const transactions = this.cache.get('transactions') || [];
      return 'Date,Description,Amount,Category,Account\n' +
        transactions.map(t =>
          `${Utils.formatDate(t.date)},${t.description},${t.amount},${t.category},${t.account}`
        ).join('\n');
    }

    return JSON.stringify(exportData, null, 2);
  }
}

// Initialize global data manager
const dataManager = new DataManager();
