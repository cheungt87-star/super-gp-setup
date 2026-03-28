

# Add Subtle Dark Background to Rota Controls Strip

## Change — `src/components/rota/RotaScheduleTab.tsx` (lines 991-992)

Replace the plain `<Card>` wrapper with a styled version that has a subtle dark background:

```
<Card> 
  <CardContent className="py-4">
```
→
```
<div className="bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
  <div className="py-4 px-6">
```

And close the matching tags at the end of the block (around line 1076).

This gives the controls strip a light grey background that subtly distinguishes it from the white content below, matching the uploaded screenshot's feel.

