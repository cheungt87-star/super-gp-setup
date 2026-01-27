
# Make Shift Options More Visible in Staff Selection Dialog

## Problem
When selecting a staff member in the rota scheduler, the "Shift Options" section (Make Full Day, Custom Time) is positioned at the bottom of the dialog after the staff list, requiring users to scroll down to find it. This is not immediately discoverable.

## Solution
Restructure the dialog layout to use a **two-column approach** on wider screens:
- **Left column**: Staff list (scrollable)
- **Right column**: Selected staff summary + Shift Options (sticky, always visible)

On smaller screens, use a different approach: move the Shift Options into a **highlighted section at the top** that appears when a staff member is selected.

## Layout Changes

### Current Structure (problematic)
```text
┌─────────────────────────────────────┐
│ Filters (Site, Job Family, Search)  │
├─────────────────────────────────────┤
│ Staff List (ScrollArea 420px)       │
│   - Staff 1                         │
│   - Staff 2                         │
│   - Staff 3...                      │
├─────────────────────────────────────┤
│ Add Temp/Locum Option               │
├─────────────────────────────────────┤
│ Shift Options (HIDDEN - scroll!)    │  ← Problem
├─────────────────────────────────────┤
│ [Add Staff Button]                  │
└─────────────────────────────────────┘
```

### New Structure (two-column on desktop)
```text
┌──────────────────────────────────────────────────────┐
│ Filters (Site, Job Family, Job Title, Search)        │
├────────────────────────────┬─────────────────────────┤
│ Staff List (ScrollArea)    │ Selection Panel         │
│   - Staff 1                │ ┌─────────────────────┐ │
│   - Staff 2 ✓ (selected)   │ │ Selected: Staff 2   │ │
│   - Staff 3...             │ │ Job Title Badge     │ │
│                            │ ├─────────────────────┤ │
│ Add Temp/Locum Option      │ │ SHIFT OPTIONS       │ │
│                            │ │ ☐ Make Full Day     │ │
│                            │ │ ☐ Custom Time       │ │
│                            │ └─────────────────────┘ │
│                            │ [Add Staff Button]      │
├────────────────────────────┴─────────────────────────┤
```

## Technical Implementation

### File: `src/components/rota/StaffSelectionDialog.tsx`

1. **Change the main content area to a two-column grid** (on sm: screens and up):
   - Left column (2/3 width): Filters + Staff List + Temp option
   - Right column (1/3 width): Selection summary + Shift Options + Add button

2. **Move Shift Options into the right column** so they're always visible when a staff member is selected

3. **Add a "Select a staff member" placeholder** in the right column when no one is selected

4. **Display selected staff info** at the top of the right column for confirmation

5. **Keep mobile-friendly**: On small screens, stack vertically but show Shift Options immediately after staff selection, before the staff list continues

### Specific Changes

- Wrap the main content in a responsive grid: `grid grid-cols-1 sm:grid-cols-3 gap-4`
- Left column (`sm:col-span-2`): Filters, Staff List ScrollArea, Temp option
- Right column (`sm:col-span-1`): Sticky panel with:
  - Selected staff summary (name, job title, hours)
  - Shift Options section (always visible, not hidden)
  - Add Staff button
- Reduce ScrollArea height to account for the new layout
- Add visual styling to make the right panel stand out (subtle background, border)

## Benefits
- Shift Options are immediately visible after selecting a staff member
- No scrolling required to configure shift settings
- Selected staff confirmation is always visible
- Mobile users still get a usable layout
- Clearer visual hierarchy and workflow
