// Main App Controller
(function() {
  'use strict';

  let selectedAccounts = CONFIG.ACCOUNTS.map(a => a.name);
  let currentTab = 'overview';
  let dropdownOpen = false;

  // ==================== INIT ====================
  document.addEventListener('DOMContentLoaded', async () => {
    setupNav();
    setupCurrencyToggle();
    setupRefresh();
    setupAccountDropdown();
    setupViewAll();

    await dataManager.fetchAll();
    renderAll();
  });

  function renderAll() {
    renderOverview();
    renderAccountCards();
    renderSelectedBalance();
    populateStatementDropdowns();
    renderFooter();
  }

  // ==================== NAVIGATION ====================
  function setupNav() {
    const dd = document.getElementById('navDropdown');
    dd.addEventListener('change', e => switchTab(e.target.value));
    const hash = location.hash.slice(1);
    if (hash && document.getElementById(hash)) { dd.value = hash; switchTab(hash); }
  }

  function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(tab);
    if (el) el.classList.add('active');
    document.getElementById('navDropdown').value = tab;
    location.hash = tab;

    if (tab === 'statements') renderStatement();
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
      renderAll();
      if (currentTab === 'statements') renderStatement();
    });
  }

  // ==================== REFRESH ====================
  function setupRefresh() {
    document.getElementById('refreshBtn').addEventListener('click', async () => {
      const btn = document.getElementById('refreshBtn');
      btn.style.animation = 'spin 1s linear infinite';
      await dataManager.fetchAll();
      renderAll();
      if (currentTab === 'statements') renderStatement();
      btn.style.animation = 'none';
    });
  }

  // ==================== VIEW ALL ====================
  function setupViewAll() {
    document.getElementById('viewAllBtn')?.addEventListener('click', () => switchTab('statements'));
  }

  // ==================== ACCOUNT DROPDOWN ====================
  function setupAccountDropdown() {
    const btn = document.getElementById('accountDropdownBtn');
    const menu = document.getElementById('accountDropdownMenu');

    // Build menu items
    let html = '';
    CONFIG.ACCOUNTS.forEach(a => {
      html += `<label class="dropdown-item" data-account="${a.name}">
        <input type="checkbox" value="${a.name}" checked>
        <div class="dropdown-item-label">
          ${a.icon} ${a.name}
          <div class="dropdown-item-sub">${a.user} · ${a.purpose}</div>
        </div>
        <span class="dropdown-item-currency">${a.currency}</span>
      </label>`;
    });
    html += `<div class="dropdown-actions">
      <button id="selectAllAccounts">Select All</button>
      <button id="selectNoneAccounts">Select None</button>
      <button id="doneAccounts">Done ✓</button>
    </div>`;
    menu.innerHTML = html;

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownOpen = !dropdownOpen;
      menu.classList.toggle('open', dropdownOpen);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-dropdown')) {
        dropdownOpen = false;
        menu.classList.remove('open');
      }
    });

    // Checkbox changes
    menu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        updateSelectedFromCheckboxes();
      });
    });

    // Select all / none / done
    document.getElementById('selectAllAccounts').addEventListener('click', () => {
      menu.querySelectorAll('input').forEach(cb => cb.checked = true);
      updateSelectedFromCheckboxes();
    });
    document.getElementById('selectNoneAccounts').addEventListener('click', () => {
      menu.querySelectorAll('input').forEach(cb => cb.checked = false);
      updateSelectedFromCheckboxes();
    });
    document.getElementById('doneAccounts').addEventListener('click', () => {
      dropdownOpen = false;
      menu.classList.remove('open');
    });
  }

  function updateSelectedFromCheckboxes() {
    const menu = document.getElementById('accountDropdownMenu');
    const checked = menu.querySelectorAll('input:checked');
    selectedAccounts = [...checked].map(cb => cb.value);

    // Update trigger label
    const count = selectedAccounts.length;
    const total = CONFIG.ACCOUNTS.length;
    const label = count === total ? `🏦 All Accounts (${total})`
      : count === 0 ? '🏦 No Accounts Selected'
      : `🏦 ${count} Account${count > 1 ? 's' : ''} Selected`;
    document.getElementById('accountDropdownBtn').querySelector('span:first-child').textContent = label;

    renderAccountCards();
    renderSelectedBalance();
    renderOverview();
  }

  // ==================== OVERVIEW ====================
  function renderOverview() {
    const accounts = dataManager.getAccounts();
    const ledger = dataManager.getLedger();
    const dm = dataManager;

    // Overall balance (all accounts)
    const overall = accounts.reduce((s, a) => s + a.balance, 0);
    const el = document.getElementById('overallBalance');
    el.textContent = dm.formatCurrency(overall);
    el.className = 'summary-value ' + (overall >= 0 ? 'positive' : 'negative');

    // Monthly income/expenses from ledger
    const income = ledger.filter(t => t.amount > 0).reduce((s, t) => s + t.convertedAmount, 0);
    const expenses = Math.abs(ledger.filter(t => t.amount < 0).reduce((s, t) => s + t.convertedAmount, 0));
    document.getElementById('monthlyIncome').textContent = dm.formatCurrency(income);
    document.getElementById('monthlyIncome').className = 'summary-value positive';
    document.getElementById('monthlyExpenses').textContent = dm.formatCurrency(expenses);
    document.getElementById('monthlyExpenses').className = 'summary-value negative';

    const rate = income > 0 ? ((income - expenses) / income * 100).toFixed(0) : '--';
    document.getElementById('savingsRate').textContent = rate + '%';
    document.getElementById('savingsRate').className = 'summary-value ' + (rate >= 20 ? 'positive' : rate >= 0 ? '' : 'negative');

    // User balances
    const findBal = (name) => {
      const a = accounts.find(a => a.name === name);
      return a ? dm.formatCurrency(a.balance) : dm.formatCurrency(0);
    };
    document.getElementById('baileyWages').textContent = findBal('BW Personal (Commonwealth)');
    document.getElementById('baileySpending').textContent = findBal('BW Personal (Starling)');
    document.getElementById('katieWages').textContent = findBal('Katie Personal (Commonwealth)');
    document.getElementById('katieSpending').textContent = findBal('Katie Personal (Starling)');
    document.getElementById('jointBills').textContent = findBal('Joint (Commonwealth)');
    document.getElementById('jointSavings').textContent = findBal('Joint Saver (Commonwealth)');
    document.getElementById('jointFood').textContent = findBal('Joint (Starling)');
    document.getElementById('jointCredit').textContent = findBal('Credit Card (Capital One)');

    // Recent transactions (filtered by selected)
    const filtered = ledger.filter(t => selectedAccounts.includes(t.account));
    const container = document.getElementById('recentTransactions');
    if (filtered.length === 0) {
      container.innerHTML = '<p class="no-data">No transactions in the last 7 days</p>';
    } else {
      container.innerHTML = filtered.slice(0, 30).map(t => txnRow(t, false)).join('');
    }
  }

  // ==================== ACCOUNT CARDS ====================
  function renderAccountCards() {
    const accounts = dataManager.getAccounts();
    const dm = dataManager;
    const container = document.getElementById('accountCards');

    container.innerHTML = accounts.map(a => {
      const cfg = CONFIG.ACCOUNTS.find(c => c.name === a.name) || {};
      const dimmed = !selectedAccounts.includes(a.name) ? ' dimmed' : '';
      const nativeStr = a.nativeCurrency !== dm.displayCurrency
        ? `<div class="acct-native">${dm.formatCurrency(a.nativeBalance, a.nativeCurrency)} ${a.nativeCurrency}</div>` : '';
      return `<div class="account-card${dimmed}">
        <div class="acct-name">${cfg.icon || '💰'} ${a.name.replace(/ \(.*\)/, '')}</div>
        <div class="acct-purpose">${a.purpose} · ${a.nativeCurrency}</div>
        <div class="acct-balance ${a.balance >= 0 ? 'positive' : 'negative'}">${dm.formatCurrency(a.balance)}</div>
        ${nativeStr}
        <div class="acct-change ${a.change >= 0 ? 'positive' : 'negative'}">${a.change >= 0 ? '↗' : '↘'} ${dm.formatCurrency(Math.abs(a.change))}</div>
      </div>`;
    }).join('');
  }

  function renderSelectedBalance() {
    const accounts = dataManager.getAccounts();
    const selected = accounts.filter(a => selectedAccounts.includes(a.name)).reduce((s, a) => s + a.balance, 0);
    const el = document.getElementById('selectedBalance');
    el.textContent = dataManager.formatCurrency(selected);
    el.className = 'balance-bar-value ' + (selected >= 0 ? 'positive' : 'negative');
  }

  // ==================== STATEMENTS ====================
  function populateStatementDropdowns() {
    const sel = document.getElementById('statementAccount');
    if (sel.options.length <= 1) {
      CONFIG.ACCOUNTS.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.name;
        opt.textContent = `${a.icon} ${a.name} (${a.currency})`;
        sel.appendChild(opt);
      });
    }

    // Months from ledger
    const ledger = dataManager.getLedger();
    const months = new Set();
    ledger.forEach(e => {
      if (e.date) months.add(e.date.getFullYear() + '-' + String(e.date.getMonth() + 1).padStart(2, '0'));
    });

    const mSel = document.getElementById('statementMonth');
    while (mSel.options.length > 1) mSel.remove(1);
    [...months].sort().reverse().forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      const [y, mo] = m.split('-');
      opt.textContent = new Date(y, mo - 1).toLocaleString('en-AU', { month: 'long', year: 'numeric' });
      mSel.appendChild(opt);
    });

    document.getElementById('statementAccount').addEventListener('change', renderStatement);
    document.getElementById('statementMonth').addEventListener('change', renderStatement);
  }

  async function renderStatement() {
    const account = document.getElementById('statementAccount').value;
    const month = document.getElementById('statementMonth').value;
    const container = document.getElementById('statementList');
    const balBar = document.getElementById('statementBalanceBar');

    container.innerHTML = '<p class="no-data">Loading...</p>';

    let ledger;
    if (month) {
      const accts = account === 'all' ? null : [account];
      const raw = await dataManager.fetchLedger(month, accts);
      ledger = raw.map(e => {
        const cur = e['Currency'] || dataManager.getAccountCurrency(e['Account']);
        return {
          date: e['Date'] ? new Date(e['Date']) : null,
          description: e['Description'] || '',
          amount: parseFloat(e['Amount']) || 0,
          balanceAfter: parseFloat(e['Balance After']) || 0,
          category: e['Category'] || '',
          account: e['Account'] || '',
          currency: cur,
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
      const a = dataManager.getAccounts().find(a => a.name === account);
      if (a) {
        balBar.innerHTML = `<div class="stmt-balance">Current Balance: <strong>${dataManager.formatCurrency(a.balance)}</strong></div>`;
      } else { balBar.innerHTML = ''; }
    } else { balBar.innerHTML = ''; }

    if (ledger.length === 0) {
      container.innerHTML = '<p class="no-data">No transactions found</p>';
      return;
    }

    container.innerHTML = ledger.map(t => txnRow(t, true)).join('');

    // Chart
    renderBalanceChart(ledger);
  }

  function renderBalanceChart(ledger) {
    const canvas = document.getElementById('balanceChart');
    if (!canvas || !window.Chart) return;
    const sorted = [...ledger].sort((a, b) => (a.date || 0) - (b.date || 0));
    if (sorted.length === 0) return;

    const labels = sorted.map(e => e.date ? e.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : '');
    const balances = sorted.map(e => e.convertedBalance);

    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Balance',
          data: balances,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          fill: true, tension: 0.3, pointRadius: 1, borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 8, color: '#64748b', font: { size: 10 } }, grid: { display: false } },
          y: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => dataManager.formatCurrency(v) }, grid: { color: 'rgba(51,65,85,0.3)' } }
        }
      }
    });
  }

  // ==================== WAGES / BILLS / SAVINGS ====================
  function renderWages() {
    const wages = dataManager.cache.wages || [];
    const c = document.getElementById('wagesContent');
    if (!wages.length) { c.innerHTML = '<p class="no-data">No wage data yet</p>'; return; }
    c.innerHTML = wages.map(w => {
      const cur = w['Currency'] || 'AUD';
      const amt = parseFloat(w['Amount']) || 0;
      return `<div class="txn-row income">
        <div class="txn-left"><div class="txn-desc">${w['User'] || ''}</div>
        <div class="txn-meta">${fmtDate(w['Date'])} · ${w['Day of Week'] || ''} · ${w['Account'] || ''}</div></div>
        <div class="txn-right"><div class="txn-amount positive">${dataManager.formatCurrency(dataManager.convert(amt, cur))}</div>
        ${cur !== dataManager.displayCurrency ? `<div class="txn-native">${dataManager.formatCurrency(amt, cur)} ${cur}</div>` : ''}</div>
      </div>`;
    }).join('');
  }

  function renderBills() {
    const bills = dataManager.cache.bills || [];
    const c = document.getElementById('billsContent');
    if (!bills.length) { c.innerHTML = '<p class="no-data">No recurring bills detected yet</p>'; return; }
    c.innerHTML = bills.map(b => {
      const cur = b['Currency'] || 'AUD';
      const amt = Math.abs(parseFloat(b['Amount'])) || 0;
      const st = (b['Status'] || 'Active');
      const sc = st === 'Overdue' ? 'overdue' : st === 'Due Soon' ? 'due-soon' : '';
      return `<div class="txn-row">
        <div class="txn-left"><div class="txn-desc">${b['Bill Name'] || ''}</div>
        <div class="txn-meta">${b['Frequency'] || 'Monthly'} · ${b['Category'] || ''} · Next: ${fmtDate(b['Next Due Date'])}</div></div>
        <div class="txn-right"><div class="txn-amount negative">${dataManager.formatCurrency(dataManager.convert(amt, cur))}</div>
        <div class="txn-status ${sc}">${st}</div></div>
      </div>`;
    }).join('');
  }

  function renderSavings() {
    const goals = dataManager.cache.savings || [];
    const c = document.getElementById('savingsContent');
    if (!goals.length) { c.innerHTML = '<p class="no-data">No savings goals set up yet</p>'; return; }
    c.innerHTML = goals.map(g => {
      const target = parseFloat(g['Target Amount']) || 1;
      const current = parseFloat(g['Current Amount']) || 0;
      const pct = Math.min(100, current / target * 100).toFixed(1);
      return `<div class="goal-card">
        <div class="goal-top"><div><div class="goal-name">${g['Goal Name'] || ''}</div><div class="goal-desc">${g['Description'] || ''}</div></div>
        <div class="goal-pct">${pct}%</div></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="goal-amounts">${dataManager.formatCurrency(current)} / ${dataManager.formatCurrency(target)}</div>
      </div>`;
    }).join('');
  }

  // ==================== HELPERS ====================
  function txnRow(t, showBal) {
    const pos = t.amount > 0;
    const amt = dataManager.formatCurrency(t.convertedAmount);
    const native = t.currency !== dataManager.displayCurrency
      ? `<div class="txn-native">${dataManager.formatCurrency(t.amount, t.currency)} ${t.currency}</div>` : '';
    const bal = showBal ? `<div class="txn-balance">Bal: ${dataManager.formatCurrency(t.convertedBalance)}</div>` : '';
    return `<div class="txn-row">
      <div class="txn-left"><div class="txn-desc">${t.description}</div>
      <div class="txn-meta">${fmtDate(t.date)} · ${t.account?.replace(/ \(.*\)/, '')} · ${t.category}</div></div>
      <div class="txn-right"><div class="txn-amount ${pos ? 'positive' : 'negative'}">${pos ? '+' : ''}${amt}</div>${native}${bal}</div>
    </div>`;
  }

  function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
  }

  function renderFooter() {
    document.getElementById('dataSourceLabel').textContent = dataManager.dataSource === 'live' ? '🟢 Live' : '🟡 Demo';
    const r = dataManager.exchangeRate;
    document.getElementById('exchangeRateLabel').textContent = `£1 = $${(r.gbpToAud || 1.95).toFixed(2)}`;
  }

})();
