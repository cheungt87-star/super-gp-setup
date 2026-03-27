

# Staff Panel Sidebar for Rota Creator

## Overview

Add a slim left-side staff panel to the rota page for drag-and-drop assignment. Staff pills show **full name and full job title** (not abbreviated). The existing StaffSelectionDialog is kept for locum/temp additions. After assignment, an edit icon on shift cards opens options for full-day/custom time.

## Layout

```text
┌───────────┬─────────────┬──────────────────────┐
│ Nav (slim) │ Staff Panel │    Rota Grid         │
│  ~11rem    │  ~240px     │    (remaining)       │
│            │ filters +   │                      │
│            │ staff pills │                      │
└───────────┴─────────────┴──────────────────────┘
```

## Changes

### 1. Slim down app sidebar
- **`src/components/ui/sidebar.tsx`**: Reduce `SIDEBAR_WIDTH` from `16rem` to `12rem`
- Tighter padding/spacing in `AppSidebar.tsx`

### 2. New `src/components/rota/StaffPanel.tsx`
- ~240px fixed-width panel, full height, scrollable
- **Filters** (stacked, compact): Site, Job Family, Job Title selects + search input
- **Staff list**: Each staff member as a slim pill showing:
  - **Full name** (e.g. "Dr Sarah Jones")
  - **Full job title** (e.g. "GP Partner") with coloured badge
  - Staff already on the current day greyed out
- **"Add Locum / External Temp" button** at bottom → opens existing StaffSelectionDialog
- Pills are `draggable="true"`, set `dataTransfer` with staff ID on drag start

### 3. Update `ClinicRoomDayCell.tsx` — drop targets + edit icon
- AM/PM cells become drop targets (`onDragOver`, `onDrop`)
- On drop: extract staff ID, call `onAddShift(userId, dateKey, period, false, roomId)`
- Dashed border highlight on drag-over
- Add small `Pencil` icon on each shift card → calls existing `onEditShift(shift)` for full-day/custom time options

### 4. Update `RotaScheduleTab.tsx` — layout + state
- Add panel filter state (site, job family, job title, search)
- Wrap content in flex row: `<StaffPanel>` left + existing schedule `<Card>` right
- Pass filtered staff list and `onAddShift` to panel
- Existing "+" buttons on cells remain as fallback

### 5. What stays the same
- StaffSelectionDialog for locum/temp/external temp
- EditShiftDialog functionality (full day, custom time)
- All validation, confirmation, publish, copy workflows
- On-call assignment flow

