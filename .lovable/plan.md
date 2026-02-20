
# Fix: Rota Duplicated Across 5 Printed Pages

## Problem
`visibility: hidden` on `body *` hides elements visually but they still take up physical space in the print layout, generating multiple pages. Since `.print-full-rota` uses `position: fixed`, it appears on every single page -- hence the same rota repeated 5 times.

## Solution
Collapse the body content so it occupies no space, while keeping the rota visible. Instead of hiding individual elements, we set the body itself to have no height/overflow, then position the rota as a fixed overlay.

## Technical Detail

**File:** `src/index.css` (print media query, lines 130-183)

Replace the print block with:

```css
@media print {
  @page {
    size: landscape;
    margin: 10mm;
  }

  /* Collapse entire body so hidden content creates no pages */
  body {
    visibility: hidden;
    height: 0 !important;
    overflow: hidden !important;
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

  .print-full-rota .rounded-3xl {
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
  }

  .print-full-rota * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .print-full-rota table {
    width: 100% !important;
    font-size: 11px !important;
    table-layout: fixed !important;
  }

  .print-full-rota td,
  .print-full-rota th {
    padding: 4px 6px !important;
  }
}
```

The key change is targeting `body` directly with `height: 0 !important; overflow: hidden !important` instead of `body *` with `visibility: hidden`. This collapses all content into zero space so the browser generates only 1 page, and the fixed-position rota overlays that single page.
