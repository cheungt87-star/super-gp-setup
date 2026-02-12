
# Fix: On-Call Validation False Positives in Week Preview

## Problem
The Week Preview dialog correctly displays on-call assignments (Manager, Doctor 1, Doctor 2) in the table, but the Issues panel falsely reports them as "not assigned." All three slots for every day are flagged, even though staff are clearly assigned.

## Root Cause
In `RotaPreviewDialog.tsx` (line 88-96), the `validateWeek()` call does **not** pass the `oncalls` data as its last argument. The `oncalls` prop exists and is available, but it's simply omitted from the function call. This causes the validation engine to default `oncalls` to `undefined`, treating every on-call slot as empty.

## Fix
**File:** `src/components/rota/RotaPreviewDialog.tsx`

Pass the `oncalls` array (mapped to the shape expected by the rules engine) to `validateWeek()`. The oncalls prop needs to be converted to the `OncallRecord` interface shape and added as the 8th argument. Also add `oncalls` to the `useMemo` dependency array.

This is a one-line fix in the function call plus adding `oncalls` to the dependency array.
