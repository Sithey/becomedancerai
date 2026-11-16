# Hackathon Team Kit — Design

Date: 2026-11-16 · Hackathon: Thursday 2026-11-19 (Israel)

## Intent

Raphael leads a team of students (Hebrew speakers, working language English) who have
never shipped a project and mostly don't know AI coding agents. Everyone has at least a
Gemini student plan. The kit lets the team work efficiently from minute one, with every
decision and step of progress traced in Markdown in the repo.

## Goals

- One repo, ready before Thursday, whose rules guide every agent (Antigravity, Codex,
  Claude Code) the same way.
- Superpowers available in the repo itself, so students don't install anything for it.
- Beginners can't break `main`: every change goes through a PR that Raphael approves.
- Students arrive with GitHub + Antigravity already installed and working.

## Non-goals

- No product code before the hackathon (most rules forbid it; Raphael checks the rules).
- No slides/pitch content: owned by the students during the event.

## Anti-goals

- Students idle while the base is being built.
- Superpowers' full process applied to every small fix (burns time and Gemini quota).
- Raphael becoming the bottleneck on reviews.
- Merge conflicts on shared tracking files.

## Constraints

- Raphael: Claude Max ($100) + Claude Code + Superpowers + Claude Design, GitHub Education
  (Pro → branch protection works on a private repo).
- Students: mostly Gemini student plan → Antigravity. Some may have ChatGPT (Codex) or Claude.
- All repo content in English.

## Approaches considered

1. **Superpowers copied into the repo (`.agents/skills/`)** — chosen. Codex and
   Antigravity both read workspace skills from `.agents/skills/`; same pinned version for
   everyone; zero install. MIT license, `LICENSE` kept.
2. Each student installs the Superpowers plugin in their tool — rejected: install friction
   on day one, version drift.
3. Copy only a subset of skills — rejected: the "hackathon mode" rule in `AGENTS.md`
   gets the same effect while keeping the full toolbox available.

## Team workflow (decided)

- Raphael builds the base with Claude Code + Superpowers, and the UI base with Claude Design.
- The base ships as a walking skeleton first (runs end to end, even ugly), then the repo
  opens to students.
- Students take issues (small features, forgotten bits, bug fixes) with Antigravity,
  working on branches and opening PRs. Raphael reviews and merges.

## Repo layout

```
README.md               project placeholder + link to onboarding
AGENTS.md               shared rules + hackathon mode (native for Codex)
CLAUDE.md               one line: @AGENTS.md
GEMINI.md               one line: @AGENTS.md (Gemini CLI)
.agents/rules/          one rule: "read AGENTS.md first" (Antigravity fallback)
.agents/skills/         Superpowers skills, pinned to 7.0.2 + its LICENSE
.github/                PR template, issue templates (feature, bug)
CONTRIBUTING.md         git for beginners: branch → commit → PR, and how to let the agent do it
docs/ONBOARDING.md      per-tool setup: Antigravity (main), Codex, Claude Code
docs/superpowers/       specs and plans
docs/log/               one small file per PR (progress trace)
```

### AGENTS.md content

- What the project is and how to run it (filled in once the stack is chosen on Thursday).
- **Hackathon mode:** for an issue-sized task, skip spec and plan. Use
  `systematic-debugging` for bugs and `verification-before-completion` before opening a PR.
  Full brainstorm → spec → plan only for features bigger than one issue, agreed with Raphael.
- **UI rules:** reuse existing components, colors from the theme file, never add a new UI
  library.
- **Protected areas:** list of core files nobody changes without asking Raphael.
- **Git rules:** never push to `main`, one branch per issue, small PRs, run the app and
  attach a screenshot.
- **Trace:** every PR adds one file to `docs/log/` (`YYYY-MM-DD-HHMM-<branch>.md`: what,
  why, who). One file per PR avoids conflicts on a shared log.

### GitHub settings

- Private repo, students added as collaborators (write access, no forks).
- Branch protection on `main`: PR required, 1 approval, no force push. Admins not
  included, so Raphael can push the base directly.
- Claude Code can be used to pre-review PRs.

## Pre-hackathon message to students (English)

Sent before Thursday: create a GitHub account and send the username, install git,
install Antigravity, sign in with the student Google account, check it answers a prompt.

## Day plan

Pending: hackathon duration and whether the topic is known in advance. Draft phases:

1. Team brainstorm together (in English), Raphael runs the Superpowers spec. Students
   start the pitch track (problem research, demo script, slides) and check their setup.
2. Raphael builds the walking skeleton + UI base. Students keep the pitch track going and
   prepare content/data and mockups.
3. Raphael opens issues; students pick them up via Antigravity → PRs.
4. Feature freeze, demo rehearsal, pitch.

## Left to the builder

- Exact wording of templates and docs.
- Verify Antigravity actually loads `AGENTS.md` / `.agents/rules/` and `.agents/skills/`
  with a real session before Thursday.
