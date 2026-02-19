// Main application logic
(function(){
  'use strict';
  var sa = CONFIG.ACCOUNTS.map(a=>a.name), sDays=7, sMonth='', sfOpen=false, tab='overview';
  var dm = dataManager;
  var allTxns = []; // cached full transaction set for insights

  document.addEventListener('DOMContentLoaded', async()=>{
    FinanceViews.init(dm);
    wireNav(); wireCur(); wireRef();
    buildFilter(); wirePeriods(); wireMonth();
    await dm.fetchAll();
    // Load all transactions for insights/charts
    try {
      var raw = await dm.fetchTransactions(null, null);
      allTxns = raw.map(e => trRow(e)).sort((a,b)=>(b.date||0)-(a.date||0));
    } catch(e) { allTxns = dm.getTransactions(); }
    renderAll();
  });

  function renderAll(){renderOverview();renderAccts();popMonths();renderFtr()}

  // NAV
  function wireNav(){
    var n=document.getElementById('nav');
    n.onchange=e=>go(e.target.value);
    var h=location.hash.slice(1);
    if(h&&document.getElementById(h)){n.value=h;go(h)}
  }
  window.go = go; // expose for views
  function go(t){
    tab=t;
    document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
    var el=document.getElementById(t);if(el)el.classList.add('on');
    document.getElementById('nav').value=t;
    history.replaceState(null,'','#'+t);
    if(t==='statements')renderStmt();
    if(t==='wages')FinanceViews.renderWages(dm.cache.wages||[]);
    if(t==='bills')FinanceViews.renderBillsCalendar(dm.cache.bills||[]);
    if(t==='savings')FinanceViews.renderSavings(dm.cache.savings||[], dm.cache.history||[]);
    if(t==='projections')FinanceViews.renderProjections(dm.cache.projections||[], dm.cache.bills||[], dm.getAccounts());
    if(t==='insights')FinanceViews.renderInsights(allTxns, dm.cache.history||[]);
  }

  // CURRENCY
  function wireCur(){
    var b=document.getElementById('curBtn');
    b.onclick=()=>{
      dm.displayCurrency=dm.displayCurrency==='AUD'?'GBP':'AUD';
      b.textContent=dm.displayCurrency==='AUD'?'$ AUD':'£ GBP';
      b.classList.toggle('gbp',dm.displayCurrency==='GBP');
      renderAll();if(tab==='statements')renderStmt();
      if(tab==='wages')FinanceViews.renderWages(dm.cache.wages||[]);
      if(tab==='bills')FinanceViews.renderBillsCalendar(dm.cache.bills||[]);
      if(tab==='savings')FinanceViews.renderSavings(dm.cache.savings||[], dm.cache.history||[]);
      if(tab==='projections')FinanceViews.renderProjections(dm.cache.projections||[], dm.cache.bills||[], dm.getAccounts());
      if(tab==='insights')FinanceViews.renderInsights(allTxns, dm.cache.history||[]);
    };
  }

  // REFRESH
  function wireRef(){
    var b=document.getElementById('refBtn');
    b.onclick=async()=>{
      b.style.animation='spin .8s linear infinite';
      await dm.fetchAll();
      try {
        var raw = await dm.fetchTransactions(null, null);
        allTxns = raw.map(e => trRow(e)).sort((a,b)=>(b.date||0)-(a.date||0));
      } catch(e) {}
      renderAll();
      if(tab==='statements')renderStmt();
      b.style.animation='none';
    };
  }

  // FILTER
  function buildFilter(){
    var list=document.getElementById('sfList');
    list.innerHTML=CONFIG.ACCOUNTS.map(a=>{
      var color = FinanceCharts.getAccountColor(a.name);
      return '<label class="sf-item"><input type="checkbox" value="'+a.name+'" checked>'+
      '<div class="sf-info"><div class="sf-name">'+a.icon+' '+a.name+'</div>'+
      '<div class="sf-sub">'+a.user+' · '+a.purpose+'</div></div>'+
      '<span class="sf-badge" style="background:'+color+';color:#fff">'+a.currency+'</span></label>';
    }).join('');
    var btn=document.getElementById('sfBtn'),panel=document.getElementById('sfPanel'),bk=document.getElementById('bkdp');
    btn.onclick=e=>{e.stopPropagation();sfOpen=!sfOpen;panel.classList.toggle('open',sfOpen);btn.classList.toggle('open',sfOpen);bk.classList.toggle('open',sfOpen)};
    bk.onclick=closeF;
    list.onchange=syncF;
    document.getElementById('sfAll').onclick=()=>{list.querySelectorAll('input').forEach(c=>c.checked=true);syncF()};
    document.getElementById('sfNone').onclick=()=>{list.querySelectorAll('input').forEach(c=>c.checked=false);syncF()};
    document.getElementById('sfDone').onclick=()=>{closeF();renderStmt()};
  }
  function closeF(){sfOpen=false;document.getElementById('sfPanel').classList.remove('open');document.getElementById('sfBtn').classList.remove('open');document.getElementById('bkdp').classList.remove('open')}
  function syncF(){
    var ch=document.querySelectorAll('#sfList input:checked');sa=[...ch].map(c=>c.value);
    var n=sa.length,t=CONFIG.ACCOUNTS.length;
    document.getElementById('sfLbl').textContent=n===t?'🏦 All Accounts':n===0?'🏦 None':'🏦 '+n+' Account'+(n>1?'s':'');
  }

  // PERIODS
  function wirePeriods(){
    document.querySelectorAll('.pbtn').forEach(b=>{
      b.onclick=()=>{
        document.querySelectorAll('.pbtn').forEach(x=>x.classList.remove('on'));
        b.classList.add('on');
        document.getElementById('sMon').value='';document.getElementById('sMon').classList.remove('on');
        sDays=parseInt(b.dataset.d);sMonth='';renderStmt();
      };
    });
  }
  function wireMonth(){
    document.getElementById('sMon').onchange=e=>{
      if(e.target.value){
        document.querySelectorAll('.pbtn').forEach(x=>x.classList.remove('on'));
        e.target.classList.add('on');sMonth=e.target.value;sDays=0;
      }else{
        e.target.classList.remove('on');
        document.querySelector('.pbtn[data-d="7"]').classList.add('on');
        sMonth='';sDays=7;
      }
      renderStmt();
    };
  }
  function popMonths(){
    var ldg=dm.getTransactions(),ms=new Set();
    ldg.forEach(e=>{if(e.date)ms.add(e.date.getFullYear()+'-'+String(e.date.getMonth()+1).padStart(2,'0'))});
    // Also check allTxns
    allTxns.forEach(e=>{if(e.date)ms.add(e.date.getFullYear()+'-'+String(e.date.getMonth()+1).padStart(2,'0'))});
    var sel=document.getElementById('sMon');while(sel.options.length>1)sel.remove(1);
    [...ms].sort().reverse().forEach(m=>{
      var o=document.createElement('option');o.value=m;
      var p=m.split('-');o.textContent=new Date(p[0],p[1]-1).toLocaleString('en-AU',{month:'short',year:'numeric'});
      sel.appendChild(o);
    });
  }

  // OVERVIEW
  function renderOverview(){
    var a=dm.getAccounts(),l=allTxns.length ? allTxns : dm.getTransactions();
    var tot=a.reduce((s,x)=>s+x.balance,0);
    var h=document.getElementById('totalBal');h.textContent=dm.formatCurrency(tot);h.className='hero-amt '+(tot>=0?'pos':'neg');
    var inc,exp,savRate;
    if(l.length>0){inc=l.filter(t=>t.amount>0).reduce((s,t)=>s+t.convertedAmount,0);exp=Math.abs(l.filter(t=>t.amount<0).reduce((s,t)=>s+t.convertedAmount,0));savRate=inc>0?((inc-exp)/inc*100).toFixed(0):'--';}
    else{inc=dm.getDashboardMetric('Monthly Income');exp=dm.getDashboardMetric('Monthly Expenses');var sr=dm.getDashboardMetric('Savings Rate');savRate=sr>0&&sr<1?(sr*100).toFixed(0):inc>0?((inc-exp)/inc*100).toFixed(0):'--';}
    document.getElementById('sInc').textContent=dm.formatCurrency(inc);
    document.getElementById('sExp').textContent=dm.formatCurrency(exp);
    document.getElementById('sSav').textContent=savRate+'%';
    var b=n=>{var x=a.find(x=>x.name===n);return dm.formatCurrency(x?x.balance:0)};
    document.getElementById('bW').textContent=b('BW Personal (Commonwealth)');
    document.getElementById('bS').textContent=b('BW Personal (Starling)');
    document.getElementById('kW').textContent=b('Katie Personal (Commonwealth)');
    document.getElementById('kS').textContent=b('Katie Personal (Starling)');
    document.getElementById('jB').textContent=b('Joint (Commonwealth)');
    document.getElementById('jSv').textContent=b('Joint Saver (Commonwealth)');
    document.getElementById('jF').textContent=b('Joint (Starling)');
    document.getElementById('jC').textContent=b('Credit Card (Capital One)');

    // Overview charts
    FinanceCharts.categoryDonut('ovCatChart', l, dm);
    FinanceCharts.incomeExpenseBar('ovIncExpChart', dm.cache.history || [], dm);
    FinanceCharts.spendingTrend('ovTrendChart', dm.cache.history || [], dm);

    // Upcoming bills mini-calendar
    renderUpcomingBills();
  }

  function renderUpcomingBills() {
    var el = document.getElementById('upcomingBills');
    if (!el) return;
    var bills = dm.cache.bills || [];
    var now = new Date();
    var twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    var upcoming = bills.filter(b => {
      var d = new Date(b['Next Due Date']);
      return d >= now && d <= twoWeeks;
    }).sort((a, b) => new Date(a['Next Due Date']) - new Date(b['Next Due Date']));

    if (!upcoming.length) {
      el.innerHTML = '<div class="empty">No bills in the next 2 weeks 🎉</div>';
      return;
    }
    el.innerHTML = upcoming.map(b => {
      var c = b['Currency'] || 'AUD';
      var a = Math.abs(parseFloat(b['Amount'])) || 0;
      var d = new Date(b['Next Due Date']);
      var days = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
      var acctColor = FinanceCharts.getAccountColor(b['Account'] || '');
      return `<div class="bill-list-item"><div class="bill-left"><div class="bill-name">${b['Bill Name'] || ''}</div><div class="bill-meta">${days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : 'In ' + days + ' days'} · ${formatDate(b['Next Due Date'])}${b['Account'] ? ' · <span class="acct-tag" style="background:' + acctColor + '">' + (b['Account'] || '').replace(/ \(.*\)/, '') + '</span>' : ''}</div></div><div class="bill-right"><div class="bill-amt">${dm.formatCurrency(dm.convert(a, c))}</div></div></div>`;
    }).join('');
  }

  // ACCOUNTS
  function renderAccts(){
    var a=dm.getAccounts(),g=document.getElementById('aCards');
    // Reset detail view
    var detail = document.getElementById('acctDetail');
    if (detail) { detail.classList.remove('on'); detail.innerHTML = ''; }
    g.classList.remove('hide');

    g.innerHTML=a.map(x=>{
      var c=CONFIG.ACCOUNTS.find(c=>c.name===x.name)||{};
      var color = FinanceCharts.getAccountColor(x.name);
      var nv=x.nativeCurrency!==dm.displayCurrency?'<div class="native">'+dm.formatCurrency(x.nativeBalance,x.nativeCurrency)+' '+x.nativeCurrency+'</div>':'';
      return '<div class="acard" data-acct="'+x.name+'" style="border-left:3px solid '+color+'"><div class="icon">'+(c.icon||'💰')+'</div><div class="name">'+x.name.replace(/ \(.*\)/,'')+'</div>'+
        '<div class="purpose">'+x.purpose+' · '+x.nativeCurrency+'</div>'+
        '<div class="bal '+(x.balance>=0?'pos':'neg')+'">'+dm.formatCurrency(x.balance)+'</div>'+nv+
        '<div class="chg '+(x.change>=0?'pos':'neg')+'">'+(x.change>=0?'↗':'↘')+' '+dm.formatCurrency(Math.abs(x.change))+'</div></div>';
    }).join('');

    // Click handler for account cards
    g.querySelectorAll('.acard').forEach(card => {
      card.onclick = () => FinanceViews.openAccountDetail(card.dataset.acct, go);
    });
  }

  // STATEMENTS
  async function renderStmt(){
    var el=document.getElementById('stmtList'),sm=document.getElementById('stmtSum');
    el.innerHTML='<div class="empty">Loading…</div>';
    var data;
    if(sMonth){
      var raw=await dm.fetchTransactions(sMonth,sa.length<8?sa:null);
      data=raw.map(e=>trRow(e)).filter(t=>sa.includes(t.account)).sort((a,b)=>(b.date||0)-(a.date||0));
    }else if(sDays>7){
      var raw=await dm.fetchTransactions(null,sa.length<8?sa:null);
      var cut=new Date();cut.setDate(cut.getDate()-sDays);cut.setHours(0,0,0,0);
      data=raw.map(e=>trRow(e)).filter(t=>t.date&&t.date>=cut&&sa.includes(t.account)).sort((a,b)=>(b.date||0)-(a.date||0));
    }else{
      data=dm.getTransactions().filter(t=>sa.includes(t.account));
    }
    var tIn=data.filter(t=>t.amount>0).reduce((s,t)=>s+t.convertedAmount,0);
    var tOut=Math.abs(data.filter(t=>t.amount<0).reduce((s,t)=>s+t.convertedAmount,0));
    sm.innerHTML='In: <b class="pos">'+dm.formatCurrency(tIn)+'</b> &nbsp; Out: <b class="neg">'+dm.formatCurrency(tOut)+'</b> &nbsp; '+data.length+' txns';
    el.innerHTML=data.length?data.map(t=>txHtml(t, dm, true)).join(''):'<div class="empty">No transactions found</div>';
    FinanceCharts.balanceLine('balChart', data, dm);
  }

  function trRow(e){
    var c=e['Currency']||dm.getAccountCurrency(e['Account']);
    return{date:e['Date']?new Date(e['Date']):null,description:e['Description']||'',amount:parseFloat(e['Amount'])||0,
      balanceAfter:parseFloat(e['Balance After'])||0,category:e['Category']||'',account:e['Account']||'',currency:c,
      convertedAmount:dm.convert(parseFloat(e['Amount'])||0,c),convertedBalance:dm.convert(parseFloat(e['Balance After'])||0,c)};
  }

  function renderFtr(){
    document.getElementById('fSrc').textContent=dm.dataSource==='live'?'🟢 Live':'🟡 Demo';
    document.getElementById('fRate').textContent='£1 = $'+(dm.exchangeRate.gbpToAud||1.95).toFixed(2);
  }
})();
