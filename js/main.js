// Main Application Initialization and Coordination

class FinanceApp {
  constructor() {
    this.isInitialized = false;
    this.version = '1.0.0';
    this.buildDate = new Date('2024-01-15');
    
    // Application state
    this.state = {
      currentUser: 'Bailey & Katie',
      dataLoaded: false,
      lastSync: null,
      offlineMode: false
    };

    // Initialize application
    this.initialize();
  }

  // Initialize the application
  async initialize() {
    try {
      console.log('🚀 Initializing Personal Finance Tracker...');
      
      // Hide loading screen immediately - show content first
      Utils.hideLoading();
      
      // Initialize core components
      await this.initializeCore();
      
      // Load initial data
      await this.loadInitialData();
      
      // Initialize UI
      await this.initializeUI();
      
      // Set up auto-refresh
      this.setupAutoRefresh();
      
      // Initialize PWA features
      if (CONFIG.FEATURES.PWA_FEATURES) {
        this.initializePWA();
      }
      
      this.isInitialized = true;
      this.state.dataLoaded = true;
      
      console.log('✅ Finance Tracker initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Finance Tracker:', error);
      // Still hide loading and show content even on error
      Utils.hideLoading();
      console.warn('App loaded with errors - some features may be limited');
    }
  }

  // Initialize core components
  async initializeCore() {
    // Initialize Chart.js
    await chartManager.initializeChartJS();
    
    // Set up error handling
    this.setupErrorHandling();
    
    // Initialize data manager
    if (!dataManager) {
      throw new Error('Data manager not initialized');
    }
    
    // Check browser compatibility
    this.checkBrowserCompatibility();
    
    // Set up offline detection
    this.setupOfflineDetection();
  }

  // Load initial data
  async loadInitialData() {
    console.log('📊 Loading initial financial data...');
    
    try {
      // Load all required data in parallel
      const [dashboardResult, accountsResult, transactionsResult] = await Promise.all([
        dataManager.getDashboardData(),
        dataManager.getAccounts(),
        dataManager.getTransactions()
      ]);

      if (!dashboardResult.success) {
        throw new Error('Failed to load dashboard data');
      }

      console.log('✅ Initial data loaded successfully');
      this.state.lastSync = new Date();
      
    } catch (error) {
      console.error('❌ Error loading initial data:', error);
      throw error;
    }
  }

  // Initialize UI components
  async initializeUI() {
    console.log('🎨 Initializing user interface...');
    
    // Set initial tab from URL hash or default to overview
    const initialTab = window.location.hash.substring(1) || 'overview';
    
    // Wait a moment for DOM to be ready
    await new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
    
    // Initialize the UI manager (already created globally)
    if (!uiManager) {
      throw new Error('UI manager not initialized');
    }
    
    // Switch to initial tab
    uiManager.switchTab(initialTab);
    
    // Update last update time
    uiManager.updateLastUpdateTime();
    
    console.log('✅ UI initialized successfully');
  }

  // Set up auto-refresh functionality
  setupAutoRefresh() {
    if (CONFIG.REFRESH_INTERVALS.NORMAL > 0) {
      setInterval(() => {
        if (!document.hidden && navigator.onLine) {
          this.backgroundRefresh();
        }
      }, CONFIG.REFRESH_INTERVALS.NORMAL);
    }
    
    // Refresh when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state.dataLoaded) {
        this.backgroundRefresh();
      }
    });
  }

  // Background refresh (less intrusive)
  async backgroundRefresh() {
    try {
      // Only refresh if data is stale
      const staleTime = 5 * 60 * 1000; // 5 minutes
      if (this.state.lastSync && (Date.now() - this.state.lastSync.getTime()) < staleTime) {
        return;
      }
      
      console.log('🔄 Background refresh...');
      
      // Refresh current tab data silently
      await uiManager.loadTabContent(uiManager.currentTab);
      
      this.state.lastSync = new Date();
      uiManager.updateLastUpdateTime();
      
    } catch (error) {
      console.warn('Background refresh failed:', error);
      // Don't show error to user for background refresh failures
    }
  }

  // Initialize PWA features
  initializePWA() {
    // Service worker registration is handled in the HTML
    
    // Add install prompt handling
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show custom install button (could be added to UI)
      this.showInstallPrompt(deferredPrompt);
    });
    
    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      console.log('📱 PWA installed successfully');
      Utils.notify('App installed! You can now use it offline.', 'success');
      deferredPrompt = null;
    });
  }

  // Show install prompt (placeholder for future enhancement)
  showInstallPrompt(prompt) {
    // Could add an install button to the UI
    console.log('💾 Install prompt available');
  }

  // Set up error handling
  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleGlobalError(event.error);
    });
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleGlobalError(event.reason);
    });
  }

  // Handle global errors
  handleGlobalError(error) {
    // Log error for debugging
    console.error('Application error:', error);
    
    // Show user-friendly message
    Utils.notify('Something went wrong. Please refresh the page.', 'error', 10000);
    
    // In a production app, you might send errors to a logging service
    // Example: Sentry.captureException(error);
  }

  // Check browser compatibility
  checkBrowserCompatibility() {
    const requiredFeatures = [
      'fetch',
      'localStorage',
      'Promise',
      'Object.assign'
    ];
    
    const unsupportedFeatures = requiredFeatures.filter(feature => {
      switch (feature) {
        case 'fetch':
          return !window.fetch;
        case 'localStorage':
          return !window.localStorage;
        case 'Promise':
          return !window.Promise;
        case 'Object.assign':
          return !Object.assign;
        default:
          return false;
      }
    });
    
    if (unsupportedFeatures.length > 0) {
      console.warn('Browser compatibility issues:', unsupportedFeatures);
      this.showCompatibilityWarning(unsupportedFeatures);
    }
  }

  // Show compatibility warning
  showCompatibilityWarning(unsupportedFeatures) {
    const message = `Your browser doesn't support some features: ${unsupportedFeatures.join(', ')}. Please update your browser for the best experience.`;
    Utils.notify(message, 'warning', 15000);
  }

  // Set up offline detection
  setupOfflineDetection() {
    window.addEventListener('online', () => {
      this.state.offlineMode = false;
      Utils.notify('Connection restored', 'success');
      console.log('🌐 Back online');
      
      // Refresh data when coming back online
      if (this.state.dataLoaded) {
        this.backgroundRefresh();
      }
    });
    
    window.addEventListener('offline', () => {
      this.state.offlineMode = true;
      Utils.notify('Working offline', 'warning');
      console.log('📴 Offline mode');
    });
  }

  // Show welcome message
  showWelcomeMessage() {
    const isFirstVisit = !Utils.getLocalStorage('hasVisited', false);
    
    if (isFirstVisit) {
      setTimeout(() => {
        Utils.notify('Welcome to your Personal Finance Tracker! 💰', 'success', 5000);
        Utils.setLocalStorage('hasVisited', true);
      }, 1000);
    }
  }

  // Handle initialization error - log only, don't destroy the page
  handleInitializationError(error) {
    Utils.hideLoading();
    console.error('Initialization error:', error);
  }

  // Export data
  async exportData(format = 'json') {
    try {
      const exportedData = dataManager.exportData(format);
      const filename = `finance-tracker-${new Date().toISOString().split('T')[0]}.${format}`;
      
      // Create and trigger download
      const blob = new Blob([exportedData], { 
        type: format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      Utils.notify(`Data exported as ${filename}`, 'success');
      
    } catch (error) {
      console.error('Export error:', error);
      Utils.notify('Failed to export data', 'error');
    }
  }

  // Sync with Google Sheets
  async syncWithGoogleSheets() {
    try {
      Utils.notify('Syncing with Google Sheets...', 'info');
      const result = await dataManager.syncWithGoogleSheets();
      
      if (result.success) {
        this.state.lastSync = new Date();
        uiManager.updateLastUpdateTime();
        
        // Refresh current tab
        await uiManager.loadTabContent(uiManager.currentTab);
        
        Utils.notify(result.message, 'success');
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Sync error:', error);
      Utils.notify('Sync failed. Please try again.', 'error');
    }
  }

  // Get application status
  getStatus() {
    return {
      version: this.version,
      buildDate: this.buildDate,
      initialized: this.isInitialized,
      dataLoaded: this.state.dataLoaded,
      lastSync: this.state.lastSync,
      offlineMode: this.state.offlineMode,
      currentTab: uiManager?.currentTab,
      browser: {
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled
      }
    };
  }

  // Debug information
  debug() {
    console.group('🔍 Finance Tracker Debug Info');
    console.log('Status:', this.getStatus());
    console.log('Config:', CONFIG);
    console.log('Data Cache Size:', dataManager.cache.size);
    console.log('Active Charts:', chartManager.charts.size);
    console.log('Local Storage Usage:', this.getLocalStorageUsage());
    console.groupEnd();
  }

  // Get local storage usage
  getLocalStorageUsage() {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return `${(total / 1024).toFixed(2)} KB`;
  }
}

// Global application instance
let financeApp;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  financeApp = new FinanceApp();
});

// Expose debug functions globally
window.financeDebug = {
  status: () => financeApp?.getStatus(),
  debug: () => financeApp?.debug(),
  export: (format) => financeApp?.exportData(format),
  sync: () => financeApp?.syncWithGoogleSheets(),
  clearCache: () => dataManager?.clearCache(),
  refresh: () => uiManager?.refreshData()
};

// Console welcome message
console.log(`
💰 Personal Finance Tracker
👥 Built for Bailey & Katie
🤖 Powered by BAI
📱 Mobile-first responsive design
`);

// Handle page unload
window.addEventListener('beforeunload', () => {
  console.log('👋 Finance Tracker closing...');
});

// Service Worker registration (if available)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(registration => {
      console.log('📋 Service Worker registered:', registration);
    })
    .catch(error => {
      console.log('Service Worker registration failed:', error);
    });
}