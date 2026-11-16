# Team lead checklist

For Raphael. Students: see [ONBOARDING.md](../ONBOARDING.md) and
[CONTRIBUTING.md](../../CONTRIBUTING.md).

## Before Thursday

- [ ] Send [pre-hackathon-message.md](pre-hackathon-message.md) to the team, collect GitHub
      usernames, add them as collaborators (write access).
- [ ] Read the hackathon rules: what may be prepared in advance, repo visibility at
      submission, deadlines, judging criteria.
- [ ] **Antigravity check** (couldn't be tested on the Mac). Open the repo in Antigravity (or
      ask one student to), run the onboarding [test questions](../ONBOARDING.md#4-test-your-agent),
      then two behavior checks:
  - "Fix a typo in README.md" → must NOT brainstorm or write spec/plan files.
  - "Work on this issue: add an About page" → must NOT stop to ask Raphael (an issue is a
    small task).
  - If the rules aren't picked up: in `.agents/rules/read-agents-md.md`, reference the file
    with Antigravity's inline syntax `@[AGENTS.md](../../AGENTS.md)`.

## On the day: base project

1. Scaffold Next.js **next to** the repo: `create-next-app` refuses a folder that's not empty.
   ```bash
   cd ..
   npx create-next-app@latest next-tmp --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
   ```
2. Move it in without overwriting the kit:
   ```bash
   rsync -a --exclude .git --exclude node_modules --exclude README.md --exclude AGENTS.md \
     --exclude CLAUDE.md --exclude .gitignore next-tmp/ hackaton-19-11-26/
   ```
   - Append Next's managed block from `next-tmp/AGENTS.md` to the end of our `AGENTS.md`
     (it points agents to the bundled docs). Keep the rest of ours as is.
   - Keep our `CLAUDE.md` (it already imports `AGENTS.md`).
   - Merge the lines of `next-tmp/.gitignore` into ours, then `npm install` in the repo.
3. `npx shadcn@latest init` → components in `components/ui/`, theme in `app/globals.css`.
4. `next.config.ts`: `output: 'standalone'` for self-hosting.
5. Build the walking skeleton (runs end to end, even ugly) + UI base with Claude Design, full
   Superpowers flow. Deploy it.
6. **Before opening any issue**, fill `AGENTS.md`: About this project, How to run
   (`npm install`, `npm run dev`, `npm run build`), adjust Stack folders if needed, extend
   Protected areas with the base's core files. Commit and push to `main`.
7. Ask one student to pull, run the app, and pass the onboarding test with Antigravity.
8. Open small issues (feature/bug templates, "Done when" filled), one per student.

## During the build

- Review PRs in batches. Claude Code can pre-review: `/code-review <PR number>`.
- A PR that breaks the demo gets reverted.
- If the topic needs Python: split into `web/` (Next.js) + `api/` (FastAPI) in this repo, and
  update the Stack and Protected areas sections of `AGENTS.md`.
