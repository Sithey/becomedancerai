# Hide score in Practice and add Nice prompt

- **Who:** Ido
- **PR / issue:** Practice learning flow
- **What:** Removed live score display during move-by-move Practice, added a 1-second "Nice!" prompt on passing a move, and added a button to the Full run when all moves are completed.
- **Why:** Practice mode is intended for learning without pressure; the score belongs at the end of the Full run.
- **Notes:** Pass condition (`isPassed` with threshold 70) remains unchanged. Coordinated with #2 (confetti/result screen).
