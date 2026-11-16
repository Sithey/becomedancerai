# AGENTS.md

Shared rules for every AI agent working in this repo (Antigravity, Codex, Claude Code, Gemini CLI).
Read this file fully before doing anything.

## About this project

<!-- Filled in on hackathon day: what we're building, for whom, the one demo flow that must work. -->
_To be defined on hackathon day._

## How to run

<!-- Filled in once the stack is chosen: install, run, test commands. -->
_To be defined once the base project exists._

## Working with the team

The people you work with are students, often new to programming and git. Communication
in the team is in English.

- Before acting, say in one or two plain sentences what you're going to do.
- After acting, explain what changed and how to check it.
- If a request breaks a rule in this file, explain the rule instead of doing it.
- Ask before installing any new dependency.
- Keep changes small and focused on the task. Don't refactor or reformat code you weren't
  asked to touch.

## Hackathon mode (how to use the Superpowers skills)

The Superpowers skills live in `.agents/skills/`. **These project rules take precedence over
the skills**, including the `using-superpowers` instruction to invoke a skill before every task.

- **Team lead exception:** Raphael (team lead) builds the base project with the full
  Superpowers flow (brainstorming → spec → plan → execution). Hackathon mode does not apply
  to Raphael. It is turned on only by Raphael's local, git-ignored `CLAUDE.local.md`; never
  assume it otherwise. Everything below applies to everyone else.
- **Small task** (one issue: a fix, a tweak, a small feature): do NOT brainstorm and do NOT
  write spec or plan files. Read the issue, make the change, verify it.
  - Bug: use `systematic-debugging`. Find the root cause before changing code.
  - Before saying it's done or opening a PR: use `verification-before-completion`. Run the
    app and check the change actually works.
- **Bigger than one issue** (new page, new data model, changes across several areas): stop
  and tell the user to check with Raphael (team lead) first. If Raphael agrees, use the full flow:
  `brainstorming` → spec in `docs/superpowers/specs/` → `writing-plans` → execute.
- Don't use `subagent-driven-development` or `dispatching-parallel-agents` unless Raphael
  asks: they use up the AI quota fast.

## UI rules

- Reuse existing components from `<components folder, filled once the base exists>`.
- Colors, fonts and spacing come from `<theme file, filled once the base exists>`. Never
  hardcode new colors.
- Never add a new UI library, CSS framework or icon set.
- If a component you need doesn't exist, build it from the existing ones and match their look.

## Protected areas

Don't change these without Raphael's explicit OK. If the task needs it, stop and say so.

- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/`, `.github/`
- <!-- Filled once the base exists: config, data model, routing, theme file... -->

## Git workflow

- Never commit or push to `main`. Every change goes through a pull request.
- One issue = one branch = one PR. Branch name: `<type>/<issue-number>-<short-name>`,
  e.g. `fix/12-login-button`, `feat/15-search-bar`.
- Small commits with clear messages: `fix: align login button (#12)`.
- Before opening the PR: merge the latest `main` into the branch, resolve conflicts, run the
  app again.
- Never run `git push --force`, `git reset --hard`, or delete branches unless the user
  explicitly asks and understands what it does.
- Fill in the PR template (`.github/pull_request_template.md`), including a screenshot for
  anything visible.

## Progress trace

Every PR adds exactly one new file in `docs/log/`, using the format in
[docs/log/README.md](docs/log/README.md). Never edit someone else's log file.

## Secrets

Never commit API keys, tokens or `.env` files. Document needed variables in `.env.example`.

## Language

Everything written in the repo is in English: code, comments, commit messages, PRs, docs.
You may chat with the user in whatever language they use.
