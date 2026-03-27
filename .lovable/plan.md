

# Fix Staff Panel: Site Filter + Sticky Scroll

## Problems

1. **Site filter not working**: `StaffPanel` receives `staff` which is already filtered to the selected site (line 234 in RotaScheduleTab). So filtering by a different site shows nothing. The panel should use `allStaff` (all org staff) as its base list.

2. **Sticky scroll not working properly**: The panel has `sticky top-0 self-start h-screen` but it's inside a `div` with `overflow-hidden` (line 1017), which breaks sticky positioning. Need to remove `overflow-hidden` from the parent container.

## Changes

### 1. `src/components/rota/RotaScheduleTab.tsx` (line 1017, 1020)
- Remove `overflow-hidden` from the parent flex container (change to just `overflow-visible` or remove it)
- Pass `allStaff` instead of `staff` as the primary staff list to `StaffPanel`

### 2. `src/components/rota/StaffPanel.tsx` (line 66-67)
- Use `allStaff` as the base list for filtering instead of `staff`
- Default the site filter to the currently selected rota site (pass `currentSiteId` prop, initialize `siteFilter` to it)

### Props change
- Add `currentSiteId?: string` prop to StaffPanel so the site filter defaults to the rota's selected site rather than "all"

