

# Fix: Rota Not Showing When Printing

## Problem
The last CSS change added `display: none !important` to `body *`, which hides every element on the page — including the parent/ancestor containers that wrap `.print-full-rota` (sidebar layout, main content div, etc.). Since parents are hidden, the rota child can never appear regardless of its own display override.

## Solution
Replace the broad `body *` hide rule with a more targeted approach that only hides non-rota content while keeping the ancestor chain intact.

**File:** `src/index.css` (print media query, lines 130-187)

Replace the current print block with:

```css
@media print {
  @page {
    size: landscape;
    margin: 10mm;
  }

  /* Hide everything except the rota's ancestor chain */
  body > *,
  body * {
    visibility: hidden;
  }

  /* Force rota and all its contents visible */
  .print-full-rota,
  .print-full-rota * {
    visibility: visible !important;
  }

  .print-full-rota {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    border-radius: 0 !important;
    z-index: 99999;
  }

  /* ... existing table/cell rules unchanged ... */
}
```

Key change: Remove `display: none !important` from the `body *` rule. The `visibility: hidden` approach keeps elements in the flow but invisible, while `position: fixed` on `.print-full-rota` pulls it out of the flow and overlays it on page 1. This avoids blank pages (the rota is fixed, not in flow) while keeping the ancestor chain intact so the rota actually renders.

