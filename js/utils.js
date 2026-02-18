// Utility Functions

class Utils {
  // Currency formatting
  static formatCurrency(amount, currency = CONFIG.UI.CURRENCY_SYMBOL, showCents = true) {
    const formatter = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: showCents ? 2 : 0,
      maximumFractionDigits: showCents ? 2 : 0
    });
    
    // Remove currency symbol and replace with our preferred symbol
    let formatted = formatter.format(Math.abs(amount));
    formatted = formatted.replace(/^[^0-9-]*/, currency);
    
    return amount < 0 ? `-${formatted}` : formatted;
  }

  // Compact currency formatting for large numbers
  static formatCompactCurrency(amount) {
    const absAmount = Math.abs(amount);
    let suffix = '';
    let divisor = 1;

    if (absAmount >= 1000000) {
      suffix = 'M';
      divisor = 1000000;
    } else if (absAmount >= 1000) {
      suffix = 'K';
      divisor = 1000;
    }

    const value = amount / divisor;
    const formatted = this.formatCurrency(value, CONFIG.UI.CURRENCY_SYMBOL, divisor === 1);
    
    return divisor === 1 ? formatted : formatted + suffix;
  }

  // Date formatting
  static formatDate(date, format = CONFIG.UI.DATE_FORMAT) {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    return d.toLocaleDateString('en-AU', options);
  }

  // Relative date formatting (e.g., "2 days ago", "in 5 days")
  static formatRelativeDate(date) {
    if (!date) return '';
    
    const d = new Date(date);
    const now = new Date();
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    
    return this.formatDate(date);
  }

  // Percentage formatting
  static formatPercentage(value, decimals = 1) {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  // Number abbreviation
  static abbreviateNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  // Debounce function for API calls
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function for scroll events
  static throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }

  // Deep clone object
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const cloned = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }
  }

  // Generate unique ID
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Local storage helpers with error handling
  static setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  }

  static getLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Failed to read from localStorage:', e);
      return defaultValue;
    }
  }

  // Color utilities
  static hexToRgba(hex, alpha = 1) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Validation helpers
  static isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static isValidNumber(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  static isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Array utilities
  static groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(item);
      return groups;
    }, {});
  }

  static sortBy(array, key, direction = 'asc') {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (direction === 'desc') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
      }
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
  }

  static sum(array, key = null) {
    if (key) {
      return array.reduce((sum, item) => sum + (item[key] || 0), 0);
    }
    return array.reduce((sum, item) => sum + item, 0);
  }

  static average(array, key = null) {
    if (array.length === 0) return 0;
    return this.sum(array, key) / array.length;
  }

  // Financial calculations
  static calculateSavingsRate(income, expenses) {
    if (income <= 0) return 0;
    return (income - expenses) / income;
  }

  static calculateDebtToIncomeRatio(totalDebt, monthlyIncome) {
    if (monthlyIncome <= 0) return 0;
    return totalDebt / monthlyIncome;
  }

  static calculateCompoundInterest(principal, rate, time, compound = 12) {
    const r = rate / 100;
    return principal * Math.pow((1 + r / compound), compound * time);
  }

  static projectFutureBalance(currentBalance, monthlyContribution, months, interestRate = 0) {
    if (interestRate === 0) {
      return currentBalance + (monthlyContribution * months);
    }
    
    const monthlyRate = interestRate / 12 / 100;
    const futureValue = currentBalance * Math.pow(1 + monthlyRate, months);
    const contributionValue = monthlyContribution * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    
    return futureValue + contributionValue;
  }

  // Category detection for transactions
  static detectCategory(description, amount) {
    const desc = description.toLowerCase();
    
    // Check for income indicators
    if (amount > 0) {
      const incomeKeywords = ['salary', 'wage', 'pay', 'income', 'transfer in', 'deposit'];
      if (incomeKeywords.some(keyword => desc.includes(keyword))) {
        return CONFIG.TRANSACTION_CATEGORIES.INCOME;
      }
    }

    // Check expense categories
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return category;
      }
    }

    return CONFIG.TRANSACTION_CATEGORIES.MISCELLANEOUS;
  }

  // Mobile detection
  static isMobile() {
    return window.innerWidth <= CONFIG.UI.MOBILE_BREAKPOINT;
  }

  // Touch device detection
  static isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  // Error handling
  static handleError(error, context = '') {
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);
    
    // You could integrate with error reporting service here
    // Example: Sentry.captureException(error);
    
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
      context
    };
  }

  // Success response helper
  static handleSuccess(data = null, message = 'Operation completed successfully') {
    return {
      success: true,
      data,
      message
    };
  }

  // Loading state management
  static showLoading(elementId = 'loading') {
    const loader = document.getElementById(elementId);
    if (loader) {
      loader.style.display = 'flex';
    }
  }

  static hideLoading(elementId = 'loading') {
    const loader = document.getElementById(elementId);
    if (loader) {
      loader.style.display = 'none';
    }
  }

  // Notification helpers (for future toast notifications)
  static notify(message, type = 'info', duration = 5000) {
    // This would integrate with a toast notification library
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // For now, just console log - could be enhanced with actual UI notifications
    return {
      message,
      type,
      timestamp: new Date(),
      duration
    };
  }
}