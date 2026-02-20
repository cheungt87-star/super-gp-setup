
# Fix: Empty Pages When Printing Rota

## Problem
The current print CSS uses `visibility: hidden` to hide non-rota content. While this makes elements invisible, they still occupy space in the document layout, producing 4+ blank pages.

## Solution
Add `display: none` on all body children except the rota, and override with `display: block` on the rota container. This removes hidden elements from the flow entirely, eliminating blank pages.

## Technical Details

**File:** `src/index.css` (print media query, lines 130-180)

Update the print block to:

1. Hide all direct body children and the sidebar/layout wrappers with `display: none !important`
2. Override the rota's ancestor chain to `display: block !important` so it remains visible
3. Keep existing visibility rules as a fallback

```css
@media print {
  @page {
    size: landscape;
    margin: 10mm;
  }

  body > *:not(.print-full-rota) {
    display: none !important;
  }

  body * {
    visibility: hidden;
  }

  .print-full-rota,
  .print-full-rota * {
    visibility: visible !important;
    display: revert !important;
  }

  .print-full-rota {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    /* ...existing reset styles... */
  }

  /* ...rest unchanged... */
}
```

Since `.print-full-rota` is nested inside layout wrappers (sidebar layout, main content area), we also need to ensure its parent elements are visible and displayed. A simpler approach: hide everything, then force the rota's ancestor chain visible using a broader selector that targets the rota's parent containers.
