// Main application logic
(function(){
  'use strict';
  var sa = CONFIG.ACCOUNTS.map(a=>a.name), sMonth='', sfOpen=false, tab='overview';
  var dm = dataManager;
  var allTxns = []; // cached full transaction set
  var globalPeriod = 7; // universal period for whole app
  window.getGlobalPeriod = function(){ return globalPeriod; };

  // Account inclusion for balance calc — credit card excluded by default
  var acctIncluded = {};
  CONFIG.ACCOUNTS.forEach(a => { acctIncluded[a.name] = a.type !== 'credit'; });

  // Self-transfer detection — also exposed globally for views/insights
  window.isSelfTransfer = isSelfTransfer;
  window.excludeSelfTransfers = excludeSelfTransfers;
  function isSelfTransfer(t) {
    var d = (t.description || '').toLowerCase();
    // Wise transfers are always self-transfers
    if (d.includes('wise')) return true;
    // CommBank app transfers between own accounts (no named recipient)
    if (d.match(/transfer (to|from) xx\d+ commbank app/i)) return true;
    // Fast transfers between own accounts
    if (d.match(/^(transfer|fast transfer) (to|from) xx\d/i)) return true;
    return false;
  }

  // Filter out self-transfers from a transaction array
  function excludeSelfTransfers(txns) {
    return txns.filter(t => !isSelfTransfer(t));
  }

  document.addEventListener('DOMContentLoaded', async()=>{
    try {
    console.log('🚀 App init');
    FinanceViews.init(dm);
    wireNav(); wireCur(); wireGlobalPeriod();
    buildFilter(); wireMonth();
    showGlobalSpinner();
    console.log('📡 Fetching data...');
    try { await dm.fetchAll(); } catch(e) { console.error('fetchAll failed:', e); }
    console.log('✅ Data loaded, transactions:', (dm.cache.transactions||[]).length);
    // Use whatever we got from fetchAll first
    allTxns = dm.getTransactions();
    console.log('📊 Rendering...');
    hideGlobalSpinner();
    renderAll();
    console.log('✅ Render complete');
    // Then load full transaction history in background
    dm.fetchTransactions(null, null).then(function(raw){
      if(raw && raw.length) {
        allTxns = raw.map(function(e){return trRow(e)}).sort(function(a,b){return(b.date||0)-(a.date||0)});
        renderAll();
        if(tab==='insights')FinanceViews.renderInsights(allTxns, dm.cache.history||[]);
      }
    }).catch(function(e){ console.error('fetchTransactions bg failed:', e); });
    } catch(fatal) { console.error('💥 FATAL:', fatal); }
  });

  function showGlobalSpinner() {
    document.querySelectorAll('.empty').forEach(el => {
      el.innerHTML = '<div class="spinner"><div class="spinner-dot"></div><div class="spinner-dot"></div><div class="spinner-dot"></div></div>';
    });
  }
  function hideGlobalSpinner() {
    // Content will be replaced by render functions
  }

  function renderAll(){
    try{renderOverview()}catch(e){console.error('renderOverview:',e)}
    try{renderAccts()}catch(e){console.error('renderAccts:',e)}
    try{popMonths()}catch(e){console.error('popMonths:',e)}
  }

  // NAV
  function wireNav(){
    var n=document.getElementById('nav');
    n.onchange=e=>go(e.target.value);
    var h=location.hash.slice(1);
    if(h&&document.getElementById(h)){n.value=h;go(h)}
  }
  window.go = go;
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
    if(t==='projections')FinanceViews.renderProjections(dm.cache.projections||[], dm.cache.bills||[], dm.getAccounts(), globalPeriod);
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
      if(tab==='projections')FinanceViews.renderProjections(dm.cache.projections||[], dm.cache.bills||[], dm.getAccounts(), globalPeriod);
      if(tab==='insights')FinanceViews.renderInsights(allTxns, dm.cache.history||[]);
    };
  }

  // GLOBAL PERIOD TOGGLE
  function wireGlobalPeriod(){
    document.querySelectorAll('.pbtn-g').forEach(function(b){
      b.addEventListener('click', function(){
        document.querySelectorAll('.pbtn-g').forEach(function(x){x.classList.remove('on')});
        b.classList.add('on');
        globalPeriod = parseInt(b.dataset.gd);
        renderAll();
        if(tab==='statements')renderStmt();
        if(tab==='wages')FinanceViews.renderWages(dm.cache.wages||[]);
        if(tab==='bills')FinanceViews.renderBillsCalendar(dm.cache.bills||[]);
        if(tab==='savings')FinanceViews.renderSavings(dm.cache.savings||[], dm.cache.history||[]);
        if(tab==='projections')FinanceViews.renderProjections(dm.cache.projections||[], dm.cache.bills||[], dm.getAccounts(), globalPeriod);
        if(tab==='insights')FinanceViews.renderInsights(allTxns, dm.cache.history||[]);
      });
    });
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

  function wireMonth(){
    document.getElementById('sMon').onchange=e=>{
      if(e.target.value){
        e.target.classList.add('on');sMonth=e.target.value;
      }else{
        e.target.classList.remove('on');sMonth='';
      }
      renderStmt();
    };
  }
  function popMonths(){
    var ldg=dm.getTransactions(),ms=new Set();
    ldg.forEach(e=>{if(e.date)ms.add(e.date.getFullYear()+'-'+String(e.date.getMonth()+1).padStart(2,'0'))});
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
    var real = excludeSelfTransfers(l);
    var filtered = FinanceViews.filterByPeriod(real, globalPeriod);
    // Exclude credit card from total balance
    var tot=a.filter(x => acctIncluded[x.name] !== false).reduce((s,x)=>s+x.balance,0);
    var h=document.getElementById('totalBal');h.textContent=dm.formatCurrency(tot);h.className='hero-amt '+(tot>=0?'pos':'neg');
    // All stats use global period, excluding self-transfers
    var inc = filtered.filter(t=>t.amount>0).reduce((s,t)=>s+t.convertedAmount,0);
    var exp = Math.abs(filtered.filter(t=>t.amount<0).reduce((s,t)=>s+t.convertedAmount,0));
    var savRate = inc>0?((inc-exp)/inc*100).toFixed(0):'--';
    if(inc===0 && l.length===0){inc=dm.getDashboardMetric('Monthly Income');}
    if(exp===0 && l.length===0){exp=dm.getDashboardMetric('Monthly Expenses');}
    document.getElementById('sIncLbl').textContent='Income ('+globalPeriod+'D)';
    document.getElementById('sExpLbl').textContent='Spent ('+globalPeriod+'D)';
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

    // Overview charts — exclude self-transfers
    try{FinanceCharts.categoryDonut('ovCatChart', filtered, dm)}catch(e){console.error('catDonut:',e)}
    try{FinanceCharts.incomeExpenseBar('ovIncExpChart', real, dm)}catch(e){console.error('incExp:',e)}
    try{FinanceCharts.spendingTrend('ovTrendChart', filtered, dm)}catch(e){console.error('trend:',e)}
    // Show canvases, hide spinners
    ['ovCatWrap','ovIncExpWrap','ovTrendWrap'].forEach(function(id){
      var w=document.getElementById(id);if(!w)return;
      var s=w.querySelector('.spinner');if(s)s.style.display='none';
      var c=w.querySelector('canvas');if(c)c.style.display='';
    });

    // Mini calendar
    try{FinanceViews.renderMiniCalendar(dm.cache.bills || [])}catch(e){console.error('miniCal:',e)}

    // Upcoming bills now integrated into mini calendar

    // Trends & Analysis
    try{FinanceViews.renderTrendsAnalysis(real, dm.cache.history || [])}catch(e){console.error('trends:',e)}
  }

  // ACCOUNTS
  function renderAccts(){
    var a=dm.getAccounts(),g=document.getElementById('aCards');
    var detail = document.getElementById('acctDetail');
    if (detail) { detail.classList.remove('on'); detail.innerHTML = ''; }
    g.classList.remove('hide');

    // Balance hero
    var balEl = document.getElementById('acctBalHero');
    if (!balEl) {
      balEl = document.createElement('div');
      balEl.id = 'acctBalHero';
      balEl.className = 'hero';
      g.parentElement.insertBefore(balEl, g);
    }
    var incTotal = a.filter(x => acctIncluded[x.name] !== false).reduce((s, x) => s + x.balance, 0);
    var incCount = a.filter(x => acctIncluded[x.name] !== false).length;
    balEl.innerHTML = '<div class="hero-lbl">Combined Balance</div><div class="hero-amt ' + (incTotal >= 0 ? 'pos' : 'neg') + '">' + dm.formatCurrency(incTotal) + '</div><div class="hero-sub">' + incCount + ' of ' + a.length + ' accounts included</div>';

    g.innerHTML=a.map(x=>{
      var c=CONFIG.ACCOUNTS.find(c=>c.name===x.name)||{};
      var color = FinanceCharts.getAccountColor(x.name);
      var checked = acctIncluded[x.name] !== false;
      var nv=x.nativeCurrency!==dm.displayCurrency?'<div class="native">'+dm.formatCurrency(x.nativeBalance,x.nativeCurrency)+' '+x.nativeCurrency+'</div>':'';
      return '<div class="acard' + (checked ? '' : ' excluded') + '" data-acct="'+x.name+'" style="border-left:3px solid '+color+'">' +
        '<label class="acct-check" onclick="event.stopPropagation()"><input type="checkbox" data-acct-chk="'+x.name+'" '+(checked?'checked':'')+'/><span class="acct-chk-mark"></span></label>' +
        '<div class="icon">'+(c.icon||'💰')+'</div><div class="name">'+(c.shortName||x.name.replace(/ \(.*\)/,''))+'</div>'+
        '<div class="purpose">'+x.purpose+' · '+x.nativeCurrency+'</div>'+
        '<div class="bal '+(x.balance>=0?'pos':'neg')+'">'+dm.formatCurrency(x.balance)+'</div>'+nv+
        '<div class="chg '+(x.change>=0?'pos':'neg')+'">'+(x.change>=0?'↗':'↘')+' '+dm.formatCurrency(Math.abs(x.change))+'</div></div>';
    }).join('');

    // Wire checkboxes
    g.querySelectorAll('input[data-acct-chk]').forEach(chk => {
      chk.onchange = () => {
        acctIncluded[chk.dataset.acctChk] = chk.checked;
        chk.closest('.acard').classList.toggle('excluded', !chk.checked);
        // Recalc balance hero
        var inc2 = a.filter(x => acctIncluded[x.name] !== false).reduce((s, x) => s + x.balance, 0);
        var cnt2 = a.filter(x => acctIncluded[x.name] !== false).length;
        balEl.querySelector('.hero-amt').textContent = dm.formatCurrency(inc2);
        balEl.querySelector('.hero-amt').className = 'hero-amt ' + (inc2 >= 0 ? 'pos' : 'neg');
        balEl.querySelector('.hero-sub').textContent = cnt2 + ' of ' + a.length + ' accounts included';
        // Also update overview total
        var ovH = document.getElementById('totalBal');
        if (ovH) { ovH.textContent = dm.formatCurrency(inc2); ovH.className = 'hero-amt ' + (inc2 >= 0 ? 'pos' : 'neg'); }
      };
    });

    g.querySelectorAll('.acard').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('.acct-check')) return;
        FinanceViews.openAccountDetail(card.dataset.acct, go);
      };
    });
  }

  // STATEMENTS
  var stmtPage = 1;
  var stmtExpanded = false;

  async function renderStmt(){
    var el=document.getElementById('stmtList'),sm=document.getElementById('stmtSum');
    el.innerHTML = FinanceViews.spinner();
    var days = globalPeriod;
    var data;
    if(sMonth){
      var raw=await dm.fetchTransactions(sMonth,sa.length<8?sa:null);
      data=raw.map(e=>trRow(e)).filter(t=>sa.includes(t.account)).sort((a,b)=>(b.date||0)-(a.date||0));
    }else if(days>7){
      var raw=await dm.fetchTransactions(null,sa.length<8?sa:null);
      var cut=new Date();cut.setDate(cut.getDate()-days);cut.setHours(0,0,0,0);
      data=raw.map(e=>trRow(e)).filter(t=>t.date&&t.date>=cut&&sa.includes(t.account)).sort((a,b)=>(b.date||0)-(a.date||0));
    }else{
      data=dm.getTransactions().filter(t=>sa.includes(t.account));
    }
    var tIn=data.filter(t=>t.amount>0).reduce((s,t)=>s+t.convertedAmount,0);
    var tOut=Math.abs(data.filter(t=>t.amount<0).reduce((s,t)=>s+t.convertedAmount,0));
    sm.innerHTML='In: <b class="pos">'+dm.formatCurrency(tIn)+'</b> &nbsp; Out: <b class="neg">'+dm.formatCurrency(tOut)+'</b> &nbsp; '+data.length+' txns';

    // Use expandable transaction list
    FinanceViews.renderTransactionList('stmtList', data, dm);
    FinanceCharts.balanceLine('balChart', data, dm);
    var bw=document.getElementById('balChartWrap');if(bw){var bs=bw.querySelector('.spinner');if(bs)bs.style.display='none';var bc=bw.querySelector('canvas');if(bc)bc.style.display='';}
  }

  function trRow(e){
    var c=e['Currency']||dm.getAccountCurrency(e['Account']);
    return{date:e['Date']?new Date(e['Date']):null,description:e['Description']||'',amount:parseFloat(e['Amount'])||0,
      balanceAfter:parseFloat(e['Balance After'])||0,category:e['Category']||'',account:e['Account']||'',currency:c,
      convertedAmount:dm.convert(parseFloat(e['Amount'])||0,c),convertedBalance:dm.convert(parseFloat(e['Balance After'])||0,c)};
  }

  // Footer removed
})();
