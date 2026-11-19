# AGENTS.md

Shared rules for every AI agent working in this repo (Antigravity, Codex, Claude Code, Gemini CLI).
Read this file fully before doing anything.

## About this project

Dance tutor: someone sees a dance trend on TikTok and wants to do it. The app teaches it like a
patient dance teacher. The dance is split into short moves, the learner practices one move at a
time (slow motion, loop, mirror), then the webcam watches them, shows which body part is wrong
and tells them how to fix it.

## Stack

One Next.js app, front and back together: Next.js (App Router) + TypeScript + Tailwind CSS +
shadcn/ui.

- The Next.js docs for the exact installed version are in `node_modules/next/dist/docs/`.
  Check them before using a Next.js API instead of relying on memory.
- Server Components by default. Add `"use client"` only to components that need state,
  effects or browser APIs.
- Folders:
  - `app/`: pages and layouts
  - `app/api/`: HTTP endpoints (route handlers)
  - `lib/server/`: business logic, database, external APIs (server only)
  - `components/ui/`: shared UI components (shadcn/ui)
  - `components/dance/`: app components
  - `lib/pose/`: browser pose code and pure scoring math (not server)

## Database

Postgres through Prisma 7 (`prisma/schema.prisma`). The dev database is shared by the whole team.

- Use the Prisma client only through `lib/server/db.ts`. Never create another `PrismaClient`.
- Never run `prisma migrate`, `prisma db push`, `prisma migrate reset` or anything that changes
  the schema or deletes data. Only Raphael changes the schema.
- After pulling `main`, run `npm install` (it regenerates the Prisma client).
- `DATABASE_URL` lives in `.env.local`, never committed.

## How to run

1. `npm install` (also regenerates the Prisma client and copies the MediaPipe files).
2. Create `.env.local` with `DATABASE_URL` (Raphael sends it) and, optionally, `UPLOAD_DIR`
   (where uploaded videos are stored, default `./uploads`).
3. `npm run dev`, then open http://localhost:3000.
4. `npm test` runs the tests, `npm run build` checks the production build.

The webcam only works on `localhost` or over HTTPS.
Videos stay on the computer that uploaded them: with the shared dev database, trends added by
teammates are hidden from your Library.

## Working with the team

The people you work with are students, often new to programming and git.

- Before acting, say in one or two plain sentences what you're going to do.
- After acting, explain what changed and how to check it.
- If a request breaks a rule in this file, explain the rule instead of doing it.
- Never add a dependency without Raphael's OK: every PR shares `package.json` and the
  lockfile, the main source of merge conflicts.
- Keep changes small and focused on the task. Don't refactor or reformat code you weren't
  asked to touch.

## Hackathon mode (how to use the Superpowers skills)

The Superpowers skills live in `.agents/skills/`. **These project rules take precedence over
the skills**, including the `using-superpowers` instruction to invoke a skill before every task.

- **Team lead exception:** Raphael (team lead) builds the base project with the full
  Superpowers flow (brainstorming → spec → plan → execution). For Raphael, hackathon mode,
  the "never commit to `main`" rule and the protected-areas rule don't apply; all other rules
  do. The exception is on only when a local, git-ignored `CLAUDE.local.md` explicitly says the
  user is Raphael; never assume it otherwise. The rest of this section applies to everyone else.
- **Small task = any issue opened by Raphael**, whatever it contains (new pages included).
  Don't ask again whether it's too big. Do NOT brainstorm and do NOT write spec or plan files.
  Read the issue, make the change, verify it.
- **Skills for a small task: only these three.**
  - `systematic-debugging` for bugs. When it asks for a failing test: write one only if the
    project already has tests; otherwise reproduce the bug by running the app.
  - `verification-before-completion` before saying it's done or opening a PR: run the app and
    check the change actually works.
  - `receiving-code-review` when Raphael requests changes on a PR. Raphael's review comments
    apply: if one seems wrong, explain why to the user and ask on the PR, don't skip it.
  - Use no other skill unless Raphael asks. In particular: never a worktree (work on a normal
    branch in this folder), no subagents, no review skills. To finish, follow step 4 of
    [CONTRIBUTING.md](CONTRIBUTING.md).
- **Bigger than one issue** = work no issue covers, or that goes beyond what the issue
  describes (a new data model, changes across several areas). Stop and tell the user to check
  with Raphael first.

## Code style

- **Reuse before writing.** Before creating a helper, hook, component or API route, search the
  repo for one that already does it. Then prefer what the stack already gives you (Next.js,
  shadcn/ui, Prisma, Tailwind). Only if neither fits, write your own; a new library needs
  Raphael's OK.
- **Comments only for the why**: a non-obvious choice, a pitfall, a workaround. No comments
  that repeat the code, no banners, no change notes ("added…", "fixed…"), no commented-out code.
- Leave no `console.log` or debug code behind.

## UI rules

- Reuse existing components from `components/ui/`. Need a shadcn/ui component that isn't
  there yet? Ask Raphael (adding one changes `package.json`).
- Colors, fonts and spacing come from the theme variables in `app/globals.css`. Never
  hardcode new colors.
- Never add a new UI library, CSS framework or icon set.
- If a component you need doesn't exist, build it from the existing ones and match their look.

## Protected areas

Don't change these without Raphael's explicit OK. If the task needs it, stop and say so.

- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/`, `.github/`
- `package.json` and the lockfile, `prisma/`
- `lib/server/`, `app/layout.tsx`, `app/globals.css`
- Config: `next.config.*`, `tsconfig.json`, `.env.example`
- `lib/pose/` (except `lib/pose/tips.ts`), `components/dance/practice-session.tsx`, `app/api/`,
  `Dockerfile`, `scripts/`, `vitest.config.mts`, `public/mediapipe/`

## Git workflow

- Never commit or push to `main`. Every change goes through a pull request.
- Never approve, merge or close a PR: only Raphael does.
- Start every new branch from the latest `main`: commit or stash your work, then
  `git checkout main`, `git pull`, `git checkout -b <branch>`.
  Never branch from another feature branch.
- One issue = one branch = one PR. Branch name: `<type>/<issue-number>-<short-name>`,
  e.g. `fix/12-login-button`, `feat/15-search-bar`.
- Small commits with clear messages: `fix: align login button (#12)`.
- Before opening the PR: merge the latest `main` into the branch, resolve conflicts, run the
  app again.
- Never run `git push --force`, `git reset --hard`, or delete branches unless the user
  explicitly asks and understands what it does.
- Fill in the PR template, with a screenshot for anything visible.

## Progress trace

Every PR adds exactly one new file in `docs/log/`, using the format in
[docs/log/README.md](docs/log/README.md). Never edit someone else's log file.

## Secrets

Never commit API keys, tokens or `.env` files. Document needed variables in `.env.example`.

- Calls that need a secret key only from server code (`lib/server/`, route handlers), never
  from the browser.
- Never put a key in a `NEXT_PUBLIC_` variable: those are sent to the browser.

## Language

Everything written in the repo is in English: code, comments, commit messages, PRs, docs.
You may chat with the user in whatever language they use.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
