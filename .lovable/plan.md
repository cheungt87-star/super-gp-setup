
# Sync Staff Panel Site Filter with Rota Site Selection

## Problem
`StaffPanel` initializes `siteFilter` with `useState(currentSiteId || "all")`, which only runs once on mount. When the user changes the rota site, `currentSiteId` updates but `siteFilter` stays stale.

## Fix — `src/components/rota/StaffPanel.tsx`

Add a `useEffect` to sync `siteFilter` when `currentSiteId` changes:

```typescript
useEffect(() => {
  setSiteFilter(currentSiteId || "all");
}, [currentSiteId]);
```

Place this after the state declarations (around line 60). Single line addition, no other changes needed.
