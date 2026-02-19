// Views module - handles account detail, bills calendar, projections, insights
const FinanceViews = {
  dm: null,
  calendarMonth: null,
  miniCalMonth: null,
  overviewPeriod: 30,
  insightsPeriod: 30,
  acctDetailPeriod: 30,

  init(dataManager) {
    this.dm = dataManager;
    var now = new Date();
    this.calendarMonth = { year: now.getFullYear(), month: now.getMonth() };
    this.miniCalMonth = { year: now.getFullYear(), month: now.getMonth() };
  },

  // ===== PERIOD TOGGLE BUILDER =====
  buildPeriodToggle(containerId, currentDays, callback) {
    var html = '<div class="period-toggle" id="' + containerId + '">';
    [7, 30, 90].forEach(d => {
      html += '<button class="pbtn' + (d === currentDays ? ' on' : '') + '" data-d="' + d + '">' + d + 'D</button>';
    });
    html += '</div>';
    return html;
  },

  wirePeriodToggle(containerId, callback) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.querySelectorAll('.pbtn').forEach(b => {
      b.onclick = () => {
        el.querySelectorAll('.pbtn').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        callback(parseInt(b.dataset.d));
      };
    });
  },

  // ===== FILTER TRANSACTIONS BY PERIOD =====
  filterByPeriod(txns, days) {
    if (!days || days <= 0) return txns;
    var cut = new Date();
    cut.setDate(cut.getDate() - days);
    cut.setHours(0, 0, 0, 0);
    return txns.filter(t => t.date && t.date >= cut);
  },

  // ===== LOADING SPINNER =====
  spinner() {
    return '<div class="spinner"><div class="spinner-dot"></div><div class="spinner-dot"></div><div class="spinner-dot"></div></div>';
  },

  // ===== EXPANDABLE TRANSACTION LIST =====
  renderTransactionList(containerId, allTxns, dm, opts) {
    opts = opts || {};
    var showAccount = opts.showAccount !== false;
    var el = document.getElementById(containerId);
    if (!el) return;

    var total = allTxns.length;
    if (!total) { el.innerHTML = '<div class="empty">No transactions</div>'; return; }

    var pageSize = 5;
    var expanded = false;
    var currentPage = 1;
    var maxExpanded = 20;
    var maxTotal = 100;

    function render() {
      var start, end, data;
      if (!expanded) {
        data = allTxns.slice(0, pageSize);
      } else {
        start = (currentPage - 1) * maxExpanded;
        end = Math.min(start + maxExpanded, Math.min(total, maxTotal));
        data = allTxns.slice(start, end);
      }

      var html = '<div class="txn-section-hd' + (expanded ? ' expanded' : '') + '" id="' + containerId + '_hd">';
      html += '<h3>📄 Transactions</h3>';
      html += '<span class="txn-count">' + (expanded ? 'Page ' + currentPage + ' · ' : '') + total + ' total <span class="txn-chev">▾</span></span>';
      html += '</div>';
      html += '<div class="fade-in">';
      html += data.map(t => txHtml(t, dm, true)).join('');
      html += '</div>';

      if (expanded) {
        var totalPages = Math.ceil(Math.min(total, maxTotal) / maxExpanded);
        if (totalPages > 1) {
          html += '<div class="pagination">';
          for (var i = 1; i <= totalPages; i++) {
            html += '<button class="pg-btn' + (i === currentPage ? ' active' : '') + '" data-pg="' + i + '">' + i + '</button>';
          }
          html += '</div>';
        }
      }

      el.innerHTML = html;

      // Wire header click
      var hd = document.getElementById(containerId + '_hd');
      if (hd) {
        hd.onclick = () => {
          expanded = !expanded;
          currentPage = 1;
          render();
        };
      }

      // Wire pagination
      el.querySelectorAll('.pg-btn').forEach(b => {
        b.onclick = (e) => {
          e.stopPropagation();
          currentPage = parseInt(b.dataset.pg);
          render();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
      });
    }

    render();
  },

  // ===== ACCOUNT DETAIL VIEW =====
  openAccountDetail(accountName, goFn) {
    var dm = this.dm;
    var self = this;
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

    // Get bills for this account
    var bills = (dm.cache.bills || []).filter(b => b['Account'] === accountName);
    var now = new Date();
    var thisMonth = now.getMonth();
    var thisYear = now.getFullYear();
    var billsThisMonth = bills.filter(b => {
      var d = new Date(b['Next Due Date']);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    var billsTotal = billsThisMonth.reduce((s, b) => s + Math.abs(parseFloat(b['Amount']) || 0), 0);

    var billsHtml = '';
    if (bills.length) {
      billsHtml = '<div class="pnl"><div class="pnl-hd"><h3>📋 Upcoming Bills</h3></div>';
      billsHtml += '<div class="bill-stats-tile"><div><div class="bst-val">' + billsThisMonth.length + ' bill' + (billsThisMonth.length !== 1 ? 's' : '') + '</div><div class="bst-lbl">this month</div></div><div><div class="bst-val">' + dm.formatCurrency(dm.convert(billsTotal, acct.nativeCurrency)) + '</div><div class="bst-lbl">total due</div></div></div>';
      billsHtml += bills.sort((a, b) => new Date(a['Next Due Date']) - new Date(b['Next Due Date'])).map(b => {
        var c = b['Currency'] || acct.nativeCurrency;
        var a2 = Math.abs(parseFloat(b['Amount'])) || 0;
        return '<div class="bill-compact"><div class="bill-compact-left"><div class="bill-compact-name">' + (b['Bill Name'] || '') + '</div><div class="bill-compact-meta">' + (b['Frequency'] || 'Monthly') + ' · ' + formatDate(b['Next Due Date']) + '</div></div><div class="bill-compact-amt">' + dm.formatCurrency(dm.convert(a2, c)) + '</div></div>';
      }).join('');
      billsHtml += '</div>';
    }

    detail.innerHTML = `
      <button class="back-btn" id="acctBack">← Back to Accounts</button>
      <div class="hero">
        <div class="hero-lbl">${(cfg.icon || '💰')} ${FinanceCharts.getShortName(accountName)}</div>
        <div class="hero-amt ${acct.balance >= 0 ? 'pos' : 'neg'}">${dm.formatCurrency(acct.balance)}</div>
        ${nv}
        <div class="hero-sub">${cfg.purpose || ''} · ${acct.nativeCurrency}</div>
      </div>
      <div class="pnl"><div class="pnl-hd"><h3>Balance Over Time</h3></div><div class="chart-w"><canvas id="adBalChart"></canvas></div></div>
      <div class="pnl"><div class="pnl-hd"><h3>Spending by Category</h3></div><div class="chart-w"><canvas id="adCatChart"></canvas></div></div>
      ${billsHtml}
      <div class="pnl" id="adTxnWrap"><div id="adTxns">${this.spinner()}</div></div>
    `;

    document.getElementById('acctBack').onclick = () => {
      detail.classList.remove('on');
      grid.classList.remove('hide');
    };

    this.loadAccountTransactions(accountName);
  },

  async loadAccountTransactions(accountName) {
    var dm = this.dm;
    var self = this;
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

      var filtered = this.filterByPeriod(txns, window.getGlobalPeriod ? window.getGlobalPeriod() : 30);
      FinanceCharts.accountBalanceLine('adBalChart', filtered, dm);
      FinanceCharts.categoryDonut('adCatChart', filtered, dm);
      this.renderTransactionList('adTxns', filtered, dm);
    } catch (err) {
      console.error('Account detail load failed:', err);
      var el = document.getElementById('adTxns');
      if (el) el.innerHTML = '<div class="empty">Failed to load</div>';
    }
  },

  // ===== BILLS CALENDAR (shared logic) =====
  _buildCalendarHtml(bills, calState, isMini) {
    var dm = this.dm;
    var year = calState.year, month = calState.month;
    var now = new Date();
    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var monthName = new Date(year, month).toLocaleString('en-AU', { month: 'long', year: 'numeric' });

    var billsByDate = {};
    (bills || []).forEach(b => {
      var d = new Date(b['Next Due Date']);
      if (isNaN(d.getTime())) return;
      var billDates = this._getBillDatesForMonth(b, year, month);
      billDates.forEach(bd => {
        var key = bd.getDate() + '-' + bd.getMonth() + '-' + bd.getFullYear();
        if (!billsByDate[key]) billsByDate[key] = [];
        billsByDate[key].push(b);
      });
    });

    var dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    var calCells = dayHeaders.map(d => `<div class="cal-cell cal-hdr">${d}</div>`);
    for (var i = 0; i < firstDay; i++) calCells.push('<div class="cal-cell"></div>');

    for (var d = 1; d <= daysInMonth; d++) {
      var key = d + '-' + month + '-' + year;
      var isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
      var dayBills = billsByDate[key];
      var cls = 'cal-cell' + (isToday ? ' today' : '') + (dayBills ? ' has-bill' : '');
      var dots = '';
      if (dayBills) {
        var dotHtml = dayBills.map(b => {
          var color = FinanceCharts.getAccountColor(b['Account'] || '');
          return `<span class="cal-acct-dot" style="background:${color}"></span>`;
        }).join('');
        dots = `<div class="cal-dots">${dotHtml}</div>`;
      }
      var dateId = isMini ? 'mc' : 'bc';
      calCells.push(`<div class="${cls}" data-cal-date="${year}-${month}-${d}" data-cal-id="${dateId}"><div class="cal-date">${d}</div>${dots}</div>`);
    }

    return { monthName, calCells: calCells.join(''), billsByDate };
  },

  _getBillDatesForMonth(bill, year, month) {
    var d = new Date(bill['Next Due Date']);
    if (isNaN(d.getTime())) return [];
    var freq = (bill['Frequency'] || 'Monthly').toLowerCase();
    var dates = [];

    if (freq === 'weekly') {
      var start = new Date(year, month, 1);
      var end = new Date(year, month + 1, 0);
      var cur = new Date(d);
      while (cur > end) cur.setDate(cur.getDate() - 7);
      while (cur < start) cur.setDate(cur.getDate() + 7);
      while (cur <= end) {
        if (cur >= start) dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 7);
      }
    } else if (freq === 'fortnightly' || freq === 'bi-weekly') {
      var start = new Date(year, month, 1);
      var end = new Date(year, month + 1, 0);
      var cur = new Date(d);
      while (cur > end) cur.setDate(cur.getDate() - 14);
      while (cur < start) cur.setDate(cur.getDate() + 14);
      while (cur <= end) {
        if (cur >= start) dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 14);
      }
    } else if (freq === 'quarterly') {
      if (d.getMonth() % 3 === month % 3) {
        var dayOfMonth = Math.min(d.getDate(), new Date(year, month + 1, 0).getDate());
        dates.push(new Date(year, month, dayOfMonth));
      }
    } else if (freq === 'yearly' || freq === 'annual') {
      if (d.getMonth() === month) {
        dates.push(new Date(year, month, d.getDate()));
      }
    } else {
      var dayOfMonth = Math.min(d.getDate(), new Date(year, month + 1, 0).getDate());
      dates.push(new Date(year, month, dayOfMonth));
    }
    return dates;
  },

  _renderCalendarDetailPanel(dateStr, bills, container) {
    var dm = this.dm;
    var parts = dateStr.split('-');
    var year = parseInt(parts[0]), month = parseInt(parts[1]), day = parseInt(parts[2]);

    var dayBills = [];
    (bills || []).forEach(b => {
      var billDates = this._getBillDatesForMonth(b, year, month);
      billDates.forEach(bd => {
        if (bd.getDate() === day) dayBills.push(b);
      });
    });

    if (!dayBills.length) return;

    var existing = container.querySelector('.cal-detail-panel');
    if (existing) existing.remove();

    var dateLabel = new Date(year, month, day).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
    var html = `<div class="cal-detail-panel"><div class="cal-detail-hd">${dateLabel}</div>`;
    dayBills.forEach(b => {
      var c = b['Currency'] || 'AUD';
      var a = Math.abs(parseFloat(b['Amount'])) || 0;
      var st = b['Status'] || 'Active';
      var stCls = st === 'Overdue' ? 'overdue' : st === 'Due Soon' ? 'due-soon' : st === 'Upcoming' ? 'upcoming' : 'paid';
      var acctColor = FinanceCharts.getAccountColor(b['Account'] || '');
      html += `<div class="cal-detail-item">
        <div class="cal-detail-left">
          <div class="bill-name">${b['Bill Name'] || ''}</div>
          <div class="bill-meta"><span class="acct-tag" style="background:${acctColor}">${FinanceCharts.getShortName(b['Account'] || '')}</span> · ${b['Frequency'] || 'Monthly'}</div>
        </div>
        <div class="cal-detail-right">
          <div class="bill-amt">${dm.formatCurrency(dm.convert(a, c))}</div>
          <div class="bill-status ${stCls}">${st}</div>
        </div>
      </div>`;
    });
    html += '</div>';
    container.insertAdjacentHTML('beforeend', html);
  },

  // ===== MINI CALENDAR (Overview) =====
  renderMiniCalendar(bills) {
    var el = document.getElementById('ovMiniCal');
    if (!el) return;
    var self = this;
    var dm = this.dm;
    var cal = this._buildCalendarHtml(bills, this.miniCalMonth, true);

    // Build upcoming bills list (next 14 days) integrated into calendar
    var now = new Date();
    var twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    var upcoming = (bills || []).filter(b => {
      var d = new Date(b['Next Due Date']);
      return d >= now && d <= twoWeeks;
    }).sort((a, b) => new Date(a['Next Due Date']) - new Date(b['Next Due Date']));

    var upcomingHtml = '';
    if (upcoming.length) {
      upcomingHtml = '<div class="cal-upcoming-list" id="mcUpcoming">';
      var prevDateStr = '';
      upcoming.forEach(b => {
        var c = b['Currency'] || 'AUD';
        var a = Math.abs(parseFloat(b['Amount'])) || 0;
        var d = new Date(b['Next Due Date']);
        var days = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
        var dateLabel = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
        var acctColor = FinanceCharts.getAccountColor(b['Account'] || '');
        // Group header by date
        var dateStr = d.toISOString().slice(0, 10);
        var headerHtml = '';
        if (dateStr !== prevDateStr) {
          headerHtml = '<div class="cal-upcoming-date">' + dateLabel + '</div>';
          prevDateStr = dateStr;
        }
        upcomingHtml += headerHtml + '<div class="bill-list-item" data-cal-date="' + dateStr + '"><div class="bill-left"><div class="bill-name">' + (b['Bill Name'] || '') + '</div><div class="bill-meta"><span class="acct-tag" style="background:' + acctColor + '">' + FinanceCharts.getShortName(b['Account'] || '') + '</span> · ' + (b['Frequency'] || 'Monthly') + '</div></div><div class="bill-right"><div class="bill-amt">' + dm.formatCurrency(dm.convert(a, c)) + '</div><div class="bill-status">' + (days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : 'In ' + days + ' days') + '</div></div></div>';
      });
      upcomingHtml += '</div>';
    }

    el.innerHTML = `<div style="padding:14px 18px">
      <div class="cal-month">
        <button class="cal-nav" id="mcPrev">‹</button>
        <div class="cal-month-title">📅 ${cal.monthName}</div>
        <button class="cal-nav" id="mcNext">›</button>
      </div>
      <div class="cal-grid">${cal.calCells}</div>
    </div>${upcomingHtml}`;

    document.getElementById('mcPrev').onclick = () => {
      self.miniCalMonth.month--;
      if (self.miniCalMonth.month < 0) { self.miniCalMonth.month = 11; self.miniCalMonth.year--; }
      self.renderMiniCalendar(bills);
    };
    document.getElementById('mcNext').onclick = () => {
      self.miniCalMonth.month++;
      if (self.miniCalMonth.month > 11) { self.miniCalMonth.month = 0; self.miniCalMonth.year++; }
      self.renderMiniCalendar(bills);
    };

    // Calendar date click highlights corresponding bills
    el.querySelectorAll('.cal-cell.has-bill').forEach(cell => {
      cell.onclick = () => {
        var dateStr = cell.dataset.calDate;
        // Toggle highlight on calendar
        el.querySelectorAll('.cal-cell').forEach(c => c.classList.remove('cal-selected'));
        cell.classList.add('cal-selected');
        // Highlight matching bills in the list
        el.querySelectorAll('.bill-list-item').forEach(item => {
          if (item.dataset.calDate === dateStr) {
            item.classList.add('bill-highlight');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          } else {
            item.classList.remove('bill-highlight');
          }
        });
      };
    });
  },

  // ===== BILLS CALENDAR (Full - Bills tab) =====
  renderBillsCalendar(bills) {
    var dm = this.dm;
    var el = document.getElementById('biContent');
    var self = this;
    if (!bills || !bills.length) {
      el.innerHTML = '<div class="empty">No bills detected yet</div>';
      return;
    }

    // Group bills by account, Joint Commonwealth first
    var byAccount = {};
    var totalMonthly = 0;
    bills.forEach(b => {
      var acct = b['Account'] || 'Unknown';
      if (!byAccount[acct]) byAccount[acct] = [];
      byAccount[acct].push(b);
      var c = b['Currency'] || 'AUD';
      var a = Math.abs(parseFloat(b['Amount'])) || 0;
      var converted = dm.convert(a, c);
      var freq = b['Frequency'] || 'Monthly';
      if (freq.toLowerCase().includes('week')) totalMonthly += converted * 4.33;
      else if (freq.toLowerCase().includes('fortnight')) totalMonthly += converted * 2.17;
      else totalMonthly += converted;
    });

    // Sort account keys: Joint Commonwealth first, then others
    var acctKeys = Object.keys(byAccount).sort((a, b) => {
      var aJoint = a.indexOf('Joint') >= 0 && a.indexOf('Commonwealth') >= 0 ? 0 : 1;
      var bJoint = b.indexOf('Joint') >= 0 && b.indexOf('Commonwealth') >= 0 ? 0 : 1;
      return aJoint - bJoint || a.localeCompare(b);
    });

    var groupsHtml = acctKeys.map((acct, idx) => {
      var items = byAccount[acct].sort((a, b) => new Date(a['Next Due Date']) - new Date(b['Next Due Date']));
      var acctColor = FinanceCharts.getAccountColor(acct);
      var shortName = FinanceCharts.getShortName(acct);
      var acctTotal = items.reduce((s, b) => {
        var c = b['Currency'] || 'AUD';
        var a = Math.abs(parseFloat(b['Amount'])) || 0;
        return s + dm.convert(a, c);
      }, 0);
      var rowsHtml = items.map(b => {
        var c = b['Currency'] || 'AUD';
        var a = Math.abs(parseFloat(b['Amount'])) || 0;
        var converted = dm.convert(a, c);
        var freq = b['Frequency'] || 'Monthly';
        var st = b['Status'] || 'Active';
        var stCls = st === 'Cancelled' ? 'cancelled' : st === 'Overdue' ? 'overdue' : 'active';
        return `<div class="recur-row">
          <div class="recur-left">
            <div class="recur-name">${b['Bill Name'] || ''}</div>
            <div class="recur-meta">
              <span class="recur-freq">${freq}</span>
              <span class="recur-status ${stCls}">${st}</span>
            </div>
          </div>
          <div class="recur-right">
            <div class="recur-amt">${dm.formatCurrency(converted)}</div>
            <div class="recur-next">Next: ${formatDate(b['Next Due Date'])}</div>
          </div>
        </div>`;
      }).join('');
      return `<div class="recur-group${idx === 0 ? ' open' : ''}">
        <div class="recur-group-hd" data-acct="${acct}">
          <div class="recur-group-left"><span class="acct-tag" style="background:${acctColor}">${shortName}</span><span class="recur-group-count">${items.length} bill${items.length !== 1 ? 's' : ''}</span></div>
          <div class="recur-group-right"><span class="recur-group-total">${dm.formatCurrency(acctTotal)}</span><span class="recur-chev">▾</span></div>
        </div>
        <div class="recur-group-body">${rowsHtml}</div>
      </div>`;
    }).join('');

    var cal = this._buildCalendarHtml(bills, this.calendarMonth, false);

    el.innerHTML = `
      <div style="padding:14px 18px" id="billsCalWrap">
        <div class="cal-month">
          <button class="cal-nav" id="bcPrev">‹</button>
          <div class="cal-month-title">📅 ${cal.monthName}</div>
          <button class="cal-nav" id="bcNext">›</button>
        </div>
        <div class="cal-grid">${cal.calCells}</div>
      </div>
      <div class="recur-tile">
        <div class="recur-header">
          <h3>🔄 Recurring Payments</h3>
          <div class="recur-total">~${dm.formatCurrency(totalMonthly)}<span>/mo</span></div>
        </div>
        <div class="recur-list">${groupsHtml}</div>
      </div>
    `;

    document.getElementById('bcPrev').onclick = () => {
      self.calendarMonth.month--;
      if (self.calendarMonth.month < 0) { self.calendarMonth.month = 11; self.calendarMonth.year--; }
      self.renderBillsCalendar(bills);
    };
    document.getElementById('bcNext').onclick = () => {
      self.calendarMonth.month++;
      if (self.calendarMonth.month > 11) { self.calendarMonth.month = 0; self.calendarMonth.year++; }
      self.renderBillsCalendar(bills);
    };

    // Wire collapsible account groups
    el.querySelectorAll('.recur-group-hd').forEach(hd => {
      hd.onclick = () => {
        hd.parentElement.classList.toggle('open');
      };
    });

    var wrap = document.getElementById('billsCalWrap');
    wrap.querySelectorAll('.cal-cell.has-bill').forEach(cell => {
      cell.onclick = () => {
        var dateStr = cell.dataset.calDate;
        var existing = wrap.querySelector('.cal-detail-panel');
        if (existing && existing.dataset.date === dateStr) { existing.remove(); return; }
        if (existing) existing.remove();
        self._renderCalendarDetailPanel(dateStr, bills, wrap);
        var panel = wrap.querySelector('.cal-detail-panel');
        if (panel) panel.dataset.date = dateStr;
      };
    });
  },

  // ===== WAGES =====
  renderWages(wages) {
    var dm = this.dm;
    var el = document.getElementById('wContent');
    if (!wages || !wages.length) {
      el.innerHTML = '<div class="empty">No wage data yet</div>';
      return;
    }

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
  renderProjections(projections, bills, accounts, periodDays) {
    var dm = this.dm;
    var el = document.getElementById('projContent');
    if (!el) return;
    var period = periodDays || 30;

    var accts = dm.getAccounts();
    var now = new Date();
    var savings = dm.cache.savings || [];
    var wages = dm.cache.wages || [];

    // Filter bills by selected period
    var billsInPeriod = [];
    var billsNext7 = [];
    (bills || []).forEach(b => {
      var d = new Date(b['Next Due Date']);
      var diff = (d - now) / (1000 * 60 * 60 * 24);
      if (diff < 0) diff = 0;
      var c = b['Currency'] || 'AUD';
      var amt = dm.convert(Math.abs(parseFloat(b['Amount']) || 0), c);
      var entry = { ...b, convertedAmt: amt, daysUntil: Math.round(diff), dueDate: d };
      if (diff <= period) { billsInPeriod.push(entry); }
      if (diff <= 7) { billsNext7.push(entry); }
    });

    var totalPeriod = billsInPeriod.reduce((s, b) => s + b.convertedAmt, 0);
    var total7 = billsNext7.reduce((s, b) => s + b.convertedAmt, 0);

    // Wage forecasting — detect regular income patterns
    var wageForecasts = this._forecastWages(wages, dm, period);

    var summaryHtml = `
      <div class="advisor-summary">
        <div class="advisor-stat"><div class="advisor-stat-val">${dm.formatCurrency(total7)}</div><div class="advisor-stat-lbl">Next 7 days</div><div class="advisor-stat-count">${billsNext7.length} bill${billsNext7.length !== 1 ? 's' : ''}</div></div>
        <div class="advisor-stat"><div class="advisor-stat-val">${dm.formatCurrency(totalPeriod)}</div><div class="advisor-stat-lbl">Next ${period} days</div><div class="advisor-stat-count">${billsInPeriod.length} bill${billsInPeriod.length !== 1 ? 's' : ''}</div></div>
        ${wageForecasts.totalExpected > 0 ? '<div class="advisor-stat"><div class="advisor-stat-val wage-forecast-val">' + dm.formatCurrency(wageForecasts.totalExpected) + '</div><div class="advisor-stat-lbl">Projected Income</div><div class="advisor-stat-count">next ' + period + ' days</div></div>' : ''}
      </div>`;

    // Bills coming up in next 7 days — detailed breakdown
    var next7Html = '';
    if (billsNext7.length) {
      next7Html = '<div class="proj-7day-bills"><div class="proj-section-title">📋 Bills Due This Week</div>';
      billsNext7.sort((a, b) => a.daysUntil - b.daysUntil).forEach(b => {
        var acctColor = FinanceCharts.getAccountColor(b['Account'] || '');
        var dayLabel = b.daysUntil <= 0 ? '<span class="proj-overdue">OVERDUE</span>' : b.daysUntil <= 1 ? '<span class="proj-tomorrow">Tomorrow</span>' : b.dueDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
        next7Html += `<div class="proj-bill-detail"><div class="proj-bill-left"><div class="proj-bill-name">${b['Bill Name'] || ''}</div><div class="proj-bill-meta">${dayLabel} · <span class="acct-tag" style="background:${acctColor}">${FinanceCharts.getShortName(b['Account'] || '')}</span></div></div><div class="proj-bill-amt">${dm.formatCurrency(b.convertedAmt)}</div></div>`;
      });
      next7Html += '</div>';
    } else {
      next7Html = '<div class="proj-7day-bills"><div class="proj-section-title">📋 Bills Due This Week</div><div class="advisor-ok">✅ No bills due in the next 7 days</div></div>';
    }

    // Wage forecast section
    var wageForecastHtml = '';
    if (wageForecasts.forecasts.length) {
      wageForecastHtml = '<div class="proj-wage-forecast"><div class="proj-section-title">💰 Projected Wages</div>';
      wageForecasts.forecasts.forEach(f => {
        wageForecastHtml += `<div class="proj-wage-item"><div class="proj-wage-left"><div class="proj-wage-person">${f.user}</div><div class="proj-wage-meta">Every ${f.frequency} · avg ${dm.formatCurrency(f.avgAmount)} · next: ${f.nextExpected.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</div></div><div class="proj-wage-amt">${dm.formatCurrency(f.projectedTotal)}</div></div>`;
      });
      if (wageForecasts.unconfirmed.length) {
        wageForecastHtml += '<div class="proj-wage-note">⚠️ Unconfirmed regular income detected: ' + wageForecasts.unconfirmed.join(', ') + ' — is this a regular wage?</div>';
      }
      wageForecastHtml += '</div>';
    }

    // "Where to move money" — focus on 7-day window (weekly pay cycle)
    var billsByAcct = {};
    billsNext7.forEach(b => {
      var acct = b['Account'] || 'Joint (Commonwealth)';
      if (!billsByAcct[acct]) billsByAcct[acct] = { total: 0, bills: [] };
      billsByAcct[acct].total += b.convertedAmt;
      billsByAcct[acct].bills.push(b);
    });

    // Also check full period for longer-term planning
    var billsByAcctPeriod = {};
    billsInPeriod.forEach(b => {
      var acct = b['Account'] || 'Joint (Commonwealth)';
      if (!billsByAcctPeriod[acct]) billsByAcctPeriod[acct] = { total: 0, bills: [] };
      billsByAcctPeriod[acct].total += b.convertedAmt;
      billsByAcctPeriod[acct].bills.push(b);
    });

    var transfers = [];
    // Priority: 7-day shortfalls first
    Object.entries(billsByAcct).forEach(([acctName, data]) => {
      var acct = accts.find(a => a.name === acctName);
      if (!acct) return;
      if (acct.balance < data.total) {
        var shortfall = data.total - acct.balance;
        var nearestBill = data.bills.sort((a, b) => a.daysUntil - b.daysUntil)[0];
        var urgency = nearestBill.daysUntil <= 0 ? 'overdue' : nearestBill.daysUntil <= 2 ? 'urgent' : 'soon';
        var surplus = accts.filter(a => a.name !== acctName && a.balance > shortfall).sort((a, b) => b.balance - a.balance);
        var dueLabel = nearestBill.daysUntil <= 0 ? 'OVERDUE' : nearestBill.daysUntil <= 1 ? 'tomorrow' : 'by ' + nearestBill.dueDate.toLocaleDateString('en-AU', { weekday: 'long' });
        var billDetail = data.bills.map(b => b['Bill Name'] + ' (' + dm.formatCurrency(b.convertedAmt) + ')').join(', ');
        if (surplus.length) {
          transfers.push({ from: surplus[0].name, to: acctName, amount: shortfall, reason: `Cover this week's bills: ${billDetail}`, urgency, deadline: dueLabel, billNames: data.bills.map(b => b['Bill Name']).join(', '), priority: 1 });
        } else {
          transfers.push({ from: null, to: acctName, amount: shortfall, reason: `Shortfall for this week: ${billDetail}`, urgency: 'overdue', deadline: 'IMMEDIATE', billNames: data.bills.map(b => b['Bill Name']).join(', '), priority: 1 });
        }
      }
    });
    // Then period shortfalls (excluding already covered 7-day ones)
    Object.entries(billsByAcctPeriod).forEach(([acctName, data]) => {
      if (billsByAcct[acctName]) return; // already handled in 7-day
      var acct = accts.find(a => a.name === acctName);
      if (!acct) return;
      if (acct.balance < data.total) {
        var shortfall = data.total - acct.balance;
        var nearestBill = data.bills.sort((a, b) => a.daysUntil - b.daysUntil)[0];
        var urgency = nearestBill.daysUntil <= 7 ? 'urgent' : nearestBill.daysUntil <= 14 ? 'soon' : 'planned';
        var surplus = accts.filter(a => a.name !== acctName && a.balance > shortfall).sort((a, b) => b.balance - a.balance);
        var dueLabel = nearestBill.daysUntil <= 1 ? 'tomorrow' : 'by ' + nearestBill.dueDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
        var billDetail = data.bills.map(b => b['Bill Name'] + ' (' + dm.formatCurrency(b.convertedAmt) + ')').join(', ');
        if (surplus.length) {
          transfers.push({ from: surplus[0].name, to: acctName, amount: shortfall, reason: `Cover upcoming: ${billDetail}`, urgency, deadline: dueLabel, billNames: data.bills.map(b => b['Bill Name']).join(', '), priority: 2 });
        } else {
          transfers.push({ from: null, to: acctName, amount: shortfall, reason: `Shortfall for upcoming bills: ${billDetail}`, urgency: 'overdue', deadline: 'IMMEDIATE', billNames: data.bills.map(b => b['Bill Name']).join(', '), priority: 2 });
        }
      }
    });

    var savingsHtml = '';
    if (savings.length) {
      var totalSaved = savings.reduce((s, g) => s + (parseFloat(g['Current Amount']) || 0), 0);
      var totalTarget = savings.reduce((s, g) => s + (parseFloat(g['Target Amount']) || 0), 0);
      var remaining = totalTarget - totalSaved;

      savingsHtml = `<div class="pnl"><div class="pnl-hd"><h3>💎 Savings Goal Progress</h3></div><div style="padding:14px 18px">`;
      savings.forEach(g => {
        var cur = parseFloat(g['Current Amount']) || 0;
        var tgt = parseFloat(g['Target Amount']) || 1;
        var pc = Math.min(100, cur / tgt * 100).toFixed(1);
        var needed = Math.max(0, tgt - cur);
        savingsHtml += `<div class="advisor-goal"><div class="advisor-goal-top"><span class="advisor-goal-name">${g['Goal Name']}</span><span class="advisor-goal-pc">${pc}%</span></div><div class="pbar"><div class="pfill" style="width:${pc}%"></div></div><div class="advisor-goal-info">${dm.formatCurrency(cur)} / ${dm.formatCurrency(tgt)} · ${dm.formatCurrency(needed)} to go</div></div>`;
      });
      if (remaining > 0) {
        var bestSource = accts.filter(a => a.purpose !== 'Savings' && a.balance > 200).sort((a, b) => b.balance - a.balance);
        if (bestSource.length) {
          var suggestAmt = Math.min(remaining, bestSource[0].balance * 0.2);
          transfers.push({ from: bestSource[0].name, to: 'Joint Saver (Commonwealth)', amount: Math.round(suggestAmt), reason: `Contribute to savings goals (${dm.formatCurrency(remaining)} remaining)`, urgency: 'planned', deadline: 'when convenient', billNames: 'Savings', priority: 3 });
        }
      }
      savingsHtml += '</div></div>';
    }

    // Sort transfers by priority
    transfers.sort((a, b) => (a.priority || 99) - (b.priority || 99));

    var transferHtml = '';
    if (transfers.length) {
      transferHtml = transfers.map(t => {
        var urgCls = t.urgency === 'overdue' ? 'advisor-urgent-red' : t.urgency === 'urgent' ? 'advisor-urgent-yellow' : t.urgency === 'soon' ? 'advisor-urgent-yellow' : 'advisor-urgent-green';
        var urgLabel = t.urgency === 'overdue' ? '🔴 OVERDUE' : t.urgency === 'urgent' ? '🟡 This Week' : t.urgency === 'soon' ? '🟡 Soon' : '🟢 Planned';
        var fromLabel = t.from ? FinanceCharts.getShortName(t.from) : '⚠️ Multiple sources needed';
        var toLabel = FinanceCharts.getShortName(t.to);
        return `<div class="advisor-card ${urgCls}"><div class="advisor-card-top"><div class="advisor-card-amt">${dm.formatCurrency(t.amount)}</div><div class="advisor-card-urg">${urgLabel}</div></div><div class="advisor-card-route">${fromLabel} → ${toLabel}</div><div class="advisor-card-reason">${t.reason}</div><div class="advisor-card-deadline">⏰ ${t.deadline}</div><div class="advisor-card-bills">${t.billNames}</div></div>`;
      }).join('');
    } else {
      transferHtml = '<div class="advisor-ok">✅ All accounts look good — no transfers needed right now</div>';
    }

    var acctBreakdown = accts.map(a => {
      var billsAmt = billsByAcctPeriod[a.name] ? billsByAcctPeriod[a.name].total : 0;
      var ok = a.balance >= billsAmt;
      var shortfall = ok ? 0 : billsAmt - a.balance;
      return `<div class="proj-row"><span class="label"><span class="acct-tag" style="background:${FinanceCharts.getAccountColor(a.name)}">${FinanceCharts.getShortName(a.name)}</span></span><span class="value" style="color:${ok ? 'var(--green)' : 'var(--red)'}">${dm.formatCurrency(a.balance)}${billsAmt > 0 ? ' / ' + dm.formatCurrency(billsAmt) : ''}${!ok ? ' <span style="font-size:.6rem;color:var(--red)">⚠️ -' + dm.formatCurrency(shortfall) + '</span>' : ''}</span></div>`;
    }).join('');

    el.innerHTML = `
      <div class="pnl"><div class="pnl-hd"><h3>💸 Where to Move Money</h3></div><div style="padding:14px 18px">${summaryHtml}${next7Html}${wageForecastHtml}${transferHtml}</div></div>
      ${savingsHtml}
      <div class="pnl"><div class="pnl-hd"><h3>🏦 Account vs Obligations (${period}D)</h3></div><div style="padding:4px 18px">${acctBreakdown}</div></div>
      <div class="pnl"><div class="pnl-hd"><h3>📈 Monthly Projections</h3></div><div class="chart-w"><canvas id="projChart"></canvas></div></div>
    `;

    FinanceCharts.projectionChart('projChart', projections, dm);
  },

  // ===== WAGE FORECASTING =====
  _forecastWages(wages, dm, periodDays) {
    var result = { forecasts: [], totalExpected: 0, unconfirmed: [] };
    if (!wages || wages.length < 2) return result;

    var now = new Date();
    var periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);
    var byUser = {};
    wages.forEach(w => {
      var user = w['User'] || 'Unknown';
      if (!byUser[user]) byUser[user] = [];
      byUser[user].push({ date: new Date(w['Date']), amount: dm.convert(parseFloat(w['Amount']) || 0, w['Currency'] || 'AUD') });
    });

    Object.entries(byUser).forEach(([user, entries]) => {
      if (entries.length < 2) return;
      entries.sort((a, b) => a.date - b.date);
      // Calculate average gap between payments
      var gaps = [];
      for (var i = 1; i < entries.length; i++) {
        gaps.push((entries[i].date - entries[i - 1].date) / (1000 * 60 * 60 * 24));
      }
      var avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
      var avgAmount = entries.reduce((s, e) => s + e.amount, 0) / entries.length;
      var lastDate = entries[entries.length - 1].date;

      // Determine frequency label
      var freqLabel = avgGap <= 8 ? 'week' : avgGap <= 16 ? 'fortnight' : 'month';

      // Project next payments within period
      var nextDate = new Date(lastDate.getTime() + avgGap * 24 * 60 * 60 * 1000);
      var projectedTotal = 0;
      var payCount = 0;
      var firstNext = new Date(nextDate);
      while (nextDate <= periodEnd) {
        if (nextDate >= now) { projectedTotal += avgAmount; payCount++; }
        nextDate = new Date(nextDate.getTime() + avgGap * 24 * 60 * 60 * 1000);
      }

      if (payCount > 0) {
        result.forecasts.push({ user, frequency: freqLabel, avgAmount, projectedTotal, payCount, nextExpected: firstNext });
        result.totalExpected += projectedTotal;
      }
    });

    return result;
  },

  // ===== TRENDS & ANALYSIS =====
  renderTrendsAnalysis(transactions, history) {
    var dm = this.dm;
    var el = document.getElementById('ovTrends');
    if (!el) return;

    var txns = transactions || [];
    if (!txns.length) { el.innerHTML = '<div class="empty">Not enough data</div>'; return; }

    var now = new Date();
    var curMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    var prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var prevMonth = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0');

    var catsCur = {}, catsPrev = {};
    txns.filter(t => t.amount < 0 && t.date && t.category !== 'Transfer').forEach(t => {
      var key = t.date.getFullYear() + '-' + String(t.date.getMonth() + 1).padStart(2, '0');
      var cat = t.category || 'Miscellaneous';
      if (key === curMonth) catsCur[cat] = (catsCur[cat] || 0) + Math.abs(t.convertedAmount);
      if (key === prevMonth) catsPrev[cat] = (catsPrev[cat] || 0) + Math.abs(t.convertedAmount);
    });

    var allCats = [...new Set([...Object.keys(catsCur), ...Object.keys(catsPrev)])];
    var comparisons = allCats.map(cat => {
      var cur = catsCur[cat] || 0;
      var prev = catsPrev[cat] || 0;
      var change = prev > 0 ? ((cur - prev) / prev * 100) : (cur > 0 ? 100 : 0);
      return { cat, cur, prev, change };
    }).filter(c => c.cur > 0 || c.prev > 0).sort((a, b) => b.cur - a.cur);

    var compHtml = comparisons.slice(0, 8).map(c => {
      var arrow = c.change > 0 ? '↑' : c.change < 0 ? '↓' : '→';
      var cls = c.change > 5 ? 'neg' : c.change < -5 ? 'pos' : '';
      var color = FinanceCharts.getCategoryColor(c.cat);
      return `<div class="trend-row"><span class="trend-dot" style="background:${color}"></span><span class="trend-name">${c.cat}</span><span class="trend-vals">${dm.formatCurrency(c.cur)}</span><span class="trend-change ${cls}">${arrow} ${Math.abs(c.change).toFixed(0)}%</span></div>`;
    }).join('');

    var suggestions = [];
    var totalCurSpend = Object.values(catsCur).reduce((s, v) => s + v, 0);
    var totalPrevSpend = Object.values(catsPrev).reduce((s, v) => s + v, 0);

    if (comparisons.length) {
      var biggest = comparisons[0];
      suggestions.push({ icon: '📊', text: `Your biggest expense category is <b>${biggest.cat}</b> at <b>${dm.formatCurrency(biggest.cur)}</b>/month`, type: 'info' });
    }

    comparisons.forEach(c => {
      if (c.change > 20 && c.prev > 50) {
        var tips = { 'Food & Dining': 'consider cooking more at home', 'Entertainment': 'look for free activities this week', 'Shopping': 'try a no-spend challenge', 'Transportation': 'consider carpooling or public transport' };
        var tip = tips[c.cat] || 'consider reducing this spending';
        suggestions.push({ icon: '⚠️', text: `<b>${c.cat}</b> spending is up <b class="neg">${c.change.toFixed(0)}%</b> this month — ${tip}`, type: 'warning' });
      }
    });

    comparisons.forEach(c => {
      if (c.change < -15 && c.prev > 50) {
        suggestions.push({ icon: '🎉', text: `<b>${c.cat}</b> spending is down <b class="pos">${Math.abs(c.change).toFixed(0)}%</b> — great job!`, type: 'success' });
      }
    });

    if (totalPrevSpend > 0) {
      var overallChange = ((totalCurSpend - totalPrevSpend) / totalPrevSpend * 100);
      if (overallChange > 10) {
        suggestions.push({ icon: '📈', text: `Overall spending is up <b class="neg">${overallChange.toFixed(0)}%</b> vs last month`, type: 'warning' });
      } else if (overallChange < -10) {
        suggestions.push({ icon: '📉', text: `Overall spending is down <b class="pos">${Math.abs(overallChange).toFixed(0)}%</b> — you're saving more!`, type: 'success' });
      }
    }

    var income = txns.filter(t => t.amount > 0 && t.date && t.date.getMonth() === now.getMonth() && t.date.getFullYear() === now.getFullYear()).reduce((s, t) => s + t.convertedAmount, 0);
    if (income > 0 && totalCurSpend > 0) {
      var savingsEst = income - totalCurSpend;
      var dayOfMonth = now.getDate();
      var daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      var projectedSavings = savingsEst * (daysInMonth / dayOfMonth);
      suggestions.push({ icon: '💰', text: `You're on track to save approximately <b class="pos">${dm.formatCurrency(Math.max(0, projectedSavings))}</b> this month`, type: 'info' });
    }

    var suggestHtml = suggestions.slice(0, 6).map(s => {
      var bgCls = s.type === 'warning' ? 'suggest-warn' : s.type === 'success' ? 'suggest-good' : 'suggest-info';
      return `<div class="suggest-card ${bgCls}"><span class="suggest-icon">${s.icon}</span><span class="suggest-text">${s.text}</span></div>`;
    }).join('');

    el.innerHTML = `
      <div style="padding:14px 18px">
        <div class="trend-header">Category Comparison <span class="trend-sub">vs last month</span></div>
        ${compHtml || '<div class="empty" style="padding:10px">Not enough data to compare</div>'}
      </div>
      <div style="padding:0 18px 14px">
        <div class="trend-header">💡 Suggestions</div>
        ${suggestHtml || '<div class="empty" style="padding:10px">Keep spending to generate insights!</div>'}
      </div>
    `;
  },

  // ===== AI INSIGHTS GENERATOR =====
  generateAIInsights(txns, dm) {
    var now = new Date();
    var thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay());
    var lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    var thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    var thisWeekTxns = txns.filter(t => t.date && t.date >= thisWeekStart && t.amount < 0 && t.category !== 'Transfer');
    var lastWeekTxns = txns.filter(t => t.date && t.date >= lastWeekStart && t.date < thisWeekStart && t.amount < 0 && t.category !== 'Transfer');
    var thisMonthTxns = txns.filter(t => t.date && t.date >= thisMonthStart && t.amount < 0 && t.category !== 'Transfer');
    var lastMonthTxns = txns.filter(t => t.date && t.date >= lastMonthStart && t.date <= lastMonthEnd && t.amount < 0 && t.category !== 'Transfer');

    var thisWeekSpend = thisWeekTxns.reduce((s, t) => s + Math.abs(t.convertedAmount), 0);
    var lastWeekSpend = lastWeekTxns.reduce((s, t) => s + Math.abs(t.convertedAmount), 0);
    var thisMonthSpend = thisMonthTxns.reduce((s, t) => s + Math.abs(t.convertedAmount), 0);
    var lastMonthSpend = lastMonthTxns.reduce((s, t) => s + Math.abs(t.convertedAmount), 0);

    var thisMonthIncome = txns.filter(t => t.date && t.date >= thisMonthStart && t.amount > 0).reduce((s, t) => s + t.convertedAmount, 0);

    // Headline
    var weekChange = lastWeekSpend > 0 ? ((thisWeekSpend - lastWeekSpend) / lastWeekSpend * 100) : 0;
    var projectedSavings = thisMonthIncome - thisMonthSpend;
    var headline = '';
    if (weekChange < -5) headline = `This week: spending down ${Math.abs(weekChange).toFixed(0)}% vs last week`;
    else if (weekChange > 5) headline = `This week: spending up ${weekChange.toFixed(0)}% vs last week`;
    else headline = `This week: spending steady vs last week`;
    if (projectedSavings > 0) headline += `, on track for ${dm.formatCurrency(projectedSavings)} savings`;

    // Category analysis
    var catThis = {}, catLast = {};
    thisMonthTxns.forEach(t => { var c = t.category || 'Misc'; catThis[c] = (catThis[c] || 0) + Math.abs(t.convertedAmount); });
    lastMonthTxns.forEach(t => { var c = t.category || 'Misc'; catLast[c] = (catLast[c] || 0) + Math.abs(t.convertedAmount); });

    var catAnalysis = Object.keys(catThis).map(c => {
      var cur = catThis[c] || 0;
      var prev = catLast[c] || 0;
      var pct = prev > 0 ? ((cur - prev) / prev * 100) : 0;
      return { cat: c, cur, prev, pct };
    }).sort((a, b) => b.cur - a.cur);

    // Suggestions
    var suggestions = [];
    if (thisMonthSpend > thisMonthIncome * 0.8) suggestions.push('⚠️ Spending is over 80% of income — consider cutting non-essentials');
    catAnalysis.forEach(c => {
      if (c.pct > 30 && c.prev > 50) suggestions.push(`📉 ${c.cat} is up ${c.pct.toFixed(0)}% — review recent purchases`);
    });
    if (projectedSavings > 0) suggestions.push(`💰 Great pace! You could save ${dm.formatCurrency(projectedSavings)} this month`);
    suggestions.push('📌 Set up automatic transfers to savings on payday');
    suggestions.push('🛒 Try a weekly grocery budget to reduce Food & Dining costs');

    return { headline, weekChange, thisWeekSpend, lastWeekSpend, thisMonthSpend, lastMonthSpend, thisMonthIncome, projectedSavings, catAnalysis, suggestions };
  },

  // ===== INSIGHTS =====
  renderInsights(transactions, history) {
    var dm = this.dm;
    var self = this;
    var el = document.getElementById('insContent');
    if (!el) return;

    var allTxns = transactions || dm.getTransactions();
    if (!allTxns.length) {
      el.innerHTML = '<div class="empty">Not enough data for insights yet</div>';
      return;
    }

    var txns = this.filterByPeriod(allTxns, (window.getGlobalPeriod ? window.getGlobalPeriod() : 30));

    // AI Insights
    var ai = this.generateAIInsights(allTxns, dm);

    var aiHtml = `<div class="ai-card">
      <div class="ai-card-hd" id="aiToggleHd">
        <div style="font-size:.62rem;color:var(--blue);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">🤖 AI Insights</div>
        <div class="ai-headline">${ai.headline}</div>
        <div class="ai-toggle" id="aiToggleBtn">See more ▾</div>
      </div>
      <div class="ai-card-body" id="aiBody">
        <div class="ai-section"><h5>📅 Week vs Previous Week</h5>
          <p>This week: <b class="${ai.thisWeekSpend > ai.lastWeekSpend ? 'ai-bad' : 'ai-good'}">${dm.formatCurrency(ai.thisWeekSpend)}</b> vs last week: <b>${dm.formatCurrency(ai.lastWeekSpend)}</b> (${ai.weekChange > 0 ? '+' : ''}${ai.weekChange.toFixed(0)}%)</p>
        </div>
        <div class="ai-section"><h5>📊 Month vs Previous Month</h5>
          <p>This month: <b>${dm.formatCurrency(ai.thisMonthSpend)}</b> vs last month: <b>${dm.formatCurrency(ai.lastMonthSpend)}</b></p>
          <p>Income this month: <b class="ai-good">${dm.formatCurrency(ai.thisMonthIncome)}</b></p>
        </div>
        <div class="ai-section"><h5>🏷️ Category Breakdown</h5>
          ${ai.catAnalysis.slice(0, 6).map(c => '<div class="ai-item"><b>' + c.cat + '</b>: ' + dm.formatCurrency(c.cur) + (c.prev > 0 ? ' <span class="' + (c.pct > 10 ? 'ai-bad' : c.pct < -10 ? 'ai-good' : '') + '">(' + (c.pct > 0 ? '+' : '') + c.pct.toFixed(0) + '% vs last month)</span>' : '') + '</div>').join('')}
        </div>
        <div class="ai-section"><h5>💡 Suggestions</h5>
          ${ai.suggestions.map(s => '<div class="ai-item">' + s + '</div>').join('')}
        </div>
      </div>
    </div>`;

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
      ${aiHtml}
      <div class="fade-in">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 0">
        <div class="insight-card"><div class="insight-big" style="color:var(--red)">${dm.formatCurrency(avgDaily)}</div><div class="insight-label">Avg Daily Spend</div></div>
        <div class="insight-card"><div class="insight-big" style="color:var(--blue)">${txns.length}</div><div class="insight-label">Transactions (${window.getGlobalPeriod ? window.getGlobalPeriod() : 30}D)</div></div>
      </div>
      <div class="pnl"><div class="pnl-hd"><h3>📈 Spending Over Time</h3></div><div class="chart-w"><canvas id="spendOverTimeChart"></canvas></div></div>
      <div class="insight-card"><h4>🏆 Top Spending Categories</h4>${catHtml}</div>
      ${momHtml}
      <div class="pnl"><div class="pnl-hd"><h3>📊 Spending by Day of Week</h3></div><div class="chart-w"><canvas id="dowChart"></canvas></div></div>
      <div class="pnl"><div class="pnl-hd"><h3>📊 Spending by Time of Month</h3></div><div class="chart-w"><canvas id="tomChart"></canvas></div></div>
      </div>
    `;

    // Wire AI toggle
    var aiHd = document.getElementById('aiToggleHd');
    if (aiHd) {
      aiHd.onclick = () => {
        var body = document.getElementById('aiBody');
        var btn = document.getElementById('aiToggleBtn');
        if (body.classList.contains('open')) {
          body.classList.remove('open');
          btn.textContent = 'See more ▾';
        } else {
          body.classList.add('open');
          btn.textContent = 'See less ▴';
        }
      };
    }

    FinanceCharts.spendingOverTime('spendOverTimeChart', txns, dm);
    FinanceCharts.dayOfWeekBar('dowChart', txns, dm);
    FinanceCharts.timeOfMonthBar('tomChart', txns, dm);
  }
};

// Shared helpers
function txHtml(t, dm, showBal) {
  var p = t.amount > 0, a = dm.formatCurrency(t.convertedAmount);
  var n = t.currency !== dm.displayCurrency ? '<div class="tx-n">' + dm.formatCurrency(t.amount, t.currency) + ' ' + t.currency + '</div>' : '';
  var bl = showBal ? '<div class="tx-b">Bal: ' + dm.formatCurrency(t.convertedBalance) + '</div>' : '';
  var acctColor = FinanceCharts.getAccountColor(t.account);
  var tag = '<div class="acct-tag" style="background:' + acctColor + '">' + FinanceCharts.getShortName(t.account || '') + '</div>';
  return '<div class="tx"><div class="tx-l"><div class="tx-d">' + t.description + '</div><div class="tx-m">' + formatDate(t.date) + ' · ' + t.category + '</div>' + tag + '</div><div class="tx-r"><div class="tx-a ' + (p ? 'pos' : 'neg') + '">' + (p ? '+' : '') + a + '</div>' + n + bl + '</div></div>';
}

function formatDate(d) {
  if (!d) return '';
  var dt = new Date(d);
  return isNaN(dt) ? '' : dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' });
}
