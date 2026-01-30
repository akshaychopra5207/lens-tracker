# Specification: Manual Next Due Date Editing

## 1. Domain Changes

### `src/domain/events.ts`

- Add `UPDATE_DUE_DATE` to `EventType`.
- Add `UpdateDueDateMeta` interface:

  ```typescript
  export interface UpdateDueDateMeta {
      eye: 'LEFT' | 'RIGHT';
      newDueDateIso: string;
  }
  ```

- Add helper to `ev` object:

  ```typescript
  updateDueDate: (eye: 'LEFT' | 'RIGHT', newDueDateIso: string, lensTypeId: string): LensEvent => ({
      id: uuid(), type: 'UPDATE_DUE_DATE', qty: 0, eye, lensTypeId, at: nowIso(), meta: { eye, newDueDateIso }
  })
  ```

### `src/domain/projection.ts`

- Update `project` function to handle `UPDATE_DUE_DATE`.
- Maintain `manualDueDateL` and `manualDueDateR` variables during the event loop.
- Reset these variables when a `USE_LEFT`/`USE_RIGHT` or `CHANGE_LEFT`/`CHANGE_RIGHT` event occurs (as a new cycle starts).
- The final `nextL` and `nextR` should prioritize the latest `UPDATE_DUE_DATE` if it exists for the current cycle.

## 2. UI Changes

### `src/ui/Home.tsx`

- Wrap the "Next: [Date]" text in a clickable element (e.g., a small button or a span with `cursor: pointer`).
- Add a state for `editingEye` and `editDateValue`.
- Reuse or create a variation of `UsageModal` (e.g., `AdjustDateModal`) to allow picking a new date.
- On confirm, save the `UPDATE_DUE_DATE` event and call `upsertCycle` to update the background worker/notifications.

## 3. Data Layer

- No changes needed to `src/data/repo.ts` as it handles generic `LensEvent` objects.
