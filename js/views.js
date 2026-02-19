// Views module - handles account detail, bills calendar, projections, insights
const FinanceViews = {
  dm: null,

  init(dataManager) {
    this.dm = dataManager;
  },

  // ===== ACCOUNT DETAIL VIEW =====
  openAccountDetail(accountName, goFn) {
    var dm = this.dm;
    var grid = document.getElementById('aCards');
    var detail = document.getElementById('acctDetail');
    grid.classList.add('hide');
    detail.classList.add('on');

    var accts = dm.getAccounts();
    var acct = accts.find(a => a.name === accountName);
    var cfg = CONFIG.ACCOUNTS.find(a => a.name === accountName) || {};
    if (!acct) return;

    var color = FinanceCharts.getAccountColor(accountName);
    var nv = acct.nativeCurrency !== dm.displayCurrency
      ? '<div class="hero-sub">' + dm.formatCurrency(acct.nativeBalance, acct.nativeCurrency) + ' ' + acct.nativeCurrency + '</div>'
      : '';

    detail.innerHTML = `
      <button class="back-btn" id="acctBack">← Back to Accounts</button>
      <div class="hero">
        <div class="hero-lbl">${(cfg.icon || '💰')} ${accountName.replace(/ \(.*\)/, '')}</div>
        <div class="hero-amt ${acct.balance >= 0 ? 'pos' : 'neg'}">${dm.formatCurrency(acct.balance)}</div>
        ${nv}
        <div class="hero-sub">${cfg.purpose || ''} · ${acct.nativeCurrency}</div>
      </div>
      <div class="pnl"><div class="pnl-hd"><h3>Balance Over Time</h3></div><div class="chart-w"><canvas id="adBalChart"></canvas></div></div>
      <div class="pnl"><div class="pnl-hd"><h3>Spending by Category</h3></div><div class="chart-w"><canvas id="adCatChart"></canvas></div></div>
      <div class="pnl"><div class="pnl-hd"><h3>Transactions</h3></div><div class="pnl-bd" id="adTxns"><div class="empty">Loading…</div></div></div>
    `;

    document.getElementById('acctBack').onclick = () => {
      detail.classList.remove('on');
      grid.classList.remove('hide');
    };

    // Load transactions for this account
    this.loadAccountTransactions(accountName);
  },

  async loadAccountTransactions(accountName) {
    var dm = this.dm;
    try {
      var raw = await dm.fetchTransactions(null, [accountName]);
      var txns = raw.map(e => {
        var c = e['Currency'] || dm.getAccountCurrency(e['Account']);
        return {
          date: e['Date'] ? new Date(e['Date']) : null,
          description: e['Description'] || '',
          amount: parseFloat(e['Amount']) || 0,
          balanceAfter: parseFloat(e['Balance After']) || 0,
          category: e['Category'] || '',
          account: e['Account'] || '',
          currency: c,
          convertedAmount: dm.convert(parseFloat(e['Amount']) || 0, c),
          convertedBalance: dm.convert(parseFloat(e['Balance After']) || 0, c)
        };
      }).sort((a, b) => (b.date || 0) - (a.date || 0));

      // Charts
      FinanceCharts.accountBalanceLine('adBalChart', txns, dm);
      FinanceCharts.categoryDonut('adCatChart', txns, dm);

      // Transaction list
      var el = document.getElementById('adTxns');
      if (el) {
        el.innerHTML = txns.length
          ? txns.slice(0, 50).map(t => txHtml(t, dm, true)).join('')
          : '<div class="empty">No transactions</div>';
      }
    } catch (err) {
      console.error('Account detail load failed:', err);
      var el = document.getElementById('adTxns');
      if (el) el.innerHTML = '<div class="empty">Failed to load</div>';
    }
  },

  // ===== BILLS CALENDAR =====
  renderBillsCalendar(bills) {
    var dm = this.dm;
    var el = document.getElementById('biContent');
    if (!bills || !bills.length) {
      el.innerHTML = '<div class="empty">No bills detected yet</div>';
      return;
    }

    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();

    // Build calendar
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var monthName = now.toLocaleString('en-AU', { month: 'long', year: 'numeric' });

    // Map bills to dates
    var billsByDate = {};
    bills.forEach(b => {
      var d = new Date(b['Next Due Date']);
      if (!isNaN(d.getTime())) {
        var key = d.getDate() + '-' + d.getMonth() + '-' + d.getFullYear();
        if (!billsByDate[key]) billsByDate[key] = [];
        billsByDate[key].push(b);
      }
    });

    var dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    var calCells = dayHeaders.map(d => `<div class="cal-cell" style="font-size:.58rem;color:var(--sub);font-weight:700">${d}</div>`);
    for (var i = 0; i < firstDay; i++) calCells.push('<div class="cal-cell"></div>');
    for (var d = 1; d <= daysInMonth; d++) {
      var key = d + '-' + month + '-' + year;
      var isToday = d === now.getDate() && month === now.getMonth();
      var hasBill = billsByDate[key];
      var cls = 'cal-cell' + (isToday ? ' today' : '') + (hasBill ? ' has-bill' : '');
      var dot = hasBill ? '<div class="cal-dot"></div>' : '';
      var amt = hasBill ? '<div class="cal-amt">' + dm.formatCurrency(hasBill.reduce((s, b) => s + Math.abs(parseFloat(b['Amount']) || 0), 0)) + '</div>' : '';
      calCells.push(`<div class="${cls}"><div class="cal-date">${d}</div>${dot}${amt}</div>`);
    }

    // Bill list with status
    var billList = bills.map(b => {
      var c = b['Currency'] || 'AUD';
      var a = Math.abs(parseFloat(b['Amount'])) || 0;
      var st = b['Status'] || 'Active';
      var stCls = st === 'Overdue' ? 'overdue' : st === 'Due Soon' ? 'due-soon' : st === 'Upcoming' ? 'upcoming' : 'paid';
      var acctColor = FinanceCharts.getAccountColor(b['Account'] || '');
      return `<div class="bill-list-item">
        <div class="bill-left">
          <div class="bill-name">${b['Bill Name'] || ''}</div>
          <div class="bill-meta">${b['Frequency'] || 'Monthly'} · Next: ${formatDate(b['Next Due Date'])}${b['Account'] ? ' · <span class="acct-tag" style="background:' + acctColor + '">' + (b['Account'] || '').replace(/ \(.*\)/, '') + '</span>' : ''}</div>
        </div>
        <div class="bill-right">
          <div class="bill-amt">${dm.formatCurrency(dm.convert(a, c))}</div>
          <div class="bill-status ${stCls}">${st}</div>
        </div>
      </div>`;
    }).join('');

    el.innerHTML = `
      <div style="padding:14px 18px">
        <div class="cal-month"><div class="cal-month-title">📅 ${monthName}</div></div>
        <div class="cal-grid">${calCells.join('')}</div>
      </div>
      <div style="padding:0 18px 14px">${billList}</div>
    `;
  },

  // ===== WAGES =====
  renderWages(wages) {
    var dm = this.dm;
    var el = document.getElementById('wContent');
    if (!wages || !wages.length) {
      el.innerHTML = '<div class="empty">No wage data yet</div>';
      return;
    }

    // Stats
    var byPerson = { Bailey: 0, Katie: 0 };
    var count = { Bailey: 0, Katie: 0 };
    wages.forEach(w => {
      var user = w['User'] || 'Bailey';
      var amt = parseFloat(w['Amount']) || 0;
      var c = w['Currency'] || 'AUD';
      byPerson[user] = (byPerson[user] || 0) + dm.convert(amt, c);
      count[user] = (count[user] || 0) + 1;
    });

    var statsHtml = `
      <div class="wage-stats">
        <div class="wage-stat"><div class="ws-val">${dm.formatCurrency(byPerson.Bailey)}</div><div class="ws-lbl">Bailey Total</div><div style="font-size:.58rem;color:var(--dim);margin-top:2px">Avg: ${dm.formatCurrency(count.Bailey > 0 ? byPerson.Bailey / count.Bailey : 0)}</div></div>
        <div class="wage-stat"><div class="ws-val">${dm.formatCurrency(byPerson.Katie)}</div><div class="ws-lbl">Katie Total</div><div style="font-size:.58rem;color:var(--dim);margin-top:2px">Avg: ${dm.formatCurrency(count.Katie > 0 ? byPerson.Katie / count.Katie : 0)}</div></div>
      </div>
    `;

    var txList = wages.map(e => {
      var c = e['Currency'] || 'AUD', a = parseFloat(e['Amount']) || 0, cv = dm.convert(a, c);
      var n = c !== dm.displayCurrency ? '<div class="tx-n">' + dm.formatCurrency(a, c) + ' ' + c + '</div>' : '';
      return `<div class="tx"><div class="tx-l"><div class="tx-d">${e['User'] || ''}</div><div class="tx-m">${formatDate(e['Date'])} · ${e['Day of Week'] || ''} · ${e['Account'] || ''}</div></div><div class="tx-r"><div class="tx-a pos">${dm.formatCurrency(cv)}</div>${n}</div></div>`;
    }).join('');

    el.innerHTML = statsHtml + '<div class="pnl"><div class="pnl-hd"><h3>📊 Wage Trend</h3></div><div class="chart-w"><canvas id="wageChart"></canvas></div></div>' + txList;
    FinanceCharts.wageHistory('wageChart', wages, dm);
  },

  // ===== SAVINGS =====
  renderSavings(savings, history) {
    var dm = this.dm;
    var el = document.getElementById('svContent');
    if (!savings || !savings.length) {
      el.innerHTML = '<div class="empty">No goals set up</div>';
      return;
    }

    var totalSaved = savings.reduce((s, g) => s + (parseFloat(g['Current Amount']) || 0), 0);
    var totalTarget = savings.reduce((s, g) => s + (parseFloat(g['Target Amount']) || 0), 0);
    var overallPc = totalTarget > 0 ? (totalSaved / totalTarget * 100).toFixed(1) : 0;

    var statsHtml = `
      <div style="text-align:center;padding:14px 18px">
        <div style="font-size:.66rem;color:var(--dim);text-transform:uppercase;letter-spacing:1px">Total Saved</div>
        <div style="font-size:1.6rem;font-weight:800;color:var(--green)">${dm.formatCurrency(totalSaved)}</div>
        <div style="font-size:.7rem;color:var(--sub)">of ${dm.formatCurrency(totalTarget)} · ${overallPc}%</div>
        <div class="pbar" style="margin-top:8px"><div class="pfill" style="width:${overallPc}%"></div></div>
      </div>
    `;

    var goalsHtml = savings.map(e => {
      var tg = parseFloat(e['Target Amount']) || 1, cu = parseFloat(e['Current Amount']) || 0;
      var pc = Math.min(100, cu / tg * 100).toFixed(1);
      return `<div class="goal"><div class="goal-top"><div><div class="goal-nm">${e['Goal Name'] || ''}</div><div class="goal-ds">${e['Description'] || ''}</div></div><div class="goal-pc">${pc}%</div></div><div class="pbar"><div class="pfill" style="width:${pc}%"></div></div><div class="goal-am">${dm.formatCurrency(cu)} / ${dm.formatCurrency(tg)}</div></div>`;
    }).join('');

    el.innerHTML = statsHtml + goalsHtml +
      '<div class="pnl" style="margin-top:14px"><div class="pnl-hd"><h3>Savings Rate Trend</h3></div><div class="chart-w"><canvas id="savRateChart"></canvas></div></div>';
    FinanceCharts.savingsRateTrend('savRateChart', history, dm);
  },

  // ===== PROJECTIONS =====
  renderProjections(projections, bills, accounts) {
    var dm = this.dm;
    var el = document.getElementById('projContent');
    if (!el) return;

    // Transfer recommendations
    var accts = dm.getAccounts();
    var upcomingBills = (bills || []).filter(b => {
      var d = new Date(b['Next Due Date']);
      var diff = (d - new Date()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    });

    // Group bills by account
    var billsByAcct = {};
    upcomingBills.forEach(b => {
      var acct = b['Account'] || 'Joint (Commonwealth)';
      if (!billsByAcct[acct]) billsByAcct[acct] = 0;
      var c = b['Currency'] || 'AUD';
      billsByAcct[acct] += dm.convert(Math.abs(parseFloat(b['Amount']) || 0), c);
    });

    var transfers = [];
    Object.entries(billsByAcct).forEach(([acctName, needed]) => {
      var acct = accts.find(a => a.name === acctName);
      if (acct && acct.balance < needed) {
        var shortfall = needed - acct.balance;
        // Find account with surplus
        var surplus = accts.filter(a => a.name !== acctName && a.balance > 500).sort((a, b) => b.balance - a.balance);
        if (surplus.length) {
          transfers.push({
            from: surplus[0].name,
            to: acctName,
            amount: shortfall,
            reason: 'Cover upcoming bills (' + dm.formatCurrency(needed) + ' due this month)'
          });
        }
      }
    });

    var transferHtml = transfers.length
      ? transfers.map(t => `<div class="transfer-suggest"><div class="amount">${dm.formatCurrency(t.amount)}</div><div class="from-to">${t.from.replace(/ \(.*\)/, '')} → ${t.to.replace(/ \(.*\)/, '')}</div><div class="reason">${t.reason}</div></div>`).join('')
      : '<div style="padding:12px;text-align:center;font-size:.78rem;color:var(--green)">✅ All accounts look good — no transfers needed</div>';

    // Bills vs balance summary
    var summaryHtml = accts.map(a => {
      var billsAmt = billsByAcct[a.name] || 0;
      var ok = a.balance >= billsAmt;
      return `<div class="proj-row"><span class="label">${a.name.replace(/ \(.*\)/, '')}</span><span class="value" style="color:${ok ? 'var(--green)' : 'var(--red)'}">${dm.formatCurrency(a.balance)}${billsAmt > 0 ? ' / ' + dm.formatCurrency(billsAmt) + ' bills' : ''}</span></div>`;
    }).join('');

    el.innerHTML = `
      <div class="pnl"><div class="pnl-hd"><h3>💸 Where to Move Money</h3></div><div style="padding:14px 18px">${transferHtml}</div></div>
      <div class="pnl"><div class="pnl-hd"><h3>📊 Account vs Bills</h3></div><div style="padding:4px 18px">${summaryHtml}</div></div>
      <div class="pnl"><div class="pnl-hd"><h3>📈 Monthly Projections</h3></div><div class="chart-w"><canvas id="projChart"></canvas></div></div>
    `;

    FinanceCharts.projectionChart('projChart', projections, dm);
  },

  // ===== INSIGHTS =====
  renderInsights(transactions, history) {
    var dm = this.dm;
    var el = document.getElementById('insContent');
    if (!el) return;

    var txns = transactions || dm.getTransactions();
    if (!txns.length) {
      el.innerHTML = '<div class="empty">Not enough data for insights yet</div>';
      return;
    }

    // Top categories
    var cats = {};
    txns.filter(t => t.amount < 0).forEach(t => {
      var c = t.category || 'Miscellaneous';
      if (c === 'Transfer') return;
      cats[c] = (cats[c] || 0) + Math.abs(t.convertedAmount);
    });
    var sortedCats = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    var maxCat = sortedCats.length ? sortedCats[0][1] : 1;

    var catHtml = sortedCats.slice(0, 8).map((e, i) => {
      var pct = (e[1] / maxCat * 100).toFixed(0);
      var color = FinanceCharts.getCategoryColor(e[0]);
      return `<div class="insight-row"><span class="insight-rank">#${i + 1}</span><span class="insight-name">${e[0]}</span><span class="insight-val neg">${dm.formatCurrency(e[1])}</span></div><div class="insight-bar"><div class="insight-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
    }).join('');

    // Average daily spend
    var expenses = txns.filter(t => t.amount < 0 && t.category !== 'Transfer');
    var totalExp = expenses.reduce((s, t) => s + Math.abs(t.convertedAmount), 0);
    var dates = expenses.filter(t => t.date).map(t => t.date.getTime());
    var dayRange = dates.length > 1 ? Math.max(1, (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24)) : 1;
    var avgDaily = totalExp / dayRange;

    // Biggest transactions
    var sorted = [...txns].sort((a, b) => Math.abs(b.convertedAmount) - Math.abs(a.convertedAmount));
    var biggestOut = sorted.filter(t => t.amount < 0).slice(0, 5);
    var biggestIn = sorted.filter(t => t.amount > 0).slice(0, 5);

    var bigOutHtml = biggestOut.map(t => `<div class="insight-row"><span class="insight-name" style="font-size:.76rem">${t.description}</span><span class="insight-val neg">${dm.formatCurrency(t.convertedAmount)}</span></div>`).join('');
    var bigInHtml = biggestIn.map(t => `<div class="insight-row"><span class="insight-name" style="font-size:.76rem">${t.description}</span><span class="insight-val pos">+${dm.formatCurrency(t.convertedAmount)}</span></div>`).join('');

    // Month-over-month
    var hist = (history || []).filter(h => h['Type'] === 'Actual' || !h['Type']);
    var momHtml = '';
    if (hist.length >= 2) {
      var cur = hist[hist.length - 1];
      var prev = hist[hist.length - 2];
      var curExp = (parseFloat(cur['Total Bills']) || 0) + (parseFloat(cur['Total Spending']) || 0);
      var prevExp = (parseFloat(prev['Total Bills']) || 0) + (parseFloat(prev['Total Spending']) || 0);
      var diff = curExp - prevExp;
      var pctChange = prevExp > 0 ? ((diff / prevExp) * 100).toFixed(1) : 0;
      momHtml = `<div class="insight-card"><h4>Month-over-Month</h4>
        <div class="insight-row"><span class="insight-name">This month expenses</span><span class="insight-val neg">${dm.formatCurrency(curExp)}</span></div>
        <div class="insight-row"><span class="insight-name">Last month expenses</span><span class="insight-val neg">${dm.formatCurrency(prevExp)}</span></div>
        <div class="insight-row"><span class="insight-name">Change</span><span class="insight-val ${diff <= 0 ? 'pos' : 'neg'}">${diff <= 0 ? '↓' : '↑'} ${dm.formatCurrency(Math.abs(diff))} (${pctChange}%)</span></div>
      </div>`;
    }

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 0">
        <div class="insight-card"><div class="insight-big" style="color:var(--red)">${dm.formatCurrency(avgDaily)}</div><div class="insight-label">Avg Daily Spend</div></div>
        <div class="insight-card"><div class="insight-big" style="color:var(--blue)">${txns.length}</div><div class="insight-label">Total Transactions</div></div>
      </div>
      <div class="insight-card"><h4>🏆 Top Spending Categories</h4>${catHtml}</div>
      ${momHtml}
      <div class="pnl"><div class="pnl-hd"><h3>📊 Spending by Day of Week</h3></div><div class="chart-w"><canvas id="dowChart"></canvas></div></div>
      <div class="insight-card"><h4>💸 Biggest Expenses</h4>${bigOutHtml || '<div class="empty">No expenses</div>'}</div>
      <div class="insight-card"><h4>💰 Biggest Income</h4>${bigInHtml || '<div class="empty">No income</div>'}</div>
    `;

    FinanceCharts.dayOfWeekBar('dowChart', txns, dm);
  }
};

// Shared helpers
function txHtml(t, dm, showBal) {
  var p = t.amount > 0, a = dm.formatCurrency(t.convertedAmount);
  var n = t.currency !== dm.displayCurrency ? '<div class="tx-n">' + dm.formatCurrency(t.amount, t.currency) + ' ' + t.currency + '</div>' : '';
  var bl = showBal ? '<div class="tx-b">Bal: ' + dm.formatCurrency(t.convertedBalance) + '</div>' : '';
  var acctColor = FinanceCharts.getAccountColor(t.account);
  var tag = '<div class="acct-tag" style="background:' + acctColor + '">' + (t.account || '').replace(/ \(.*\)/, '') + '</div>';
  return '<div class="tx"><div class="tx-l"><div class="tx-d">' + t.description + '</div><div class="tx-m">' + formatDate(t.date) + ' · ' + t.category + '</div>' + tag + '</div><div class="tx-r"><div class="tx-a ' + (p ? 'pos' : 'neg') + '">' + (p ? '+' : '') + a + '</div>' + n + bl + '</div></div>';
}

function formatDate(d) {
  if (!d) return '';
  var dt = new Date(d);
  return isNaN(dt) ? '' : dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
}
