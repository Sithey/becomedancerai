# Day plan

Ruppin programming club "White Night" hackathon: **Thursday 20:00 → Friday 09:00** (coding
stops at 09:00, event ends at 10:00). The topic is revealed on the night.

## Roles

| Role | Who | Owns |
|------|-----|------|
| Tech lead | Raphael | Architecture, base project, issues, PR reviews and merges |
| Deputy | Picked on site | Runs the team while Raphael sleeps (see [NIGHT-SHIFT.md](NIGHT-SHIFT.md)) |
| Builders | Students comfortable with code | Issues → PRs with their AI agent |
| Pitch & demo | 1–2 students | Slides, demo script, rehearsals, timing |
| Research & content | 1–2 students | Problem validation, user interviews, data/content, mockups |

Everyone can switch: a pitch person can pick up an issue, a builder can help rehearse.

## Timeline

```
20:00  Kickoff: topic → 3 ideas → team vote (KICKOFF-BRIEF.md), roles, setup check
20:45  Raphael: Superpowers brainstorm + spec on the chosen idea
21:00  Raphael: walking skeleton + UI base + deploy
       Others: pitch outline, user interviews (other teams are users too), content, mockups,
       setup for anyone who isn't ready
00:00  Base pushed, AGENTS.md filled, issues open → build
00:30  Shift A sleeps (~2h30), pitch & demo people first     ← deputy awake
03:00  Shift B sleeps (~2h30), Raphael ~03:30–05:00          ← deputy awake
06:00  Feature freeze: only bug fixes and polish on the demo flow
06:00  Pitch & demo (rested): slides, rehearsal on the real app, backup video
08:30  Final rehearsal with a timer
09:00  Code stops
```

The deputy must sleep in the opposite shift from Raphael.

## Rules of the night

- `main` must always run. A PR that breaks the demo gets reverted, no debate.
- Blocked for 15 minutes → ask.
- The backup video of the demo is recorded **before** the freeze, not at 08:55.
- Before submitting, check the hackathon rules (repo visibility, deadlines, what's required).
