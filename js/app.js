// Main App Controller

(function() {
  let selectedAccounts = CONFIG.ACCOUNTS.map(a => a.name);
  let currentTab = 'overview';

  // ==================== INIT ====================

  document.addEventListener('DOMContentLoaded', async () => {
    setupNav();
    setupCurrencyToggle();
    setupRefresh();
    setupAccountFilters();

    await dataManager.fetchAll();
    renderOverview();
    renderFooter();

    // View All button
    document.getElementById('viewAllBtn')?.addEventListener('click', () => {
      switchTab('statements');
    });

    // Select All button
    document.getElementById('selectAllBtn')?.addEventListener('click', toggleSelectAll);

    // Statement controls
    document.getElementById('statementAccount')?.addEventListener('change', renderStatement);
    document.getElementById('statementMonth')?.addEventListener('change', renderStatement);
    document.getElementById('historyMonth')?.addEventListener('change', renderHistory);

    populateMonthDropdowns();
    populateStatementAccountDropdown();
  });

  // ==================== NAVIGATION ====================

  function setupNav() {
    const dd = document.getElementById('navDropdown');
    dd.addEventListener('change', (e) => switchTab(e.target.value));
    const hash = location.hash.slice(1);
    if (hash) { dd.value = hash; switchTab(hash); }
  }

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(tab);
    if (el) el.classList.add('active');
    document.getElementById('navDropdown').value = tab;
    location.hash = tab;

    if (tab === 'statements') renderStatement();
    if (tab === 'history') renderHistory();
    if (tab === 'wages') renderWages();
    if (tab === 'bills') renderBills();
    if (tab === 'savings') renderSavings();
  }

  // ==================== CURRENCY TOGGLE ====================

  function setupCurrencyToggle() {
    const btn = document.getElementById('currencyToggle');
    btn.addEventListener('click', () => {
      dataManager.displayCurrency = dataManager.displayCurrency === 'AUD' ? 'GBP' : 'AUD';
      btn.textContent = dataManager.displayCurrency === 'AUD' ? '$ AUD' : '£ GBP';
      btn.classList.toggle('gbp', dataManager.displayCurrency === 'GBP');
      renderOverview();
      if (currentTab === 'statements') renderStatement();
      if (currentTab === 'history') renderHistory();
    });
  }

  // ==================== REFRESH ====================

  function setupRefresh() {
    document.getElementById('refreshBtn').addEventListener('click', async () => {
      const btn = document.getElementById('refreshBtn');
      btn.style.animation = 'spin 1s linear infinite';
      await dataManager.fetchAll();
      renderOverview();
      renderFooter();
      btn.style.animation = 'none';
    });
  }

  // ==================== ACCOUNT FILTERS ====================

  function setupAccountFilters() {
    const container = document.getElementById('accountFilters');
    CONFIG.ACCOUNTS.forEach(acct => {
      const label = document.createElement('label');
      label.className = 'account-filter-item';
      label.innerHTML = `
        <input type="checkbox" value="${acct.name}" checked>
        <span class="filter-label">${acct.icon} ${acct.name.replace(/ \(.*\)/, '')} <span class="currency-tag">${acct.currency}</span></span>
      `;
      label.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) {
          if (!selectedAccounts.includes(acct.name)) selectedAccounts.push(acct.name);
        } else {
          selectedAccounts = selectedAccounts.filter(n => n !== acct.name);
        }
        renderBalances();
        renderRecentTransactions();
      });
      container.appendChild(label);
    });
  }

  function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('#accountFilters input[type=checkbox]');
    const allChecked = selectedAccounts.length === CONFIG.ACCOUNTS.length;
    checkboxes.forEach(cb => { cb.checked = !allChecked; });
    selectedAccounts = allChecked ? [] : CONFIG.ACCOUNTS.map(a => a.name);
    renderBalances();
    renderRecentTransactions();
  }

  // ==================== OVERVIEW RENDERING ====================

  function renderOverview() {
    renderAccountCards();
    renderBalances();
    renderRecentTransactions();
  }

  function renderAccountCards() {
    const accounts = dataManager.getAccounts();
    const container = document.getElementById('accountCards');
    container.innerHTML = accounts.map(a => {
      const cfg = CONFIG.ACCOUNTS.find(c => c.name === a.name) || {};
      const bal = dataManager.formatCurrency(a.balance);
      const nativeBal = a.nativeCurrency !== dataManager.displayCurrency
        ? `<div class="native-bal">${dataManager.formatCurrency(a.nativeBalance, a.nativeCurrency)} ${a.nativeCurrency}</div>`
        : '';
      const changeClass = a.change >= 0 ? 'positive' : 'negative';
      const changeStr = dataManager.formatCurrency(a.change);
      return `
        <div class="card account-card ${a.type}">
          <div class="card-body">
            <div class="account-header">
              <div>
                <div class="account-name">${cfg.icon || '💰'} ${a.name}</div>
                <div class="account-type">${a.purpose} · ${a.nativeCurrency}</div>
              </div>
            </div>
            <div class="account-balance ${a.balance >= 0 ? 'positive' : 'negative'}">${bal}</div>
            ${nativeBal}
            <div class="account-change ${changeClass}">${a.change >= 0 ? '↗️' : '↘️'} ${changeStr}</div>
          </div>
        </div>`;
    }).join('');
  }

  function renderBalances() {
    const accounts = dataManager.getAccounts();
    const overall = accounts.reduce((s, a) => s + a.balance, 0);
    const selected = accounts
      .filter(a => selectedAccounts.includes(a.name))
      .reduce((s, a) => s + a.balance, 0);

    const cur = dataManager.displayCurrency;
    document.getElementById('overallBalance').textContent = dataManager.formatCurrency(overall);
    document.getElementById('overallBalance').className = 'balance-amount ' + (overall >= 0 ? 'positive' : 'negative');
    document.getElementById('overallBalanceSub').textContent = `All 8 accounts in ${cur}`;

    document.getElementById('selectedBalance').textContent = dataManager.formatCurrency(selected);
    document.getElementById('selectedBalance').className = 'balance-amount ' + (selected >= 0 ? 'positive' : 'negative');
    document.getElementById('selectedBalanceSub').textContent = `${selectedAccounts.length} account${selectedAccounts.length !== 1 ? 's' : ''} selected`;
  }

  function renderRecentTransactions() {
    const ledger = dataManager.getLedger();
    const filtered = ledger.filter(e => selectedAccounts.includes(e.account));
    const container = document.getElementById('recentTransactions');

    if (filtered.length === 0) {
      container.innerHTML = '<p class="no-data">No transactions in the last 7 days</p>';
      return;
    }

    container.innerHTML = filtered.slice(0, 50).map(t => txnRow(t)).join('');
  }

  // ==================== STATEMENT VIEW ====================

  function populateStatementAccountDropdown() {
    const sel = document.getElementById('statementAccount');
    CONFIG.ACCOUNTS.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.name;
      opt.textContent = `${a.icon} ${a.name} (${a.currency})`;
      sel.appendChild(opt);
    });
  }

  function populateMonthDropdowns() {
    // We'll populate from ledger data
    const ledger = dataManager.getLedger();
    const months = new Set();
    ledger.forEach(e => {
      if (e.date) {
        const m = e.date.getFullYear() + '-' + String(e.date.getMonth() + 1).padStart(2, '0');
        months.add(m);
      }
    });
    const sorted = [...months].sort().reverse();

    ['statementMonth', 'historyMonth'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      // Keep first option
      while (sel.options.length > 1) sel.remove(1);
      sorted.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        const [y, mo] = m.split('-');
        const monthName = new Date(y, mo - 1).toLocaleString('en-AU', { month: 'long', year: 'numeric' });
        opt.textContent = monthName;
        sel.appendChild(opt);
      });
    });
  }

  async function renderStatement() {
    const account = document.getElementById('statementAccount').value;
    const month = document.getElementById('statementMonth').value;
    const container = document.getElementById('statementList');
    const balanceBar = document.getElementById('statementBalanceBar');

    container.innerHTML = '<p class="no-data">Loading...</p>';

    let ledger;
    if (month) {
      // Fetch full month from API
      const accts = account === 'all' ? null : [account];
      ledger = await dataManager.fetchLedger(month, accts);
      ledger = ledger.map(e => {
        const cur = e['Currency'] || dataManager.getAccountCurrency(e['Account']);
        return {
          date: e['Date'] ? new Date(e['Date']) : null,
          description: e['Description'] || '',
          amount: parseFloat(e['Amount']) || 0,
          balanceAfter: parseFloat(e['Balance After']) || 0,
          category: e['Category'] || '',
          account: e['Account'] || '',
          currency: cur,
          type: e['Type'] || '',
          convertedAmount: dataManager.convert(parseFloat(e['Amount']) || 0, cur),
          convertedBalance: dataManager.convert(parseFloat(e['Balance After']) || 0, cur)
        };
      }).sort((a, b) => (b.date || 0) - (a.date || 0));
    } else {
      ledger = dataManager.getLedger();
      if (account !== 'all') ledger = ledger.filter(e => e.account === account);
    }

    // Balance bar
    if (account !== 'all') {
      const acctData = dataManager.getAccounts().find(a => a.name === account);
      if (acctData) {
        balanceBar.innerHTML = `<div class="statement-balance">Current Balance: <strong>${dataManager.formatCurrency(acctData.balance)}</strong></div>`;
      } else {
        balanceBar.innerHTML = '';
      }
    } else {
      balanceBar.innerHTML = '';
    }

    if (ledger.length === 0) {
      container.innerHTML = '<p class="no-data">No transactions found</p>';
      return;
    }

    container.innerHTML = ledger.map(t => txnRow(t, true)).join('');
  }

  // ==================== HISTORY VIEW ====================

  function renderHistory() {
    const month = document.getElementById('historyMonth').value;
    const container = document.getElementById('historyList');

    let ledger = dataManager.getLedger();

    // If we need all data beyond 7 days, fetch it
    if (month) {
      // Use cached data filtered by month
      ledger = ledger.filter(e => {
        if (!e.date) return false;
        const m = e.date.getFullYear() + '-' + String(e.date.getMonth() + 1).padStart(2, '0');
        return m === month;
      });
    }

    // Also check history filters
    const checks = document.querySelectorAll('#historyAccountFilters input:checked');
    if (checks.length > 0 && checks.length < CONFIG.ACCOUNTS.length) {
      const selected = [...checks].map(c => c.value);
      ledger = ledger.filter(e => selected.includes(e.account));
    }

    if (ledger.length === 0) {
      container.innerHTML = '<p class="no-data">No transactions found for this period</p>';
      return;
    }

    container.innerHTML = ledger.map(t => txnRow(t, true)).join('');

    // Balance chart
    renderBalanceChart(ledger);
  }

  function renderBalanceChart(ledger) {
    const canvas = document.getElementById('balanceChart');
    if (!canvas || !window.Chart) return;

    const sorted = [...ledger].sort((a, b) => (a.date || 0) - (b.date || 0));
    const labels = sorted.map(e => e.date ? e.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '');
    const balances = sorted.map(e => e.convertedBalance);

    if (canvas._chart) canvas._chart.destroy();

    canvas._chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Balance (' + dataManager.displayCurrency + ')',
          data: balances,
          borderColor: CONFIG.CHART_COLORS.PRIMARY,
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true, tension: 0.2, pointRadius: 1
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 10, color: '#6B7280' }, grid: { color: 'rgba(156,163,175,0.1)' } },
          y: { ticks: { color: '#6B7280', callback: v => dataManager.formatCurrency(v) }, grid: { color: 'rgba(156,163,175,0.1)' } }
        }
      }
    });
  }

  // ==================== WAGES ====================

  function renderWages() {
    const wages = (dataManager.cache.wages || []);
    const container = document.getElementById('wagesContent');
    if (wages.length === 0) {
      container.innerHTML = '<p class="no-data">No wage data yet. Upload pay statements to #finances.</p>';
      return;
    }
    container.innerHTML = '<div class="transactions-list">' + wages.map(w => {
      const cur = w['Currency'] || 'AUD';
      const amt = parseFloat(w['Amount']) || 0;
      return `<div class="txn-row income">
        <div class="txn-left">
          <div class="txn-desc">${w['User'] || ''}</div>
          <div class="txn-meta">${formatDate(w['Date'])} · ${w['Day of Week'] || ''} · ${w['Account'] || ''}</div>
        </div>
        <div class="txn-right">
          <div class="txn-amount positive">${dataManager.formatCurrency(dataManager.convert(amt, cur))}</div>
          ${cur !== dataManager.displayCurrency ? `<div class="txn-native">${dataManager.formatCurrency(amt, cur)} ${cur}</div>` : ''}
        </div>
      </div>`;
    }).join('') + '</div>';
  }

  // ==================== BILLS ====================

  function renderBills() {
    const bills = (dataManager.cache.bills || []);
    const container = document.getElementById('billsContent');
    if (bills.length === 0) {
      container.innerHTML = '<p class="no-data">No recurring bills detected yet.</p>';
      return;
    }
    container.innerHTML = '<div class="transactions-list">' + bills.map(b => {
      const cur = b['Currency'] || 'AUD';
      const amt = Math.abs(parseFloat(b['Amount'])) || 0;
      const status = b['Status'] || 'Active';
      const statusClass = status === 'Overdue' ? 'overdue' : status === 'Due Soon' ? 'due-soon' : '';
      return `<div class="txn-row ${statusClass}">
        <div class="txn-left">
          <div class="txn-desc">${b['Bill Name'] || ''}</div>
          <div class="txn-meta">${b['Frequency'] || 'Monthly'} · ${b['Category'] || ''} · Next: ${formatDate(b['Next Due Date'])}</div>
        </div>
        <div class="txn-right">
          <div class="txn-amount negative">${dataManager.formatCurrency(dataManager.convert(amt, cur))}</div>
          <div class="txn-status ${statusClass}">${status}</div>
        </div>
      </div>`;
    }).join('') + '</div>';
  }

  // ==================== SAVINGS ====================

  function renderSavings() {
    const goals = (dataManager.cache.savings || []);
    const container = document.getElementById('savingsContent');
    if (goals.length === 0) {
      container.innerHTML = '<p class="no-data">No savings goals set up yet.</p>';
      return;
    }
    container.innerHTML = goals.map(g => {
      const target = parseFloat(g['Target Amount']) || 1;
      const current = parseFloat(g['Current Amount']) || 0;
      const pct = Math.min(100, (current / target * 100)).toFixed(1);
      return `<div class="card goal-card">
        <div class="card-body">
          <div class="goal-header">
            <div><div class="goal-name">${g['Goal Name'] || ''}</div><div class="goal-desc">${g['Description'] || ''}</div></div>
            <div class="goal-pct">${pct}%</div>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div class="goal-amounts">${dataManager.formatCurrency(current)} / ${dataManager.formatCurrency(target)}</div>
        </div>
      </div>`;
    }).join('');
  }

  // ==================== HELPERS ====================

  function txnRow(t, showBalance) {
    const isIncome = t.amount > 0;
    const amountStr = dataManager.formatCurrency(t.convertedAmount);
    const nativeStr = t.currency !== dataManager.displayCurrency
      ? `<div class="txn-native">${dataManager.formatCurrency(t.amount, t.currency)} ${t.currency}</div>`
      : '';
    const balStr = showBalance
      ? `<div class="txn-balance">Bal: ${dataManager.formatCurrency(t.convertedBalance)}</div>`
      : '';

    return `<div class="txn-row ${isIncome ? 'income' : 'expense'}">
      <div class="txn-left">
        <div class="txn-desc">${t.description}</div>
        <div class="txn-meta">${formatDate(t.date)} · ${t.account} · ${t.category}</div>
      </div>
      <div class="txn-right">
        <div class="txn-amount ${isIncome ? 'positive' : 'negative'}">${isIncome ? '+' : ''}${amountStr}</div>
        ${nativeStr}
        ${balStr}
      </div>
    </div>`;
  }

  function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
  }

  function renderFooter() {
    document.getElementById('dataSourceLabel').textContent =
      dataManager.dataSource === 'live' ? '🟢 Live' : '🟡 Mock Data';
    const rate = dataManager.exchangeRate;
    document.getElementById('exchangeRateLabel').textContent =
      `£1 = $${(rate.gbpToAud || 1.95).toFixed(2)}`;
  }

  // Setup history account filters
  document.addEventListener('DOMContentLoaded', () => {
    const hf = document.getElementById('historyAccountFilters');
    if (!hf) return;
    CONFIG.ACCOUNTS.forEach(a => {
      const label = document.createElement('label');
      label.className = 'account-filter-item compact';
      label.innerHTML = `<input type="checkbox" value="${a.name}" checked> <span>${a.icon} ${a.name.replace(/ \(.*\)/,'')}</span>`;
      label.querySelector('input').addEventListener('change', () => renderHistory());
      hf.appendChild(label);
    });
  });

})();
