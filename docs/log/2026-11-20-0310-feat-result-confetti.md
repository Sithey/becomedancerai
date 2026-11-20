# Result screen with score bars and full-page confetti

- **Who:** Ido
- **PR / issue:** Result screen with confetti (#2)
- **What:** Added a proper result screen for Full run with big score and move score bars (highlighting moves < 70 with a "Practice" link), and a full-page canvas confetti animation that runs for a few seconds on "All moves passed!" and Full run completion.
- **Why:** Gives the dancer clear visual feedback on which specific moves need improvement, and celebrates completing the dance with a fun celebration.
- **Notes:** Isolated in `components/dance/run-result.tsx` and `components/dance/confetti.tsx`. Confetti uses canvas with theme colors (`--primary`, `--destructive`, `--ring`, `--chart-1`, `--chart-2`) and covers the entire page with `fixed inset-0`.
