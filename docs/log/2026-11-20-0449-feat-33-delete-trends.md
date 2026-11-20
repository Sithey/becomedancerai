# Delete a trend

- **Who:** oryackov-cell
- **PR / issue:** #33
- **What:** Added a confirmed Delete trend action to each Library card and the Learn page. It removes the selected trend and its MP4.
- **Why:** Demo users can browse the shared Library and remove an unwanted upload without leaving other videos affected.
- **Notes:** Deletion is shared for the demo. Tests cover missing IDs, filesystem failures, and restoring the video when a database transaction fails.
