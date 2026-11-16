# Onboarding

Do all of this **before Thursday**. On the day, we build; we don't install.

## Checklist

- [ ] GitHub account created, username sent to Raphael
- [ ] Invitation to the repo accepted (GitHub email or github.com/notifications)
- [ ] git and GitHub CLI installed, logged in
- [ ] Repo cloned on your computer
- [ ] Your AI tool installed, signed in, and it answers a question about the repo

## 1. GitHub

1. Create an account on [github.com](https://github.com) and send your username to Raphael.
2. When the invitation arrives, accept it.

## 2. git + GitHub CLI

- **Windows:** install [Git for Windows](https://git-scm.com/download/win) and
  [GitHub CLI](https://cli.github.com).
- **Mac:** run `xcode-select --install` for git, then install [GitHub CLI](https://cli.github.com).

Then, in a terminal:

```bash
gh auth login        # GitHub.com → HTTPS → "Yes" to authenticate git → log in with browser
git config --global user.name "Your Name"
git config --global user.email "the-email-of-your-github-account"
gh repo clone Sithey/hackaton-19-11-26
```

## 3. Your AI tool

Pick the one that matches your subscription. All of them read the same project rules
(`AGENTS.md`).

### Gemini student plan → Antigravity (most of the team)

1. Download Antigravity from [antigravity.google](https://antigravity.google) and install it.
2. Sign in with the Google account that has your student Gemini plan.
3. Open the `hackaton-19-11-26` folder you cloned.
4. Nothing else to install: the Superpowers skills are already in the repo (`.agents/skills/`).
5. **Test:** ask the agent "What does AGENTS.md say about small tasks?". It should describe
   "Hackathon mode". If it doesn't know, tell Raphael.

### ChatGPT → Codex

1. Install the Codex app or CLI ([developers.openai.com/codex](https://developers.openai.com/codex))
   and sign in with your ChatGPT account.
2. Open the repo folder. Codex reads `AGENTS.md` and `.agents/skills/` automatically.
3. **Test:** same question as above.

### Claude → Claude Code

1. Install Claude Code ([code.claude.com](https://code.claude.com)) and sign in.
2. Install Superpowers (Claude Code doesn't read the copy in `.agents/skills/`):
   ```
   /plugin install superpowers@claude-plugins-official
   ```
3. Run `claude` in the repo folder. It reads `CLAUDE.md`, which points to `AGENTS.md`.
4. **Test:** same question as above.

## 4. Your first pull request

Read [CONTRIBUTING.md](../CONTRIBUTING.md). It walks you through the whole loop with your agent.
