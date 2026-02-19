// Data Management - fetches from Google Apps Script webapp

class DataManager {
  constructor() {
    this.cache = {};
    this.lastFetch = null;
    this.exchangeRate = { gbpToAud: 1.95, audToGbp: 0.513, date: null };
    this.displayCurrency = 'AUD'; // 'AUD' or 'GBP'
    this.isOnline = navigator.onLine;
    this.dataSource = 'loading';

    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  // Fetch all data from GAS
  async fetchAll() {
    const url = CONFIG.GAS_WEBAPP.URL;
    if (!url) { this.loadMockData(); return false; }

    try {
      console.log('📡 Fetching from Google Sheets...');
      const resp = await fetch(url + '?action=all');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const raw = await resp.json();
      if (raw.error) throw new Error(raw.error);

      this.cache = raw;
      this.lastFetch = new Date();
      this.dataSource = 'live';

      // Store exchange rate
      if (raw.exchangeRate) {
        this.exchangeRate = raw.exchangeRate;
      }

      console.log('✅ Live data loaded');
      return true;
    } catch (err) {
      console.error('❌ Fetch failed:', err);
      if (!this.cache.accounts) this.loadMockData();
      return false;
    }
  }

  // Fetch transactions for specific month
  async fetchTransactions(month, accounts) {
    const url = CONFIG.GAS_WEBAPP.URL;
    let params = '?action=transactions_all';
    if (month) params += '&month=' + month;
    if (accounts && accounts.length) params += '&accounts=' + accounts.join(',');

    try {
      const resp = await fetch(url + params);
      const raw = await resp.json();
      return raw.data || [];
    } catch (err) {
      console.error('Ledger fetch failed:', err);
      return [];
    }
  }

  // Convert amount between currencies
  convert(amount, fromCurrency, toCurrency) {
    if (!toCurrency) toCurrency = this.displayCurrency;
    if (fromCurrency === toCurrency) return amount;
    if (fromCurrency === 'GBP' && toCurrency === 'AUD') return amount * this.exchangeRate.gbpToAud;
    if (fromCurrency === 'AUD' && toCurrency === 'GBP') return amount * this.exchangeRate.audToGbp;
    return amount;
  }

  // Format currency with symbol
  formatCurrency(amount, currency) {
    if (!currency) currency = this.displayCurrency;
    const symbol = currency === 'GBP' ? '£' : '$';
    const abs = Math.abs(amount);
    const formatted = symbol + abs.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return amount < 0 ? '-' + formatted : formatted;
  }

  // Get accounts with converted balances
  getAccounts() {
    const raw = this.cache.accounts || [];
    return raw.map(a => {
      const nativeCurrency = this.getAccountCurrency(a['Account Name']);
      const balance = parseFloat(a['Current Balance']) || 0;
      const prev = parseFloat(a['Previous Balance']) || 0;
      return {
        name: a['Account Name'],
        type: a['Type'],
        bank: a['Bank'],
        user: a['User'],
        purpose: a['Purpose'],
        nativeBalance: balance,
        nativeCurrency: nativeCurrency,
        balance: this.convert(balance, nativeCurrency),
        previousBalance: this.convert(prev, nativeCurrency),
        change: this.convert(balance - prev, nativeCurrency),
        lastUpdate: a['Last Updated']
      };
    });
  }

  // Get transactions (last 7 days by default)
  getTransactions() {
    return (this.cache.transactions || []).map(e => {
      const cur = e['Currency'] || this.getAccountCurrency(e['Account']);
      return {
        date: e['Date'] ? new Date(e['Date']) : null,
        description: e['Description'] || '',
        amount: parseFloat(e['Amount']) || 0,
        balanceAfter: parseFloat(e['Balance After']) || 0,
        category: e['Category'] || '',
        account: e['Account'] || '',
        bank: e['Bank'] || '',
        user: e['User'] || '',
        currency: cur,
        type: e['Type'] || '',
        convertedAmount: this.convert(parseFloat(e['Amount']) || 0, cur),
        convertedBalance: this.convert(parseFloat(e['Balance After']) || 0, cur),
        id: e['ID'] || '',
        notes: e['Notes'] || ''
      };
    }).sort((a, b) => (b.date || 0) - (a.date || 0));
  }

  getDashboardMetric(name) {
    const d = this.cache.dashboard || [];
    const m = d.find(x => x['Metric'] === name);
    return m ? (parseFloat(m['Value']) || 0) : 0;
  }

  getAccountCurrency(accountName) {
    if (!accountName) return 'AUD';
    const cfg = CONFIG.ACCOUNTS.find(a => a.name === accountName);
    return cfg ? cfg.currency : 'AUD';
  }

  // Calculate totals with currency conversion
  getTotals(selectedAccounts) {
    const accounts = this.getAccounts();
    let filtered = accounts;
    if (selectedAccounts && selectedAccounts.length > 0) {
      filtered = accounts.filter(a => selectedAccounts.includes(a.name));
    }
    const total = filtered.reduce((s, a) => s + a.balance, 0);
    return { total, accounts: filtered };
  }

  loadMockData() {
    this.dataSource = 'mock';
    this.cache = {
      accounts: CONFIG.ACCOUNTS.map(a => ({
        'Account Name': a.name, 'Type': a.type, 'Bank': a.bank,
        'User': a.user, 'Purpose': a.purpose, 'Current Balance': 0,
        'Previous Balance': 0, 'Currency': a.currency
      })),
      transactions: [],
      wages: [], bills: [], savings: [], history: [], dashboard: []
    };
  }
}

const dataManager = new DataManager();
