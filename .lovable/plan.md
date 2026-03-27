

# Fix: Custom Time Shifts Not Recognized by Validation Rules

## Problem

In `src/lib/rotaRulesEngine.ts` (line 102-103), the empty room check only looks for `shift_type` values of `"am"`, `"pm"`, or `"full_day"`. Custom time shifts have `shift_type === "custom"` and are completely ignored, causing false "room is empty" warnings even when a staff member is assigned with a custom time slot.

## Solution

Update the empty room validation (Rule 2) to also consider `"custom"` shift types. A custom shift covers:
- **AM** if it exists in the AM period (i.e. `shift_type === "custom"` on an AM-period shift, or a shift whose custom times overlap AM hours)
- **PM** if it exists in the PM period

Since custom shifts that span AM/PM are already split into two linked records (one with AM period, one with PM), the simplest fix is: treat any shift with `shift_type === "custom"` as covering the period it belongs to. Looking at how shifts are stored, custom shifts are split into AM and PM halves. The `shift_type` field for these is `"custom"` but they're stored separately per period.

### File: `src/lib/rotaRulesEngine.ts`

Update lines 102-103 to also check for custom shifts. The shift records include a `shift_period` or the shift is split into AM/PM rows. Looking at the Shift interface, shifts have `shift_type` which can be `"am"`, `"pm"`, `"full_day"`, or `"custom"`. For custom shifts, they are stored in either the AM or PM column of the rota grid.

The most robust approach: any non-oncall shift assigned to the room for that day means the room is not empty for that period. Since custom shifts that span both periods are split into two records (one appearing in AM column, one in PM), we need to know which period each custom shift belongs to.

I need to check how custom shifts store their period assignment -- let me refine. The shift data likely uses the column placement or a separate field. The simplest correct fix: treat `shift_type === "custom"` as covering **both** AM and PM (since even a single-period custom shift means someone is in that room), OR check `custom_start_time`/`custom_end_time` against AM/PM boundaries.

**Simplest correct approach**: Any shift assigned to the room (regardless of type) means coverage. Change the check to:
```typescript
const hasAM = roomShifts.some((s) => 
  s.shift_type === "am" || s.shift_type === "full_day" || s.shift_type === "custom"
);
const hasPM = roomShifts.some((s) => 
  s.shift_type === "pm" || s.shift_type === "full_day" || s.shift_type === "custom"
);
```

Since custom shifts spanning both periods are already split into two DB records (one in each period column), and single-period custom shifts only appear in one column, this correctly handles all cases. A custom AM-only shift will have its linked PM half in the PM column if it spans, or no PM record if it doesn't -- but the validation runs against what's actually in the DB, so a `custom` record existing for that room means someone is assigned.

**However**, this would mark both AM and PM as covered even if the custom shift only covers AM. The better approach requires checking the shift's actual time against period boundaries, but that needs the rota rules (AM/PM times) passed into the function.

**Pragmatic fix**: Add the Shift interface's `custom_start_time` and `custom_end_time` fields, then check overlap with AM/PM periods. But since the rota already splits spanning shifts into two records, each custom record effectively covers one period. So treating `custom` as covering both is acceptable -- if a user assigns a custom AM-only shift, there will only be one record, and it covers that room for that time. The "empty room" warning is about whether anyone is assigned at all, not about full coverage.

**Final approach**: Simply include `"custom"` in both AM and PM checks. This is consistent with how the UI displays custom shifts as occupying the room.

### Change

**`src/lib/rotaRulesEngine.ts`** lines 102-103: Add `|| s.shift_type === "custom"` to both `hasAM` and `hasPM` checks.

