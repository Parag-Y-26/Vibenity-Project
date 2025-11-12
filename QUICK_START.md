# Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Launch the App

```bash
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🔐 Authentication

### Create an Account

1. Click **"Create New Account"** button
2. Fill in:
   - Full Name (min 2 characters)
   - Email (valid format)
   - Password (min 8 characters)
   - Confirm Password
3. Accept Terms of Service
4. Click **"Create Account"**

**Password Strength Tips:**
- Use 8+ characters
- Mix uppercase & lowercase
- Include numbers
- Add special characters (!, @, #, etc.)

### Login

#### Option 1: Demo Account
Click **"Try Demo Account"** for instant access

#### Option 2: Your Account
1. Enter email and password
2. Check "Remember me" (optional)
3. Click **"Sign In"**

---

## 📝 Using the Form System

### Create a New Entry

1. Navigate to **"Form Entry"** tab
2. Fill out the form:
   - **First Name**: John
   - **Last Name**: Doe  
   - **Email**: john@example.com
   - **Phone**: 5551234567
   - **Date of Birth**: 1990-05-15
   - **Address**: 123 Main Street
   - **City**: New York
   - **Zip Code**: 10001

3. Watch for:
   - ✅ **Green checkmarks** = Valid
   - ⚠️ **Yellow warnings** = Needs review
   - ❌ **Red errors** = Fix required

4. **Accept Suggestions**:
   - Type `john@gm` → Click suggestion for `john@gmail.com`
   - Type `5551234567` → Click to format as `(555) 123-4567`

5. Click **"Submit Entry"**

### What Happens Next?

**High Confidence (>85%):**
- ✅ Entry validated immediately
- Ready for sync
- Notification: "Entry validated and ready for sync"

**Medium Confidence (40-85%):**
- ⚠️ Entry moved to staging
- Requires review before sync
- Notification: "Entry saved to staging"

**Low Confidence (<40%):**
- ❌ Entry quarantined automatically
- Must be corrected before sync
- Notification: "Entry quarantined for review"

---

## 📊 Managing Entries (CRUD)

### View All Entries

1. Click **"Manage Entries"** tab
2. See list of all entries with:
   - Entry ID
   - Key data preview
   - Status (Staging/Validated/Quarantined)
   - Confidence score
   - Creation date

### Search & Filter

**Search:**
- Type in search box to find entries
- Searches across all fields

**Filter by Status:**
- All Status
- Staging
- Validated
- Quarantined

**Sort:**
- Click column headers to sort
- Click again to reverse

### View Entry Details

1. Click **👁️ Eye icon** on any entry
2. See complete data:
   - All form fields
   - Confidence breakdown
   - Behavior analysis
   - Anomaly details
   - Change history

### Edit an Entry

1. Click **✏️ Edit icon** on entry
2. Modify fields
3. Click **"Save"**
4. Entry is re-validated automatically
5. Confidence score recalculated

### Delete an Entry

1. Click **🗑️ Trash icon** on entry
2. Confirm deletion in popup
3. Entry removed permanently

### Export Data

1. Click **"Export"** button
2. Download as JSON file
3. Contains all entries with metadata

---

## 📤 File Upload

### Upload Files

1. Click **"Upload Files"** button in Manage Entries
2. Choose one:
   - **Drag & drop** files into the box
   - **Click** the box to browse

3. Supported files:
   - Images (JPG, PNG, GIF, SVG)
   - Documents (PDF, DOC, TXT)
   - Archives (ZIP, RAR)
   - Max size: 10MB per file

4. Watch upload progress bar
5. ✅ Green checkmark when complete

### View Uploaded Files

- Files shown in list with:
  - Preview (for images)
  - File name
  - File size
  - Upload date

### Delete Files

- Click ❌ on file to remove

---

## 🛡️ Quarantine Management

### View Quarantined Entries

1. Click **"Quarantine"** tab
2. See entries with issues:
   - Red alert badges
   - Confidence scores
   - List of problems

### Correct Quarantined Entry

1. Click **"Edit"** on quarantined entry
2. Review issues shown:
   - Format errors
   - Suspicious patterns
   - Behavior flags

3. Fix each problem:
   - Update incorrect fields
   - Use suggested corrections
   - Ensure all required fields filled

4. Click **"Save"**
5. Entry re-validated
6. If confidence >85%, moved to Validated!

### Common Issues & Fixes

**Email Issues:**
- ❌ `test@gmial.com` → ✅ `test@gmail.com`
- ❌ Missing @ → ✅ Add @domain.com

**Phone Issues:**
- ❌ `123` → ✅ `(555) 123-4567`
- ❌ Too short → ✅ Add missing digits

**Name Issues:**
- ❌ `test` → ✅ `Test User`
- ❌ `ALL CAPS` → ✅ `Proper Case`

---

## 📈 Diagnostics Dashboard

### View Metrics

1. Click **"Diagnostics"** tab
2. See real-time stats:
   - Total Entries
   - Validated count
   - Quarantined count
   - Correction rate

### Run Sync Simulator

1. Click **"Run Simulation"** button
2. Wait 2-3 seconds
3. View results:

**Baseline (No Validation):**
- Conflicts: ~35
- Corruptions: ~20
- Success Rate: ~45%

**Prototype (With Validation):**
- Conflicts: ~5 (-86%)
- Corruptions: ~1 (-95%)
- Success Rate: ~92% (+104%)

4. See bar chart comparison
5. Read key insights

---

## 📜 Audit Trail

### View Activity Log

1. Click **"Audit Trail"** tab
2. See chronological list of:
   - Entry creations
   - Edits/updates
   - Deletions
   - Validations

### Search Logs

- Type to search: entry ID, action, date
- Filter by action type
- View detailed changes

### View Entry History

1. Click **"View History"** on any log entry
2. See complete timeline:
   - All changes made
   - Who made them
   - When they occurred
   - What was changed

### Undo Changes

1. Find the change in audit trail
2. Click **"Undo"** icon
3. Confirm undo action
4. Change reverted

---

## 👤 User Profile

### View Profile

1. Click your **avatar/name** in top right
2. See profile information:
   - Name
   - Email
   - Role
   - Join date

### Update Profile

1. Go to **Profile** tab
2. Update fields:
   - Full Name
   - (Email cannot be changed)
3. Click **"Save Changes"**

### Upload Avatar

1. Click **camera icon** on avatar
2. Select image (max 2MB)
3. Supported: JPG, PNG, GIF
4. Avatar updated instantly

### Change Password

1. Go to **"Security"** tab in Profile
2. Enter:
   - Current password
   - New password (min 8 chars)
   - Confirm new password
3. Click **"Change Password"**

### Delete Account

⚠️ **Warning: This is permanent!**

1. Go to **"Danger Zone"** tab in Profile
2. Click **"Delete Account Permanently"**
3. Enter your password
4. Confirm deletion
5. Account and all data removed

---

## 🎨 Customize Experience

### Switch Theme

- Click **🌙 Moon** icon (top right) for dark mode
- Click **☀️ Sun** icon for light mode
- Theme preference saved

### Adjust Validation Rules

(Admin feature - see Configuration in README)

---

## 💡 Pro Tips

### Maximize Confidence Scores

1. **Type naturally** - Don't rush
2. **Use suggestions** - They're helpful
3. **Fill all fields** - Completeness matters
4. **Double-check emails** - Common mistake source
5. **Format phone numbers** - Accept suggestions

### Avoid Quarantine

❌ **Don't:**
- Paste everything rapidly
- Use test data (test@test.com)
- Enter repetitive characters (aaaa)
- Skip required fields
- Use all caps

✅ **Do:**
- Type at normal speed
- Use real-seeming data
- Vary your input
- Fill required fields
- Use proper capitalization

### Efficient Workflow

1. **Batch similar work** - Multiple entries at once
2. **Use search** - Find entries quickly
3. **Export regularly** - Backup your data
4. **Review quarantine** - Fix issues daily
5. **Check diagnostics** - Monitor performance

---

## 🆘 Troubleshooting

### "Entry quarantined unexpectedly"

**Cause:** Low confidence score  
**Fix:** Review issues list, make corrections

### "File upload failed"

**Cause:** File too large or wrong type  
**Fix:** Check file size (<10MB) and type

### "Cannot login"

**Cause:** Wrong credentials or expired session  
**Fix:** Re-enter password or create new account

### "Changes not saving"

**Cause:** Browser storage full  
**Fix:** Export data, clear browser cache

### "App running slow"

**Cause:** Too many entries  
**Fix:** Export and archive old entries

---

## 🎯 Keyboard Shortcuts

- **Tab** - Navigate between fields
- **Enter** - Submit form
- **Esc** - Close modals
- **Ctrl/Cmd + K** - Focus search (when available)

---

## 📱 Mobile Usage

### Optimized for Touch

- Large tap targets
- Swipe gestures
- Mobile keyboards
- Responsive layouts

### Best Practices

- Hold device vertically for forms
- Rotate for better table view
- Use zoom for details
- Pull to refresh (where available)

---

## 🚀 Advanced Features

### Bulk Operations

(Coming soon - import CSV, bulk edit)

### Custom Validation Rules

See `README.md` Configuration section

### API Integration

See `API_DOCUMENTATION.md` for backend setup

### Webhooks

See API docs for real-time notifications

---

## 📚 Additional Resources

- **README.md** - Complete documentation
- **API_DOCUMENTATION.md** - All API endpoints
- **FEATURES.md** - Detailed feature list
- **DEPLOYMENT_GUIDE.md** - Deploy to production
- **TEST_CASES.md** - Example test scenarios
- **DEMO_SCRIPT.md** - Presentation guide

---

## ✅ Checklist: Have You Tried?

- [ ] Created an account
- [ ] Logged in with demo account
- [ ] Submitted a form entry
- [ ] Accepted a suggestion
- [ ] Viewed entry list
- [ ] Searched for an entry
- [ ] Edited an entry
- [ ] Deleted an entry
- [ ] Uploaded a file
- [ ] Corrected quarantined entry
- [ ] Ran sync simulator
- [ ] Viewed audit trail
- [ ] Updated profile
- [ ] Changed password
- [ ] Switched theme
- [ ] Tested on mobile
- [ ] Exported data

---

**🎉 Congratulations!** You now know how to use all features of the Offline-First Form Validator!

---

**Need Help?**
- Check README.md for detailed docs
- Review error messages carefully
- Try the demo account to explore
- All data is stored locally and safe

**Enjoy validating! 🚀**
