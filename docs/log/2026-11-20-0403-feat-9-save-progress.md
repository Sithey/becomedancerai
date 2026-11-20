# Save progress per trend in browser

- **Who:** Ido
- **PR / issue:** #9
- **What:** Added `lib/progress.ts` to remember best score per move, first and best Full run score, and last practiced move in `localStorage`. Updated Practice to resume at the last practiced move and save move loop scores, Full run to save final scores, and Learn page to display "Best full run" score and a "Reset progress" button with confirmation.
- **Why:** Allows learners to track their improvements and resume practice where they left off without requiring accounts or a backend database.
- **Notes:** Fully tested with 8 unit tests in `lib/progress.test.ts`. Uses defensive `localStorage` access so it works safely in SSR, browser, and test environments.
