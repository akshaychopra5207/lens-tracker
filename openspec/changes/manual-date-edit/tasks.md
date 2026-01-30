# Tasks: Manual Next Due Date Editing

- [ ] **Domain: Update Events**
  - [ ] Add `UPDATE_DUE_DATE` to `EventType` in [`src/domain/events.ts`](src/domain/events.ts)
  - [ ] Add `UpdateDueDateMeta` interface to [`src/domain/events.ts`](src/domain/events.ts)
  - [ ] Add `ev.updateDueDate` helper to [`src/domain/events.ts`](src/domain/events.ts)

- [ ] **Domain: Update Projection**
  - [ ] Update `project` function in [`src/domain/projection.ts`](src/domain/projection.ts) to track `UPDATE_DUE_DATE` events
  - [ ] Ensure `UPDATE_DUE_DATE` only applies to the current cycle (reset on `USE` or `CHANGE`)

- [ ] **UI: Home Screen**
  - [ ] Add `AdjustDateModal` component to [`src/ui/Home.tsx`](src/ui/Home.tsx)
  - [ ] Make "Next: [Date]" labels clickable in the Status Card
  - [ ] Implement `onConfirmAdjustDate` to save the event and update the cycle API

- [ ] **Verification**
  - [ ] Verify that changing the date manually updates the "Next" display immediately
  - [ ] Verify that the new date is persisted across refreshes
