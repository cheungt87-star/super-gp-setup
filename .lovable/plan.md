

# Sidebar Gradient Background

## Change

### `src/components/layout/AppSidebar.tsx`

Add inline `style` to the `<Sidebar>` component with the gradient background:

```typescript
<Sidebar style={{ background: 'linear-gradient(135deg, hsla(259, 42%, 86%, 1) 0%, hsla(193, 37%, 85%, 1) 24%, hsla(0, 0%, 96%, 1) 100%)' }}>
```

This overrides the default `--sidebar-background` CSS variable with the specified lavender → teal → near-white gradient.

