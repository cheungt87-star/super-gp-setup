

# Fix: Show "On-call only" instead of "Not working" for on-call staff

## Problem

In `MyShiftsWidget.tsx`, when a staff member has no room/clinic shifts but IS assigned to on-call duties, the left side of the row still displays "Not working" (line 480-481). The screenshot shows this -- the user sees "Not working" alongside an "On Duty Doctor 2 (PM)" badge.

## Change

**File: `src/components/dashboard/MyShiftsWidget.tsx`** (line 480-481)

Replace the "Not working" text shown when `day.shifts.length === 0` (but on-call assignments exist) with "On-call only" styled in a softer orange/amber to match the on-call theme.

```typescript
// Line 480-481: Change from
{day.shifts.length === 0 ? (
  <span className="text-sm text-muted-foreground italic">Not working</span>
// To
{day.shifts.length === 0 ? (
  <span className="text-sm text-orange-500 italic">On-call only</span>
```

Single line change, no other files affected.

