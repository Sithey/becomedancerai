# Kickoff brief

For Raphael at 20:00. Paste the prompt below into Claude with the topic, get 3 ideas, let the
team vote, then run the Superpowers brainstorm on the winner. Target: idea chosen by 20:45.

## Prompt

```text
Hackathon topic just announced: <PASTE TOPIC>

Constraints:
- 13 hours, overnight (20:00 to 09:00), short pitch + live demo after.
- Team: <N> students, mostly beginners, coding with AI agents (mostly Antigravity/Gemini).
  I'm the only experienced developer; I build the base, they do small issues.
- Stack: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, Postgres + Prisma,
  self-hosted. LLM API available: <WHICH>.
- Users are in the room: students at a college programming-club hackathon; judges are from
  the club too.
- Must have: one demo flow that works end to end and can be shown in 90 seconds.
- Avoid: hardware, data we don't have, more than one external integration, a plain chatbot
  wrapper.

Give me 3 ideas. For each:
1. Problem: who has it, how it hurts.
2. The 90-second demo flow, step by step.
3. What AI does that couldn't be done without it (if AI is used).
4. Scope for 13 hours: must / should / won't.
5. Main risk and how we'd cut scope if it hits.
6. How the team splits: base (me), issues (builders), pitch.
Then recommend one and say why.
```

## Team vote (15 min)

1. Read the 3 ideas out loud (5 min).
2. Questions (5 min).
3. Everyone votes; Raphael breaks ties.
