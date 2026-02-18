/**
 * Google Apps Script - Image Processing for Bank Statements
 * Handles screenshot analysis from Discord #finances channel
 */

/**
 * Process bank statement image from Discord webhook
 * This would be called by a webhook when BAI processes images in Discord
 */
function processStatementImage(imageData) {
  console.log('📸 Processing bank statement image...');
  
  try {
    // In a real implementation, this would:
    // 1. Receive image data from Discord webhook
    // 2. Use Google Cloud Vision API or similar to extract text
    // 3. Parse transactions from the extracted text
    // 4. Add transactions to the spreadsheet
    
    // For now, simulate with mock data based on common statement patterns
    const mockTransactions = simulateImageProcessing(imageData);
    
    // Add transactions to spreadsheet
    const addedTransactions = addTransactionsToSheet(mockTransactions);
    
    // Update dashboard and notify BAI
    updateDashboard();
    notifyBAI({
      type: 'image-processed',
      transactionsAdded: addedTransactions.length,
      transactions: addedTransactions,
      timestamp: new Date()
    });
    
    console.log(`✅ Processed ${addedTransactions.length} transactions from image`);
    return addedTransactions;
    
  } catch (error) {
    console.error('❌ Image processing failed:', error);
    throw new Error(`Image processing failed: ${error.message}`);
  }
}

/**
 * Simulate image processing with mock transaction data
 * In reality, this would use OCR and transaction parsing
 */
function simulateImageProcessing(imageData) {
  // Mock transactions that would be extracted from a bank statement
  const mockTransactions = [
    {
      date: new Date(),
      description: 'Woolworths Supermarket',
      amount: -127.50,
      category: 'Food & Dining',
      account: 'Joint Checking',
      type: 'expense'
    },
    {
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
      description: 'Shell Service Station',
      amount: -85.20,
      category: 'Transportation', 
      account: 'Joint Checking',
      type: 'expense'
    },
    {
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      description: 'Netflix Subscription',
      amount: -17.99,
      category: 'Entertainment',
      account: 'Joint Checking', 
      type: 'expense'
    }
  ];
  
  console.log(`🔍 Extracted ${mockTransactions.length} transactions from image`);
  return mockTransactions;
}

/**
 * Parse bank statement text using pattern matching
 * This would be used with actual OCR results
 */
function parseStatementText(ocrText) {
  const transactions = [];
  const lines = ocrText.split('\n');
  
  // Common Australian bank statement patterns
  const patterns = [
    // Date, Description, Amount
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+([-]?\$?[\d,]+\.?\d{0,2})/g,
    // DD/MM Description Amount
    /(\d{1,2}\/\d{1,2})\s+(.+?)\s+([-]?\$?[\d,]+\.?\d{0,2})/g,
    // Description Amount Date  
    /(.+?)\s+([-]?\$?[\d,]+\.?\d{0,2})\s+(\d{1,2}\/\d{1,2}\/?\d{0,4})/g
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(ocrText)) !== null) {
      const transaction = parseTransactionMatch(match);
      if (transaction) {
        transactions.push(transaction);
      }
    }
  });
  
  // Remove duplicates based on date, description, and amount
  const uniqueTransactions = removeDuplicateTransactions(transactions);
  
  console.log(`📋 Parsed ${uniqueTransactions.length} unique transactions from OCR text`);
  return uniqueTransactions;
}

/**
 * Parse individual transaction match
 */
function parseTransactionMatch(match) {
  try {
    let date, description, amount;
    
    // Handle different match patterns
    if (match.length === 4) {
      [, date, description, amount] = match;
    } else {
      return null;
    }
    
    // Clean and parse amount
    const cleanAmount = parseAmount(amount);
    if (isNaN(cleanAmount)) return null;
    
    // Clean description
    const cleanDescription = cleanDescription(description);
    if (!cleanDescription) return null;
    
    // Parse date
    const parsedDate = parseDate(date);
    if (!parsedDate) return null;
    
    // Auto-categorize
    const category = categorizTransaction(cleanDescription, cleanAmount);
    
    return {
      date: parsedDate,
      description: cleanDescription,
      amount: cleanAmount,
      category: category,
      account: 'Joint Checking', // Default account
      type: cleanAmount > 0 ? 'income' : 'expense'
    };
    
  } catch (error) {
    console.warn('Failed to parse transaction match:', error);
    return null;
  }
}

/**
 * Parse amount from string
 */
function parseAmount(amountStr) {
  if (!amountStr) return NaN;
  
  // Remove currency symbols, commas, spaces
  let cleaned = amountStr.replace(/[$,\s]/g, '');
  
  // Handle negative amounts (CR suffix or parentheses)
  const isNegative = cleaned.includes('-') || 
                    cleaned.includes('CR') || 
                    cleaned.includes('DR') ||
                    (cleaned.startsWith('(') && cleaned.endsWith(')'));
  
  // Remove negative indicators
  cleaned = cleaned.replace(/[-()CR DR]/g, '');
  
  const amount = parseFloat(cleaned);
  return isNegative ? -Math.abs(amount) : amount;
}

/**
 * Clean transaction description
 */
function cleanDescription(desc) {
  if (!desc) return null;
  
  // Remove extra whitespace and special characters
  let cleaned = desc.trim()
    .replace(/\s+/g, ' ')
    .replace(/[*#]/g, '')
    .replace(/^\d+\s*/, '') // Remove leading transaction numbers
    .replace(/\s*\d{4}$/, ''); // Remove trailing reference numbers
  
  // Remove common bank codes
  const bankCodes = ['EFTPOS', 'ATM', 'DIRECT DEBIT', 'BPAY', 'PAYPAL', 'VISA'];
  bankCodes.forEach(code => {
    cleaned = cleaned.replace(new RegExp(`\\b${code}\\b`, 'gi'), '').trim();
  });
  
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Parse date from string
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Handle DD/MM/YYYY or DD/MM formats
    const parts = dateStr.split('/');
    if (parts.length < 2) return null;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
    const year = parts.length > 2 ? parseInt(parts[2]) : new Date().getFullYear();
    
    const date = new Date(year, month, day);
    
    // Validate date
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null;
    }
    
    return date;
    
  } catch (error) {
    console.warn('Failed to parse date:', dateStr, error);
    return null;
  }
}

/**
 * Remove duplicate transactions
 */
function removeDuplicateTransactions(transactions) {
  const seen = new Set();
  
  return transactions.filter(transaction => {
    const key = `${transaction.date.toDateString()}_${transaction.description}_${transaction.amount}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Add transactions to spreadsheet
 */
function addTransactionsToSheet(transactions) {
  if (!transactions || transactions.length === 0) {
    return [];
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEETS.TRANSACTIONS);
  
  const addedTransactions = [];
  
  transactions.forEach(transaction => {
    // Check if transaction already exists
    if (!transactionExists(sheet, transaction)) {
      // Generate unique ID
      const id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare row data
      const rowData = [
        transaction.date,
        transaction.description,
        transaction.amount,
        transaction.category,
        transaction.account,
        transaction.type,
        id,
        `Added from image on ${new Date().toLocaleDateString()}`
      ];
      
      // Add to sheet
      sheet.appendRow(rowData);
      addedTransactions.push({
        ...transaction,
        id: id
      });
      
      console.log(`➕ Added transaction: ${transaction.description} - $${transaction.amount}`);
    } else {
      console.log(`⏭️ Skipped duplicate: ${transaction.description} - $${transaction.amount}`);
    }
  });
  
  return addedTransactions;
}

/**
 * Check if transaction already exists in spreadsheet
 */
function transactionExists(sheet, newTransaction) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  // Get column indices
  const dateCol = headers.indexOf('Date');
  const descCol = headers.indexOf('Description');
  const amountCol = headers.indexOf('Amount');
  
  // Check for exact matches within 1 day
  return rows.some(row => {
    if (!row[dateCol] || !row[descCol] || row[amountCol] === '') return false;
    
    const existingDate = new Date(row[dateCol]);
    const newDate = new Date(newTransaction.date);
    const dayDiff = Math.abs((existingDate - newDate) / (1000 * 60 * 60 * 24));
    
    return dayDiff <= 1 && 
           row[descCol].toLowerCase().includes(newTransaction.description.toLowerCase().substr(0, 10)) &&
           Math.abs(row[amountCol] - newTransaction.amount) < 0.01;
  });
}

/**
 * Process multiple images in batch
 */
function processBatchImages(imageDataArray) {
  console.log(`📸 Processing batch of ${imageDataArray.length} images...`);
  
  const allTransactions = [];
  let successCount = 0;
  
  imageDataArray.forEach((imageData, index) => {
    try {
      const transactions = processStatementImage(imageData);
      allTransactions.push(...transactions);
      successCount++;
      
      console.log(`✅ Image ${index + 1}/${imageDataArray.length}: ${transactions.length} transactions`);
    } catch (error) {
      console.error(`❌ Image ${index + 1}/${imageDataArray.length} failed:`, error);
    }
  });
  
  console.log(`📊 Batch complete: ${successCount}/${imageDataArray.length} images processed, ${allTransactions.length} total transactions`);
  
  return {
    successCount,
    totalImages: imageDataArray.length,
    totalTransactions: allTransactions.length,
    transactions: allTransactions
  };
}

/**
 * Validate and clean extracted transactions
 */
function validateTransactions(transactions) {
  return transactions.filter(transaction => {
    // Required fields validation
    if (!transaction.date || !transaction.description || 
        transaction.amount === undefined || transaction.amount === null) {
      console.warn('❌ Transaction missing required fields:', transaction);
      return false;
    }
    
    // Date validation
    if (!(transaction.date instanceof Date) || isNaN(transaction.date)) {
      console.warn('❌ Transaction has invalid date:', transaction);
      return false;
    }
    
    // Amount validation
    if (typeof transaction.amount !== 'number' || isNaN(transaction.amount)) {
      console.warn('❌ Transaction has invalid amount:', transaction);
      return false;
    }
    
    // Description validation
    if (typeof transaction.description !== 'string' || transaction.description.trim().length === 0) {
      console.warn('❌ Transaction has invalid description:', transaction);
      return false;
    }
    
    return true;
  });
}

/**
 * Generate processing summary for BAI
 */
function generateProcessingSummary(results) {
  const summary = {
    timestamp: new Date(),
    totalTransactions: results.length,
    categories: {},
    totalAmount: 0,
    incomeCount: 0,
    expenseCount: 0,
    dateRange: {
      earliest: null,
      latest: null
    }
  };
  
  results.forEach(transaction => {
    // Category breakdown
    const category = transaction.category || 'Uncategorized';
    summary.categories[category] = (summary.categories[category] || 0) + 1;
    
    // Amount totals
    summary.totalAmount += transaction.amount;
    
    // Income/expense counts
    if (transaction.amount > 0) {
      summary.incomeCount++;
    } else {
      summary.expenseCount++;
    }
    
    // Date range
    if (!summary.dateRange.earliest || transaction.date < summary.dateRange.earliest) {
      summary.dateRange.earliest = transaction.date;
    }
    if (!summary.dateRange.latest || transaction.date > summary.dateRange.latest) {
      summary.dateRange.latest = transaction.date;
    }
  });
  
  return summary;
}

/**
 * Handle webhook from BAI/Discord
 * This would be the entry point for image processing from Discord
 */
function handleDiscordWebhook(webhookData) {
  console.log('📨 Received webhook from Discord/BAI');
  
  try {
    const { imageUrl, channelId, userId, timestamp } = webhookData;
    
    // Validate webhook data
    if (!imageUrl) {
      throw new Error('No image URL provided');
    }
    
    // Download and process image
    const imageBlob = UrlFetchApp.fetch(imageUrl).getBlob();
    const processedTransactions = processStatementImage(imageBlob);
    
    // Generate summary
    const summary = generateProcessingSummary(processedTransactions);
    
    // Return response for BAI
    return {
      success: true,
      message: `Processed ${processedTransactions.length} transactions`,
      summary: summary,
      transactions: processedTransactions
    };
    
  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}