# BecomeDancerAI

**From scrolling to dancing.** Paste a TikTok dance, learn it move by move, and let your webcam
tell you what to fix.

[![Watch the 53-second pitch](docs/pitch/poster.jpg)](docs/pitch/becomedancerai-pitch.mp4)

**Try it live: [becomedancerai.sharpheberg.com](https://becomedancerai.sharpheberg.com)**

Built overnight at the Ruppin programming club "White Night" hackathon (Nov 19–20, 2026).

## What it does

1. **Import a trend.** Paste a TikTok link or upload the video. The app splits the dance into
   short moves.
2. **Learn one move at a time.** Slow motion, loop and mirror, like a patient dance teacher.
3. **Get coached.** Your webcam tracks your body, highlights the limb that's off and tells you
   how to fix it ("Lower your left arm"). Each move gets a score.

## How it works

Pose detection runs in the browser with [MediaPipe Pose Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker).
The dancer's video and your webcam are both turned into body landmarks, then compared limb by
limb to score each one and pick the most useful tip.

Stack: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Postgres with Prisma.

## Run it locally

You need Node.js and a Postgres database.

```bash
npm install
echo 'DATABASE_URL=postgresql://user:password@localhost:5432/becomedancerai' > .env.local
npx prisma migrate deploy
npm run dev
```

Then open http://localhost:3000. The webcam only works on `localhost` or over HTTPS.
`npm test` runs the tests.

## Team

| | GitHub | LinkedIn |
|---|---|---|
| Raphael Zerbib | [@Sithey](https://github.com/Sithey) | [LinkedIn](https://www.linkedin.com/in/raphael518/) |
| Omer Ben Ami | [@omerfinancial123-alt](https://github.com/omerfinancial123-alt) | [LinkedIn](https://www.linkedin.com/in/omer-ben-ami-629107375/) |
| Ido Butbool | [@idobu11-hue](https://github.com/idobu11-hue) | [LinkedIn](https://www.linkedin.com/in/%D7%A2%D7%99%D7%93%D7%95-%D7%91%D7%95%D7%98%D7%91%D7%95%D7%9C-857815450/) |
| Or Yackobovitch | [@oryackov-cell](https://github.com/oryackov-cell) | [LinkedIn](https://www.linkedin.com/in/%D7%90%D7%95%D7%A8-%D7%99%D7%A2%D7%A7%D7%95%D7%91%D7%95%D7%91%D7%99%D7%A5-870353451/) |

We built it as a team of students working with AI coding agents. The rules they followed are in
[AGENTS.md](AGENTS.md), how we worked is in [CONTRIBUTING.md](CONTRIBUTING.md) and
[docs/team/](docs/team/DAY-PLAN.md), and every merged change left a note in
[docs/log/](docs/log/README.md).
