# Elder Help MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A clone-and-run web app where an elder talks by voice to "Maya", Maya books (mocked), logs medicine, or escalates, and a family dashboard updates live.

**Architecture:** One Next.js app with two pages (`/elder`, `/family`) and API routes. All business logic lives in plain TypeScript modules under `src/server/` that take a `Db` handle, so they are unit-testable without HTTP. Voice sits behind a `VoiceProvider` interface with a real (OpenAI Realtime) and a fake implementation, chosen by `VOICE_PROVIDER`.

**Tech Stack:** Next.js (App Router) + TypeScript, `better-sqlite3`, Vitest, Playwright, OpenAI Realtime API (WebRTC) for voice, OpenAI chat completions for summaries.

**Spec:** `docs/superpowers/specs/2026-11-04-elder-help-mvp-design.md`

## Global Constraints

- Runs locally: `git clone` → `cp .env.example .env` → `npm install` → `npm run dev`, then `/elder` and `/family`.
- Database is a local SQLite file (`data/elder-help.db`, gitignored), created and seeded on first run. `npm run reset` wipes and re-seeds.
- The voice API key never reaches the browser. The browser gets a short-lived session token from `POST /api/session`.
- `VOICE_PROVIDER=fake` must run the whole app and all tests with no API key and no network.
- Integrations are mocked. No real bookings, SMS, or emergency calls.
- One demo household. Names live in `src/config/household.ts`.
- Exact user-facing copy (copy verbatim):
  - Mic denied: `Allow microphone to talk to Maya`
  - Voice unavailable: `Maya is resting, try again soon.`
  - Tool failed: `I couldn't do that, I've told your family.`
  - Escalated: `I've let your family know.`
  - Silence prompt (after 10 seconds): `Are you still there?`
  - Summary failure placeholder: `Summary unavailable`
- Summaries are 2 to 3 lines. Dashboard falls back to polling every 5 seconds if the event stream drops.
- Elder UI: large text, high contrast, one primary button.

## Review Focus

1. **Vague or empty tool arguments** (`when: ""`, `type: "   "`). Expect: handler rejects, Maya speaks the tool-failed line, an alert is created. Pinned in Task 2.
2. **Medicine named loosely** ("my metformin pill", "METFORMIN"). Expect: case-insensitive substring match against the schedule. No match is a tool failure (alert). Pinned in Task 2.
3. **Same dose logged twice in one day.** Expect: second call returns "already logged" and writes no new row. Pinned in Task 2.
4. **Conversation ended twice, or tab closed mid-session.** Expect: `endConversation` is idempotent, and a conversation with no end still shows on the dashboard. Pinned in Task 3.
5. **No API key set while `VOICE_PROVIDER=openai`.** Expect: `/api/session` returns 503, elder screen shows the voice-unavailable state and the text fallback. Pinned in Task 5.

---

## File Structure

```
src/
  config/household.ts          demo names + medicine seed
  server/db.ts                 open, migrate, seed, reset
  server/events.ts             in-process change bus
  server/tools.ts              3 tool handlers + runTool dispatcher
  server/conversations.ts      start/append/end + Summarizer
  server/dashboard.ts          getDashboard read model
  server/reminders.ts          dueReminders
  server/intent.ts             keyword intent parser (fake voice + text fallback)
  app/api/...                  thin route handlers (Task 5)
  voice/VoiceProvider.ts       interface
  voice/fakeProvider.ts
  voice/openaiProvider.ts
  voice/mayaPrompt.ts          system prompt + tool schemas
  app/elder/page.tsx + components/elder/*
  app/family/page.tsx + components/family/*
scripts/reset.ts
tests/unit/*.test.ts, tests/e2e/demo.spec.ts
```

---

### Task 1: Scaffold + database layer

**Files:**
- Create: `package.json` scripts, `src/config/household.ts`, `src/server/db.ts`, `scripts/reset.ts`, `.gitignore` (adds `data/`, `.env`), `vitest.config.ts`
- Test: `tests/unit/db.test.ts`

**Interfaces:**
- Produces:
  - `type Db = import('better-sqlite3').Database`
  - `openDb(path?: string): Db` (defaults to `process.env.DB_PATH ?? 'data/elder-help.db'`, creates folder, runs `migrate` and `seedIfEmpty`)
  - `migrate(db: Db): void` creates tables exactly as spec 4.4: `conversations(id, started_at, ended_at, transcript, summary)`, `appointments(id, type, when_text, confirmation_code, created_at)`, `medicine_schedule(id, name, dose, time_of_day)`, `medicine_log(id, schedule_id, taken, logged_at)`, `alerts(id, issue, status, created_at)`. Times are ISO strings. `time_of_day` is `"HH:MM"`. `status` is `'open' | 'resolved'`.
  - `seedIfEmpty(db: Db): void` inserts `household.medicines` only when `medicine_schedule` is empty
  - `resetDb(db: Db): void` deletes all rows then seeds
  - `household = { elderName: 'Margaret', familyName: 'Priya', helperName: 'Maya', medicines: [{name:'Metformin', dose:'500 mg', timeOfDay:'08:00'}, {name:'Lisinopril', dose:'10 mg', timeOfDay:'20:00'}] }`
  - `getDb(): Db` module-level singleton for route handlers
  - npm scripts: `dev`, `build`, `test` (vitest), `test:e2e` (playwright), `reset` (`tsx scripts/reset.ts`)

- [ ] **Step 1:** `npx create-next-app@latest elderly-help-mvp --ts --app --src-dir --no-tailwind --eslint` inside the existing repo folder (keep `docs/`). Add deps `better-sqlite3`, dev deps `vitest`, `tsx`, `@types/better-sqlite3`.
- [ ] **Step 2: Write failing tests** in `tests/unit/db.test.ts` using `openDb(':memory:')`:
  - `creates all five tables` → `sqlite_master` contains all five names
  - `seeds two medicines once` → count is 2 after `openDb`, still 2 after a second `seedIfEmpty`
  - `resetDb clears data and re-seeds` → insert an alert, reset, alerts count 0, schedule count 2
- [ ] **Step 3:** Run `npm test` → FAIL (module missing).
- [ ] **Step 4:** Implement `db.ts`, `household.ts`, `scripts/reset.ts`.
- [ ] **Step 5:** Run `npm test` → PASS. Run `npm run reset` → exits 0, `data/elder-help.db` exists.
- [ ] **Step 6:** Commit `feat: scaffold app and SQLite layer`.

---

### Task 2: Tool handlers + change events

**Files:**
- Create: `src/server/events.ts`, `src/server/tools.ts`
- Test: `tests/unit/tools.test.ts`

**Interfaces:**
- Consumes: `Db`, `openDb` (Task 1)
- Produces:
  - `type ChangeKind = 'appointments' | 'medicine' | 'alerts' | 'conversations'`
  - `onChange(fn: (kind: ChangeKind) => void): () => void` (returns unsubscribe), `emitChange(kind: ChangeKind): void`. Store listeners on `globalThis` so Next.js dev reloads share one bus.
  - `type ToolResult = { ok: boolean; message: string; data?: Record<string, unknown> }`
  - `bookAppointment(db, args: { type: string; when: string }): ToolResult` → `data.confirmationCode` is `'APT-' + 6 uppercase alphanumerics`. Message: `Your ${type} appointment is booked for ${when}.`
  - `logMedicine(db, args: { name: string; taken: boolean }, now?: Date): ToolResult` matches schedule by case-insensitive substring in either direction
  - `escalate(db, args: { issue: string }): ToolResult` → status `open`, message `I've let your family know.`
  - `runTool(db, name: string, args: unknown): ToolResult` dispatches. On unknown tool, invalid args, or thrown error: inserts an alert `Maya could not complete: ${name}` and returns `{ ok: false, message: "I couldn't do that, I've told your family." }`
  - Every successful write calls `emitChange` with its kind.

- [ ] **Step 1: Write failing tests** (all via `runTool` except where noted):
  - `book_appointment saves row and returns APT code` → `/^APT-[A-Z0-9]{6}$/`, 1 appointment row, change `'appointments'` emitted
  - `book_appointment rejects blank args` → `{type:'  ', when:''}` gives `ok:false`, exact tool-failed copy, 1 alert row, 0 appointments
  - `log_medicine matches loosely` → `{name:'my METFORMIN pill', taken:true}` gives `ok:true` and log row with Metformin's `schedule_id`
  - `log_medicine unknown name fails with alert` → `{name:'aspirin'}` gives `ok:false`, 1 alert
  - `log_medicine twice same day is idempotent` → second call `ok:true`, message contains `already`, still 1 log row
  - `escalate creates open alert` → message `I've let your family know.`, row status `open`
  - `unknown tool creates alert` → `runTool(db,'order_pizza',{})` gives `ok:false`
- [ ] **Step 2:** `npm test tools` → FAIL.
- [ ] **Step 3:** Implement `events.ts` and `tools.ts`. Validate args by hand (non-empty trimmed strings, boolean `taken`). No validation library.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: add tool handlers with escalation on failure`.

---

### Task 3: Conversations + summaries

**Files:**
- Create: `src/server/conversations.ts`
- Test: `tests/unit/conversations.test.ts`

**Interfaces:**
- Consumes: `Db`, `emitChange`
- Produces:
  - `type TranscriptLine = { role: 'elder' | 'maya'; text: string; at: string }`
  - `interface Summarizer { summarize(lines: TranscriptLine[]): Promise<string> }`
  - `fakeSummarizer: Summarizer` → joins the first 3 elder lines, one per line
  - `openaiSummarizer(apiKey: string): Summarizer` → chat completion asking for a 2 to 3 line plain summary for a family member
  - `getSummarizer(): Summarizer` → fake when `VOICE_PROVIDER=fake` or no `OPENAI_API_KEY`
  - `startConversation(db): number`
  - `appendLine(db, id: number, line: TranscriptLine): void` (transcript stored as JSON array)
  - `endConversation(db, id: number, s: Summarizer): Promise<{ summary: string }>` → sets `ended_at` and `summary`. If already ended, returns the stored summary without calling `s`. If `s` throws, stores `Summary unavailable`. Emits `'conversations'`.

- [ ] **Step 1: Write failing tests:**
  - `end stores summary and ended_at`
  - `end twice calls summarizer once` (spy summarizer)
  - `summarizer failure stores placeholder` → `Summary unavailable`
  - `unended conversation keeps null ended_at` (dashboard reads it in Task 4)
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: add conversations and summaries`.

---

### Task 4: Dashboard read model + due reminders

**Files:**
- Create: `src/server/dashboard.ts`, `src/server/reminders.ts`
- Test: `tests/unit/dashboard.test.ts`, `tests/unit/reminders.test.ts`

**Interfaces:**
- Consumes: `Db`, Tasks 2 and 3 for test setup
- Produces:
  - `type DashboardData = { summaries: {id:number; startedAt:string; endedAt:string|null; summary:string|null}[]; appointments: {id:number; type:string; when:string; confirmationCode:string}[]; medicines: {scheduleId:number; name:string; dose:string; timeOfDay:string; takenToday:boolean}[]; alerts: {id:number; issue:string; status:'open'|'resolved'; createdAt:string}[] }`
  - `getDashboard(db, now?: Date): DashboardData` → newest first, last 10 summaries, open alerts first
  - `dueReminders(db, now?: Date): { scheduleId:number; name:string; dose:string }[]` → schedule entries whose `timeOfDay` is at or before `now` (local time) and not taken today. "Backend timer" from the spec is realised as the elder page polling this every 60 seconds.

- [ ] **Step 1: Write failing tests:**
  - `dashboard includes in-progress conversation` (`endedAt: null`)
  - `takenToday true only for today's log` (yesterday's log → false)
  - `due at 09:00 returns Metformin only`; `due after logging Metformin returns []`
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat: add dashboard model and due reminders`.

---

### Task 5: API routes

**Files:**
- Create: `src/app/api/tools/[name]/route.ts`, `src/app/api/conversations/route.ts`, `src/app/api/conversations/[id]/lines/route.ts`, `src/app/api/conversations/[id]/end/route.ts`, `src/app/api/dashboard/route.ts`, `src/app/api/reminders/due/route.ts`, `src/app/api/events/route.ts`, `src/app/api/session/route.ts`, `.env.example`
- Test: `tests/unit/session-route.test.ts`

**Interfaces:**
- Consumes: everything in `src/server/`, `getDb()`
- Produces (all JSON, `export const runtime = 'nodejs'`):
  - `POST /api/tools/:name` body = args → `ToolResult`
  - `POST /api/conversations` → `{ id }`; `POST /api/conversations/:id/lines` body `TranscriptLine` → 204; `POST /api/conversations/:id/end` → `{ summary }`
  - `GET /api/dashboard` → `DashboardData`; `GET /api/reminders/due` → array
  - `GET /api/events` → SSE stream, one `data: {"kind": ChangeKind}` per change, `: ping` comment every 25 s, unsubscribes on abort
  - `POST /api/session` → fake mode: `{ provider: 'fake' }`. OpenAI mode: `{ provider: 'openai', clientSecret, model }`. Missing key: status 503 `{ error: 'voice_unavailable' }`
  - `.env.example`: `VOICE_PROVIDER=openai`, `OPENAI_API_KEY=`, `OPENAI_REALTIME_MODEL=`, `OPENAI_SUMMARY_MODEL=`, `DB_PATH=data/elder-help.db`

- [ ] **Step 1:** Before coding the session route, check the current OpenAI Realtime docs for the ephemeral client-secret endpoint, request shape, and current model names. Record what you used in a comment at the top of `session/route.ts`.
- [ ] **Step 2: Write failing tests** calling the exported `POST` handler directly:
  - `fake mode returns provider fake`
  - `openai mode without key returns 503 voice_unavailable`
- [ ] **Step 3–4:** FAIL → implement all routes (thin: parse, call server module, return) → PASS.
- [ ] **Step 5:** Manual check with `npm run dev`: `curl -X POST localhost:3000/api/tools/escalate -d '{"issue":"sink"}' -H 'content-type: application/json'` returns `ok:true`, and `curl -N localhost:3000/api/events` in another shell prints `{"kind":"alerts"}`.
- [ ] **Step 6:** Commit `feat: add API routes and SSE events`.

---

### Task 6: Voice provider interface, intent parser, fake provider

**Files:**
- Create: `src/voice/VoiceProvider.ts`, `src/server/intent.ts`, `src/voice/fakeProvider.ts`, `src/voice/mayaPrompt.ts`
- Test: `tests/unit/intent.test.ts`, `tests/unit/fakeProvider.test.ts`

**Interfaces:**
- Consumes: `POST /api/tools/:name` (via injected `callTool`)
- Produces:
  - `type VoiceEvent = { type: 'speaking'; on: boolean } | { type: 'caption'; line: TranscriptLine } | { type: 'error'; reason: 'mic_denied' | 'unavailable' } | { type: 'ended' }`
  - `interface VoiceProvider { start(opts: { callTool: (name: string, args: unknown) => Promise<ToolResult>; onEvent: (e: VoiceEvent) => void; initialPrompt?: string }): Promise<void>; sendText(text: string): Promise<void>; stop(): Promise<void> }`
  - `parseIntent(text: string, ctx?: { dueMedicine?: string }): { tool: 'book_appointment' | 'log_medicine' | 'escalate'; args: Record<string, unknown> }`
    - contains `doctor|appointment|dentist` → `book_appointment`, `type` = matched word (`doctor` for appointment), `when` = text after `next|on|tomorrow` or `soon`
    - contains `took|taken|take` → `log_medicine`, `name` = `ctx.dueMedicine ?? text`, `taken: true`
    - otherwise → `escalate`, `issue` = text
  - `VoiceProvider` also gets `setContext(ctx: { dueMedicine?: string }): void` (OpenAI provider puts the medicine name into the reminder prompt, fake provider passes it to `parseIntent`).
  - `fakeProvider: VoiceProvider` → `sendText` emits elder caption, runs `parseIntent` + `callTool`, emits Maya caption with `result.message`, toggles `speaking`. Also used as the text-chat fallback.
  - `mayaPrompt: string` (warm, patient, short sentences, simple words, confirm actions out loud, say she is an AI helper if asked, use `escalate` for anything outside the other two tools) and `mayaTools` JSON schemas for the 3 tools.

- [ ] **Step 1: Write failing tests:**
  - `"I need to see my doctor next week"` → `book_appointment`, `{type:'doctor', when:'next week'}`
  - `"I took it"` with `{dueMedicine:'Metformin'}` → `log_medicine`, `{name:'Metformin', taken:true}`
  - `"My sink is leaking"` → `escalate`, `issue` = text
  - `fake provider emits elder caption, calls tool once, emits maya caption with tool message`
- [ ] **Step 2–4:** FAIL → implement → PASS.
- [ ] **Step 5:** Commit `feat: add voice interface, intent parser, fake provider`.

---

### Task 7: OpenAI Realtime provider

**Files:**
- Create: `src/voice/openaiProvider.ts`, `src/voice/index.ts`

**Interfaces:**
- Consumes: `POST /api/session`, `mayaPrompt`, `mayaTools`, `VoiceProvider`
- Produces: `openaiProvider: VoiceProvider`; `getVoiceProvider(session: { provider: 'fake' | 'openai' }): VoiceProvider`

- [ ] **Step 1:** Re-check the current Realtime WebRTC docs (connection URL, session update event, function-call and function-output event names, transcript events). Note the doc date in a file comment.
- [ ] **Step 2:** Implement: get mic (`NotAllowedError` → `error mic_denied`), open WebRTC with the client secret, send session config with `mayaPrompt` and `mayaTools`, map function-call events to `callTool` and return outputs, map audio start/stop to `speaking`, transcripts to `caption`. Connection failure → `error unavailable`. Silence: if no elder speech for 10 seconds, ask Maya to say `Are you still there?`. After a further 10 seconds of silence, `stop()` and emit `ended`.
- [ ] **Step 3: Manual verification** with a real key: say "I need to see my doctor next week", hear a confirmation, see the appointment row via `GET /api/dashboard`.
- [ ] **Step 4:** Commit `feat: add OpenAI realtime voice provider`.

---

### Task 8: Elder screen

**Files:**
- Create: `src/app/elder/page.tsx`, `src/components/elder/MayaAvatar.tsx`, `Captions.tsx`, `ReminderBanner.tsx`, `TextFallback.tsx`, `public/maya.jpg` (placeholder portrait with usage rights; note its source in `public/CREDITS.md`)

**Interfaces:**
- Consumes: `getVoiceProvider`, conversation routes, `GET /api/reminders/due`
- Produces: page at `/elder`. Test hooks: `data-testid` = `talk-button`, `maya-avatar` (with `data-speaking="true|false"`), `captions`, `reminder-banner`, `trigger-reminder`, `text-input`, `text-send`, `end-button`. In fake mode the text input is always shown, so the e2e test can drive it.

- [ ] **Step 1:** Layout: portrait centered, glow ring animates only while `speaking`. One large **Talk to Maya** button. Captions below. Fonts at least 24px, high contrast.
- [ ] **Step 2:** Talk flow: `POST /api/session` → provider → `POST /api/conversations` → each caption `POST .../lines` → on stop or `ended`, `POST .../end`.
- [ ] **Step 3:** States: `mic_denied` → full screen `Allow microphone to talk to Maya` + retry. 503 or `unavailable` → greyed portrait, `Maya is resting, try again soon.`, and `TextFallback` using `fakeProvider`.
- [ ] **Step 4:** Reminders: poll `/api/reminders/due` every 60 s. When due, show banner, call `provider.setContext({ dueMedicine })`, and start a session with `initialPrompt` reminding about that medicine. Clear the context once it is logged. A small **Trigger reminder now** button forces the banner with the first scheduled medicine.
- [ ] **Step 5:** Manual check in fake mode: type "I need to see my doctor next week", see both captions and the glow toggle.
- [ ] **Step 6:** Commit `feat: add elder screen`.

---

### Task 9: Family dashboard

**Files:**
- Create: `src/app/family/page.tsx`, `src/components/family/Summaries.tsx`, `Appointments.tsx`, `Medicines.tsx`, `Alerts.tsx`, `src/components/family/useLiveDashboard.ts`

**Interfaces:**
- Consumes: `GET /api/dashboard`, `GET /api/events`
- Produces: `useLiveDashboard(): DashboardData | null` (fetch on mount, refetch on each SSE event, on `EventSource` error switch to polling every 5 seconds). Test hooks: `summaries`, `appointments`, `medicines`, `alerts`, each item `data-testid="alert-card"` etc.

- [ ] **Step 1:** Build the four sections in spec order. Alerts as red cards, open first. In-progress conversation shows "In progress".
- [ ] **Step 2:** Manual check: escalate via curl, alert card appears without refresh. Stop the server briefly, restart, page recovers by polling.
- [ ] **Step 3:** Commit `feat: add family dashboard with live updates`.

---

### Task 10: End-to-end demo test + README

**Files:**
- Create: `playwright.config.ts` (starts `npm run dev` with `VOICE_PROVIDER=fake` and `DB_PATH=data/e2e.db`, runs reset first), `tests/e2e/demo.spec.ts`, `README.md`

- [ ] **Step 1: Write the e2e test** `full demo flow in fake mode`, two pages:
  1. elder: text "I need to see my doctor next week" → captions contain `booked`
  2. elder: click `trigger-reminder`, text "I took it" → family `medicines` shows Metformin taken
  3. elder: text "My sink is leaking" → captions contain `I've let your family know.`
  4. elder: end conversation → family `summaries` has an entry with non-empty text
  5. family: `appointments` has 1 item, `alert-card` count is 1
- [ ] **Step 2:** `npm run test:e2e` → PASS.
- [ ] **Step 3:** README: what it is, setup (Global Constraints commands), fake mode, `npm run reset`, the manual real-voice demo checklist (the 6 spec steps), and "What's next" (spec section 10).
- [ ] **Step 4:** Run `npm test && npm run test:e2e && npm run build` → all pass.
- [ ] **Step 5:** Commit `test: add e2e demo flow and README`.
