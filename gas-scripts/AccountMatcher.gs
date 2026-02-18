/**
 * Account Matcher for Bailey & Katie's Banking Setup
 * Recognizes banks, accounts, and categorizes transactions
 */

// Bailey & Katie's Account Configuration
const ACCOUNT_CONFIG = {
  // Commonwealth Bank Accounts
  COMMONWEALTH: {
    patterns: ['commonwealth', 'cba', 'commbank', 'netbank'],
    accounts: {
      'bw_personal_cba': {
        name: 'BW Personal (Commonwealth)',
        type: 'checking',
        purpose: 'wages',
        user: 'Bailey',
        keywords: ['salary', 'wage', 'pay', 'income', 'bw', 'bailey']
      },
      'katie_personal_cba': {
        name: 'Katie Personal (Commonwealth)', 
        type: 'checking',
        purpose: 'wages',
        user: 'Katie',
        keywords: ['salary', 'wage', 'pay', 'income', 'katie']
      },
      'joint_cba': {
        name: 'Joint (Commonwealth)',
        type: 'checking', 
        purpose: 'bills',
        user: 'Joint',
        keywords: ['rent', 'utilities', 'bills', 'insurance', 'subscription', 'direct debit']
      },
      'joint_saver_cba': {
        name: 'Joint Saver (Commonwealth)',
        type: 'savings',
        purpose: 'savings', 
        user: 'Joint',
        keywords: ['transfer', 'savings', 'emergency', 'goal', 'deposit']
      }
    }
  },
  
  // Starling Bank Accounts  
  STARLING: {
    patterns: ['starling', 'starling bank'],
    accounts: {
      'bw_personal_starling': {
        name: 'BW Personal (Starling)',
        type: 'checking',
        purpose: 'spending',
        user: 'Bailey', 
        keywords: ['shopping', 'personal', 'entertainment', 'transport', 'bw', 'bailey']
      },
      'katie_personal_starling': {
        name: 'Katie Personal (Starling)',
        type: 'checking',
        purpose: 'spending', 
        user: 'Katie',
        keywords: ['shopping', 'personal', 'entertainment', 'transport', 'katie']
      },
      'joint_starling': {
        name: 'Joint (Starling)',
        type: 'checking',
        purpose: 'food_spending',
        user: 'Joint',
        keywords: ['grocery', 'food', 'restaurant', 'cafe', 'takeaway', 'dining', 'supermarket']
      }
    }
  },
  
  // Capital One Credit Card
  CAPITAL_ONE: {
    patterns: ['capital one', 'capitalone', 'capital1'],
    accounts: {
      'credit_capital_one': {
        name: 'Credit Card (Capital One)',
        type: 'credit',
        purpose: 'credit',
        user: 'Joint', // Assuming joint, can be updated
        keywords: ['purchase', 'payment', 'balance', 'credit', 'card']
      }
    }
  }
};

/**
 * Identify bank from screenshot text or account identifiers
 */
function identifyBank(text, accountInfo) {
  const lowerText = text.toLowerCase();
  
  // Check for Commonwealth Bank patterns
  if (ACCOUNT_CONFIG.COMMONWEALTH.patterns.some(pattern => lowerText.includes(pattern))) {
    return 'COMMONWEALTH';
  }
  
  // Check for Starling Bank patterns  
  if (ACCOUNT_CONFIG.STARLING.patterns.some(pattern => lowerText.includes(pattern))) {
    return 'STARLING';
  }
  
  // Check for Capital One patterns
  if (ACCOUNT_CONFIG.CAPITAL_ONE.patterns.some(pattern => lowerText.includes(pattern))) {
    return 'CAPITAL_ONE';
  }
  
  return 'UNKNOWN';
}

/**
 * Match specific account within a bank
 */
function matchAccount(bankId, text, transactionData) {
  if (!ACCOUNT_CONFIG[bankId]) return null;
  
  const bankConfig = ACCOUNT_CONFIG[bankId];
  const lowerText = text.toLowerCase();
  
  // Score each account based on keyword matches
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [accountId, accountConfig] of Object.entries(bankConfig.accounts)) {
    let score = 0;
    
    // Check for direct account name matches
    if (lowerText.includes(accountConfig.name.toLowerCase())) {
      score += 10;
    }
    
    // Check for purpose/keyword matches
    accountConfig.keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 2;
      }
    });
    
    // Additional scoring based on transaction patterns
    if (transactionData) {
      score += scoreTransactionPatterns(accountConfig, transactionData);
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = accountConfig;
    }
  }
  
  return bestMatch;
}

/**
 * Score transaction patterns against account purpose
 */
function scoreTransactionPatterns(accountConfig, transactions) {
  let score = 0;
  
  transactions.forEach(transaction => {
    const desc = transaction.description?.toLowerCase() || '';
    const amount = transaction.amount || 0;
    
    switch (accountConfig.purpose) {
      case 'wages':
        // Large positive amounts likely salary
        if (amount > 1000 && desc.includes('pay')) score += 3;
        break;
        
      case 'bills':
        // Regular negative amounts to utilities/services
        if (amount < 0 && (desc.includes('rent') || desc.includes('utilities'))) score += 3;
        break;
        
      case 'spending':
        // Mix of small to medium purchases
        if (amount < 0 && Math.abs(amount) < 500) score += 1;
        break;
        
      case 'food_spending':
        // Food-related transactions
        if (amount < 0 && (desc.includes('supermarket') || desc.includes('restaurant'))) score += 3;
        break;
        
      case 'savings':
        // Transfers in or interest
        if (amount > 0 && desc.includes('transfer')) score += 2;
        break;
        
      case 'credit':
        // Credit card specific patterns
        if (desc.includes('payment') || desc.includes('purchase')) score += 2;
        break;
    }
  });
  
  return score;
}

/**
 * Enhanced transaction categorization based on account context
 */
function categorizeTransactionWithAccount(transaction, accountConfig) {
  const baseCategory = categorizTransaction(transaction.description, transaction.amount);
  
  // Refine category based on account purpose
  if (accountConfig) {
    switch (accountConfig.purpose) {
      case 'wages':
        if (transaction.amount > 0) return 'Income';
        break;
        
      case 'bills': 
        if (transaction.amount < 0) {
          // More specific bill categorization
          const desc = transaction.description.toLowerCase();
          if (desc.includes('rent')) return 'Housing';
          if (desc.includes('electric') || desc.includes('gas') || desc.includes('water')) return 'Utilities';
          if (desc.includes('insurance')) return 'Insurance';
          if (desc.includes('phone') || desc.includes('internet')) return 'Utilities';
          return 'Bills';
        }
        break;
        
      case 'food_spending':
        if (transaction.amount < 0) return 'Food & Dining';
        break;
        
      case 'spending':
        // Keep base categorization for personal spending
        return baseCategory;
        
      case 'savings':
        if (transaction.amount > 0) return 'Savings & Investments';
        break;
        
      case 'credit':
        // Credit card transactions keep their natural categories
        return baseCategory;
    }
  }
  
  return baseCategory;
}

/**
 * Generate account-specific insights
 */
function generateAccountInsights(accountConfig, transactions) {
  if (!accountConfig || !transactions.length) return [];
  
  const insights = [];
  const totalSpent = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalReceived = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
    
  switch (accountConfig.purpose) {
    case 'wages':
      if (totalReceived > 0) {
        insights.push({
          type: 'income',
          title: `${accountConfig.user} Income Received`,
          description: `${totalReceived.toFixed(2)} deposited to ${accountConfig.name}`
        });
      }
      break;
      
    case 'bills':
      if (totalSpent > 0) {
        insights.push({
          type: 'bills', 
          title: 'Bill Payments Processed',
          description: `${totalSpent.toFixed(2)} paid in bills from joint account`
        });
      }
      break;
      
    case 'food_spending':
      if (totalSpent > 0) {
        insights.push({
          type: 'spending',
          title: 'Food & Dining Expenses',
          description: `${totalSpent.toFixed(2)} spent on food and dining together`
        });
      }
      break;
      
    case 'spending':
      if (totalSpent > 0) {
        insights.push({
          type: 'spending',
          title: `${accountConfig.user} Personal Spending`,
          description: `${totalSpent.toFixed(2)} in personal expenses`
        });
      }
      break;
  }
  
  return insights;
}

/**
 * Main processing function for screenshot analysis
 */
function processStatementWithAccountMatching(ocrText, transactions) {
  // Identify the bank
  const bankId = identifyBank(ocrText);
  console.log(`Identified bank: ${bankId}`);
  
  // Match specific account
  const accountConfig = matchAccount(bankId, ocrText, transactions);
  console.log(`Matched account: ${accountConfig?.name || 'Unknown'}`);
  
  // Process transactions with account context
  const processedTransactions = transactions.map(transaction => ({
    ...transaction,
    account: accountConfig?.name || 'Unknown Account',
    bank: bankId,
    category: categorizeTransactionWithAccount(transaction, accountConfig)
  }));
  
  // Generate account-specific insights
  const insights = generateAccountInsights(accountConfig, processedTransactions);
  
  return {
    bank: bankId,
    account: accountConfig,
    transactions: processedTransactions,
    insights: insights,
    summary: {
      totalTransactions: transactions.length,
      accountType: accountConfig?.type || 'unknown',
      accountPurpose: accountConfig?.purpose || 'unknown',
      user: accountConfig?.user || 'unknown'
    }
  };
}

/**
 * Validate account matching results
 */
function validateAccountMatch(result) {
  const validation = {
    confidence: 'low',
    issues: [],
    suggestions: []
  };
  
  if (result.bank === 'UNKNOWN') {
    validation.issues.push('Could not identify bank from screenshot');
    validation.suggestions.push('Ensure bank logo or name is visible');
  } else {
    validation.confidence = 'medium';
  }
  
  if (result.account) {
    validation.confidence = 'high';
  } else {
    validation.issues.push('Could not match specific account');
    validation.suggestions.push('Include account name or more transaction context');
  }
  
  return validation;
}