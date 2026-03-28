

# Simplified Locum/Temp Add Flow

## Current State
- Two separate draggable pills in Staff Panel: "Locum - Confirmed" (green) and "Locum - Unconfirmed" (red)
- Each sets a `locumType` of "confirmed" or "unconfirmed" on drag
- On drop, a dialog asks for the locum's name regardless of type

## New Flow
1. **Single pill** "Add Locum/Temp" in dark grey replaces both green/red pills
2. On drop, a **Status dialog** appears with two options: "Confirmed" / "Unconfirmed"
   - **Confirmed**: Shows a name input field, user enters name, clicks Add
   - **Unconfirmed**: Immediately adds with name set to "TBC" (no name input needed)

## Changes

### 1. StaffPanel.tsx — Single locum pill
Replace the two locum badges (lines 171-189) with one dark grey pill labelled "Add Locum/Temp". The drag handler sets a generic `locumType` value of `"locum"` (no confirmed/unconfirmed distinction at drag time).

### 2. ClinicRoomDayCell.tsx — New status-first dialog
Replace the current locum name dialog (lines 925-951) with a two-step dialog:
- **Step 1 — Status selection**: Title "Add Locum/Temp", two buttons: "Confirmed" and "Unconfirmed"
  - Clicking "Unconfirmed" immediately calls `onAddShift` with name `"TBC"` and `confirmed: false`, closes dialog
  - Clicking "Confirmed" transitions to step 2
- **Step 2 — Name input**: Title "Add Confirmed Locum", name input + Add button (same as current)

Update `locumNameDialog` state to no longer receive `confirmed` from the drag data. Instead, `confirmed` is set during the dialog interaction.

Update drop handlers (`handleDrop` line 174, `handleOncallDrop` line 196) to set `confirmed: false` as placeholder — the actual value is determined in the dialog.

### 3. handleLocumNameConfirm — handle TBC case
Add a new handler `handleLocumUnconfirmed` that calls `onAddShift` with name `"TBC"` and `confirmed: false`, then closes the dialog.

## Files
- `src/components/rota/StaffPanel.tsx`
- `src/components/rota/ClinicRoomDayCell.tsx`

