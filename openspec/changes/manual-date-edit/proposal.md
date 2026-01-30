# Proposal: Manual Next Due Date Editing

## Problem

Currently, the "Next Due" date for lenses is automatically calculated based on the frequency settings (e.g., 14 days for bi-weekly). While there is a confirmation modal when using a lens that allows adjusting the date, there is no way to change the due date *after* the lens has already been started without deleting and re-adding events. Users may want to extend or shorten the current cycle manually (e.g., if they didn't wear them for a few days).

## Proposed Solution

1. **Home Screen Enhancement**: Make the "Next: [Date]" display in the Status Card interactive. Clicking it should open a date picker modal to update the `manualDueDate` for the current active lens cycle.
2. **Event System**: Introduce a new event type `UPDATE_DUE_DATE` or repurpose the `meta` of the last `USE_X` event. Given the event-sourced nature, adding a specific event `UPDATE_DUE_DATE` is cleaner for tracking changes.
3. **Projection Update**: The `project` function should look for the latest `UPDATE_DUE_DATE` event for each eye that occurs after the last `USE_X` event.

## User Experience

- User sees "Next: Feb 10" on the Home screen.
- User clicks "Feb 10".
- A modal appears: "Adjust Due Date for Left Eye".
- User selects "Feb 12" and clicks "Save".
- The Home screen now shows "Next: Feb 12".
