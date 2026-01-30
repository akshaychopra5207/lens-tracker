## Why

Lens wearers often forget when their lenses are due for replacement. While the app tracks usage, it currently relies on the user checking the UI. An automated email reminder on the day of expiry ensures timely replacement, maintaining eye health and convenience.

## What Changes

- **Email Notification Service**: Integrate **Resend** (free tier: 3000 emails/mo) into the Cloudflare Worker.
- **Expiry Logic Integration**: Extend the worker's sweep logic to identify lenses expiring "today" and trigger emails.
- **User Data Extension**: Add email address storage to the user profile or notification settings.

## Capabilities

### New Capabilities
- `lens-email-notifications`: Sends an email to the user on the day their left or right lens is due for replacement, including the lens type and side.

### Modified Capabilities
- None (baseline specs don't yet exist for notifications).

## Impact

- `infra/lenstracker-reminders-worker`: Major update to include email sending logic.
- `src/firebase.ts` / `src/data/`: Potential changes to store user contact info (email) if not already available in auth.
- Cloudflare KV: New keys for tracking email notification state to prevent duplicate sends.
