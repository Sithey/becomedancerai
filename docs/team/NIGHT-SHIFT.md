# Night shift: the deputy and handoffs

## Picking the deputy

Picked on site after 2–3 hours, not before: the most reliable person who understands the
branch → PR loop. The deputy sleeps in the opposite shift from Raphael.

## What the deputy does

- **Decides:** who takes which issue, small product or UI questions, turning a reported bug
  into an issue.
- **Unblocks:** teammates stuck on git, setup or their agent.
- **Watches:** the app on `main` still runs.

## What the deputy doesn't do

- Change the database schema, the architecture, or add dependencies.
- Merge to `main`, unless Raphael chose option B below.

## Wake Raphael if

- `main` is broken or the demo doesn't work anymore.
- Nobody can make progress.

Anything else: write the question in the handoff issue and it waits.

## PRs while Raphael sleeps

- **Option A (default):** PRs wait. Builders keep working on their branches; Raphael reviews
  and merges in one batch on waking up. Raphael leaves enough issues open before sleeping.
- **Option B:** the deputy may approve for the night. Raphael adds the deputy to
  `.github/CODEOWNERS` (`* @Sithey @<deputy>`) before sleeping and removes them in the morning.

## Handoffs

One pinned GitHub issue named **"Night handoff"**. Both directions are comments on it, so
there's a written trace and nobody needs a PR at 4am.

Raphael, before sleeping:

```markdown
**Going to sleep — back at <time>**
- State of main: <works / known issue>
- Issues ready to pick: #.., #..
- Open questions (can wait): ...
- Wake me if: main broken, demo down, everyone blocked
```

Deputy, when Raphael wakes up:

```markdown
**While you slept**
- PRs waiting: #.., #..
- Decisions I made: ...
- Problems / questions for you: ...
```
