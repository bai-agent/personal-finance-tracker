// Charts and Visualizations using Chart.js

class ChartManager {
  constructor() {
    this.charts = new Map();
    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#374151',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(156, 163, 175, 0.2)'
          },
          ticks: {
            color: '#6B7280'
          }
        },
        y: {
          grid: {
            color: 'rgba(156, 163, 175, 0.2)'
          },
          ticks: {
            color: '#6B7280',
            callback: function(value) {
              return Utils.formatCompactCurrency(value);
            }
          }
        }
      }
    };
  }

  // Initialize Chart.js (would be loaded from CDN in real implementation)
  async initializeChartJS() {
    // In a real implementation, Chart.js would be loaded from CDN
    // For now, we'll create a simple canvas-based chart system
    if (!window.Chart) {
      console.warn('Chart.js not loaded, using fallback chart system');
      return this.initializeFallbackCharts();
    }
    
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    Chart.defaults.color = '#6B7280';
    
    return true;
  }

  // Fallback chart system using canvas (simplified)
  initializeFallbackCharts() {
    // Simple canvas-based charts for when Chart.js is not available
    this.useSimpleCharts = true;
    return true;
  }

  // Create cash flow chart
  async createCashFlowChart(elementId, data, period = 30) {
    const canvas = document.getElementById(elementId);
    if (!canvas) return;

    try {
      // Destroy existing chart
      if (this.charts.has(elementId)) {
        this.charts.get(elementId).destroy();
      }

      const chartData = this.prepareCashFlowData(data, period);
      
      if (this.useSimpleCharts) {
        this.drawSimpleLineChart(canvas, chartData, 'Cash Flow');
        return;
      }

      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          ...this.defaultOptions,
          scales: {
            ...this.defaultOptions.scales,
            y: {
              ...this.defaultOptions.scales.y,
              beginAtZero: false
            }
          },
          plugins: {
            ...this.defaultOptions.plugins,
            title: {
              display: true,
              text: `Cash Flow - Last ${period} Days`
            }
          }
        }
      });

      this.charts.set(elementId, chart);
    } catch (error) {
      console.error('Error creating cash flow chart:', error);
      this.drawErrorChart(canvas, 'Unable to load cash flow chart');
    }
  }

  // Create spending categories chart
  async createCategoryChart(elementId, data, period = 'thisMonth') {
    const canvas = document.getElementById(elementId);
    if (!canvas) return;

    try {
      if (this.charts.has(elementId)) {
        this.charts.get(elementId).destroy();
      }

      const chartData = this.prepareCategoryData(data, period);
      
      if (this.useSimpleCharts) {
        this.drawSimplePieChart(canvas, chartData, 'Spending by Category');
        return;
      }

      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
          ...this.defaultOptions,
          plugins: {
            ...this.defaultOptions.plugins,
            title: {
              display: true,
              text: 'Spending by Category'
            },
            legend: {
              position: Utils.isMobile() ? 'bottom' : 'right'
            }
          }
        }
      });

      this.charts.set(elementId, chart);
    } catch (error) {
      console.error('Error creating category chart:', error);
      this.drawErrorChart(canvas, 'Unable to load category chart');
    }
  }

  // Create goals progress chart
  async createGoalsChart(elementId, goals) {
    const canvas = document.getElementById(elementId);
    if (!canvas) return;

    try {
      if (this.charts.has(elementId)) {
        this.charts.get(elementId).destroy();
      }

      const chartData = this.prepareGoalsData(goals);
      
      if (this.useSimpleCharts) {
        this.drawSimpleBarChart(canvas, chartData, 'Goals Progress');
        return;
      }

      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
          ...this.defaultOptions,
          indexAxis: Utils.isMobile() ? 'y' : 'x',
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              ticks: {
                callback: function(value) {
                  return value + '%';
                }
              }
            }
          },
          plugins: {
            ...this.defaultOptions.plugins,
            title: {
              display: true,
              text: 'Goals Progress'
            }
          }
        }
      });

      this.charts.set(elementId, chart);
    } catch (error) {
      console.error('Error creating goals chart:', error);
      this.drawErrorChart(canvas, 'Unable to load goals chart');
    }
  }

  // Create financial projections chart
  async createProjectionsChart(elementId, accounts, goals) {
    const canvas = document.getElementById(elementId);
    if (!canvas) return;

    try {
      if (this.charts.has(elementId)) {
        this.charts.get(elementId).destroy();
      }

      const chartData = this.prepareProjectionsData(accounts, goals);
      
      if (this.useSimpleCharts) {
        this.drawSimpleLineChart(canvas, chartData, 'Financial Projections');
        return;
      }

      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          ...this.defaultOptions,
          plugins: {
            ...this.defaultOptions.plugins,
            title: {
              display: true,
              text: 'Financial Projections (Next 12 Months)'
            }
          }
        }
      });

      this.charts.set(elementId, chart);
    } catch (error) {
      console.error('Error creating projections chart:', error);
      this.drawErrorChart(canvas, 'Unable to load projections chart');
    }
  }

  // Prepare cash flow data
  prepareCashFlowData(transactions, period) {
    const days = period;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Group transactions by day
    const dailyData = {};
    let runningBalance = 0;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.date).toISOString().split('T')[0];
        return tDate === dateStr;
      });
      
      const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
      runningBalance += dayTotal;
      
      dailyData[dateStr] = {
        date: date,
        balance: runningBalance,
        income: dayTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        expenses: Math.abs(dayTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0))
      };
    }

    const labels = Object.keys(dailyData).map(date => {
      return new Date(date).toLocaleDateString('en-AU', { 
        month: 'short', 
        day: 'numeric' 
      });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Balance',
          data: Object.values(dailyData).map(d => d.balance),
          borderColor: CONFIG.CHART_COLORS.PRIMARY,
          backgroundColor: Utils.hexToRgba(CONFIG.CHART_COLORS.PRIMARY, 0.1),
          fill: true,
          tension: 0.1
        },
        {
          label: 'Daily Income',
          data: Object.values(dailyData).map(d => d.income),
          borderColor: CONFIG.CHART_COLORS.SUCCESS,
          backgroundColor: CONFIG.CHART_COLORS.SUCCESS,
          type: 'bar',
          yAxisID: 'y1'
        },
        {
          label: 'Daily Expenses',
          data: Object.values(dailyData).map(d => d.expenses),
          borderColor: CONFIG.CHART_COLORS.DANGER,
          backgroundColor: CONFIG.CHART_COLORS.DANGER,
          type: 'bar',
          yAxisID: 'y1'
        }
      ]
    };
  }

  // Prepare category spending data
  prepareCategoryData(transactions, period) {
    // Filter transactions by period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        transactions = transactions.filter(t => t.date >= startDate && t.date <= endDate);
        break;
      case 'last3Months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filteredTransactions = transactions.filter(t => 
      t.date >= startDate && t.amount < 0 // Only expenses
    );

    // Group by category
    const categories = {};
    filteredTransactions.forEach(t => {
      const category = t.category || 'Miscellaneous';
      categories[category] = (categories[category] || 0) + Math.abs(t.amount);
    });

    // Sort by amount and get top categories
    const sortedCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8 categories

    const colors = [
      CONFIG.CHART_COLORS.PRIMARY,
      CONFIG.CHART_COLORS.SUCCESS,
      CONFIG.CHART_COLORS.DANGER,
      CONFIG.CHART_COLORS.WARNING,
      CONFIG.CHART_COLORS.SECONDARY,
      CONFIG.CHART_COLORS.ACCENT,
      '#8B5CF6',
      '#F472B6'
    ];

    return {
      labels: sortedCategories.map(c => c[0]),
      datasets: [{
        data: sortedCategories.map(c => c[1]),
        backgroundColor: colors,
        borderColor: colors.map(color => color),
        borderWidth: 1
      }]
    };
  }

  // Prepare goals progress data
  prepareGoalsData(goals) {
    const goalData = goals.map(goal => {
      const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
      return {
        name: goal.name,
        progress: progress,
        current: goal.currentAmount,
        target: goal.targetAmount
      };
    });

    return {
      labels: goalData.map(g => g.name),
      datasets: [{
        label: 'Progress (%)',
        data: goalData.map(g => g.progress),
        backgroundColor: goalData.map((g, i) => {
          const colors = [CONFIG.CHART_COLORS.SUCCESS, CONFIG.CHART_COLORS.PRIMARY, CONFIG.CHART_COLORS.SECONDARY];
          return g.progress >= 75 ? CONFIG.CHART_COLORS.SUCCESS : 
                 g.progress >= 50 ? CONFIG.CHART_COLORS.WARNING : 
                 colors[i % colors.length];
        }),
        borderColor: '#ffffff',
        borderWidth: 1
      }]
    };
  }

  // Prepare financial projections data
  prepareProjectionsData(accounts, goals) {
    const months = 12;
    const labels = [];
    const currentDate = new Date();
    
    for (let i = 0; i <= months; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      labels.push(date.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' }));
    }

    // Calculate savings accounts projection
    const savingsAccounts = accounts.filter(acc => acc.type === 'savings');
    const currentSavings = savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const monthlySavings = 800; // Estimated monthly savings
    
    const savingsProjection = [];
    for (let i = 0; i <= months; i++) {
      savingsProjection.push(currentSavings + (monthlySavings * i));
    }

    // Emergency fund goal projection
    const emergencyGoal = goals.find(g => g.name.toLowerCase().includes('emergency'));
    const emergencyProjection = emergencyGoal ? Array(months + 1).fill(emergencyGoal.targetAmount) : [];

    return {
      labels,
      datasets: [
        {
          label: 'Projected Savings',
          data: savingsProjection,
          borderColor: CONFIG.CHART_COLORS.SUCCESS,
          backgroundColor: Utils.hexToRgba(CONFIG.CHART_COLORS.SUCCESS, 0.1),
          fill: true,
          tension: 0.1
        },
        ...(emergencyProjection.length > 0 ? [{
          label: 'Emergency Fund Goal',
          data: emergencyProjection,
          borderColor: CONFIG.CHART_COLORS.DANGER,
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          pointRadius: 0
        }] : [])
      ]
    };
  }

  // Simple fallback chart implementations
  drawSimpleLineChart(canvas, data, title) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 30);
    ctx.fillText('📈 Chart visualization requires Chart.js library', width / 2, height / 2);
  }

  drawSimplePieChart(canvas, data, title) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 30);
    ctx.fillText('🍰 Chart visualization requires Chart.js library', width / 2, height / 2);
  }

  drawSimpleBarChart(canvas, data, title) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 30);
    ctx.fillText('📊 Chart visualization requires Chart.js library', width / 2, height / 2);
  }

  drawErrorChart(canvas, message) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ ' + message, width / 2, height / 2);
  }

  // Update chart with new data
  updateChart(elementId, newData) {
    if (this.charts.has(elementId)) {
      const chart = this.charts.get(elementId);
      chart.data = newData;
      chart.update();
    }
  }

  // Destroy all charts
  destroyAllCharts() {
    this.charts.forEach((chart, id) => {
      chart.destroy();
    });
    this.charts.clear();
  }

  // Resize charts for responsive design
  resizeCharts() {
    this.charts.forEach((chart, id) => {
      chart.resize();
    });
  }
}

// Initialize global chart manager
const chartManager = new ChartManager();