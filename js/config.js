// Configuration and Constants
const CONFIG = {
  // Google Sheets API configuration
  GOOGLE_SHEETS: {
    SPREADSHEET_ID: '1KIzq9VaJWqyFSIUk8J0GB43Yp1sYVY86K3M30_q73xc', // Bailey & Katie Finance Tracker
    API_KEY: 'YOUR_API_KEY_HERE', // To be updated during setup
    SHEETS: {
      TRANSACTIONS: 'Transactions',
      ACCOUNTS: 'Accounts',
      BILLS: 'Bills',
      GOALS: 'Goals',
      CATEGORIES: 'Categories',
      DASHBOARD: 'Dashboard'
    }
  },

  // Google Apps Script Web App
  GAS_WEBAPP: {
    URL: 'https://script.google.com/a/macros/babybloomsydney.com.au/s/AKfycbzyF9l0RlzH4N-syW_wRQ2xM6edLQ7Lclc6yC_Ya9BYrnAyjDCl-U8qXjsMK21GeU58/exec'
  },

  // OpenClaw webhook configuration
  OPENCLAW: {
    WEBHOOK_URL: 'http://localhost:18789/wake',
    FINANCE_CONTEXT_PATH: '/Users/bai/.openclaw/workspace/bai-brain/memory/personal/projects/finances/'
  },

  // Default account types and categories
  ACCOUNT_TYPES: {
    CHECKING: 'checking',
    SAVINGS: 'savings',
    CREDIT: 'credit',
    INVESTMENT: 'investment'
  },

  TRANSACTION_CATEGORIES: {
    INCOME: 'Income',
    HOUSING: 'Housing',
    TRANSPORTATION: 'Transportation',
    FOOD: 'Food & Dining',
    UTILITIES: 'Utilities',
    HEALTHCARE: 'Healthcare',
    ENTERTAINMENT: 'Entertainment',
    SHOPPING: 'Shopping',
    PERSONAL: 'Personal Care',
    EDUCATION: 'Education',
    SAVINGS: 'Savings & Investments',
    MISCELLANEOUS: 'Miscellaneous'
  },

  // Chart colors and themes
  CHART_COLORS: {
    PRIMARY: '#2563eb',
    SUCCESS: '#22c55e',
    DANGER: '#ef4444',
    WARNING: '#f97316',
    SECONDARY: '#10b981',
    ACCENT: '#f59e0b',
    MUTED: '#94a3b8'
  },

  // Data refresh intervals (in milliseconds)
  REFRESH_INTERVALS: {
    FAST: 30000,    // 30 seconds
    NORMAL: 60000,  // 1 minute
    SLOW: 300000,   // 5 minutes
    MANUAL: 0       // Manual only
  },

  // Financial calculation constants
  FINANCIAL: {
    EMERGENCY_FUND_MONTHS: 6,
    HIGH_DEBT_RATIO: 0.3, // 30% debt-to-income
    LOW_SAVINGS_RATE: 0.1, // 10% savings rate
    BILL_WARNING_DAYS: 7,
    BILL_OVERDUE_DAYS: 1
  },

  // UI preferences
  UI: {
    CURRENCY_SYMBOL: '$',
    DATE_FORMAT: 'DD/MM/YYYY',
    CHART_ANIMATION_DURATION: 300,
    MOBILE_BREAKPOINT: 768,
    ITEMS_PER_PAGE: 50
  },

  // Feature flags
  FEATURES: {
    DARK_MODE: true,
    PWA_FEATURES: true,
    OFFLINE_MODE: false, // Future feature
    EXPORT_DATA: true,
    PREDICTIVE_ANALYTICS: true
  }
};

// Account configuration templates
const ACCOUNT_TEMPLATES = {
  checking: {
    type: 'checking',
    color: CONFIG.CHART_COLORS.SUCCESS,
    icon: '🏦',
    defaultGoal: null,
    trackingEnabled: true
  },
  savings: {
    type: 'savings',
    color: CONFIG.CHART_COLORS.SECONDARY,
    icon: '💰',
    defaultGoal: 'Emergency Fund',
    trackingEnabled: true
  },
  credit: {
    type: 'credit',
    color: CONFIG.CHART_COLORS.DANGER,
    icon: '💳',
    defaultGoal: 'Pay Off Debt',
    trackingEnabled: true
  },
  investment: {
    type: 'investment',
    color: CONFIG.CHART_COLORS.PRIMARY,
    icon: '📈',
    defaultGoal: 'Investment Growth',
    trackingEnabled: true
  }
};

// Default financial goals
const DEFAULT_GOALS = [
  {
    id: 'emergency_fund',
    name: 'Emergency Fund',
    description: 'Save 6 months of expenses',
    category: 'savings',
    priority: 'high',
    icon: '🛡️'
  },
  {
    id: 'vacation',
    name: 'Vacation Fund',
    description: 'Save for annual vacation',
    category: 'lifestyle',
    priority: 'medium',
    icon: '✈️'
  },
  {
    id: 'house_deposit',
    name: 'House Deposit',
    description: 'Save for house down payment',
    category: 'investment',
    priority: 'high',
    icon: '🏠'
  }
];

// Spending category mappings for automatic categorization
const CATEGORY_KEYWORDS = {
  [CONFIG.TRANSACTION_CATEGORIES.HOUSING]: [
    'rent', 'mortgage', 'property', 'real estate', 'housing', 'landlord'
  ],
  [CONFIG.TRANSACTION_CATEGORIES.TRANSPORTATION]: [
    'fuel', 'petrol', 'gas station', 'uber', 'taxi', 'train', 'bus', 'parking',
    'car', 'vehicle', 'registration', 'insurance'
  ],
  [CONFIG.TRANSACTION_CATEGORIES.FOOD]: [
    'restaurant', 'cafe', 'takeaway', 'grocery', 'supermarket', 'food',
    'dining', 'mcdonald', 'kfc', 'subway', 'pizza'
  ],
  [CONFIG.TRANSACTION_CATEGORIES.UTILITIES]: [
    'electricity', 'gas', 'water', 'internet', 'phone', 'mobile', 'utility'
  ],
  [CONFIG.TRANSACTION_CATEGORIES.HEALTHCARE]: [
    'doctor', 'medical', 'pharmacy', 'hospital', 'dental', 'optometrist',
    'physiotherapy', 'medicare'
  ],
  [CONFIG.TRANSACTION_CATEGORIES.ENTERTAINMENT]: [
    'cinema', 'movie', 'netflix', 'spotify', 'entertainment', 'gym',
    'fitness', 'sport', 'game'
  ],
  [CONFIG.TRANSACTION_CATEGORIES.SHOPPING]: [
    'shopping', 'amazon', 'ebay', 'target', 'kmart', 'clothing', 'fashion'
  ]
};

// Export configuration for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFIG,
    ACCOUNT_TEMPLATES,
    DEFAULT_GOALS,
    CATEGORY_KEYWORDS
  };
}