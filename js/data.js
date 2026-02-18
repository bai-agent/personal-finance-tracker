// Data Management and API Integration

class DataManager {
  constructor() {
    this.cache = new Map();
    this.lastFetch = new Map();
    this.refreshInterval = CONFIG.REFRESH_INTERVALS.NORMAL;
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
    
    // Initialize mock data for demo purposes
    this.initializeMockData();
  }

  // Initialize with mock data for demonstration
  initializeMockData() {
    const mockData = {
      accounts: [
        {
          id: 'checking_001',
          name: 'Joint Checking',
          type: 'checking',
          balance: 5420.50,
          lastUpdate: new Date(),
          change: 150.00
        },
        {
          id: 'savings_001',
          name: 'Emergency Fund',
          type: 'savings',
          balance: 12800.75,
          lastUpdate: new Date(),
          change: 500.00
        },
        {
          id: 'savings_002',
          name: 'Vacation Fund',
          type: 'savings',
          balance: 3200.00,
          lastUpdate: new Date(),
          change: 200.00
        },
        {
          id: 'credit_001',
          name: 'Credit Card',
          type: 'credit',
          balance: -1250.30,
          lastUpdate: new Date(),
          change: -75.00
        }
      ],
      
      transactions: this.generateMockTransactions(),
      
      bills: [
        {
          id: 'bill_001',
          name: 'Rent',
          amount: 2200.00,
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          status: 'pending',
          category: 'Housing',
          account: 'checking_001'
        },
        {
          id: 'bill_002',
          name: 'Electricity',
          amount: 180.50,
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: 'pending',
          category: 'Utilities',
          account: 'checking_001'
        },
        {
          id: 'bill_003',
          name: 'Internet',
          amount: 89.99,
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          status: 'pending',
          category: 'Utilities',
          account: 'checking_001'
        }
      ],

      goals: [
        {
          id: 'goal_001',
          name: 'Emergency Fund',
          description: 'Save 6 months of expenses',
          targetAmount: 20000.00,
          currentAmount: 12800.75,
          targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          category: 'savings',
          priority: 'high'
        },
        {
          id: 'goal_002',
          name: 'Vacation Fund',
          description: 'Europe trip next year',
          targetAmount: 8000.00,
          currentAmount: 3200.00,
          targetDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
          category: 'lifestyle',
          priority: 'medium'
        },
        {
          id: 'goal_003',
          name: 'House Deposit',
          description: 'Save for house down payment',
          targetAmount: 80000.00,
          currentAmount: 15000.00,
          targetDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
          category: 'investment',
          priority: 'high'
        }
      ],

      insights: [
        {
          id: 'insight_001',
          type: 'recommendation',
          title: 'Optimize Your Savings',
          description: 'You could save an extra $200/month by reducing dining out expenses.',
          priority: 'medium',
          timestamp: new Date()
        },
        {
          id: 'insight_002',
          type: 'warning',
          title: 'Credit Card Balance Growing',
          description: 'Your credit card balance has increased by 25% this month.',
          priority: 'high',
          timestamp: new Date()
        }
      ]
    };

    // Cache the mock data
    Object.keys(mockData).forEach(key => {
      this.cache.set(key, mockData[key]);
      this.lastFetch.set(key, new Date());
    });
  }

  // Generate mock transactions for demonstration
  generateMockTransactions(count = 50) {
    const transactions = [];
    const descriptions = [
      'Woolworths Supermarket',
      'Shell Service Station',
      'Netflix Subscription',
      'Salary Deposit',
      'Uber Trip',
      'Coffee Club',
      'Target Australia',
      'Electricity Bill',
      'Gym Membership',
      'Restaurant Booking'
    ];

    for (let i = 0; i < count; i++) {
      const isIncome = Math.random() < 0.2; // 20% chance of income
      const amount = isIncome 
        ? Math.random() * 3000 + 1000 // Income: $1000-$4000
        : -(Math.random() * 200 + 10); // Expense: $10-$210

      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

      transactions.push({
        id: `txn_${Utils.generateId()}`,
        description,
        amount,
        date,
        category: Utils.detectCategory(description, amount),
        account: 'checking_001',
        type: amount > 0 ? 'income' : 'expense'
      });
    }

    return transactions.sort((a, b) => b.date - a.date);
  }

  // Check if cached data is still fresh
  isCacheFresh(dataType, maxAge = this.refreshInterval) {
    const lastFetch = this.lastFetch.get(dataType);
    if (!lastFetch) return false;
    return (Date.now() - lastFetch.getTime()) < maxAge;
  }

  // Get data from cache or fetch fresh data
  async getData(dataType, forceRefresh = false) {
    try {
      // Return cached data if fresh and not forcing refresh
      if (!forceRefresh && this.isCacheFresh(dataType)) {
        return Utils.handleSuccess(this.cache.get(dataType));
      }

      // In a real implementation, this would fetch from Google Sheets
      // For now, return mock data or cached data
      const cachedData = this.cache.get(dataType);
      if (cachedData) {
        return Utils.handleSuccess(cachedData);
      }

      // If no cached data and we're offline, return error
      if (!this.isOnline) {
        return Utils.handleError(new Error('No cached data available offline'));
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return cached data (in real app, this would be fresh API data)
      return Utils.handleSuccess(this.cache.get(dataType));

    } catch (error) {
      return Utils.handleError(error, `fetching ${dataType}`);
    }
  }

  // Get account data
  async getAccounts(forceRefresh = false) {
    return this.getData('accounts', forceRefresh);
  }

  // Get transaction data
  async getTransactions(forceRefresh = false) {
    return this.getData('transactions', forceRefresh);
  }

  // Get bill data
  async getBills(forceRefresh = false) {
    return this.getData('bills', forceRefresh);
  }

  // Get goal data
  async getGoals(forceRefresh = false) {
    return this.getData('goals', forceRefresh);
  }

  // Get insights data
  async getInsights(forceRefresh = false) {
    return this.getData('insights', forceRefresh);
  }

  // Get dashboard summary data
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
        bills.data,
        goals.data
      );

      return Utils.handleSuccess(summary);

    } catch (error) {
      return Utils.handleError(error, 'fetching dashboard data');
    }
  }

  // Calculate dashboard summary metrics
  calculateDashboardSummary(accounts, transactions, bills, goals) {
    // Calculate net worth
    const netWorth = accounts.reduce((total, account) => {
      return account.type === 'credit' 
        ? total + account.balance // Credit balances are negative
        : total + account.balance;
    }, 0);

    // Calculate monthly income and expenses
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTransactions = transactions.filter(t => t.date >= thirtyDaysAgo);
    
    const monthlyIncome = recentTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const monthlyExpenses = Math.abs(recentTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));

    // Calculate savings rate
    const savingsRate = Utils.calculateSavingsRate(monthlyIncome, monthlyExpenses);

    // Calculate upcoming bills
    const upcomingBills = bills.filter(bill => {
      const daysUntilDue = (bill.dueDate - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntilDue <= 30 && bill.status === 'pending';
    });

    // Calculate goal progress
    const totalGoalProgress = goals.reduce((total, goal) => {
      return total + (goal.currentAmount / goal.targetAmount);
    }, 0) / goals.length;

    // Calculate financial health score
    const healthScore = this.calculateHealthScore({
      netWorth,
      monthlyIncome,
      monthlyExpenses,
      savingsRate,
      accounts,
      goals
    });

    return {
      netWorth,
      monthlyIncome,
      monthlyExpenses,
      savingsRate,
      upcomingBills,
      totalGoalProgress,
      healthScore,
      lastUpdate: new Date()
    };
  }

  // Calculate financial health score (0-100)
  calculateHealthScore({ netWorth, monthlyIncome, monthlyExpenses, savingsRate, accounts, goals }) {
    let score = 0;
    const factors = [];

    // Emergency fund factor (25 points)
    const emergencyFund = accounts
      .filter(acc => acc.type === 'savings')
      .reduce((sum, acc) => sum + acc.balance, 0);
    const monthsOfExpenses = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;
    
    if (monthsOfExpenses >= 6) {
      score += 25;
      factors.push({ name: 'Emergency Fund', score: 25, maxScore: 25 });
    } else {
      const emergencyScore = Math.min(25, (monthsOfExpenses / 6) * 25);
      score += emergencyScore;
      factors.push({ name: 'Emergency Fund', score: Math.round(emergencyScore), maxScore: 25 });
    }

    // Savings rate factor (25 points)
    if (savingsRate >= 0.2) {
      score += 25;
      factors.push({ name: 'Savings Rate', score: 25, maxScore: 25 });
    } else if (savingsRate >= 0) {
      const savingsScore = (savingsRate / 0.2) * 25;
      score += savingsScore;
      factors.push({ name: 'Savings Rate', score: Math.round(savingsScore), maxScore: 25 });
    } else {
      factors.push({ name: 'Savings Rate', score: 0, maxScore: 25 });
    }

    // Debt management factor (25 points)
    const creditAccounts = accounts.filter(acc => acc.type === 'credit');
    const totalDebt = Math.abs(creditAccounts.reduce((sum, acc) => sum + acc.balance, 0));
    const debtRatio = monthlyIncome > 0 ? (totalDebt / monthlyIncome) : 0;
    
    if (debtRatio === 0) {
      score += 25;
      factors.push({ name: 'Debt Management', score: 25, maxScore: 25 });
    } else if (debtRatio <= 0.3) {
      const debtScore = (1 - (debtRatio / 0.3)) * 25;
      score += debtScore;
      factors.push({ name: 'Debt Management', score: Math.round(debtScore), maxScore: 25 });
    } else {
      factors.push({ name: 'Debt Management', score: 0, maxScore: 25 });
    }

    // Goal progress factor (25 points)
    const avgGoalProgress = goals.reduce((sum, goal) => {
      return sum + (goal.currentAmount / goal.targetAmount);
    }, 0) / goals.length;
    
    const goalScore = Math.min(25, avgGoalProgress * 25);
    score += goalScore;
    factors.push({ name: 'Goal Progress', score: Math.round(goalScore), maxScore: 25 });

    return {
      score: Math.round(score),
      factors,
      maxScore: 100
    };
  }

  // Update local cache
  updateCache(dataType, data) {
    this.cache.set(dataType, data);
    this.lastFetch.set(dataType, new Date());
  }

  // Clear cache
  clearCache(dataType = null) {
    if (dataType) {
      this.cache.delete(dataType);
      this.lastFetch.delete(dataType);
    } else {
      this.cache.clear();
      this.lastFetch.clear();
    }
  }

  // Sync with Google Sheets (placeholder for real implementation)
  async syncWithGoogleSheets() {
    try {
      // This would implement actual Google Sheets API calls
      Utils.showLoading();
      
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force refresh all data
      const results = await Promise.all([
        this.getAccounts(true),
        this.getTransactions(true),
        this.getBills(true),
        this.getGoals(true)
      ]);
      
      Utils.hideLoading();
      
      const allSuccessful = results.every(result => result.success);
      return Utils.handleSuccess(null, allSuccessful ? 'Data synced successfully' : 'Partial sync completed');
      
    } catch (error) {
      Utils.hideLoading();
      return Utils.handleError(error, 'syncing with Google Sheets');
    }
  }

  // Wake up BAI with financial data update
  async wakeBAI(updateData) {
    try {
      // This would send a webhook to OpenClaw to wake up BAI
      const response = await fetch(CONFIG.OPENCLAW.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'finance-tracker',
          type: 'data-update',
          data: updateData,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        return Utils.handleSuccess(null, 'BAI notified successfully');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return Utils.handleError(error, 'waking BAI');
    }
  }

  // Export data for backup or analysis
  exportData(format = 'json') {
    const exportData = {
      accounts: this.cache.get('accounts'),
      transactions: this.cache.get('transactions'),
      bills: this.cache.get('bills'),
      goals: this.cache.get('goals'),
      exportDate: new Date().toISOString()
    };

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const transactions = this.cache.get('transactions') || [];
      const csvContent = 'Date,Description,Amount,Category,Account\n' +
        transactions.map(t => 
          `${Utils.formatDate(t.date)},${t.description},${t.amount},${t.category},${t.account}`
        ).join('\n');
      
      return csvContent;
    }

    return JSON.stringify(exportData, null, 2);
  }
}

// Initialize global data manager
const dataManager = new DataManager();