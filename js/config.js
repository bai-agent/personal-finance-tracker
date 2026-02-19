// Configuration
const CONFIG = {
  SPREADSHEET_ID: '1jIDRs9Vbm97RYbSf40jsTth6J8-WKcBgccX5EvpMTZ4',

  GAS_WEBAPP: {
    URL: 'https://script.google.com/macros/s/AKfycbztqPI6i_JXY9KJwl4QciwjXcS3iAHSC1nmH2SI0q81b6BHibqiz3rjJul5bo5JuInJdg/exec'
  },

  ACCOUNTS: [
    { id: 'bw_cba', name: 'BW Personal (Commonwealth)', bank: 'CBA', user: 'Bailey', purpose: 'Wages', currency: 'AUD', icon: '🏛️', type: 'checking' },
    { id: 'katie_cba', name: 'Katie Personal (Commonwealth)', bank: 'CBA', user: 'Katie', purpose: 'Wages', currency: 'AUD', icon: '🏛️', type: 'checking' },
    { id: 'joint_cba', name: 'Joint (Commonwealth)', bank: 'CBA', user: 'Joint', purpose: 'Bills', currency: 'AUD', icon: '🏛️', type: 'checking' },
    { id: 'saver_cba', name: 'Joint Saver (Commonwealth)', bank: 'CBA', user: 'Joint', purpose: 'Savings', currency: 'AUD', icon: '🏛️', type: 'savings' },
    { id: 'bw_starling', name: 'BW Personal (Starling)', bank: 'Starling', user: 'Bailey', purpose: 'Spending', currency: 'GBP', icon: '⭐', type: 'checking' },
    { id: 'katie_starling', name: 'Katie Personal (Starling)', bank: 'Starling', user: 'Katie', purpose: 'Spending', currency: 'GBP', icon: '⭐', type: 'checking' },
    { id: 'joint_starling', name: 'Joint (Starling)', bank: 'Starling', user: 'Joint', purpose: 'Food', currency: 'GBP', icon: '⭐', type: 'checking' },
    { id: 'cc_capone', name: 'Credit Card (Capital One)', bank: 'Capital One', user: 'Joint', purpose: 'Credit', currency: 'GBP', icon: '💳', type: 'credit' }
  ],

  CHART_COLORS: {
    PRIMARY: '#2563eb',
    SUCCESS: '#22c55e',
    DANGER: '#ef4444',
    WARNING: '#f97316',
    SECONDARY: '#10b981',
    ACCENT: '#f59e0b',
    MUTED: '#94a3b8'
  },

  UI: {
    DATE_FORMAT: 'DD/MM/YYYY',
    MOBILE_BREAKPOINT: 768
  }
};
