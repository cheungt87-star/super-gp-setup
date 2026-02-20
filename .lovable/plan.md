

# Fix: Invitation Code Card Query

## Problem
The current query uses `.is("email", null)` to find the shareable code, which is unreliable. The `invitation_codes` table has a `type` column (set automatically by the `set_invitation_type` trigger) that cleanly distinguishes:
- `type = 'general'` -- shareable ORG-XXXX codes for staff sign-up
- `type = 'onboarding'` -- setup codes used to create the org

## Change

**File:** `src/pages/Dashboard.tsx` (lines 188-194)

Replace the current query filter:

```ts
// Before
.is("email", null)

// After
.eq("type", "general")
```

Full updated query:
```ts
const { data: codeData } = await supabase
  .from("invitation_codes")
  .select("code, used_count, max_uses")
  .eq("organisation_id", profile.organisation_id)
  .eq("type", "general")
  .eq("is_active", true)
  .maybeSingle();
```

Additionally, redesign the card UI to be full-width and visually prominent as previously discussed -- large centred monospace code block, prominent "Copy Code" button with animation, and usage counter.

## No other changes needed
- The `type` column is already populated by the `set_invitation_type` trigger (codes starting with `ORG` get `type = 'general'`)
- The `organisation_id` comes from the user's profile (already fetched)
- No database migration required

