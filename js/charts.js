// Chart rendering module
const FinanceCharts = {
  instances: {},
  
  ACCOUNT_COLORS: {
    'BW Personal (Commonwealth)': '#3b82f6',
    'Katie Personal (Commonwealth)': '#60a5fa',
    'Joint (Commonwealth)': '#34d399',
    'Joint Saver (Commonwealth)': '#6ee7b7',
    'BW Personal (Starling)': '#a78bfa',
    'Katie Personal (Starling)': '#c4b5fd',
    'Joint (Starling)': '#f472b6',
    'Credit Card (Capital One)': '#fb923c'
  },

  CATEGORY_COLORS: {
    'Food & Dining': '#f97316',
    'Housing': '#3b82f6',
    'Utilities': '#8b5cf6',
    'Transportation': '#06b6d4',
    'Entertainment': '#ec4899',
    'Shopping': '#f59e0b',
    'Healthcare': '#10b981',
    'Insurance': '#6366f1',
    'Transfer': '#64748b',
    'Income': '#22c55e',
    'Miscellaneous': '#94a3b8'
  },

  defaults: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a2540',
        borderColor: '#1e2d4a',
        borderWidth: 1,
        titleFont: { size: 11 },
        bodyFont: { size: 11 },
        padding: 8,
        cornerRadius: 8
      }
    },
    scales: {
      x: { ticks: { color: '#4d6080', font: { size: 9 } }, grid: { display: false } },
      y: { ticks: { color: '#4d6080', font: { size: 9 } }, grid: { color: 'rgba(30,45,74,.4)' } }
    }
  },

  destroy(id) {
    if (this.instances[id]) { this.instances[id].destroy(); delete this.instances[id]; }
  },

  getAccountColor(name) {
    return this.ACCOUNT_COLORS[name] || '#4f8cff';
  },

  getCategoryColor(cat) {
    return this.CATEGORY_COLORS[cat] || '#94a3b8';
  },

  // Spending by category donut
  categoryDonut(canvasId, transactions, dm) {
    this.destroy(canvasId);
    var cv = document.getElementById(canvasId);
    if (!cv) return;
    var cats = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
      var c = t.category || 'Miscellaneous';
      if (c === 'Transfer' || c === 'Income') return;
      cats[c] = (cats[c] || 0) + Math.abs(t.convertedAmount);
    });
    var sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) { cv.parentElement.innerHTML = '<div class="empty">No spending data</div>'; return; }
    var labels = sorted.map(e => e[0]);
    var data = sorted.map(e => e[1]);
    var colors = labels.map(l => this.getCategoryColor(l));
    this.instances[canvasId] = new Chart(cv, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#151d30', borderWidth: 2 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: '#7e90b5', font: { size: 9 }, padding: 8, boxWidth: 10, boxHeight: 10 } },
          tooltip: {
            ...this.defaults.plugins.tooltip,
            callbacks: { label: ctx => ctx.label + ': ' + dm.formatCurrency(ctx.raw) }
          }
        }
      }
    });
  },

  // Income vs expenses bar chart
  incomeExpenseBar(canvasId, history, dm) {
    this.destroy(canvasId);
    var cv = document.getElementById(canvasId);
    if (!cv) return;
    var months = (history || []).filter(h => h['Type'] === 'Actual' || !h['Type']).slice(-6);
    if (!months.length) { cv.parentElement.innerHTML = '<div class="empty">No history data</div>'; return; }
    var labels = months.map(m => {
      var p = (m['Month'] || '').split('-');
      return p.length === 2 ? new Date(p[0], p[1] - 1).toLocaleString('en-AU', { month: 'short' }) : m['Month'];
    });
    this.instances[canvasId] = new Chart(cv, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Income', data: months.map(m => parseFloat(m['Total Income']) || 0), backgroundColor: 'rgba(52,211,153,.7)', borderRadius: 4 },
          { label: 'Expenses', data: months.map(m => (parseFloat(m['Total Bills']) || 0) + (parseFloat(m['Total Spending']) || 0)), backgroundColor: 'rgba(248,113,113,.7)', borderRadius: 4 }
        ]
      },
      options: {
        ...this.defaults,
        plugins: {
          ...this.defaults.plugins,
          legend: { display: true, position: 'top', labels: { color: '#7e90b5', font: { size: 9 }, boxWidth: 10, boxHeight: 10, padding: 8 } },
          tooltip: { ...this.defaults.plugins.tooltip, callbacks: { label: ctx => ctx.dataset.label + ': ' + dm.formatCurrency(ctx.raw) } }
        },
        scales: {
          ...this.defaults.scales,
          y: { ...this.defaults.scales.y, ticks: { ...this.defaults.scales.y.ticks, callback: v => dm.formatCurrency(v) } }
        }
      }
    });
  },

  // Spending trend line
  spendingTrend(canvasId, history, dm) {
    this.destroy(canvasId);
    var cv = document.getElementById(canvasId);
    if (!cv) return;
    var months = (history || []).filter(h => h['Type'] === 'Actual' || !h['Type']).slice(-6);
    if (!months.length) { cv.parentElement.innerHTML = '<div class="empty">No trend data</div>'; return; }
    var labels = months.map(m => {
      var p = (m['Month'] || '').split('-');
      return p.length === 2 ? new Date(p[0], p[1] - 1).toLocaleString('en-AU', { month: 'short' }) : m['Month'];
    });
    this.instances[canvasId] = new Chart(cv, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: months.map(m => (parseFloat(m['Total Bills']) || 0) + (parseFloat(m['Total Spending']) || 0)),
          borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,.06)', fill: true, tension: .35, pointRadius: 3,
          pointBackgroundColor: '#f87171', borderWidth: 2
        }]
      },
      options: {
        ...this.defaults,
        scales: {
          ...this.defaults.scales,
          y: { ...this.defaults.scales.y, ticks: { ...this.defaults.scales.y.ticks, callback: v => dm.formatCurrency(v) } }
        }
      }
    });
  },

  // Balance over time (statements)
  balanceLine(canvasId, data, dm) {
    this.destroy(canvasId);
    var cv = document.getElementById(canvasId);
    if (!cv || !data.length) return;
    var s = [...data].sort((a, b) => (a.date || 0) - (b.date || 0));
    this.instances[canvasId] = new Chart(cv, {
      type: 'line',
      data: {
        labels: s.map(e => e.date ? e.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''),
        datasets: [{ data: s.map(e => e.convertedBalance), borderColor: '#4f8cff', backgroundColor: 'rgba(79,140,255,.06)', fill: true, tension: .35, pointRadius: 0, borderWidth: 2 }]
      },
      options: {
        ...this.defaults,
        scales: {
          ...this.defaults.scales,
          y: { ...this.defaults.scales.y, ticks: { ...this.defaults.scales.y.ticks, callback: v => dm.formatCurrency(v) } }
        }
      }
    });
  },

  // Wage history bar chart grouped by person
  wageHistory(canvasId, wages, dm) {
    this.destroy(canvasId);
    var cv = document.getElementById(canvasId);
    if (!cv) return;
    // Group by month and person
    var monthly = {};
    (wages || []).forEach(w => {
      var d = new Date(w['Date']);
      if (isNaN(d.getTime())) return;
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (!monthly[key]) monthly[key] = { Bailey: 0, Katie: 0 };
      var user = w['User'] || 'Bailey';
      var amt = parseFloat(w['Amount']) || 0;
      var cur = w['Currency'] || 'AUD';
      monthly[key][user] = (monthly[key][user] || 0) + dm.convert(amt, cur);
    });
    var months = Object.keys(monthly).sort().slice(-8);
    if (!months.length) { cv.parentElement.innerHTML = '<div class="empty">No wage data</div>'; return; }
    var labels = months.map(m => { var p = m.split('-'); return new Date(p[0], p[1] - 1).toLocaleString('en-AU', { month: 'short' }); });
    this.instances[canvasId] = new Chart(cv, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Bailey', data: months.map(m => monthly[m].Bailey || 0), backgroundColor: 'rgba(59,130,246,.7)', borderRadius: 4 },
          { label: 'Katie', data: months.map(m => monthly[m].Katie || 0), backgroundColor: 'rgba(167,139,250,.7)', borderRadius: 4 }
        ]
      },
      options: {
        ...this.defaults,
        plugins: {
          ...this.defaults.plugins,
          legend: { display: true, position: 'top', labels: { color: '#7e90b5', font: { size: 9 }, boxWidth: 10, boxHeight: 10 } },
          tooltip: { ...this.defaults.plugins.tooltip, callbacks: { label: ctx => ctx.dataset.label + ': ' + dm.formatCurrency(ctx.raw) } }
        },
        scales: {
          ...this.defaults.scales,
          y: { ...this.defaults.scales.y, ticks: { ...this.defaults.scales.y.ticks, callback: v => dm.formatCurrency(v) } }
        }
      }
    });
  },

  // Savings rate trend
  savingsRateTrend(canvasId, history, dm) {
    this.destroy(canvasId);
    var cv = document.getElementById(canvasId);
    if (!cv) return;
    var months = (history || []).filter(h => h['Type'] === 'Actual' || !h['Type']).slice(-8);
    if (!months.length) { cv.parentElement.innerHTML = '<div class="empty">No savings data</div>'; return; }
    var labels = months.map(m => {
      var p = (m['Month'] || '').split('-');
      return p.length === 2 ? new Date(p[0], p[1] - 1).toLocaleString('en-AU', { month: 'short' }) : m['Month'];
    });
    var rates = months.map(m => {
      var inc = parseFloat(m['Total Income']) || 0;
      var saved = parseFloat(m['Total Saved']) || 0;
      return inc > 0 ? (saved / inc * 100) : 0;
    });
    this.instances[canvasId] = new Chart(cv, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: rates, borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,.06)', fill: true,
          tension: .35, pointRadius: 3, pointBackgroundColor: '#34d399', borderWidth: 2
        }]
      },
      options: {
        ...this.defaults,
        scales: {
          ...this.defaults.scales,
          y: { ...this.defaults.scales.y, ticks: { ...this.defaults.scales.y.ticks, callback: v => v.toFixed(0) + '%' } }
        }
      }
    });
  },

  // Monthly projection chart
  projectionChart(canvasId, projections, dm) {
    this.destroy(canvasId);
    var cv = document.getElementById(canvasId);
    if (!cv) return;
    var data = (projections || []).slice(0, 6);
    if (!data.length) { cv.parentElement.innerHTML = '<div class="empty">No projection data</div>'; return; }
    var labels = data.map(p => {
      var parts = (p['Month'] || '').split('-');
      return parts.length === 2 ? new Date(parts[0], parts[1] - 1).toLocaleString('en-AU', { month: 'short' }) : p['Month'];
    });
    this.instances[canvasId] = new Chart(cv, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Income', data: data.map(p => parseFloat(p['Projected Income']) || 0), backgroundColor: 'rgba(52,211,153,.6)', borderRadius: 4 },
          { label: 'Bills', data: data.map(p => parseFloat(p['Projected Bills']) || 0), backgroundColor: 'rgba(248,113,113,.6)', borderRadius: 4 },
          { label: 'Spending', data: data.map(p => parseFloat(p['Projected Spending']) || 0), backgroundColor: 'rgba(249,115,22,.6)', borderRadius: 4 },
          { label: 'Savings', data: data.map(p => parseFloat(p['Projected Savings']) || 0), backgroundColor: 'rgba(79,140,255,.6)', borderRadius: 4 }
        ]
      },
      options: {
        ...this.defaults,
        plugins: {
          ...this.defaults.plugins,
          legend: { display: true, position: 'top', labels: { color: '#7e90b5', font: { size: 8 }, boxWidth: 8, boxHeight: 8, padding: 6 } },
          tooltip: { ...this.defaults.plugins.tooltip, callbacks: { label: ctx => ctx.dataset.label + ': ' + dm.formatCurrency(ctx.raw) } }
        },
        scales: {
          ...this.defaults.scales,
          y: { ...this.defaults.scales.y, ticks: { ...this.defaults.scales.y.ticks, callback: v => dm.formatCurrency(v) } }
        }
      }
    });
  },

  // Account balance over time (for detail view, uses transaction history)
  accountBalanceLine(canvasId, transactions, dm) {
    this.destroy(canvasId);
    var cv = document.getElementById(canvasId);
    if (!cv || !transactions.length) return;
    var s = [...transactions].sort((a, b) => (a.date || 0) - (b.date || 0));
    this.instances[canvasId] = new Chart(cv, {
      type: 'line',
      data: {
        labels: s.map(e => e.date ? e.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''),
        datasets: [{
          data: s.map(e => e.convertedBalance),
          borderColor: '#4f8cff', backgroundColor: 'rgba(79,140,255,.08)',
          fill: true, tension: .35, pointRadius: 0, borderWidth: 2
        }]
      },
      options: {
        ...this.defaults,
        scales: {
          ...this.defaults.scales,
          y: { ...this.defaults.scales.y, ticks: { ...this.defaults.scales.y.ticks, callback: v => dm.formatCurrency(v) } }
        }
      }
    });
  },

  // Day of week spending pattern
  dayOfWeekBar(canvasId, transactions, dm) {
    this.destroy(canvasId);
    var cv = document.getElementById(canvasId);
    if (!cv) return;
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var totals = new Array(7).fill(0);
    var counts = new Array(7).fill(0);
    transactions.filter(t => t.amount < 0 && t.date).forEach(t => {
      var d = t.date.getDay();
      totals[d] += Math.abs(t.convertedAmount);
      counts[d]++;
    });
    var avgs = totals.map((t, i) => counts[i] > 0 ? t / counts[i] : 0);
    this.instances[canvasId] = new Chart(cv, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{ data: avgs, backgroundColor: days.map((_, i) => i === 0 || i === 6 ? 'rgba(167,139,250,.6)' : 'rgba(79,140,255,.6)'), borderRadius: 4 }]
      },
      options: {
        ...this.defaults,
        scales: {
          ...this.defaults.scales,
          y: { ...this.defaults.scales.y, ticks: { ...this.defaults.scales.y.ticks, callback: v => dm.formatCurrency(v) } }
        }
      }
    });
  }
};
