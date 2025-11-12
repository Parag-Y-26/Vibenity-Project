# Quick Test Guide - 3 New Features

## 🎯 Test All 3 Features in 3 Minutes

---

### ✅ Test 1: Auto-Quarantine (< 50% Confidence)

**Goal:** Verify entries with confidence < 50% go straight to quarantine.

**Steps:**
```
1. Go to Form Entry tab
2. Fill form with POOR quality data:
   
   First Name: A            (too short)
   Last Name: B             (too short)
   Email: test              (invalid)
   Phone: 123               (too short)
   
3. Click "Submit Entry"
4. Watch the submission result
```

**Expected Result:**
- ✅ Form submits
- ✅ Confidence score shown < 50%
- ✅ Entry goes directly to Quarantine Inbox
- ✅ Message says "quarantined" status

**Verify:**
```
5. Go to Quarantine Inbox tab
6. ✅ Your entry is there
7. ✅ Shows low confidence score (< 50%)
```

---

### ✅ Test 2: Corrections Counter Increment

**Goal:** Verify corrections counter increases when editing entries.

**Steps:**
```
1. Go to Audit Trail tab
2. Look at "Corrections Made" card
3. Note the current number (e.g., 0)

4. Go to Manage Entries tab
5. Click Edit (✏️) icon on any entry
6. Change a field:
   - Example: City from "Mumbai" to "Delhi"
7. Click "Save Changes"
8. ✅ Alert: "Entry updated successfully! Correction logged..."

9. Go back to Audit Trail tab
10. Check "Corrections Made" card
```

**Expected Result:**
- ✅ Counter increased by 1
- ✅ New blue "CORRECTED" log appears at top
- ✅ Log shows what changed: "Mumbai → Delhi"

**Edit More:**
```
11. Edit another entry
12. Change 2 fields this time
13. Save
14. Go to Audit Trail
15. ✅ Counter increased by 1 again
16. ✅ New correction log shows both changes
```

**Filter Test:**
```
17. In Audit Trail, click "All Actions" dropdown
18. Select "Corrected"
19. ✅ Only correction logs show (blue color)
20. ✅ Count matches the counter
```

---

### ✅ Test 3: Audit Trail Modal Visibility

**Goal:** Verify entry history popup is clearly visible.

**Steps:**
```
1. Go to Audit Trail tab
2. Find any log entry
3. Click the clock icon (🕐) "View History"
```

**Expected Result:**
- ✅ Large modal appears instantly
- ✅ Dark overlay (60% black + blur) visible
- ✅ Modal title "Entry #X History" clearly readable
- ✅ Subtitle "Complete timeline of changes" visible
- ✅ Timeline with dots and lines appears
- ✅ Each log has:
  - Colored action badge (CREATED, CORRECTED, etc.)
  - Timestamp in Indian format
  - Changes in bordered card
  - All text large and readable
- ✅ Close button (X) visible in top-right
- ✅ Can click outside modal to close
- ✅ Can click X to close

---

## 📊 Quick Checklist

**Auto-Quarantine:**
- [ ] Bad data goes to quarantine
- [ ] Confidence < 50% shown
- [ ] Entry in Quarantine Inbox

**Corrections Counter:**
- [ ] Counter shows number
- [ ] Increments when editing
- [ ] Blue "CORRECTED" logs appear
- [ ] Changes tracked (old → new)
- [ ] Can filter by "Corrected"

**Modal Visibility:**
- [ ] Modal appears on click
- [ ] Dark overlay visible
- [ ] All text readable
- [ ] Timeline colored
- [ ] Close button works
- [ ] Click outside closes

---

## 🎨 What to Look For

### Auto-Quarantine:
```
🔴 Low confidence entry:
┌─────────────────────────────────────┐
│ Confidence: 45% (QUARANTINED)       │
│ Entry moved to Quarantine Inbox     │
└─────────────────────────────────────┘
```

### Corrections Counter:
```
📊 Audit Trail Stats:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total Logs   │ │ Entries      │ │ Corrections  │
│     12       │ │   Created    │ │    Made      │
│              │ │      5       │ │      3       │ ← Increments!
└──────────────┘ └──────────────┘ └──────────────┘
                                     (Blue number)
```

### Correction Log:
```
🔵 CORRECTED
   Nov 11, 2025, 11:15 AM
   ┌──────────────────────────────┐
   │ CHANGES:                     │
   │ city: Mumbai → Delhi         │
   │ phone: 9876543210 → 91234... │
   └──────────────────────────────┘
```

### Modal:
```
════════════════════════════════════════
│  Entry #12345 History              ✕ │
│  Complete timeline of changes         │
├───────────────────────────────────────┤
│                                       │
│  ● ─── 🔵 CORRECTED                  │
│  │      Nov 11, 2025, 11:15 AM       │
│  │      Changes: city: Mumbai → Delhi│
│  │                                    │
│  ● ─── 🟢 CREATED                    │
│        Nov 11, 2025, 10:00 AM        │
│                                       │
└───────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Issue: Counter doesn't increment
**Solution:**
1. Hard refresh: Ctrl + Shift + R
2. Edit entry again
3. Check Audit Trail tab

### Issue: Modal not visible
**Solution:**
1. Already fixed - should be visible
2. Try different browser
3. Check browser console for errors

### Issue: Entry not in quarantine
**Solution:**
1. Check confidence score
2. Must be < 50% to quarantine
3. Try submitting worse data

---

## ✅ Success Indicators

You'll know it's working when:

1. **Auto-Quarantine:**
   - Submit bad data
   - See "quarantined" status
   - Find in Quarantine Inbox

2. **Corrections:**
   - Edit entry
   - See alert about correction logged
   - Counter increases
   - Blue log appears

3. **Modal:**
   - Click clock icon
   - Large modal appears
   - All text clearly readable
   - Timeline visible

---

## 🎉 All Working?

If all 3 tests pass → **PERFECT!** ✅

**Test URL:** http://localhost:3000

**Test Time:** ~3 minutes

---

**Happy Testing! 🚀**
