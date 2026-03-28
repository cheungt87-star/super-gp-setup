

# Weekly Rota Creation Header — Visual Prominence & Styling Updates

## Changes

### 1. Prominent section background — `RotaScheduleTab.tsx` (line 1017)
Replace `bg-slate-50 border border-slate-200` with `bg-slate-100 border-2 border-slate-300 shadow-md` to make the control panel feel more prominent and distinct.

### 2. Date range format DD/MM/YY — `rotaUtils.ts` (line 11-14)
Change `formatWeekRange` to use `dd/MM/yy` format:
```
return `${format(weekStart, "dd/MM/yy")} - ${format(weekEnd, "dd/MM/yy")}`;
```

### 3. Date range pill styling — `WeekSelector.tsx` (line 29)
Replace `bg-muted/50 rounded-lg px-4 py-1` with `border-2 border-slate-300 shadow-sm rounded-lg px-4 py-1.5` to match the design system's pill/button border style.

### 4. Middle section title "Week Status" — `RotaScheduleTab.tsx` (line 1044)
Add a label above the middle section content:
```
<label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Week Status</label>
```

### 5. In Progress badge text — `RotaScheduleTab.tsx` (line 1083)
Change `In Progress ({confirmedCount}/{totalOpenDays})` to `{confirmedCount}/{totalOpenDays} days complete`. Add `border-2` to the badge for consistency.

## Files
- `src/components/rota/RotaScheduleTab.tsx`
- `src/lib/rotaUtils.ts`
- `src/components/rota/WeekSelector.tsx`

