# Elder Help MVP: Design Spec

**Date:** 2026-11-04
**Author:** Devansh
**Status:** Draft, awaiting review
**Source idea:** `Elderly Companion Avatars.md` (Oct 29, 2026)

---

## 1. Purpose

A small, polished prototype that shows the **core workflow** of the Elderly Companion Avatars idea to investors and early testers.

- **Goal:** prove the loop "elder asks for help, AI helper acts, family stays informed" works end to end.
- **Audience:** investors, early testers, and developers who clone the repo.
- **Success looks like:** anyone can clone the repo, add one API key, run it on a laptop, and complete the full 6-step demo flow in under 5 minutes.

### Non-goals (this version)

- Family member cloned voices (phase 2)
- Video avatars (phase 3)
- Virtual friend groups
- Real integrations (appointment booking, groceries, SMS, emergency calls)
- Multiple elders, multiple family members, real authentication
- Mobile app store builds

---

## 2. Decisions so far

| Decision | Choice |
|---|---|
| Build type | Investor/traction prototype (polished, light backend) |
| Core workflow | Help avatar + family dashboard |
| Interaction | Voice first, video later |
| Helper voice | Neutral helper "Maya" now. Family-voice check-ins come next (path toward option C) |
| Visual | Real-looking portrait + glowing ring while speaking |
| Platform | Web app on a tablet or laptop browser |
| Voice engine | Real-time speech-to-speech AI API with tool calling |
| Database | Local SQLite file, so the repo runs on any laptop |
| Integrations | Mocked |

---

## 3. The demo flow (end to end)

1. Elder taps **Talk to Maya** and says "I need to see my doctor next week."
2. Maya replies by voice, "books" the appointment (mocked), and confirms out loud.
3. At a set time, Maya gives a **medicine reminder**. Elder says "I took it." The dose is logged.
4. Elder asks for something Maya cannot do ("My sink is leaking"). Maya **escalates**, and an alert appears for the family.
5. When the conversation ends, it is **summarized** in 2 to 3 lines.
6. The **family dashboard** shows the summary, the appointment, the medicine log, and the alert, updating live.

---

## 4. Architecture

Five small units, each with one job.

```
Elder screen ──voice──> Voice brain ──tool call──> Tool handlers ──> SQLite
                                                                       │
                                     Family dashboard <──live updates──┘
```

### 4.1 Elder screen (`/elder`)
- Large portrait of Maya. A glow ring animates while Maya is speaking.
- One large **Talk to Maya** button. Live captions below.
- Reminder banner when a medicine is due.
- Big text, high contrast, minimal choices.
- **Depends on:** voice brain session, backend event stream.

### 4.2 Voice brain
- One real-time voice session per conversation, opened from the browser.
- System prompt sets Maya's personality: warm, patient, short sentences, simple words, always confirms actions out loud, says she is an AI helper if asked.
- Exposes three tools:
  - `book_appointment(type: string, when: string)`
  - `log_medicine(name: string, taken: boolean)`
  - `escalate(issue: string)`
- The API key stays on the backend. The browser gets a short-lived session token from the backend.
- Wrapped behind a `VoiceProvider` interface so the vendor can be swapped, and so a **fake provider** can run tests without an API key.

### 4.3 Tool handlers (backend)
- One function per tool. Each validates input, writes to SQLite, and returns a short result for Maya to speak.
- `book_appointment` is mocked. It saves a record with a fake confirmation code.
- `escalate` creates an alert with status `open`.
- After any write, the handler emits a change event for the dashboard.

### 4.4 Database (SQLite)

| Table | Key fields |
|---|---|
| `conversations` | id, started_at, ended_at, transcript, summary |
| `appointments` | id, type, when_text, confirmation_code, created_at |
| `medicine_schedule` | id, name, dose, time_of_day |
| `medicine_log` | id, schedule_id, taken, logged_at |
| `alerts` | id, issue, status, created_at |

- Created automatically on first run.
- Seeded with two medicines. The elder's and family member's names live in a simple config file, since there is one demo household.
- `npm run reset` wipes and re-seeds for a fresh demo.

### 4.5 Family dashboard (`/family`)
- Sections: Latest summaries, Upcoming appointments, Today's medicines (checklist), Alerts (red cards).
- Receives live updates through Server-Sent Events. Falls back to polling every 5 seconds.

### 4.6 Video upgrade path
Only unit 4.1 changes. The glowing portrait is replaced by a video avatar component. Units 4.2 to 4.5 stay the same.

---

## 5. Data flow details

**Booking.** Speech → voice brain calls `book_appointment` → handler saves row → returns "confirmed" → Maya speaks confirmation → dashboard updates.

**Medicine reminder.** A backend timer checks `medicine_schedule` every minute. For demos, a **Trigger reminder now** button fires it immediately. The elder screen shows the banner and starts a Maya session with the reminder. "I took it" → `log_medicine` → dashboard checklist ticks off.

**Escalation.** Maya decides a request is outside her tools → `escalate` → alert saved → red card on dashboard. Maya tells the elder "I've let your family know."

**Summary.** On session end, the transcript is sent to the AI for a 2 to 3 line summary. Saved to `conversations` and shown on the dashboard.

---

## 6. Error handling

| Failure | Behavior |
|---|---|
| No microphone permission | Full-screen prompt to allow the mic, with a retry button |
| Voice API down or key missing | Portrait greys out, message "Maya is resting, try again soon." Text-chat fallback still runs the tools |
| Tool call fails | Maya says "I couldn't do that, I've told your family." An alert is created automatically |
| Elder silent ~10 seconds | Maya asks "Are you still there?" Then ends the session and saves the summary |
| Summary call fails | Save transcript with summary "Summary unavailable" |
| Dashboard stream drops | Switch to polling every 5 seconds |

**Rule:** nothing fails silently. Maya says so kindly, and the family gets an alert.

---

## 7. Testing

- **Unit tests** for each tool handler against a temporary SQLite file.
- **Fake voice provider** that replays scripted inputs and tool calls. Selected with `VOICE_PROVIDER=fake`. No API key or cost needed.
- **End-to-end test** that runs the full 6-step flow in fake mode and checks the dashboard data.
- **Manual demo checklist** in the README for a real-voice run-through.

---

## 8. Developer setup

```
git clone <repo>
cp .env.example .env      # add your voice API key
npm install
npm run dev
```
Open `/elder` and `/family` in two browser tabs.

---

## 9. Still open (not blocking the MVP)

- Exact voice API vendor and its pricing (verify before building).
- Exact frontend framework (for example Next.js). To be fixed in the implementation plan.
- Portrait image source for Maya (stock or AI-generated, with rights to use).

## 10. Next after the MVP

1. Family-voice check-ins (cloned voice + family photo, clearly labeled as AI).
2. Real SMS or email for escalations.
3. Video avatar replacing the glowing portrait.
