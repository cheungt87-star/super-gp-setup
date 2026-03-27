

# Staff Panel: Add Site Filter + Single-Line Pills

## Changes

### 1. `src/components/rota/StaffPanel.tsx`

**Props**: Add `sites: { id: string; name: string }[]` to `StaffPanelProps`. Remove `scheduledHours` from props (no longer used).

**State**: Add `siteFilter` state (`"all"` default).

**Filters section**: Add a Site select dropdown as the first filter (above Job Family). When a site is selected, filter staff by `primary_site_id`.

**Staff pills**: Change from two-line to single-line layout:
- Current: name on line 1, badge + hours on line 2 (wrapped in a `<div>` with `<p>` + nested `<div>`)
- New: single `flex items-center` row: `[GripVertical] [Name] [Badge]` — all inline, no hours
- Remove the `contracted`/`hours` variables and rendering

**Filtering logic**: Add site filter check in `filteredStaff` memo:
```typescript
if (siteFilter !== "all") {
  result = result.filter((s) => s.primary_site_id === siteFilter);
}
```

### 2. `src/components/rota/RotaScheduleTab.tsx`

Pass `sites={sites}` to the `<StaffPanel>` component (line ~1019). Remove `scheduledHours` prop.

