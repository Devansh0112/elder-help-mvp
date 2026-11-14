# Elder Help Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bare `/` page with a portfolio landing page for Elder Help (clean option B, glass cards for two sections).

**Architecture:** One static server component page at `src/app/page.tsx` built from small section components in
`src/components/landing/`, styled by one CSS module. Screenshots are served from `public/landing/` and cropped with CSS. No client JS.

**Tech Stack:** Next.js 16 App Router, React 19, CSS Modules, `next/font/google` (Inter), `next/image`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-14-landing-page-design.md`

## Global Constraints

- GitHub URL: `https://github.com/Devansh0112/elder-help-mvp` (opens in a new tab, `rel="noopener noreferrer"`).
- The page must not link to `/elder` or `/family`.
- The footer must say bookings and alerts in this prototype are simulated.
- Inter is loaded on the landing page only. `globals.css` and the elder and family screens stay unchanged.
- Light theme only; works at 375px width with no horizontal scroll.
- `prefers-reduced-motion: reduce` turns off hover lifts and the pulse; `@supports not (backdrop-filter)` makes glass cards solid white.
- Copy matches the mockups (`.superpowers/brainstorm/12143-1794677538/content/`).

## Review Focus

1. Phone width (375px): every grid stacks, the timeline is vertical, and nothing scrolls sideways. (Task 2 e2e at 375px.)
2. Accidental demo links: no `href` to `/elder` or `/family`. (Task 2 e2e.)
3. Anchor nav: How it works, Vision, and Roadmap scroll to `#how`, `#vision`, `#roadmap`. (Task 2 e2e checks the ids exist.)
4. Images: every screenshot has meaningful `alt` text and loads (no 404). (Task 2 e2e checks that `naturalWidth > 0`.)
5. Glass fallback: without `backdrop-filter`, card text stays readable. (CSS `@supports`; checked by eye.)

---

### Task 1: Assets and housekeeping

**Files:**
- Create: `public/landing/` with `elder-speaking.png`, `elder-booking.png`, `elder-reminder.png`, `family-alert.png`, copied from `docs/superpowers/screens/before/` (`elder-speaking-1280x800`, `elder-after-booking-1280x800`, `elder-reminder-banner-1280x800`, `family-after-flow-desktop-1280`)
- Modify: `.gitignore` (add `/.superpowers/`)

- [ ] Copy the files, add the ignore line, and check that `git status` no longer lists `.superpowers/`.

### Task 2: Landing page

**Files:**
- Create: `src/components/landing/landing.module.css`, `Nav.tsx`, `Hero.tsx`, `HowItWorks.tsx`, `WhoItsFor.tsx`, `Vision.tsx`, `Roadmap.tsx`, `Principles.tsx`, `Closing.tsx`, `links.ts` (exports `GITHUB_URL`)
- Modify: `src/app/page.tsx` (composes the sections and applies the Inter `className`), `src/app/page.module.css` (delete), `src/app/layout.tsx` (metadata: title "Elder Help: a voice helper for older adults", description, `openGraph`)
- Test: `tests/e2e/landing.spec.ts`

- [ ] **Step 1: Write the failing e2e test** `tests/e2e/landing.spec.ts`:
  - `shows hero and sections`: h1 contains "Help for your parents"; `#how`, `#who`, `#vision`, `#roadmap` are visible; text "simulated" is visible.
  - `links to GitHub and not to demo screens`: there is at least one `a[href="https://github.com/Devansh0112/elder-help-mvp"]`; `a[href="/elder"]` and `a[href="/family"]` each have count 0.
  - `images load`: every `img` inside `main` has `naturalWidth > 0` and a non-empty `alt`.
  - `fits a phone`: at viewport 375×812, `document.documentElement.scrollWidth <= 375`.
- [ ] **Step 2:** Run `npx playwright test tests/e2e/landing.spec.ts`. Expected: FAIL (old page).
- [ ] **Step 3:** Build the section components with the copy and structure from the mockups. Glass cards are used in `WhoItsFor` and `Roadmap` only. Step 3 of How it works uses `family-alert.png`.
- [ ] **Step 4:** Run the landing e2e test (expected: PASS), plus `npm run lint`, `npm test`, `npm run build`, and the full `npm run test:e2e` (the existing demo flow must still pass).
- [ ] **Step 5:** Check it by eye in the browser at desktop and 375px width.
- [ ] **Step 6:** Commit only when the user asks.
