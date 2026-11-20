# Move timeline

- **Who:** Student
- **PR / issue:** issue number to fill in
- **What:** New `MoveTimeline` component: one clickable box per move, current move highlighted, passed moves marked. Used in Learn (jumps to the move) and in Practice, where it replaces the row of move badges and clicking restarts practice on that move.
- **Why:** Let learners jump to any move instead of only going next or previous.
- **Notes:** Theme colors only. The Practice edit is a small `selectMove` handler plus a `key` on `CountIn` so the count-in restarts when jumping.
