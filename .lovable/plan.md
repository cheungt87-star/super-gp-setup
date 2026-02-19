
# Forgotten Password Journey

## Overview
Two things need to be built:
1. A "Forgot password?" link on the sign-in screen that triggers a reset email via Supabase
2. A `/reset-password` page where the user lands from the email link and sets a new password

---

## Current State
- `Auth.tsx` uses a `mode` state string (`"login" | "invite" | ...`) to switch between views within a single page
- The login card (lines 516–562) has no forgot-password link
- No `/reset-password` route exists in `App.tsx`
- The existing `ChangePasswordForm` in `src/components/profile/ChangePasswordForm.tsx` shows the correct password update pattern to follow

---

## Changes Required

### 1. Add `"forgot-password"` and `"reset-sent"` modes to `Auth.tsx`

Extend the `AuthMode` type:
```
"login" | "invite" | "org-setup" | "org-confirm" | "register" | "verify" | "forgot-password" | "reset-sent" | "error"
```

**Forgot Password card** (mode = `"forgot-password"`):
- Email input field
- "Send reset link" button — calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
- Back to sign in link

**Reset Sent confirmation card** (mode = `"reset-sent"`):
- Confirms the email has been sent
- Back to sign in button

**Login card update** — add a "Forgot password?" link beneath the password field that sets mode to `"forgot-password"`

### 2. Create `/reset-password` page — `src/pages/ResetPassword.tsx`

This page is where users land after clicking the email link. Supabase appends `#type=recovery&access_token=...` to the URL.

The page will:
- On mount, listen for the `PASSWORD_RECOVERY` auth event via `supabase.auth.onAuthStateChange`
- Show a form with "New password" and "Confirm password" fields (with show/hide toggles and strength indicators, matching the existing registration style)
- On submit, call `supabase.auth.updateUser({ password: newPassword })`
- On success, redirect to `/dashboard` with a success toast
- If no recovery session is detected, show an "Invalid or expired link" message with a link back to `/auth`

### 3. Register the new route in `App.tsx`

Add `/reset-password` as a **public** route (outside `AuthenticatedLayout`) so it is accessible without being logged in:

```tsx
<Route path="/reset-password" element={<ResetPassword />} />
```

---

## File Summary

| File | Change |
|---|---|
| `src/pages/Auth.tsx` | Add `"forgot-password"` and `"reset-sent"` modes; add Forgot Password link to login card |
| `src/pages/ResetPassword.tsx` | New page — handles password recovery session and update |
| `src/App.tsx` | Register `/reset-password` public route |

---

## Technical Notes
- Supabase sends a magic link email; on click the browser lands at `/reset-password` with a URL fragment containing the recovery token — Supabase JS SDK exchanges this automatically via `onAuthStateChange`
- The `redirectTo` must exactly match a URL allowed in Supabase Auth settings — the project's site URL is already configured so `window.location.origin + '/reset-password'` will work
- No database migration required — this is purely frontend + Supabase Auth
