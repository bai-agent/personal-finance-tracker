// B&K Finance Tracker — App Controller
(function() {
  'use strict';

  // Statement filter state
  let stmtAccounts = CONFIG.ACCOUNTS.map(a => a.name);
  let stmtDays = 7;       // 7, 30, 90, or 0 (month mode)
  let stmtMonth = '';      // e.g. '2026-02'
  let stmtFilterOpen = false;
  let currentTab = 'overview';

  // ===== INIT =====
  document.addEventListener('DOMContentLoaded', async () => {
    wireNav();
    wireCurrency();
    wireRefresh();
    wireViewAll();
    buildStmtFilter();
    wirePeriodBtns();
    wireMonthSelect();

    await dataManager.fetchAll();
    renderAll();
  });

  function renderAll() {
    renderOverview();
    renderAccountCards();
    populateMonthDropdown();
    renderFooter();
  }

  // ===== NAV =====
  function wireNav() {
    const dd = document.getElementById('navDropdown');
    dd.addEventListener('change', e => go(e.target.value));
    const h = location.hash.slice(1);
    if (h && document.getElementById(h)) { dd.value = h; go(h); }
  }

  function go(tab) {
    currentTab = tab;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(tab)?.classList.add('active');
    document.getElementById('navDropdown').value = tab;
    history.replaceState(null, '', '#' + tab);
    if (tab === 'statements') renderStatement();
    if (tab === 'wages') renderWages();
    if (tab === 'bills') renderBills();
    if (tab === 'savings') renderSavings();
  }

  // ===== CURRENCY =====
  function wireCurrency() {
    const btn = document.getElementById('currencyToggle');
    btn.addEventListener('click', () => {
      const dm = dataManager;
      dm.displayCurrency = dm.displayCurrency === 'AUD' ? 'GBP' : 'AUD';
      btn.textContent = dm.displayCurrency === 'AUD' ? '$ AUD' : '£ GBP';
      btn.classList.toggle('gbp', dm.displayCurrency === 'GBP');
      renderAll();
      if (currentTab === 'statements') renderStatement();
    });
  }

  // ===== REFRESH =====
  function wireRefresh() {
    const btn = document.getElementById('refreshBtn');
    btn.addEventListener('click', async () => {
      btn.querySelector('svg').style.animation = 'spin .8s linear infinite';
      await dataManager.fetchAll();
      renderAll();
      if (currentTab === 'statements') renderStatement();
      btn.querySelector('svg').style.animation = 'none';
    });
  }

  function wireViewAll() {
    document.getElementById('viewAllBtn')?.addEventListener('click', () => go('statements'));
  }

  // ===== STATEMENT ACCOUNT FILTER =====
  function buildStmtFilter() {
    const list = document.getElementById('stmtFilterList');
    const btn = document.getElementById('stmtFilterBtn');
    const panel = document.getElementById('stmtFilterPanel');
    const backdrop = document.getElementById('backdrop');

    list.innerHTML = CONFIG.ACCOUNTS.map(a =>
      `<label class="filter-item">
        <input type="checkbox" value="${a.name}" checked>
        <div class="fi-info">
          <div class="fi-name">${a.icon} ${a.name}</div>
          <div class="fi-sub">${a.user} · ${a.purpose}</div>
        </div>
        <span class="fi-badge">${a.currency}</span>
      </label>`
    ).join('');

    btn.addEventListener('click', e => {
      e.stopPropagation();
      stmtFilterOpen = !stmtFilterOpen;
      panel.classList.toggle('open', stmtFilterOpen);
      btn.classList.toggle('open', stmtFilterOpen);
      backdrop.classList.toggle('open', stmtFilterOpen);
    });

    backdrop.addEventListener('click', closeStmtFilter);

    list.addEventListener('change', syncStmtFilter);

    document.getElementById('stmtSelectAll').addEventListener('click', () => {
      list.querySelectorAll('input').forEach(c => c.checked = true);
      syncStmtFilter();
    });
    document.getElementById('stmtSelectNone').addEventListener('click', () => {
      list.querySelectorAll('input').forEach(c => c.checked = false);
      syncStmtFilter();
    });
    document.getElementById('stmtDone').addEventListener('click', () => {
      closeStmtFilter();
      renderStatement();
    });
  }

  function closeStmtFilter() {
    stmtFilterOpen = false;
    document.getElementById('stmtFilterPanel').classList.remove('open');
    document.getElementById('stmtFilterBtn').classList.remove('open');
    document.getElementById('backdrop').classList.remove('open');
  }

  function syncStmtFilter() {
    const checks = document.querySelectorAll('#stmtFilterList input:checked');
    stmtAccounts = [...checks].map(c => c.value);
    const n = stmtAccounts.length, t = CONFIG.ACCOUNTS.length;
    document.getElementById('stmtFilterLabel').textContent =
      n === t ? '🏦 All Accounts' :
      n === 0 ? '🏦 No Accounts' :
      `🏦 ${n} Account${n > 1 ? 's' : ''}`;
  }

  // ===== PERIOD BUTTONS =====
  function wirePeriodBtns() {
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Clear active from all period btns and month select
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('stmtMonth').value = '';
        document.getElementById('stmtMonth').classList.remove('active');

        stmtDays = parseInt(btn.dataset.days);
        stmtMonth = '';
        renderStatement();
      });
    });
  }

  function wireMonthSelect() {
    document.getElementById('stmtMonth').addEventListener('change', e => {
      const val = e.target.value;
      if (val) {
        // Clear period btn active states
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        stmtMonth = val;
        stmtDays = 0;
      } else {
        // Back to default 7 days
        e.target.classList.remove('active');
        document.querySelector('.period-btn[data-days="7"]').classList.add('active');
        stmtMonth = '';
        stmtDays = 7;
      }
      renderStatement();
    });
  }

  function populateMonthDropdown() {
    const ledger = dataManager.getLedger();
    const months = new Set();
    ledger.forEach(e => {
      if (e.date) months.add(e.date.getFullYear() + '-' + String(e.date.getMonth() + 1).padStart(2, '0'));
    });
    const sel = document.getElementById('stmtMonth');
    while (sel.options.length > 1) sel.remove(1);
    [...months].sort().reverse().forEach(m => {
      const o = document.createElement('option');
      o.value = m;
      const [y, mo] = m.split('-');
      o.textContent = new Date(y, mo - 1).toLocaleString('en-AU', { month: 'short', year: 'numeric' });
      sel.appendChild(o);
    });
  }

  // ===== OVERVIEW =====
  function renderOverview() {
    const dm = dataManager;
    const accts = dm.getAccounts();
    const ledger = dm.getLedger();

    // Hero balance
    const total = accts.reduce((s, a) => s + a.balance, 0);
    const heroEl = document.getElementById('overallBalance');
    heroEl.textContent = dm.formatCurrency(total);
    heroEl.className = 'hero-amount ' + (total >= 0 ? 'positive' : 'negative');

    // Stats
    const inc = ledger.filter(t => t.amount > 0).reduce((s, t) => s + t.convertedAmount, 0);
    const exp = Math.abs(ledger.filter(t => t.amount < 0).reduce((s, t) => s + t.convertedAmount, 0));
    document.getElementById('monthlyIncome').textContent = dm.formatCurrency(inc);
    document.getElementById('monthlyExpenses').textContent = dm.formatCurrency(exp);
    const rate = inc > 0 ? ((inc - exp) / inc * 100).toFixed(0) : '--';
    document.getElementById('savingsRate').textContent = rate + '%';

    // People
    const bal = name => { const a = accts.find(x => x.name === name); return dm.formatCurrency(a ? a.balance : 0); };
    document.getElementById('baileyWages').textContent = bal('BW Personal (Commonwealth)');
    document.getElementById('baileySpending').textContent = bal('BW Personal (Starling)');
    document.getElementById('katieWages').textContent = bal('Katie Personal (Commonwealth)');
    document.getElementById('katieSpending').textContent = bal('Katie Personal (Starling)');
    document.getElementById('jointBills').textContent = bal('Joint (Commonwealth)');
    document.getElementById('jointSavings').textContent = bal('Joint Saver (Commonwealth)');
    document.getElementById('jointFood').textContent = bal('Joint (Starling)');
    document.getElementById('jointCredit').textContent = bal('Credit Card (Capital One)');

    // Recent (last 7 days, all accounts)
    const el = document.getElementById('recentTransactions');
    el.innerHTML = ledger.length
      ? ledger.slice(0, 20).map(t => txn(t)).join('')
      : '<div class="empty-state">No transactions in the last 7 days</div>';
  }

  // ===== ACCOUNTS =====
  function renderAccountCards() {
    const dm = dataManager;
    const accts = dm.getAccounts();
    const grid = document.getElementById('accountCards');

    grid.innerHTML = accts.map(a => {
      const cfg = CONFIG.ACCOUNTS.find(c => c.name === a.name) || {};
      const native = a.nativeCurrency !== dm.displayCurrency
        ? `<div class="ac-native">${dm.formatCurrency(a.nativeBalance, a.nativeCurrency)} ${a.nativeCurrency}</div>` : '';
      return `<div class="acct-card">
        <div class="ac-icon">${cfg.icon || '💰'}</div>
        <div class="ac-name">${a.name.replace(/ \(.*\)/, '')}</div>
        <div class="ac-sub">${a.purpose} · ${a.nativeCurrency}</div>
        <div class="ac-bal ${a.balance >= 0 ? 'pos' : 'neg'}">${dm.formatCurrency(a.balance)}</div>
        ${native}
        <div class="ac-change ${a.change >= 0 ? 'pos' : 'neg'}">${a.change >= 0 ? '↗' : '↘'} ${dm.formatCurrency(Math.abs(a.change))}</div>
      </div>`;
    }).join('');
  }

  // ===== STATEMENTS =====
  async function renderStatement() {
    const el = document.getElementById('stmtList');
    const summaryEl = document.getElementById('stmtSummary');
    el.innerHTML = '<div class="empty-state">Loading…</div>';

    let data;

    if (stmtMonth) {
      // Fetch specific month from API
      const raw = await dataManager.fetchLedger(stmtMonth, stmtAccounts.length < 8 ? stmtAccounts : null);
      data = raw.map(e => transformLedgerRow(e))
        .filter(t => stmtAccounts.includes(t.account))
        .sort((a, b) => (b.date || 0) - (a.date || 0));
    } else {
      // Use cached ledger filtered by days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - stmtDays);
      cutoff.setHours(0, 0, 0, 0);

      // For 30/90 days we need to fetch more data
      if (stmtDays > 7) {
        const raw = await dataManager.fetchLedger(null, stmtAccounts.length < 8 ? stmtAccounts : null);
        data = raw.map(e => transformLedgerRow(e))
          .filter(t => {
            if (!t.date) return false;
            return t.date >= cutoff && stmtAccounts.includes(t.account);
          })
          .sort((a, b) => (b.date || 0) - (a.date || 0));
      } else {
        data = dataManager.getLedger()
          .filter(t => stmtAccounts.includes(t.account));
      }
    }

    // Summary
    const totalIn = data.filter(t => t.amount > 0).reduce((s, t) => s + t.convertedAmount, 0);
    const totalOut = Math.abs(data.filter(t => t.amount < 0).reduce((s, t) => s + t.convertedAmount, 0));
    summaryEl.innerHTML = `
      <div class="ss-item">In: <span class="ss-val pos">${dataManager.formatCurrency(totalIn)}</span></div>
      <div class="ss-item">Out: <span class="ss-val neg">${dataManager.formatCurrency(totalOut)}</span></div>
      <div class="ss-item">${data.length} transactions</div>
    `;

    // List
    el.innerHTML = data.length
      ? data.map(t => txn(t, true)).join('')
      : '<div class="empty-state">No transactions found</div>';

    renderChart(data);
  }

  function transformLedgerRow(e) {
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
  }

  function renderChart(data) {
    const canvas = document.getElementById('balanceChart');
    if (!canvas || !window.Chart) return;
    const sorted = [...data].sort((a, b) => (a.date || 0) - (b.date || 0));
    if (!sorted.length) return;
    if (canvas._chart) canvas._chart.destroy();
    canvas._chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: sorted.map(e => e.date ? e.date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''),
        datasets: [{
          data: sorted.map(e => e.convertedBalance),
          borderColor: '#4f8cff', backgroundColor: 'rgba(79,140,255,.06)',
          fill: true, tension: .35, pointRadius: 0, borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { maxTicksLimit: 6, color: '#576a94', font: { size: 9 } }, grid: { display: false } },
          y: { ticks: { color: '#576a94', font: { size: 9 }, callback: v => dataManager.formatCurrency(v) }, grid: { color: 'rgba(36,48,73,.4)' } }
        }
      }
    });
  }

  // ===== WAGES / BILLS / SAVINGS =====
  function renderWages() {
    const w = dataManager.cache.wages || [];
    const el = document.getElementById('wagesContent');
    if (!w.length) { el.innerHTML = '<div class="empty-state">No wage data yet</div>'; return; }
    el.innerHTML = w.map(e => {
      const cur = e['Currency'] || 'AUD', amt = parseFloat(e['Amount']) || 0;
      const conv = dataManager.convert(amt, cur);
      const native = cur !== dataManager.displayCurrency ? `<div class="txn-conv">${dataManager.formatCurrency(amt, cur)} ${cur}</div>` : '';
      return `<div class="txn"><div class="txn-l"><div class="txn-desc">${e['User']||''}</div><div class="txn-meta">${fdate(e['Date'])} · ${e['Day of Week']||''} · ${e['Account']||''}</div></div>
      <div class="txn-r"><div class="txn-amt pos">${dataManager.formatCurrency(conv)}</div>${native}</div></div>`;
    }).join('');
  }

  function renderBills() {
    const b = dataManager.cache.bills || [];
    const el = document.getElementById('billsContent');
    if (!b.length) { el.innerHTML = '<div class="empty-state">No bills detected yet</div>'; return; }
    el.innerHTML = b.map(e => {
      const cur = e['Currency'] || 'AUD', amt = Math.abs(parseFloat(e['Amount'])) || 0;
      const st = e['Status'] || 'Active';
      const sc = st === 'Overdue' ? 'overdue' : st === 'Due Soon' ? 'due-soon' : '';
      return `<div class="txn"><div class="txn-l"><div class="txn-desc">${e['Bill Name']||''}</div><div class="txn-meta">${e['Frequency']||'Monthly'} · Next: ${fdate(e['Next Due Date'])}</div></div>
      <div class="txn-r"><div class="txn-amt neg">${dataManager.formatCurrency(dataManager.convert(amt, cur))}</div><div class="bill-status ${sc}">${st}</div></div></div>`;
    }).join('');
  }

  function renderSavings() {
    const g = dataManager.cache.savings || [];
    const el = document.getElementById('savingsContent');
    if (!g.length) { el.innerHTML = '<div class="empty-state">No goals set up</div>'; return; }
    el.innerHTML = g.map(e => {
      const tgt = parseFloat(e['Target Amount']) || 1, cur = parseFloat(e['Current Amount']) || 0;
      const pct = Math.min(100, cur / tgt * 100).toFixed(1);
      return `<div class="goal-item"><div class="goal-top"><div><div class="goal-name">${e['Goal Name']||''}</div><div class="goal-desc">${e['Description']||''}</div></div>
      <div class="goal-pct">${pct}%</div></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="goal-amounts">${dataManager.formatCurrency(cur)} / ${dataManager.formatCurrency(tgt)}</div></div>`;
    }).join('');
  }

  // ===== HELPERS =====
  function txn(t, showBal) {
    const pos = t.amount > 0;
    const amt = dataManager.formatCurrency(t.convertedAmount);
    const native = t.currency !== dataManager.displayCurrency
      ? `<div class="txn-conv">${dataManager.formatCurrency(t.amount, t.currency)} ${t.currency}</div>` : '';
    const bal = showBal ? `<div class="txn-bal">Bal: ${dataManager.formatCurrency(t.convertedBalance)}</div>` : '';
    return `<div class="txn"><div class="txn-l"><div class="txn-desc">${t.description}</div>
    <div class="txn-meta">${fdate(t.date)} · ${(t.account||'').replace(/ \(.*\)/,'')} · ${t.category}</div></div>
    <div class="txn-r"><div class="txn-amt ${pos?'pos':'neg'}">${pos?'+':''}${amt}</div>${native}${bal}</div></div>`;
  }

  function fdate(d) {
    if (!d) return '';
    const dt = new Date(d);
    return isNaN(dt) ? '' : dt.toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'2-digit' });
  }

  function renderFooter() {
    document.getElementById('dataSourceLabel').textContent = dataManager.dataSource === 'live' ? '🟢 Live' : '🟡 Demo';
    document.getElementById('exchangeRateLabel').textContent = `£1 = $${(dataManager.exchangeRate.gbpToAud || 1.95).toFixed(2)}`;
  }

})();
