// UI Management and DOM Manipulation

class UIManager {
  constructor() {
    this.currentTab = 'overview';
    this.isLoading = false;
    this.refreshInterval = null;
    this.lastUpdate = new Date();
    
    // Bind event listeners
    this.bindEventListeners();
    
    // Initialize responsive features
    this.initializeResponsive();
  }

  // Bind all event listeners
  bindEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    // Chart period controls
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('chart-btn')) {
        this.handleChartPeriodChange(e.target);
      }
    });

    // Category period selector
    const categoryPeriod = document.getElementById('categoryPeriod');
    if (categoryPeriod) {
      categoryPeriod.addEventListener('change', (e) => {
        this.updateCategoryChart(e.target.value);
      });
    }

    // Window resize handler
    window.addEventListener('resize', Utils.throttle(() => {
      this.handleResize();
    }, 250));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e);
    });

    // Touch gestures for mobile
    if (Utils.isTouchDevice()) {
      this.initializeTouchGestures();
    }
  }

  // Initialize responsive features
  initializeResponsive() {
    // Set initial responsive state
    this.updateResponsiveLayout();
    
    // Initialize mobile navigation
    if (Utils.isMobile()) {
      this.initializeMobileNavigation();
    }
  }

  // Switch between tabs
  switchTab(tabName) {
    if (!tabName || this.isLoading) return;

    // Update active tab button
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    // Sync dropdown selector
    const dropdown = document.getElementById('navDropdown');
    if (dropdown) dropdown.value = tabName;

    // Show corresponding content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    this.currentTab = tabName;
    
    // Load tab-specific content
    this.loadTabContent(tabName);
    
    // Update URL hash for bookmarking
    window.history.replaceState({}, '', `#${tabName}`);
  }

  // Load content for specific tab
  async loadTabContent(tabName) {
    try {
      switch (tabName) {
        case 'overview':
          await this.loadOverviewTab();
          break;
        case 'accounts':
          await this.loadAccountsTab();
          break;
        case 'bills':
          await this.loadBillsTab();
          break;
        case 'goals':
          await this.loadGoalsTab();
          break;
        case 'insights':
          await this.loadInsightsTab();
          break;
      }
    } catch (error) {
      console.error(`Error loading ${tabName} tab:`, error);
      this.showError(`Failed to load ${tabName} data`);
    }
  }

  // Load overview tab content
  async loadOverviewTab() {
    const dashboardData = await dataManager.getDashboardData();
    
    if (dashboardData.success) {
      this.updateOverviewCards(dashboardData.data);
      this.updateCashFlowChart();
      this.updateCategoryChart();
    } else {
      this.showError('Failed to load dashboard data');
    }
  }

  // Update overview cards with latest data
  updateOverviewCards(data) {
    // Net Worth
    const netWorthElement = document.getElementById('netWorth');
    const netWorthChangeElement = document.getElementById('netWorthChange');
    const netWorthTrendElement = document.getElementById('netWorthTrend');
    
    if (netWorthElement) {
      netWorthElement.textContent = Utils.formatCurrency(data.netWorth);
      netWorthElement.className = `big-number ${data.netWorth >= 0 ? 'positive' : 'negative'}`;
    }
    
    if (netWorthChangeElement) {
      const change = Math.random() * 1000 - 500; // Mock change
      netWorthChangeElement.textContent = `${change >= 0 ? '+' : ''}${Utils.formatCurrency(change)} this month`;
      netWorthChangeElement.className = `change ${change >= 0 ? 'positive' : 'negative'}`;
    }
    
    if (netWorthTrendElement) {
      netWorthTrendElement.textContent = data.netWorth >= 0 ? '📈' : '📉';
    }

    // Monthly Income
    const monthlyIncomeElement = document.getElementById('monthlyIncome');
    const incomeChangeElement = document.getElementById('incomeChange');
    
    if (monthlyIncomeElement) {
      monthlyIncomeElement.textContent = Utils.formatCurrency(data.monthlyIncome);
    }
    
    if (incomeChangeElement) {
      incomeChangeElement.textContent = 'Last 30 days';
    }

    // Monthly Expenses
    const monthlyExpensesElement = document.getElementById('monthlyExpenses');
    const expensesChangeElement = document.getElementById('expensesChange');
    
    if (monthlyExpensesElement) {
      monthlyExpensesElement.textContent = Utils.formatCurrency(data.monthlyExpenses);
    }
    
    if (expensesChangeElement) {
      expensesChangeElement.textContent = 'Last 30 days';
    }

    // Savings Rate
    const savingsRateElement = document.getElementById('savingsRate');
    const savingsAmountElement = document.getElementById('savingsAmount');
    
    if (savingsRateElement) {
      savingsRateElement.textContent = Utils.formatPercentage(data.savingsRate);
    }
    
    if (savingsAmountElement) {
      const savings = data.monthlyIncome - data.monthlyExpenses;
      savingsAmountElement.textContent = Utils.formatCurrency(savings) + ' saved';
    }
  }

  // Load accounts tab
  async loadAccountsTab() {
    const accountsResult = await dataManager.getAccounts();
    const transactionsResult = await dataManager.getTransactions();
    
    if (accountsResult.success) {
      this.renderAccountCards(accountsResult.data);
    }
    
    if (transactionsResult.success) {
      this.renderRecentTransactions(transactionsResult.data.slice(0, 20));
    }
  }

  // Render account cards
  renderAccountCards(accounts) {
    const container = document.getElementById('accountsGrid');
    if (!container) return;

    container.innerHTML = accounts.map(account => `
      <div class="card account-card ${account.type}">
        <div class="card-body">
          <div class="account-header">
            <div>
              <div class="account-name">${account.name}</div>
              <div class="account-type">${account.type}</div>
            </div>
            <div class="account-type">${ACCOUNT_TEMPLATES[account.type]?.icon || '💰'}</div>
          </div>
          <div class="account-balance ${account.balance >= 0 ? 'positive' : 'negative'}">
            ${Utils.formatCurrency(account.balance)}
          </div>
          <div class="account-change ${account.change >= 0 ? 'positive' : 'negative'}">
            <span>${account.change >= 0 ? '↗️' : '↘️'}</span>
            ${account.change >= 0 ? '+' : ''}${Utils.formatCurrency(account.change)} this month
          </div>
        </div>
      </div>
    `).join('');
  }

  // Render recent transactions
  renderRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactions');
    if (!container) return;

    container.innerHTML = transactions.map(transaction => `
      <div class="transaction-item">
        <div class="transaction-info">
          <div class="transaction-description">${transaction.description}</div>
          <div class="transaction-meta">
            <span>${Utils.formatDate(transaction.date)}</span>
            <span>${transaction.category}</span>
          </div>
        </div>
        <div class="transaction-amount ${transaction.type}">
          ${transaction.amount >= 0 ? '+' : ''}${Utils.formatCurrency(transaction.amount)}
        </div>
      </div>
    `).join('');
  }

  // Load bills tab
  async loadBillsTab() {
    const billsResult = await dataManager.getBills();
    
    if (billsResult.success) {
      this.renderUpcomingBills(billsResult.data);
      this.renderBillCalendar(billsResult.data);
      this.renderTransfersNeeded(billsResult.data);
    }
  }

  // Render upcoming bills
  renderUpcomingBills(bills) {
    const container = document.getElementById('upcomingBills');
    if (!container) return;

    const upcomingBills = bills.filter(bill => {
      const daysUntilDue = (bill.dueDate - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntilDue <= 30 && bill.status === 'pending';
    });

    container.innerHTML = upcomingBills.map(bill => {
      const daysUntilDue = Math.ceil((bill.dueDate - new Date()) / (1000 * 60 * 60 * 24));
      const urgencyClass = daysUntilDue < 0 ? 'overdue' : daysUntilDue <= 3 ? 'due-soon' : '';
      
      return `
        <div class="bill-item ${urgencyClass}">
          <div class="bill-info">
            <div class="bill-name">${bill.name}</div>
            <div class="bill-due-date">Due ${Utils.formatRelativeDate(bill.dueDate)}</div>
          </div>
          <div class="bill-amount">${Utils.formatCurrency(bill.amount)}</div>
          <div class="bill-status ${bill.status}">${bill.status}</div>
        </div>
      `;
    }).join('');
  }

  // Render bill calendar
  renderBillCalendar(bills) {
    const container = document.getElementById('billCalendar');
    if (!container) return;

    // Simple calendar implementation
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    let calendarHTML = '';
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarHTML += '<div class="calendar-day"></div>';
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = day === today.getDate();
      const hasBill = bills.some(bill => {
        const billDate = new Date(bill.dueDate);
        return billDate.getDate() === day && billDate.getMonth() === currentMonth;
      });

      calendarHTML += `
        <div class="calendar-day ${isToday ? 'today' : ''} ${hasBill ? 'has-bill' : ''}">
          <div class="calendar-day-number">${day}</div>
          ${hasBill ? '<div class="calendar-bill-indicator"></div>' : ''}
        </div>
      `;
    }

    container.innerHTML = calendarHTML;
  }

  // Render transfers needed
  renderTransfersNeeded(bills) {
    const container = document.getElementById('transfersList');
    if (!container) return;

    // Mock transfer calculations
    const transfers = [
      {
        description: 'Cover upcoming rent payment',
        fromAccount: 'Savings',
        toAccount: 'Checking',
        amount: 2200.00,
        urgency: 'normal'
      },
      {
        description: 'Credit card payment',
        fromAccount: 'Checking',
        toAccount: 'Credit Card',
        amount: 500.00,
        urgency: 'urgent'
      }
    ];

    container.innerHTML = transfers.map(transfer => `
      <div class="transfer-item">
        <div class="transfer-info">
          <div class="transfer-description">${transfer.description}</div>
          <div class="transfer-accounts">${transfer.fromAccount} → ${transfer.toAccount}</div>
        </div>
        <div class="transfer-amount">${Utils.formatCurrency(transfer.amount)}</div>
      </div>
    `).join('');
  }

  // Load goals tab
  async loadGoalsTab() {
    const goalsResult = await dataManager.getGoals();
    
    if (goalsResult.success) {
      this.renderGoalCards(goalsResult.data);
      await chartManager.createGoalsChart('goalsChart', goalsResult.data);
    }
  }

  // Render goal cards
  renderGoalCards(goals) {
    const container = document.getElementById('goalsGrid');
    if (!container) return;

    container.innerHTML = goals.map(goal => {
      const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
      
      return `
        <div class="card goal-card">
          <div class="card-body">
            <div class="goal-header">
              <div>
                <div class="goal-name">${goal.name}</div>
                <div class="goal-target">Target: ${Utils.formatCurrency(goal.targetAmount)}</div>
              </div>
              <div class="goal-progress">
                <div class="goal-current">${Utils.formatCurrency(goal.currentAmount)}</div>
                <div class="goal-percentage">${progress.toFixed(1)}%</div>
              </div>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="goal-timeline">
              Target date: ${Utils.formatDate(goal.targetDate)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Load insights tab
  async loadInsightsTab() {
    const insightsResult = await dataManager.getInsights();
    const dashboardResult = await dataManager.getDashboardData();
    const accountsResult = await dataManager.getAccounts();
    const goalsResult = await dataManager.getGoals();
    
    if (insightsResult.success) {
      this.renderBAIInsights(insightsResult.data);
    }
    
    if (dashboardResult.success) {
      this.renderFinancialHealthScore(dashboardResult.data.healthScore);
      this.renderSpendingPatterns(dashboardResult.data);
    }
    
    if (accountsResult.success && goalsResult.success) {
      await chartManager.createProjectionsChart('projectionsChart', accountsResult.data, goalsResult.data);
    }
  }

  // Render BAI insights
  renderBAIInsights(insights) {
    const container = document.getElementById('baiInsights');
    if (!container) return;

    if (insights.length === 0) {
      container.innerHTML = '<p class="no-data">No insights yet. Upload some bank statements to get started!</p>';
      return;
    }

    container.innerHTML = insights.map(insight => `
      <div class="insight-item ${insight.type}">
        <div class="insight-title">${insight.title}</div>
        <div class="insight-description">${insight.description}</div>
      </div>
    `).join('');
    
    // Update timestamp
    const timestamp = document.getElementById('insightsTimestamp');
    if (timestamp) {
      timestamp.textContent = `Updated: ${Utils.formatRelativeDate(new Date())}`;
    }
  }

  // Render financial health score
  renderFinancialHealthScore(healthScore) {
    const scoreElement = document.getElementById('healthScore');
    const breakdownElement = document.getElementById('scoreBreakdown');
    const circleElement = document.getElementById('healthScoreCircle');
    
    if (scoreElement) {
      scoreElement.textContent = healthScore.score;
    }
    
    if (circleElement) {
      const percentage = (healthScore.score / 100) * 360;
      circleElement.style.background = `conic-gradient(
        ${CONFIG.CHART_COLORS.SUCCESS} 0deg ${percentage}deg, 
        #e5e7eb ${percentage}deg 360deg
      )`;
    }
    
    if (breakdownElement) {
      breakdownElement.innerHTML = healthScore.factors.map(factor => `
        <div class="score-factor">
          <span class="factor-name">${factor.name}</span>
          <span class="factor-score">${factor.score}/${factor.maxScore}</span>
        </div>
      `).join('');
    }
  }

  // Render spending patterns
  renderSpendingPatterns(data) {
    const container = document.getElementById('spendingPatterns');
    if (!container) return;

    // Mock patterns analysis
    const patterns = [
      'Higher spending on weekends (+15%)',
      'Coffee purchases average 3.2x per week',
      'Grocery spending down 8% this month',
      'Transportation costs increasing (+12%)'
    ];

    container.innerHTML = patterns.map(pattern => `
      <div class="insight-item">
        <div class="insight-description">${pattern}</div>
      </div>
    `).join('');
  }

  // Update charts
  async updateCashFlowChart(period = 30) {
    const transactionsResult = await dataManager.getTransactions();
    if (transactionsResult.success) {
      await chartManager.createCashFlowChart('cashFlowChart', transactionsResult.data, period);
    }
  }

  async updateCategoryChart(period = 'thisMonth') {
    const transactionsResult = await dataManager.getTransactions();
    if (transactionsResult.success) {
      await chartManager.createCategoryChart('categoryChart', transactionsResult.data, period);
    }
  }

  // Handle chart period changes
  handleChartPeriodChange(button) {
    // Update active state
    button.parentElement.querySelectorAll('.chart-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    button.classList.add('active');

    // Update chart
    const period = parseInt(button.dataset.period);
    this.updateCashFlowChart(period);
  }

  // Refresh all data
  async refreshData() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showRefreshing();

    try {
      // Clear cache and fetch fresh data
      dataManager.clearCache();
      await this.loadTabContent(this.currentTab);
      
      this.lastUpdate = new Date();
      this.updateLastUpdateTime();
      
      Utils.notify('Data refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing data:', error);
      this.showError('Failed to refresh data');
    } finally {
      this.isLoading = false;
      this.hideRefreshing();
    }
  }

  // Show refreshing state
  showRefreshing() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.innerHTML = '🔄';
      refreshBtn.style.animation = 'spin 1s linear infinite';
      refreshBtn.disabled = true;
    }
  }

  // Hide refreshing state
  hideRefreshing() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.innerHTML = '🔄';
      refreshBtn.style.animation = 'none';
      refreshBtn.disabled = false;
    }
  }

  // Update last update time
  updateLastUpdateTime() {
    const elements = document.querySelectorAll('#lastUpdate, #footerLastSync');
    elements.forEach(element => {
      if (element.id === 'lastUpdate') {
        element.textContent = `Last updated: ${Utils.formatRelativeDate(this.lastUpdate)}`;
      } else {
        element.textContent = Utils.formatRelativeDate(this.lastUpdate);
      }
    });
  }

  // Show error message
  showError(message) {
    Utils.notify(message, 'error');
    console.error(message);
  }

  // Handle window resize
  handleResize() {
    this.updateResponsiveLayout();
    chartManager.resizeCharts();
  }

  // Update responsive layout
  updateResponsiveLayout() {
    const isMobile = Utils.isMobile();
    document.body.classList.toggle('mobile', isMobile);
    
    // Update chart configurations for mobile
    if (isMobile) {
      // Adjust chart heights for mobile
      document.querySelectorAll('.chart-canvas').forEach(canvas => {
        canvas.style.maxHeight = '250px';
      });
    }
  }

  // Initialize mobile navigation
  initializeMobileNavigation() {
    // Add swipe navigation for mobile
    let startX = 0;
    let startY = 0;
    
    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      if (Math.abs(e.touches[0].clientY - startY) > 50) {
        return; // Vertical scroll, ignore horizontal swipe
      }
      
      const deltaX = e.touches[0].clientX - startX;
      if (Math.abs(deltaX) > 100) {
        // Swipe detected
        if (deltaX > 0) {
          this.navigateTab('previous');
        } else {
          this.navigateTab('next');
        }
      }
    }, { passive: true });
  }

  // Navigate to previous/next tab
  navigateTab(direction) {
    const tabs = ['overview', 'accounts', 'bills', 'goals', 'insights'];
    const currentIndex = tabs.indexOf(this.currentTab);
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % tabs.length;
    } else {
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }
    
    this.switchTab(tabs[newIndex]);
  }

  // Initialize touch gestures
  initializeTouchGestures() {
    // Add touch feedback to interactive elements
    document.addEventListener('touchstart', (e) => {
      if (e.target.matches('.btn, .nav-tab, .chart-btn')) {
        e.target.style.transform = 'scale(0.98)';
      }
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      if (e.target.matches('.btn, .nav-tab, .chart-btn')) {
        setTimeout(() => {
          e.target.style.transform = '';
        }, 150);
      }
    }, { passive: true });
  }

  // Handle keyboard navigation
  handleKeyboardNavigation(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        if (e.shiftKey) {
          this.navigateTab('previous');
          e.preventDefault();
        }
        break;
      case 'ArrowRight':
        if (e.shiftKey) {
          this.navigateTab('next');
          e.preventDefault();
        }
        break;
      case 'r':
        if (!e.target.matches('input, textarea')) {
          this.refreshData();
          e.preventDefault();
        }
        break;
    }
  }
}

// Initialize global UI manager
const uiManager = new UIManager();