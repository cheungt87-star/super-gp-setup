

## Color-Code Day Tabs by Status

The status pills are rendering but are invisible because the active tab's teal background (`bg-primary`) overwhelms the small pill colors. The fix is to color-code the **entire tab background** based on day status, not just the small pill inside it.

### Changes

**File: `src/components/rota/RotaScheduleTab.tsx`** (lines 1048-1066)

1. Replace the fixed `data-[state=active]:bg-primary` styling on `TabsTrigger` with dynamic classes based on `dayStatus`:
   - **Not Started**: Red tones (`bg-red-500 text-white` when active, `bg-red-50 text-red-700` when inactive)
   - **In Progress**: Amber tones (`bg-amber-500 text-white` when active, `bg-amber-50 text-amber-700` when inactive)
   - **Completed**: Green tones (`bg-green-500 text-white` when active, `bg-green-50 text-green-700` when inactive)

2. Update the status pill inside the tab to use lighter/contrasting colors so it remains visible on the colored tab background (e.g., white/semi-transparent background on active tabs).

3. Remove the hardcoded `data-[state=active]:bg-primary` and `data-[state=inactive]:text-muted-foreground` from the className, replacing them with the dynamic status-based colors.

This will make each tab visually distinct at a glance -- red for days needing attention, amber for in-progress, and green for completed -- matching the screenshot reference where the completed tab has a green background with the pill inside.

