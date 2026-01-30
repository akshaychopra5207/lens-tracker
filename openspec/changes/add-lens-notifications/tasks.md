## 1. Setup & Infrastructure

- [ ] 1.1 Configure `RESEND_API_KEY` in Cloudflare Worker secrets
- [x] 1.2 Update `Env` interface and `CycleState` type in `infra/lenstracker-reminders-worker/snowy-dew-8baf/src/index.ts`
- [ ] 1.3 Implement `sendResendEmail` helper function using `fetch`

## 2. Worker Logic Update

- [x] 2.1 Update `runNagSweep` function to identify lenses expiring on the current date
- [x] 2.2 Implement duplicate prevention logic using `lastEmailSentAt` in `CycleState`
- [ ] 2.3 Add `sendResendEmail` call within the `runNagSweep` loop for eligible lenses

## 3. API & Frontend Integration

- [x] 3.1 Update `/push/register` endpoint in worker to accept and store user email address
- [x] 3.2 Update frontend registration logic (likely in `App.tsx` or a dedicated service) to pass the user's email from Firebase Auth

## 4. Verification

- [ ] 4.1 Create a temporary test endpoint `/email/test` to verify Resend integration
- [ ] 4.2 Validate full sweep flow by manually triggering `/cron/runOnce` with mock KV data
