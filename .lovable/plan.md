

# Restyle "Weekly Rota Creation" — Dark Containers + Publish Layout

## Changes — `src/components/rota/RotaScheduleTab.tsx` (lines 1017-1179)

### 1. Dark theme containers
All 3 containers change from `bg-white border-slate-200` to `bg-slate-800 border-slate-700 text-white`. Labels inside switch from `text-slate-400` to `text-slate-300`.

### 2. Container titles — larger and bold
Change all `<h3>` from `text-xs font-bold uppercase tracking-wider text-slate-400` to `text-base font-bold text-white`.

### 3. Container 1 (Overview)
- Remove "Week Status" from here (move to Container 3)
- Keep Site and Date Range with updated label colors (`text-slate-300`)
- SelectTrigger gets `bg-slate-700 border-slate-600 text-white`

### 4. Container 2 (Quick Actions)
- Buttons styled for dark bg: `bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600`

### 5. Container 3 (Publish & Confirm)
- Title "Publish & Confirm" centered at top: `text-center`
- CTA: Square-ish, large, fills most of container — `w-full aspect-square max-h-32 rounded-lg`
- Below the CTA: Show `{x}/{y} days complete` status badge + "Complete all to publish" message in `text-slate-300 text-sm`

## Files
- `src/components/rota/RotaScheduleTab.tsx`

