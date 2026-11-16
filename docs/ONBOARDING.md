# Onboarding

Do all of this **before Thursday**. On the day, we build; we don't install.

## Checklist

- [ ] GitHub account created, username sent to Raphael
- [ ] Invitation to the repo accepted (GitHub email or github.com/notifications)
- [ ] git and GitHub CLI installed, logged in
- [ ] Repo cloned on your computer
- [ ] Your AI tool installed, signed in, and it passes the test questions below

## 1. GitHub

1. Create an account on [github.com](https://github.com) and send your username to Raphael.
2. When the invitation arrives, accept it.

## 2. git + GitHub CLI

- **Windows:** install [Git for Windows](https://git-scm.com/download/win) and
  [GitHub CLI](https://cli.github.com). Then run every command below in **Git Bash** (installed
  with Git for Windows), not in PowerShell or cmd.
- **Mac:** run `xcode-select --install` for git, then install [GitHub CLI](https://cli.github.com).

Close and reopen your terminal after installing, so it finds the new commands.

Log in to GitHub. When `gh auth login` asks, choose: GitHub.com → HTTPS → **Yes** to
authenticate git → log in with a web browser.

```bash
gh auth login
git config --global user.name "Your Name"
git config --global user.email "the-email-of-your-github-account"
```

Then go to the folder where you keep your projects (for example `Documents`) and clone:

```bash
cd ~/Documents
gh repo clone Sithey/hackaton-19-11-26
```

## 3. Your AI tool

Pick the one that matches your subscription. All of them read the same project rules
(`AGENTS.md`). Always open the **`hackaton-19-11-26` folder itself**, not a parent folder:
otherwise your agent won't see the project rules and skills.

### Gemini student plan → Antigravity (most of the team)

1. Download Antigravity from [antigravity.google](https://antigravity.google) and install it.
2. Sign in with the Google account where you activated your student Gemini plan.
3. Open the `hackaton-19-11-26` folder you cloned.
4. Nothing else to install: the Superpowers skills are already in the repo (`.agents/skills/`).
5. Run the [test questions](#4-test-your-agent).

### ChatGPT → Codex

1. Install the Codex app or CLI ([developers.openai.com/codex](https://developers.openai.com/codex))
   and sign in with your ChatGPT account.
2. Open the `hackaton-19-11-26` folder. Codex reads `AGENTS.md` and `.agents/skills/`
   automatically.
3. Run the [test questions](#4-test-your-agent).

### Claude (Pro or Max plan) → Claude Code

1. Install Claude Code ([code.claude.com](https://code.claude.com)) and sign in.
2. Run `claude` in the `hackaton-19-11-26` folder. It reads `CLAUDE.md`, which points to
   `AGENTS.md`.
3. Inside Claude Code (not in the terminal), install Superpowers, then restart Claude Code.
   Claude Code doesn't read the copy in `.agents/skills/`.
   ```
   /plugin install superpowers@claude-plugins-official
   ```
4. Run the [test questions](#4-test-your-agent).

## 4. Test your agent

Ask these two questions without mentioning any file name:

1. "Before changing anything here: what's your process for a small bug fix in this project,
   and what would you name the branch for issue 12?"
   → It should talk about **hackathon mode**, `systematic-debugging`, and a branch like
   `fix/12-...`.
2. "Which skills do you have from this workspace?"
   → It should list skills like `systematic-debugging` and `verification-before-completion`.

If the answers don't match, tell Raphael.

## 5. Your first pull request

Read [CONTRIBUTING.md](../CONTRIBUTING.md). It walks you through the whole loop with your agent.
