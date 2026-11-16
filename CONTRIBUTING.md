# Contributing

New to git or to AI coding agents? This page is for you. Raphael (team lead) builds the
base of the project; you improve it through small pull requests (PRs).

**On Windows:** run every command from these docs in **Git Bash** (installed with Git for
Windows), not in PowerShell or cmd.

## Golden rules

1. Never push to `main`. GitHub blocks it anyway.
2. Never approve, merge or close PRs: only Raphael does.
3. One issue = one branch = one PR, always started from the latest `main`.
4. Run the app and check your change works before opening the PR.
5. Stuck for more than 15 minutes? Ask Raphael or a teammate.

## The loop

### 1. Pick an issue

On GitHub → **Issues**, pick one nobody is assigned to and assign yourself.

### 2. Let your agent work on it

Open the repo in your AI tool (Antigravity, Codex or Claude Code) and ask, for example:

> Work on issue #12: <paste the issue text>. Follow AGENTS.md. Start a branch from the latest
> main, make the change, run the app to check it, and tell me how to test it myself.

Your agent knows the project rules (`AGENTS.md`) and the Superpowers skills. It will create
a branch, make the change and verify it.

### 3. Check it yourself

Run the app, look at the result. If something's off, tell your agent what you see.

### 4. Open the PR

Ask your agent:

> Merge the latest main into my branch, add my log file in docs/log/, commit, push, and give
> me the link to open the pull request.

On GitHub, fill in the PR template (what, how you tested, screenshot). Raphael is added as
reviewer automatically.

### 5. While you wait, and after review

- **Waiting for review:** don't wait. Start the next issue from `main`:
  ask your agent "Commit my work, go back to main, pull, and start issue #<n>".
- **Changes requested:** ask your agent to switch back to that branch, fix, commit, push.
  The PR updates itself.

## The same thing by hand

```bash
git checkout main
git pull
git checkout -b fix/12-login-button
# ...make your change...
git add -A
git commit -m "fix: align login button (#12)"
git push -u origin fix/12-login-button
```

`git push` prints a link: open it to create the PR.

## When git complains

- **Merge conflict:** ask your agent: "Help me resolve the merge conflict. Explain each
  conflict to me, keep both changes where possible, then run the app." Not sure? Call Raphael.
- **Anything with `--force` or `reset --hard`:** don't. Ask Raphael first.

## Good prompts for your agent

- "Explain what this file does in simple terms before we change it."
- "This button doesn't work: <what you see>. Find the root cause before fixing it."
- "Show me what you changed and why, file by file."
- "Is this task bigger than the issue describes? If yes, say so before starting."
