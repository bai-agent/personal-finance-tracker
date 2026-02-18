# Personal Finance Tracker - Complete Setup Guide

## 🎯 **What You're Getting**

A complete personal finance tracking system for Bailey & Katie with:
- **Mobile-responsive dashboard** (works perfectly on phones)
- **Google Sheets automation** with Apps Script
- **Discord #finances channel** integration with BAI
- **Screenshot analysis** of bank statements
- **Automatic categorization** and insights
- **Goal tracking** and financial projections
- **PWA capability** (install to home screen)

---

## 📋 **Prerequisites**

- Google Account (for Google Sheets)
- GitHub account (for hosting)
- Discord server admin access (for #finances channel)
- OpenClaw BAI system running

---

## 🚀 **Step 1: Google Sheets Setup**

### Create the Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Click "Create" → "Blank spreadsheet"
3. Rename to "Bailey & Katie Finance Tracker"
4. Note the Spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

### Add Google Apps Script
1. In your spreadsheet, click **Extensions** → **Apps Script**
2. Delete the default `Code.gs` content
3. Copy the contents of `gas-scripts/Code.gs` and paste it in
4. Create a new file: **File** → **New** → **Script file**
5. Name it `ImageProcessor` and paste `gas-scripts/ImageProcessor.gs`
6. Click **Save** (💾 icon)

### Initialize the System
1. In Apps Script, select `initializeSpreadsheet` from the function dropdown
2. Click **Run** (▶️ button)
3. Grant permissions when prompted
4. Check your spreadsheet - it should now have 6 tabs with sample data

### Set Up Triggers (Automatic)
The `initializeSpreadsheet` function sets up automatic triggers. Your system will now:
- Process edits automatically
- Run daily analysis at 9 AM
- Update dashboard when data changes

---

## 🌐 **Step 2: GitHub Pages Deployment**

### Create Repository
1. Go to [GitHub.com](https://github.com)
2. Click **New Repository**
3. Name: `personal-finance-tracker`
4. Set to **Public** (required for GitHub Pages)
5. Click **Create repository**

### Upload Files
**Option A: Web Interface**
1. Click **uploading an existing file**
2. Drag and drop all files from your `personal-finance-tracker` folder
3. Commit with message: "Initial finance tracker setup"

**Option B: Git Commands**
```bash
git clone https://github.com/YOUR_USERNAME/personal-finance-tracker.git
cd personal-finance-tracker
# Copy all files to this directory
git add .
git commit -m "Initial finance tracker setup"  
git push origin main
```

### Enable GitHub Pages
1. In your repository, click **Settings**
2. Scroll to **Pages** section
3. Source: **Deploy from a branch**
4. Branch: **main** / **root**
5. Click **Save**
6. Note the URL: `https://YOUR_USERNAME.github.io/personal-finance-tracker/`

---

## 💬 **Step 3: Discord Channel Setup**

### Create #finances Channel
1. In your Discord server, right-click channel category
2. Select **Create Channel**
3. Name: `finances`
4. Type: **Text Channel**
5. Set permissions so Bailey & Katie can post
6. Pin a message explaining the channel purpose

### Channel Setup Message
```
💰 **Personal Finance Tracker**

📸 **Upload bank statement screenshots here**
🤖 **BAI will automatically analyze and update our tracking**
📊 **View dashboard:** https://YOUR_USERNAME.github.io/personal-finance-tracker/

**Supported formats:**
• Screenshots of transaction lists
• Bank statement PDFs (as images)
• Account balance screenshots

BAI will extract transactions and update our Google Sheet automatically! 💡
```

---

## 🔧 **Step 4: Configuration Updates**

### Update Google Sheets ID in Dashboard
1. Open `js/config.js` in your code
2. Update `SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE'`
3. Commit and push the change

### Update Apps Script Configuration
1. In your Google Apps Script, open `Code.gs`
2. Update the `CONFIG.EMAIL` section:
   ```javascript
   EMAIL: {
     BAILEY: 'bailey@example.com',
     KATIE: 'katie@example.com'
   }
   ```

### Enable Google Sheets API (for dashboard)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Sheets API**
4. Create credentials (API Key)
5. Update `API_KEY` in your dashboard config

---

## 🧠 **Step 5: BAI Memory Integration**

### Verify Memory Structure
The following directory should exist (created automatically):
```
/Users/bai/.openclaw/workspace/bai-brain/memory/personal/projects/finances/
├── accounts/
├── transactions/
├── analysis/
├── projections/
├── goals/
├── sync-data/
└── logs/
```

### Test BAI Integration
1. Post a test message in #finances: "Test bank statement processing"
2. BAI should respond acknowledging the test
3. Check that BAI memory files are being updated

---

## 📱 **Step 6: Mobile Setup (PWA)**

### Install to Home Screen
**iPhone/iPad:**
1. Open the dashboard URL in Safari
2. Tap Share button (box with arrow)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"

**Android:**
1. Open the dashboard URL in Chrome
2. Tap the menu (3 dots)
3. Tap "Add to Home screen"
4. Tap "Add"

### Verify Mobile Experience
- Test all tabs work smoothly on mobile
- Check charts display properly
- Ensure touch navigation works
- Test landscape/portrait orientation

---

## ✅ **Step 7: Testing & Validation**

### Test Data Flow
1. **Manual Transaction Entry**
   - Add a transaction in Google Sheets
   - Verify dashboard updates
   - Check BAI receives notification

2. **Image Processing Simulation**
   - Upload an image to #finances
   - BAI should acknowledge processing
   - Check if mock transactions appear in sheets

3. **Dashboard Functionality**
   - Test all tabs (Overview, Accounts, Bills, Goals, Insights)
   - Verify charts load
   - Check mobile responsiveness

### Verify Automation
- **Daily Processing:** Check Apps Script execution log
- **Real-time Updates:** Edit spreadsheet, watch dashboard
- **BAI Integration:** Confirm memory files update

---

## 🔒 **Security & Privacy**

### Data Protection
- All data stays in your Google account
- Dashboard hosted on your GitHub (public code, private data)
- BAI processes only cropped bank statements
- No sensitive account details stored

### Access Control
- Only Bailey & Katie have access to #finances channel
- Google Sheets shared only with necessary accounts
- GitHub repository contains no personal financial data

---

## 🛠️ **Troubleshooting**

### Common Issues

**Dashboard Not Loading:**
- Check GitHub Pages is enabled
- Verify all files uploaded correctly
- Check browser console for errors

**Google Sheets Not Updating:**
- Verify Apps Script permissions granted
- Check trigger setup in Apps Script
- Review execution logs for errors

**BAI Not Responding:**
- Ensure OpenClaw is running
- Check #finances channel permissions
- Verify BAI has admin access to server

**Mobile Issues:**
- Clear browser cache
- Try different mobile browser
- Check PWA installation steps

### Getting Help
1. Check browser console errors (F12)
2. Review Google Apps Script execution logs
3. Test individual components separately
4. Ask BAI to check system status

---

## 🎉 **You're Done!**

Your Personal Finance Tracker is now live at:
**https://YOUR_USERNAME.github.io/personal-finance-tracker/**

### Next Steps:
1. **Upload real bank statements** to #finances
2. **Customize categories** in Google Sheets
3. **Set your financial goals** in the Goals tab
4. **Install PWA** to phone home screen
5. **Start tracking** your financial journey!

### Key Features:
- 📱 **Mobile-first design**
- 🤖 **AI-powered analysis via BAI**
- 📊 **Real-time dashboard updates**
- 🎯 **Goal tracking and projections**
- 💡 **Intelligent financial insights**

---

## 📞 **Support**

**Technical Issues:** Check troubleshooting section above
**Feature Requests:** Update the code and redeploy
**BAI Questions:** Ask BAI directly in Discord

**System Status:** Visit your dashboard and check last update times

Enjoy your new AI-powered personal finance tracking system! 💰✨