# Elder Help MVP

An older adult talks by voice to **Maya**, an AI helper. Maya books appointments (mocked), logs
medicine, and tells the family when something is beyond her. A family dashboard updates live.

- `/elder`: big portrait of Maya with a glow ring while she speaks, one **Talk to Maya** button, live captions, medicine reminder banner.
- `/family`: latest conversation summaries, appointments, today's medicines, and red alert cards.

Built with Next.js, SQLite (`better-sqlite3`), and the OpenAI Realtime API over WebRTC. Bookings,
SMS, and emergency calls are **not** real.

## Setup

Needs Node 22 or newer.

```bash
git clone <repo> elder-help-mvp && cd elder-help-mvp
cp .env.example .env      # add OPENAI_API_KEY for real voice
npm install
npm run dev
```

Open <http://localhost:3000/elder> and <http://localhost:3000/family> in two browser tabs.

The database is a local file (`data/elder-help.db`, not committed). It is created and seeded with two
medicines on first run. Names live in `src/config/household.ts`.

```bash
npm run reset             # wipe and re-seed for a fresh demo
```

## Fake mode (no API key, no network)

Set `VOICE_PROVIDER=fake` in `.env`. The elder screen shows a text box. Typed messages run through a
keyword parser and call the same tools, so the whole flow works offline. All tests use fake mode.

If `VOICE_PROVIDER=openai` but the key is missing or the voice service is down, the portrait greys
out, Maya shows "Maya is resting, try again soon.", and the same text box takes over.

## Tests

```bash
npm test                  # unit tests (Vitest)
npm run test:e2e          # full demo flow in a real browser (Playwright, fake mode)
```

The e2e run starts its own server on port 3100 with `data/e2e.db`. It uses your installed Google
Chrome. Without Chrome, run `npx playwright install chromium` and then `PW_CHANNEL= npm run test:e2e`.

## Real-voice demo checklist

With `OPENAI_API_KEY` set and `VOICE_PROVIDER=openai`, open both tabs and:

1. Tap **Talk to Maya** and allow the microphone. Say "I need to see my doctor next week."
2. Maya confirms out loud; an appointment appears on the dashboard.
3. Tap **Trigger reminder now**. Maya reminds you about Metformin. Say "I took it." The checklist ticks off.
4. Say "My sink is leaking." Maya says "I've let your family know." A red alert card appears.
5. Tap **End conversation** (or stay silent: after 10 seconds Maya asks "Are you still there?", then ends). A 2 to 3 line summary appears.
6. Check the dashboard shows the summary, the appointment, the medicine log, and the alert, all without refreshing.

Model defaults: realtime `gpt-realtime-2.1`, summaries `gpt-4.1-mini`. Override with
`OPENAI_REALTIME_MODEL` and `OPENAI_SUMMARY_MODEL`.

## How it fits together

- `src/server/`: plain TypeScript business logic over a `Db` handle (tools, conversations, dashboard, reminders, change events). Unit-tested without HTTP.
- `src/app/api/`: thin route handlers. `GET /api/events` is a Server-Sent Events stream; the dashboard falls back to polling every 5 seconds if it drops.
- `src/voice/`: the `VoiceProvider` interface with an OpenAI Realtime provider and a fake provider. The API key stays on the server; the browser gets a short-lived client secret from `POST /api/session`.

## Troubleshooting

- **Page keeps reloading in dev after restarting the server:** stop the server, delete `.next/`, and start it again.

## What's next

1. Family-voice check-ins (cloned voice + family photo, clearly labelled as AI).
2. Real SMS or email for escalations.
3. Video avatar replacing the glowing portrait.

The Maya portrait is a placeholder illustration (see `public/CREDITS.md`).
