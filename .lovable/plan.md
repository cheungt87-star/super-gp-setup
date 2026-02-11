

## Day Status Pills, Publish Gate, and Published-Only Shifts

### 1. Day Status Pills on Each Tab

Add a colour-coded status pill to each day tab showing:
- **Not Started** (grey) -- no shifts exist for that day
- **In Progress** (amber/orange) -- at least 1 shift exists but day not confirmed
- **Day Completed** (green) -- "Confirm Day" has been selected (confirmation exists)

The pill will appear inside each tab trigger, below the date, before the existing confirmation icons (which will be removed since the pill replaces their purpose).

### 2. "Copy from Previous Week" Pill Placement

The status pill will sit to the left of any existing action pills in the day content area header. Since the tabs themselves show the status, this is cleanly integrated.

### 3. Publish Button Gated by All Days Completed

The "Publish" button (line 866-879) will be disabled unless every open (non-closed) day in the week has a confirmation status (i.e., all days are "Day Completed"). A tooltip will explain why it's disabled.

### 4. "My Upcoming Shifts" Filters by Published Rotas Only

In `MyShiftsWidget.tsx`, the query that fetches `rota_weeks` will add a filter: `.eq("status", "published")`. This ensures only published rotas appear in the dashboard widget.

---

### Technical Details

**File: `src/components/rota/RotaScheduleTab.tsx`**

1. **Compute day status** -- create a helper/memo that for each day returns `"not_started" | "in_progress" | "completed"`:
   - `completed`: `getConfirmationStatus(dateKey)` returns a confirmation
   - `in_progress`: `shiftsByDate[dateKey]?.length > 0` but no confirmation
   - `not_started`: no shifts and no confirmation

2. **Tab triggers (lines 1026-1046)** -- replace the CheckCircle2/AlertTriangle icons with a small coloured badge:
   - Not Started: `bg-gray-100 text-gray-500` -- "Not Started"
   - In Progress: `bg-amber-100 text-amber-600` -- "In Progress"  
   - Completed: `bg-green-100 text-green-600` -- "Completed"

3. **Publish button (lines 866-879)** -- add `allDaysCompleted` boolean check:
   ```
   const allDaysCompleted = openDayDates.length > 0 && 
     openDayDates.every(day => getConfirmationStatus(formatDateKey(day)));
   ```
   Disable the button when `!allDaysCompleted` and add a title/tooltip.

4. **Preview dialog publish button** (line 1169) -- pass the same `allDaysCompleted` condition so publish is also gated there.

**File: `src/components/dashboard/MyShiftsWidget.tsx`**

5. **Filter rota_weeks by published status** (around line 155) -- add `.eq("status", "published")` to the rota_weeks query so only published rotas surface shifts in the dashboard widget.

