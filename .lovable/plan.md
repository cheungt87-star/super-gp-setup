

# Simplify Edit Shift Dialog

## Overview

Strip the EditShiftDialog down to show the current shift slot and contextual edit options only. Remove On-Call toggle, Temp/Agency toggle, and Notes textarea.

## Changes — `src/components/rota/EditShiftDialog.tsx`

### 1. Remove unused UI sections
- **Lines 244-252**: Remove On-Call toggle
- **Lines 254-284**: Remove Temp/Agency Staff toggle and Booking Confirmed toggle
- **Lines 286-294**: Remove Notes textarea

### 2. Remove related state and logic
- Remove `isOncall`, `notes`, `isTempStaff`, `tempConfirmed` state variables (lines 58-61)
- Remove their initialization in the `useEffect` (lines 118-121)
- In `handleSave`, hardcode: `is_oncall: shift.is_oncall` (preserve original), `notes: shift.notes || null`, `is_temp_staff: shift.is_temp_staff || false`, `temp_confirmed: shift.temp_confirmed || false`

### 3. Add "Current Shift" display
Above the radio group, add a small info line showing the current slot:

```text
Current shift: AM Shift (08:00 - 13:00)
```

Derived from `shift.shift_type` — display as badge/label (e.g. "AM", "PM", "Full Day", or custom times).

### 4. Context-aware radio options
Instead of always showing all 4 options, show only the relevant ones based on the current `shift.shift_type`:
- If current is **AM** → show: "Make Full Day", "Move to PM", "Custom Time"
- If current is **PM** → show: "Make Full Day", "Move to AM", "Custom Time"
- If current is **Full Day** → show: "Change to AM only", "Change to PM only", "Custom Time"
- If current is **Custom** → show: "Make Full Day", "Change to AM", "Change to PM", "Custom Time"

Keep the same `shiftType` state and `RadioGroup` — just conditionally render which `RadioGroupItem` entries appear.

### 5. Remove unused imports
Remove `Switch`, `Textarea` imports (no longer used in the dialog).

