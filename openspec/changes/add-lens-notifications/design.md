## Context

The existing system utilizes a Cloudflare Worker (`lenstracker-reminders-worker`) to perform daily sweeps of lens replacement cycles stored in Cloudflare KV. Currently, it only supports Web Push notifications. We are extending this to support email notifications on the day of expiry.

## Goals / Non-Goals

**Goals:**
- Implement a reliable email notification system triggered by the existing cron sweep.
- Use a 3rd party email service provider (e.g., Postmark) for delivery.
- Prevent duplicate emails for the same expiry event.
- Include lens details (Side, Expiry Date) in the email.

**Non-Goals:**
- Building a custom SMTP server.
- Managing email templates within the worker (will use provider templates if possible, or simple HTML/Text).
- Real-time notifications (batch sweep is sufficient).

## Decisions

### 1. Email Service Provider
**Decision**: Use **Resend**.
**Rationale**: Generous free tier (3,000 emails/mo), simple HTTP API compatible with Cloudflare Workers, and easy verification.
**Alternatives**: Brevo, SendGrid. Resend is chosen for its modern developer experience.

### 2. User Data Management
**Decision**: Store the user's email address in the `LT_KV` under a `user:<deviceId>` or `sub:<deviceId>` key during the registration phase.
**Rationale**: The worker needs the email address to send notifications. Storing it alongside the push subscription ensures it's available during the sweep.

### 3. State Tracking for Duplicates
**Decision**: Add `lastEmailSentAt` to the `CycleState` object in KV.
**Rationale**: The worker sweeps periodically. Tracking the timestamp of the last email sent for a specific cycle ensures we only send one email per day/expiry event.

## Risks / Trade-offs

- **[Risk]**: Email provider API downtime → **[Mitigation]**: Implement basic retry logic or log failures.
- **[Risk]**: Exposure of API Keys → **[Mitigation]**: Use `wrangler secret put RESEND_API_KEY`.
- **[Trade-off]**: Increased KV writes → **[Rationale]**: Updating `lastEmailSentAt` is necessary to prevent spamming users.

## Implementation Plan

1. **Environmental Setup**: Add `RESEND_API_KEY` to Worker secrets.
2. **Worker Update**:
   - Update `Env` interface to include `RESEND_API_KEY`.
   - Update `CycleState` type (already done).
   - Replace `sendPostmarkEmail` with `sendResendEmail`.
3. **Frontend Update**:
   - Update the registration call to include the user's email address from Firebase Auth.
