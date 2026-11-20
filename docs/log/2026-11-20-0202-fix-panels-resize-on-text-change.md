# Fix: panels resize on text change

- **Who:** Antigravity
- **PR / issue:** none (layout bug)
- **What:** Added `w-full` to every `<main>` element so it always fills the flex-column `<body>` instead of shrinking to its content. Added `min-h-[1.5rem] truncate` to the tip cell in the status row so it never collapses or widens the layout when a tip appears or disappears.
- **Why:** `<body>` is `flex flex-col`; `mx-auto` without `w-full` makes `<main>` shrink-wrap its content, so any text change resized the panels (`w-full max-w-[…]` inherited the shrinking width).
- **Notes:** None.
