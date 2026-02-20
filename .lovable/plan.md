

# Fix: Print Layout for Full Rota

## Problem
The printed rota table is centered on the page with excess whitespace, rounded container styling still visible, and doesn't fill the page width properly.

## Changes

**File:** `src/index.css` (lines 130-169)

Update the print media query:

1. Add `@page { size: landscape; margin: 10mm; }` to force landscape orientation and tight margins
2. Remove the rounded container background/shadow/padding on `.print-full-rota > .rounded-3xl` wrapper so the table sits flush
3. Set `text-align: left` on the print header block
4. Ensure the table stretches to full width with `table-layout: fixed`

**File:** `src/components/dashboard/FullRotaWidget.tsx`

5. Update the print-only header from `print:text-center` to `print:text-left` (line ~241)

## Technical Detail

Updated print CSS block:
```css
@media print {
  @page {
    size: landscape;
    margin: 10mm;
  }

  body * {
    visibility: hidden;
  }

  .print-full-rota,
  .print-full-rota * {
    visibility: visible !important;
  }

  .print-full-rota {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    box-shadow: none !important;
    border: none !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    border-radius: 0 !important;
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

And in `FullRotaWidget.tsx`, change the print header to left-aligned.

