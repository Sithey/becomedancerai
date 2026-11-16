# Day plan

> **Pending:** hackathon duration and whether the topic is known in advance. Phases are in
> % of total time; adjust once we know.

## Roles

| Role | Who | Owns |
|------|-----|------|
| Tech lead | Raphael | Architecture, base project, issues, PR reviews and merges |
| Builders | Students comfortable with code | Issues → PRs with their AI agent |
| Pitch & demo | 1–2 students | Slides, demo script, rehearsals, timing |
| Research & content | 1–2 students | Problem validation, user quotes, data/content, mockups |

Everyone can switch: a pitch person can pick up an issue, a builder can help rehearse.

## Phases

### 1. Kickoff (~10%)

- Whole team: brainstorm the idea together, in English. Raphael runs the Superpowers
  brainstorm and writes the spec.
- Agree on the **one demo flow** that must work at the end.
- Everyone checks their setup (see [ONBOARDING.md](../ONBOARDING.md)).

### 2. Base (~25%)

- Raphael builds a walking skeleton (runs end to end, even ugly) + UI base with Claude Design.
- Pitch & demo: problem statement, slide outline, demo script draft.
- Research & content: user research, data/content the app needs, mockups for later screens.
- End of phase: Raphael fills the `AGENTS.md` placeholders and pushes the base (see
  [THURSDAY-CHECKLIST.md](THURSDAY-CHECKLIST.md)) before opening any issue.

### 3. Build (~45%)

- Raphael opens small issues; builders pick them up (see [CONTRIBUTING.md](../../CONTRIBUTING.md)).
- Raphael reviews PRs in batches (Claude Code can pre-review), keeps `main` always demoable.
- Pitch keeps the slides in sync with what actually works.

### 4. Freeze & pitch (last ~20%)

- **Feature freeze:** only bug fixes and polish on the demo flow.
- Rehearse the demo on the real app at least twice, with a timer.
- Backup: screenshots or a recorded video of the demo in case something breaks live.

## Rules of the day

- `main` must always run. A PR that breaks the demo gets reverted, no debate.
- Blocked for 15 minutes → ask.
- Before submitting, check the hackathon rules (repo visibility, deadlines, what's required).
