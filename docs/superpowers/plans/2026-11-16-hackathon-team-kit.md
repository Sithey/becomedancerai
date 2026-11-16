# Hackathon Team Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A ready-to-push repo that guides every team member's AI agent the same way, ships Superpowers in-repo, enforces PR-only changes, and onboards beginner students.

**Architecture:** Plain Markdown + config, no product code. `AGENTS.md` is the single source of rules; tool-specific files only point at it. Superpowers skills are vendored into `.agents/skills/` (read natively by Codex and Antigravity).

**Tech Stack:** git, GitHub (Pro via Education), Markdown. Verification with `claude -p` and `codex exec` (both installed locally); Antigravity not installed here.

**Spec:** `docs/superpowers/specs/2026-11-16-hackathon-team-kit-design.md`

## Global Constraints

- All repo content in English.
- No product code before the hackathon.
- Superpowers pinned to 7.0.2, copied from `~/.claude/plugins/cache/claude-plugins-official/superpowers/7.0.2/skills/`, its `LICENSE` kept next to it.
- No symlinks (students may be on Windows).
- Progress trace: one file per PR in `docs/log/`, named `YYYY-MM-DD-HHMM-<branch>.md`.
- Never push to `main` for students; Raphael (admin) may.

## Review Focus

1. A student asks their agent for a small fix and the agent starts a full brainstorm/spec → `AGENTS.md` must name the skills to skip and state it overrides Superpowers' "always invoke" rule. Pinned by Task 4 step 2.
2. Windows student gets CRLF noise in every diff → `.gitattributes` with `* text=auto eol=lf`. Pinned by Task 1 step 3.
3. Claude Code shows every Superpowers skill twice for Raphael (plugin + repo) if it also reads `.agents/skills/` → checked in Task 4 step 1.
4. Two students' log files collide → branch name in the filename; `docs/log/README.md` states it. Pinned by Task 2 step 2.
5. A student's PR changes a core file unnoticed → protected-areas list in `AGENTS.md` + PR template checkbox. Pinned by Task 2 step 2.

---

### Task 1: Repo skeleton + vendored Superpowers

**Files:**
- Create: `.agents/skills/<15 skill folders>/`, `.agents/skills/LICENSE`, `.agents/skills/README.md` (source + version + how to update), `.gitignore`, `.gitattributes`

- [ ] **Step 1:** `git init -b main` in `/Users/raphael/Documents/Development/hackaton/hackaton-19-11-26` (one folder per hackathon; the parent `hackaton/` stays a plain folder).
- [ ] **Step 2:** Copy the 15 skill folders and `LICENSE` from the pinned path.
- [ ] **Step 3:** `.gitattributes`: `* text=auto eol=lf`. `.gitignore`: `.DS_Store`, `node_modules/`, `.env*`, `!.env.example`.
- [ ] **Step 4: Verify** — `ls .agents/skills | grep -vc -E 'LICENSE|README'` → `15`; `grep -L '^name:' .agents/skills/*/SKILL.md` → empty.
- [ ] **Step 5: Commit** `chore: vendor superpowers 7.0.2 skills`.

### Task 2: Agent rules + contribution workflow

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md`), `GEMINI.md` (`@AGENTS.md`), `.agents/rules/read-agents-md.md`, `CONTRIBUTING.md`, `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE/feature.md`, `.github/ISSUE_TEMPLATE/bug.md`, `docs/log/README.md`

`AGENTS.md` sections (spec "AGENTS.md content"): Project (placeholder, filled Thursday) · How to run (placeholder) · Hackathon mode · UI rules · Protected areas (placeholder list) · Git rules · Progress trace · Language (English).

Hackathon mode must say: issue-sized task → no spec/plan files, no brainstorm; bug → `systematic-debugging`; before PR → `verification-before-completion`; bigger than one issue → ask Raphael, then full Superpowers flow. These project rules take precedence over the `using-superpowers` skill.

- [ ] **Step 1:** Write the files.
- [ ] **Step 2: Verify** — `grep -c -E '^## ' AGENTS.md` ≥ 8; `grep -E 'systematic-debugging|verification-before-completion|precedence' AGENTS.md` → 3 hits; PR template contains `docs/log/`, `screenshot`, `protected`; `docs/log/README.md` shows the filename pattern with `<branch>`.
- [ ] **Step 3: Commit** `docs: add shared agent rules and contribution workflow`.

### Task 3: Onboarding + team docs

**Files:**
- Create: `README.md`, `docs/ONBOARDING.md` (before-Thursday checklist; Antigravity setup with student plan; first PR walkthrough; Codex and Claude Code sections, Claude section says install the plugin, repo copy is for Codex/Antigravity), `docs/team/pre-hackathon-message.md`, `docs/team/DAY-PLAN.md` (spec phases + roles; duration/topic marked pending)

- [ ] **Step 1:** Write the files.
- [ ] **Step 2: Verify** — every relative link in `README.md` and `docs/ONBOARDING.md` resolves to an existing file.
- [ ] **Step 3: Commit** `docs: add onboarding and day plan`.

### Task 4: Agent loading check

- [ ] **Step 1:** In the repo, `claude -p "In one line each: (1) what does this project's hackathon mode say about small fixes? (2) list any skills you see from .agents/skills"`. Expected: (1) cites AGENTS.md rules. Note (2) for Review Focus 3.
- [ ] **Step 2:** `codex exec "Without editing files: (1) summarize hackathon mode in one line, (2) can you see the systematic-debugging skill?"`. Expected: both yes.
- [ ] **Step 3:** Fix anything that fails, commit. Antigravity check is left to Raphael (not installed here) — note it in the handoff.

### Task 5: GitHub (only after Raphael confirms)

- [ ] **Step 1:** `gh repo create hackaton-19-11-26 --private --source . --push`.
- [ ] **Step 2:** Branch protection on `main` via `gh api`: required PR, 1 approval, no force push, `enforce_admins: false`.
- [ ] **Step 3: Verify** — `gh api repos/Sithey/hackaton-19-11-26/branches/main/protection` shows those values.
- [ ] **Step 4 (when usernames arrive):** `gh api -X PUT repos/Sithey/hackaton-19-11-26/collaborators/<user> -f permission=push` per student.
