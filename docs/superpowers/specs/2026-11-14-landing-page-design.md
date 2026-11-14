# Elder Help Landing Page: Design (short)

**Date:** 2026-11-14
**Status:** Awaiting approval
**Mockups:** `.superpowers/brainstorm/12143-1794677538/content/` (`b-refined-full-page.html`, `cards-float-vs-glass.html`)

## Intent

A portfolio page for Elder Help at `/`. Someone looking at Devansh's work should understand the idea in about
30 seconds, see that it really works (real screenshots), and find the code (GitHub). It is the first thing
people see on the Vercel URL.

- **Goals:** explain what Maya does, who it serves, the vision, and what's being built now; look clean and elegant.
- **Non-goals:** a live demo (tracked in Notion Sprint Board, "Live demo on Vercel" tasks), sign-ups, analytics.
- **Anti-goals:** links that break on Vercel (`/elder`, `/family` need SQLite); overstating what's real
  (bookings and alerts are simulated, and the page says so).

## Approaches

1. **A page in this Next.js app at `/` (chosen).** Static server component plus a CSS module, with screenshots
   in `public/`. It deploys with the repo to Vercel with no extra setup.
2. Separate static site or repo: a second thing to deploy and keep in sync, and the repo is already going to Vercel.
3. Claude-hosted artifact page: not on the user's own Vercel domain, so it's not what was asked.

Only option 1 fits.

## Decided with Devansh

- **Look:** option B (clean product), refined: lots of whitespace, near-black buttons, one quiet blue accent,
  thin hairlines between sections, real screenshots.
- **Proof:** a screenshot walkthrough plus a GitHub link (https://github.com/Devansh0112/elder-help-mvp).
  No live demo links for now.
- **Glass cards** (frosted cards over soft colour glows) for **Who it's for** and **What we're up to**,
  as in mockup option 2.

## Page sections (in order)

1. **Nav:** logo dot plus "Elder Help"; anchor links (How it works, Vision, Roadmap); GitHub button.
2. **Hero:** "Working prototype · voice AI" tag; "Help for your parents, one conversation away."; one-line
   explainer; See how it works (scrolls down) and View the code on GitHub; the elder screen in a browser frame.
3. **How it works:** 3 numbered steps (Just talk, Gentle reminders, Family in the loop), each with a screenshot
   cropped to the part that matters. Step 3 uses the **family dashboard alert**, not the elder screen.
4. **Who it's for (glass):** Margaret and Priya persona cards with avatar, quote, and 3 icon benefits.
5. **Vision:** the large quote "Growing older at home should feel less lonely, and caring from far away should
   feel less worrying," plus the path from helper to companion, always labelled AI.
6. **What we're up to (glass):** timeline Built → Building now (pulsing, with a progress bar) → Next.
7. **Principles:** Always honest it's AI · Nothing fails silently · Simple by design.
8. **Closing:** "See how it's built" with a GitHub button; footer noting that bookings and alerts are simulated.

## My calls (correct any)

- "Option 2" read as glass for those two sections only, with the rest in the clean floating style (as in the mockup).
- Copy as in the mockups.
- Inter via `next/font/google`, loaded on this page only, so the elder and family screens stay unchanged.
- Light theme only.
- Responsive down to phone width: grids stack and the timeline turns vertical.
- Hover lifts and the pulse turn off for people who prefer reduced motion. If the browser can't blur
  (no `backdrop-filter`), the glass cards fall back to solid white.
- Screenshots copied into `public/landing/` and cropped with CSS (`object-fit`/`object-position`), with no new image tooling.
- Page metadata (title, description, Open Graph text) updated for link previews.
- `.superpowers/` added to `.gitignore` so mockups don't get pushed.

## Left to the builder

Exact spacing, shadow values, crop positions, and icon drawing details, within the mockups' look.
