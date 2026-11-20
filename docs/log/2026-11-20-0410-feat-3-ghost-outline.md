# Ghost outline to frame yourself

- **Who:** Raphael (with Claude Code)
- **PR / issue:** #3
- **What:** A semi-transparent body silhouette shows on the learner panel until the whole body is in frame, then fades out. If no one is detected for 2 seconds the panel says "Step back so your whole body is visible"; other framing issues show their own message.
- **Why:** So the learner knows where to stand before dancing.
- **Notes:** Reuses `framingIssue`; the 2 s timing lives in `lib/pose/framing-state.ts` (tested). Framing state in `practice-session.tsx` updates at most every 250 ms. Not tried with a real webcam yet.
