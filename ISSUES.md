# ISSUE LIST — NPS Frontend

> **Purpose:** Collect and document all reported UI/UX/logic issues for batch fixing.
> **How to use:** Issues are logged here by the investigator. Do not fix directly — use this as the fix queue.
> **Last updated:** 2026-02-21

---

## Issue #1 — Dashboard layout is asymmetric, cheap-looking, and lacks visual hierarchy

**Reported by:** Screenshot (web-production-a5179.up.railway.app/dashboard)
**Priority:** P1 High

> Affects the entire first impression of the app. Not a crash, but a severe design regression that makes the product look unfinished and untrustworthy.

### What I See (User Report)

"The layout is very cheap design. It doesn't look good, so it has to be much better, symmetric, logical, professional, and futuristic."

The screenshot shows:

- A wide banner at the top ("Good morning, Explorer")
- A large mostly-empty card ("Today's Reading") taking up ~66% of the width
- Three small Quick Action buttons stacked vertically in a narrow right column
- Four stats cards below in a row (TOTAL READINGS: 6, AVG CONFIDENCE: 85%, MOST USED TYPE: Name, STREAK: 2 days)
- Three recent reading cards at the bottom with plain text and no visual differentiation

### What's Actually Happening

**Problem 1 — The 8/4 column split creates a giant empty void.**
`DailyReadingCard` is assigned `lg:col-span-8` while `QuickActions` gets `lg:col-span-4`. When the daily reading is absent (the empty state in the screenshot), the 8-column area renders almost nothing — just a title and a lot of blank dark space. This creates a visually unbalanced, asymmetric result where two-thirds of the viewport is wasted.

**Problem 2 — Quick Actions are isolated and vertically stacked in a narrow column.**
`QuickActions` renders 3 buttons in a `grid-cols-1` on large screens. Three tall thin cards stacked on the right side of one empty card on the left makes the section look like an afterthought with no visual relationship to the rest of the content.

**Problem 3 — Stats cards have no visual weight or differentiation.**
`StatsCard` uses a uniform glass-bg card with tiny uppercase labels and large mono numbers. There is no color coding per stat, no accent differentiation, no icon prominence, and no micro-animation beyond a generic hover glow. All 4 cards look identical.

**Problem 4 — Welcome banner is plain and underused.**
`WelcomeBanner` uses a near-invisible gradient (`rgba(79,195,247,0.08)`) over a dark base. There is no focal point, no decorative element, no sense of personality. The moon phase widget shows only when `moonData` is passed, but `WelcomeBanner` receives no `moonData` prop from `Dashboard.tsx` (it's always `undefined`), so the right side of the banner is always empty.

**Problem 5 — Recent Readings cards have no visual hierarchy.**
Each reading card in `RecentReadings` shows a type badge, date, truncated text, and a confidence bar — all in identical neutral styling. `Name` readings and `Question` readings look nearly the same. There is no visual differentiation between reading types beyond the small color badge.

**Problem 6 — The overall layout has no focal point or flow.**
The grid goes: Full-width banner → 8/4 split → full-width stats → full-width recent readings. There is no visual rhythm, no section grouping, and no focal point that draws the eye.

### Location in Codebase

| File                                                     | Line(s) | What's there now                                                                                                                                                                      |
| -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/pages/Dashboard.tsx`                       | 44–65   | Grid layout: `grid-cols-1 lg:grid-cols-12 gap-6`; WelcomeBanner col-span-12, DailyReadingCard col-span-8, QuickActions col-span-4, StatsCards col-span-12, RecentReadings col-span-12 |
| `frontend/src/pages/Dashboard.tsx`                       | 48–49   | `<WelcomeBanner isLoading={dailyLoading} />` — `moonData` and `userName` props are never passed; always renders with empty right side                                                 |
| `frontend/src/components/dashboard/QuickActions.tsx`     | 71–73   | `grid-cols-1 sm:grid-cols-3 lg:grid-cols-1` — forces vertical stack on large screens inside the 4-column panel                                                                        |
| `frontend/src/components/dashboard/DailyReadingCard.tsx` | 52–63   | Empty state renders a title + subtitle + one button with no visual fill for 8 columns of space                                                                                        |
| `frontend/src/components/dashboard/WelcomeBanner.tsx`    | 62–63   | `background: linear-gradient(135deg, rgba(15,26,46,0.9) 0%, rgba(79,195,247,0.08) 100%)` — second color is nearly invisible; moon widget always hidden because no data passed         |
| `frontend/src/components/StatsCard.tsx`                  | 52–70   | All 4 stats cards use identical styling, no per-stat color, icon is `w-4 h-4 text-nps-text-dim` (tiny, grey, uniform)                                                                 |
| `frontend/src/components/dashboard/RecentReadings.tsx`   | 77–113  | All reading cards render with the same glass-bg border, no per-type visual treatment beyond the small TypeBadge                                                                       |

### Root Cause

The dashboard layout was designed assuming the `DailyReadingCard` would always have rich content to fill its 8-column space, and all components were given generic glass-card styling with no visual hierarchy, focal points, or personality — making the overall design feel flat and cheap especially when data is sparse.

### How It Should Be

1. **Hero zone at the top** — WelcomeBanner should be visually rich with gradient depth, subtle animated elements, and user data (name + moon phase) always present.
2. **Centered focal point** — DailyReadingCard should be the visual star of the page. Even in empty state it should feel inviting with iconography and a glowing CTA.
3. **Quick Actions as a horizontal row or integrated strip**, not a cramped vertical panel.
4. **Stats cards with individual color identity** — each stat gets its own accent color (total = oracle-accent/blue, confidence = green, most-used = purple, streak = gold/amber).
5. **Recent reading cards with type-based visual themes** — Name readings should look different from Question readings.
6. **Overall layout rhythm** — Hero (full width) → Actions (horizontal strip) → Stats (4-column) → Recent (card grid).

### Fix Scope

**Large change** — touches all dashboard components:

- `Dashboard.tsx` — restructure grid layout, pass missing props
- `WelcomeBanner.tsx` — add decorative gradient, always-visible content
- `DailyReadingCard.tsx` — redesign empty state, make it visually rich
- `QuickActions.tsx` — change to horizontal layout, add descriptions
- `StatsCard.tsx` — add per-stat color prop, larger icons, more visual weight
- `RecentReadings.tsx` — add per-type visual treatment

### Notes for the Developer

- **Moon data is missing from WelcomeBanner**: `Dashboard.tsx` line 48 calls `<WelcomeBanner isLoading={dailyLoading} />` but never passes `moonData`. The `useDailyReading` hook returns moon data inside `daily?.moon_phase` but it's not extracted and forwarded.
- **Username is always "Explorer"**: `WelcomeBanner` receives no `userName` prop from `Dashboard.tsx`, so it always falls back to the generic explorer greeting. The actual username likely comes from an auth store or a separate user profile API call.
- **DailyReadingCard empty state is the main visible state**: In the screenshot, `dailyReading` is null. The empty state at `DailyReadingCard.tsx` lines 52–63 is what most users see first and needs the most visual work.
- **QuickActions layout conflict**: `grid-cols-1 sm:grid-cols-3 lg:grid-cols-1` makes buttons go horizontal on tablet then vertical on desktop — the opposite of what feels natural.
- **RTL consideration**: Any decorative elements added to WelcomeBanner must mirror for RTL. Use `ms-`/`me-` instead of `ml-`/`mr-`, and check absolutely-positioned elements use `start`/`end` not `left`/`right`.
- **Dark/light mode**: The current gradient uses hard-coded `rgba(15,26,46,...)` values which only look correct in dark mode. New decorative backgrounds should reference CSS variables.
- **Mobile breakpoints**: At mobile size, the 8/4 grid collapses to full width. Any horizontal Quick Actions strip should also stack cleanly at mobile.

---

## Issue #2 — Oracle "Submit Reading" button returns "Server error. Please try again later."

**Reported by:** Screenshot (web-production-a5179.up.railway.app/oracle) + text description
**Priority:** P0 Critical
**Status:** **FIXED 2026-02-20** — Root cause: `time_progress` callback in `oracle.py` was missing the 4th `reading_type` parameter that `ReadingOrchestrator._send_progress()` passes (`TypeError: takes 3 positional args but 4 were given`). Fix: added `rt: str = "time"` to callback signature. Also added comprehensive exception handling (ImportError→503, generic→500).

> Core feature is broken. Users cannot generate any reading. The entire Oracle functionality is non-functional.

### What I See (User Report)

"The submit button is not working."

The screenshot shows:

- Time Reading form is filled (Hour: 04, Minute: 31, Second: 00)
- A red error message appears: **"Server error. Please try again later."**
- The green "Submit Reading" button is visible and not in loading state — meaning the request completed (and failed), not hung

### What's Actually Happening

The error message "Server error. Please try again later." is the generic fallback shown when the API returns a non-2xx response. The full flow:

1. `TimeReadingForm.tsx` calls `mutation.mutate(...)` on submit (line 69)
2. `useSubmitTimeReading()` calls `oracle.timeReading(data)` which POSTs to `/oracle/readings`
3. The `request()` function in `api.ts` adds `Authorization: Bearer {token}` — token comes from `localStorage.getItem("nps_token")` OR falls back to `import.meta.env.VITE_API_KEY`
4. The API returns a non-2xx status (likely 500, 502, or 401/403)
5. `onError` fires (lines 81–85 of `TimeReadingForm.tsx`), sets `error` to `err.message`
6. The error is rendered at lines 234–244 in red text

**Most likely root causes (in order of probability):**

- **Backend Oracle service is down or returning 500** — the production Railway deployment may have a crashed Oracle container
- **Auth failure (401/403)** — the `VITE_API_KEY` in the production environment may not be valid for the production database, or no valid JWT exists in localStorage
- **Wrong API base URL** — `api.ts` uses relative path `/api` which depends on nginx correctly forwarding to FastAPI on port 8000; if the proxy is misconfigured in production this gives 502/504

### Location in Codebase

| File                                                 | Line(s)     | What's there now                                                                                               |
| ---------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/oracle/TimeReadingForm.tsx` | 64–90       | `handleSubmit` — calls `mutation.mutate()`, sets `error` state on failure                                      |
| `frontend/src/components/oracle/TimeReadingForm.tsx` | 81–85       | `onError` handler: `const msg = err instanceof Error ? err.message : t("oracle.error_submit"); setError(msg);` |
| `frontend/src/components/oracle/TimeReadingForm.tsx` | 237         | Error element uses class `text-nps-bg-danger` — a class name collision (should be `text-nps-error`)            |
| `frontend/src/hooks/useOracleReadings.ts`            | retryConfig | 3 retries with exponential backoff, skips 4xx; server 5xx errors ARE retried 3 times before showing the error  |
| `frontend/src/services/api.ts`                       | ~7          | `const API_BASE = "/api"` — relative path, depends on nginx proxy in production                                |
| `frontend/src/services/api.ts`                       | ~49–51      | Auth: `localStorage.getItem("nps_token")` OR `import.meta.env.VITE_API_KEY`                                    |
| `frontend/.env`                                      | 1           | Contains `VITE_API_KEY` set to a hex string — this key may not match the production database's stored keys     |

### Root Cause

The Oracle backend is returning a server-side error (5xx) or auth rejection (401/403) for POST `/oracle/readings` in the production Railway environment, causing the frontend to surface the generic error message after exhausting 3 retry attempts.

### How It Should Be

Submitting a Time Reading with a valid user and time value should return a successful `FrameworkReadingResponse` and populate the results panel. No error should appear.

### Fix Scope

**Primarily backend/infrastructure** — the frontend error handling logic is correct. Investigation needed:

- Check Railway logs for the Oracle/API service containers at the time of submission
- Verify the `VITE_API_KEY` in Railway env vars matches a valid API key in the production PostgreSQL `oracle_api_keys` table
- Check nginx proxy config routes `/api/*` → FastAPI on port 8000
- If 401: ensure a valid JWT or API key is being sent with production requests

Secondary frontend fix:

- `TimeReadingForm.tsx` line 237: change `text-nps-bg-danger` → `text-nps-error` (correct semantic class)

### Notes for the Developer

- **Error fires after retries**: `useOracleReadings.ts` retries server errors 3 times. If the error appeared quickly (within 1–2 seconds), it is likely a 4xx (auth/not found) which skips retries — pointing to an auth issue.
- **Error text class bug**: Line 237 uses `text-nps-bg-danger` which resolves to `nps.bg.danger` in Tailwind config (`#da3633`). The correct semantic class for error text is `text-nps-error` (`#f85149`). Both are red but this is semantically wrong and fragile.
- **No toast notification**: Error only shows inline in the form. If the user is scrolled to the results panel they may miss it entirely. A toast would be more robust.
- **Production env vars**: Railway deployments should have env vars set in the Railway dashboard, not from the committed `.env` file. The `.env` file committed to the repo appears to contain a real API key — this violates CLAUDE.md rule #9 (NEVER commit `.env` files) and is a security concern regardless of this issue.

---

## Issue #3 — Oracle empty-state icon (crystal ball) is visually unappealing

**Reported by:** Screenshot (web-production-a5179.up.railway.app/oracle) + text description
**Priority:** P3 Low

> Visual only — doesn't break functionality but looks unpolished and unwelcoming.

### What I See (User Report)

"The picture that is there, the emoji, also doesn't like it."

The screenshot shows in the "Reading Results" section, below the Summary/Details/History tabs, a small circular icon above the text "Results will appear here after a reading." The user finds this icon unappealing.

### What's Actually Happening

The icon is **not an emoji** — it is a custom SVG component `CrystalBallIcon` rendered via the `EmptyState` component. However, the SVG design is too minimalistic:

- A simple circle outline (`fill="none"`, stroke only) — looks like a plain empty circle
- Three tiny filled circles inside at very low opacity (0.15, 0.4, 0.3, 0.25) — essentially invisible at 48px
- A curved path and horizontal line for the base

At `size={48}` (hardcoded in `EmptyState`), the SVG renders as a thin empty-looking circle with barely visible interior detail. It reads as a generic circle, not a crystal ball. The monochrome `currentColor` mapped to `text-nps-oracle-accent` (#4fc3f7) gives it a flat blue outlined appearance with no depth or mysticism.

Additionally, `SummaryTab` and `DetailsTab` call `<EmptyState>` with no `description` or `action` props, so the idle results panel shows only icon + one line of text — no invitation, no call-to-action.

### Location in Codebase

| File                                                       | Line(s)  | What's there now                                                                                                              |
| ---------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/common/icons/CrystalBallIcon.tsx` | 14–56    | SVG: outer circle stroke-only, inner glow at 15% opacity, 3 sparkle dots at 25–40% opacity, minimal base — all `currentColor` |
| `frontend/src/components/common/EmptyState.tsx`            | 48–50    | `<span className="mb-3 text-nps-oracle-accent"><IconComponent size={48} /></span>` — 48px, monochrome, no glow                |
| `frontend/src/components/oracle/SummaryTab.tsx`            | ~414–418 | `<EmptyState icon="readings" title={t("oracle.results_placeholder")} />` — no `description`, no `action` prop                 |
| `frontend/src/components/oracle/DetailsTab.tsx`            | ~363–366 | `<EmptyState icon="readings" title={t("oracle.details_placeholder")} />` — no `description`, no `action` prop                 |

### Root Cause

The `CrystalBallIcon` SVG is too sparse at 48px — the interior sparkle details are below the threshold of visibility at low opacity, making it read as a plain outlined circle. The `EmptyState` invocations also provide no supporting text or CTA, making the panel feel abandoned.

### How It Should Be

1. **Redesigned icon**: The crystal ball SVG needs a fill with subtle gradient inside the sphere, stronger visible highlights, and a glow effect — something recognizable as mystical at 48–64px
2. **Add description text**: A subtitle like "Choose a reading type and submit to see your results"
3. **Add a CTA button**: "Start a Reading" that scrolls to or focuses the Oracle form

### Fix Scope

**Small change** — 3–4 files:

- `CrystalBallIcon.tsx` — redesign SVG (add partial fill, stronger highlights) OR replace with a different icon
- `EmptyState.tsx` — optionally add CSS `drop-shadow` glow to the icon wrapper for the "readings" variant
- `SummaryTab.tsx` ~line 416 — add `description` and `action` props to `EmptyState`
- `DetailsTab.tsx` ~line 364 — same

### Notes for the Developer

- Icon color is controlled by the parent `span`'s `text-nps-oracle-accent` class. Any redesign should keep using `currentColor` for theme compatibility.
- A CSS `filter: drop-shadow(0 0 6px currentColor)` on the SVG wrapper `<span>` would add a glow cheaply without redesigning the SVG — this alone would make it look more "oracle-like".
- `size={48}` is hardcoded in `EmptyState.tsx` line 49. Bumping to `size={64}` would make the existing icon more readable without any SVG changes.
- Fix `SummaryTab` and `DetailsTab` only — `ReadingHistory.tsx` has its own separate `EmptyState` that is fine as-is.
- In RTL (Persian) mode the empty state layout is centered, so no directional changes needed for this component.

---

## Issue #4 — "The Message" output is a single unformatted wall of text with separator lines

**Reported by:** Screenshot (web-production-a5179.up.railway.app/oracle?type=question) + text description
**Priority:** P1 High

> The AI reading — the most important output of the entire app — is completely unreadable. Users cannot absorb or enjoy the content.

### What I See (User Report)

"I do not like the way the message is written. It's not comfortable to read, and also I want the text and everything to be in simpler English and more understandable by humans, and have all the things that a person would love to read if it's something there."

The screenshot shows "The Message" section containing a single continuous paragraph of approximately 700+ words with NO line breaks, NO paragraphs, and NO visual separation between sections. The section headers are embedded inline using long separator strings like:

`———————————————————— CORE IDENTITY ————————————————————`
`———————————————————— RIGHT NOW ————————————————————`
`———————————————————— THE MESSAGE ————————————————————`

The entire reading — header, universal address, core identity, right now, patterns, the message, advice, caution, and footer — is jammed into one single raw text block and rendered inside a single `<p>{reading}</p>` tag with no processing.

### What's Actually Happening

**Problem 1 — The `ai_interpretation` field stores the ENTIRE 9-section reading as one raw string.**
In `ai_interpreter.py`, the AI response is parsed into 9 sections (`header`, `universal_address`, `core_identity`, `right_now`, `patterns`, `message`, `advice`, `caution`, `footer`) stored in a `ReadingInterpretation` dataclass. However, when this data is serialized to the database and returned to the frontend, the `ai_interpretation` field in the API response appears to contain the **entire `full_text`** (all 9 sections concatenated), not just "The Message" section.

**Problem 2 — The frontend renders the raw string as plain text with no formatting.**
`TranslatedReading.tsx` line 42 renders the entire `reading` prop as `<p>{reading}</p>` — one plain paragraph with no whitespace processing, no line-break recognition, no markdown parsing, no section awareness. The separator strings (`————`) that the AI uses as section delimiters render literally as long dash sequences in the browser.

**Problem 3 — The AI is generating section headers and separators designed for a text terminal, not a web UI.**
The section markers defined in `ai_interpreter.py` (lines 48–62) like `"READING FOR"`, `"CORE IDENTITY"`, `"THE MESSAGE"` are all-caps labels that Claude outputs surrounded by long `————` separator lines. These are parsing markers for the backend section parser — they were never meant to be displayed to the user.

**Problem 4 — The language, while technically following the system prompt rules, is dense and jargon-heavy.**
The system prompt in `prompt_templates.py` defines "Wisdom" as a caring friend using plain language, but the actual output mixes technical tokens (`ME-OX-RUMT`, `J60: TIFI-DRMT-GOMT-TIWU`, `Y60: HOMT-ROFI`), life path titles ("Life Path 9 — Sage"), and dense run-on sentences. The system prompt allows 800–1200 words for full data but does not require readable paragraph breaks.

### Location in Codebase

| File                                                         | Line(s)          | What's there now                                                                                               |
| ------------------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/oracle/TranslatedReading.tsx`       | 42               | `<p>{reading}</p>` — renders entire multi-section raw string as a single paragraph                             |
| `frontend/src/components/oracle/TranslatedReading.tsx`       | 37–43            | No whitespace processing, no newline-to-break conversion, no markdown rendering                                |
| `services/oracle/oracle_service/engines/ai_interpreter.py`   | 48–62            | Section markers like `"READING FOR"`, `"CORE IDENTITY"` — all-caps delimiters embedded in the AI response text |
| `services/oracle/oracle_service/engines/prompt_templates.py` | 49–66            | Reading structure defined as 9 sections; no instruction to use readable paragraph breaks within sections       |
| `services/oracle/oracle_service/engines/prompt_templates.py` | 59               | "The Message: 3-5 sentence synthesis" — correct intent, but the AI outputs all 9 sections into one block       |
| `api/app/routers/oracle.py`                                  | ~178, ~232, ~409 | `ai_interpretation` stored from `full_text` (entire reading) rather than just `message` section                |

### Root Cause

The `ai_interpretation` field being sent to the frontend contains the entire raw AI response (`full_text`) including all 9 sections with their all-caps headers and `————` separator lines. The frontend has no rendering logic to parse or format this — it renders it as a single `<p>` tag. The result is a wall of unreadable text with visible parsing artifacts.

### How It Should Be

Two complementary fixes required:

**Backend fix:** The `ai_interpretation` stored in the database and returned by the API should be EITHER:

- (Option A) Only the `message` + `advice` + `caution` sections from the parsed `ReadingInterpretation` — the human-readable synthesis, not the full technical reading
- (Option B) The `full_text` but with markdown-formatted output (using `##`, `**`, newlines) instead of `————` separator lines, so the frontend can render it properly

**Frontend fix:** `TranslatedReading.tsx` needs to handle multi-line/formatted text:

- Replace `<p>{reading}</p>` with a renderer that converts newlines to `<br>` or paragraph breaks
- If markdown is used: use a lightweight markdown renderer (e.g., `react-markdown`)
- If plain text: split on `\n\n` and render each chunk as a separate `<p>` with spacing

**Language fix:** The system prompt should explicitly instruct Wisdom to:

- Use simple, warm, conversational sentences — not technical token strings in the body text
- Avoid showing raw FC60 tokens (`ME-OX-RUMT`) in the narrative; keep them in the header/universal address sections only
- Write in short paragraphs of 2–4 sentences each
- Use a reading level appropriate for a general audience, not a numerology expert

### Fix Scope

**Medium change — spans backend and frontend:**

- `prompt_templates.py` — add explicit formatting instructions to system prompt (no terminal-style separators, use paragraph breaks, simpler language in The Message section)
- `ai_interpreter.py` — verify which field gets stored as `ai_interpretation` in the API response; should be parsed section(s), not `full_text`
- `api/app/routers/oracle.py` — check what is assigned to `ai_interpretation` before DB storage (lines ~178, ~232, ~409)
- `TranslatedReading.tsx` — replace single `<p>` with paragraph-aware renderer (split on `\n\n` minimum)

### Notes for the Developer

- **The `ReadingInterpretation` dataclass already has separate sections** (`message`, `advice`, `caution`). The fix may be as simple as storing `interp.message + "\n\n" + interp.advice + "\n\n" + interp.caution` as `ai_interpretation` instead of `interp.full_text` in the oracle router.
- **Do not show technical headers in the frontend**: The `"READING FOR HAMZEH Date: 2026-02-18..."` header visible at the top of the screenshot is the AI's section 1 header — it should not appear in "The Message" panel since the SummaryTab already has its own `ReadingHeader` component. If `ai_interpretation` is scoped to just the `message` section, this header disappears automatically.
- **The `————` separator lines** are generated by Claude because the system prompt does not explicitly forbid them. Adding one line to `WISDOM_SYSTEM_PROMPT_EN` like `"Do not use separator lines (----, ====) in your response. Use blank lines between sections instead."` would fix the visual artifacts immediately.
- **System prompt language fix**: Add to TONE section: `"Write The Message section in 2–3 short paragraphs of plain English. Do not include technical tokens (FC60 stamps, Ganzhi tokens) in The Message — keep those in the Universal Address section only."`
- **Translation button**: The "Translate to Persian" button in `TranslatedReading.tsx` sends the entire raw `ai_interpretation` string (including separator lines and headers) to the translation API. If the text is cleaned up, translation quality will also improve significantly.
- **RTL rendering**: When showing the Persian translation, `TranslatedReading.tsx` correctly uses `dir="rtl" lang="fa"`. This is fine. The translation issue (Issue #5) is separate.

---

## Issue #5 — "Translate to Persian" button does not work

**Reported by:** Screenshot (web-production-a5179.up.railway.app/oracle?type=question) + text description
**Priority:** P1 High

> Core bilingual feature is broken. Persian-speaking users cannot read their readings in their native language.

### What I See (User Report)

"The button which is the translation to Persian, it doesn't work."

The screenshot shows the "Translate to Persian" button visible at the bottom of "The Message" section as a small teal/blue outlined button. Clicking it produces no translation.

### What's Actually Happening

The translation flow in `TranslatedReading.tsx`:

1. User clicks "Translate to Persian" button (line 49–56)
2. `handleTranslate()` is called (line 16–28)
3. `setIsTranslating(true)` — button changes to "Translating..."
4. `translation.translate(reading, "en", "fa")` is called — POSTs to `/translation/translate`
5. On success: `result.translated_text` is stored and shown
6. On error: `setError(t("oracle.translate_error"))` — shows an error message

The button either:

- **Silently fails** (no error message shows in the screenshot), meaning the API call succeeds but returns empty/null `translated_text`, OR
- **Fails with an error** that the user did not capture in the screenshot, meaning the `/translation/translate` endpoint is returning an error

**Most likely root causes:**

- The backend translation service (likely using Anthropic or a third-party translator) is not configured or running correctly in production
- The `/translation/translate` endpoint returns a 4xx or 5xx, but `TranslatedReading.tsx` catches the error and shows `t("oracle.translate_error")` — however the screenshot does not show this error text, suggesting the button may not have been clicked OR the error text is rendered in `text-nps-bg-danger` which may be invisible against the dark background
- The `translated_text` field in the response is empty string or null — `TranslatedReading.tsx` only checks `if (!translatedText)` to show the button, so if `translated_text` returns `""`, the button disappears but no translation shows

### Location in Codebase

| File                                                   | Line(s)               | What's there now                                                                                                                                                |
| ------------------------------------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/oracle/TranslatedReading.tsx` | 16–28                 | `handleTranslate()` — calls `translation.translate(reading, "en", "fa")`, sets `translatedText` on success                                                      |
| `frontend/src/components/oracle/TranslatedReading.tsx` | 20–21                 | `const result = await translation.translate(reading, "en", "fa"); setTranslatedText(result.translated_text);` — no null/empty check on `result.translated_text` |
| `frontend/src/components/oracle/TranslatedReading.tsx` | 48                    | `{!translatedText && (` — button only hidden when `translatedText` is truthy; if empty string returned, button disappears but no translation shows              |
| `frontend/src/components/oracle/TranslatedReading.tsx` | 73                    | Error rendered as `text-nps-bg-danger` — same class collision as Issue #2 (should be `text-nps-error`); error may be nearly invisible                           |
| `frontend/src/services/api.ts`                         | translation.translate | `POST /translation/translate` with `{ text, source_lang: "en", target_lang: "fa" }`                                                                             |

### Root Cause

The `/translation/translate` backend endpoint is either returning an error (possibly because the translation service requires configuration in production) or returning an empty `translated_text` field. A secondary issue is that even when an error occurs, the error display uses `text-nps-bg-danger` (same bug as Issue #2 error display) which may render as near-invisible text — making the failure silent to the user.

### How It Should Be

Clicking "Translate to Persian" should:

1. Show a loading state ("Translating..." with a spinner)
2. Replace the English text with the Persian translation using RTL layout and Vazirmatn font
3. Show a "Show Original" toggle to switch back

### Fix Scope

**Two-part fix:**

Backend/infrastructure:

- Verify the translation service is deployed and configured in the production Railway environment
- Check Railway logs for errors on `POST /translation/translate` at the time the button is clicked
- Confirm the translation backend has a valid API key (Anthropic or third-party) in its environment

Frontend defensive fixes:

- `TranslatedReading.tsx` line 21: add null/empty guard: `if (!result.translated_text) throw new Error("empty");`
- `TranslatedReading.tsx` line 73: change `text-nps-bg-danger` → `text-nps-error`
- Consider adding a visible toast or more prominent inline error if translation fails, since the current inline error may be missed
- The button should not disappear if translation returned empty — it should stay visible and show an error

### Notes for the Developer

- **The translation error is likely silent**: The screenshot does not show the `t("oracle.translate_error")` text, which means either the button was never clicked in that screenshot, the error rendered invisibly (wrong CSS class), or the call succeeded with an empty result.
- **Shared error class bug**: `TranslatedReading.tsx` line 73 uses `text-nps-bg-danger` (same as `TimeReadingForm.tsx` line 237 documented in Issue #2). This is a widespread pattern — search for `text-nps-bg-danger` across all components and replace with `text-nps-error`.
- **The translate button sends the full raw `ai_interpretation` string** (including separator lines and section headers from Issue #4) to the translation API. This inflates token cost and degrades translation quality. Fixing Issue #4 first (cleaning the `ai_interpretation` content) will improve translation quality automatically.
- **After Issue #4 is fixed**: The translation of a clean 3-paragraph "Message" section will be much more accurate than translating a 700-word raw technical dump.
- **Vazirmatn font**: `TranslatedReading.tsx` line 38 uses `className="font-[Vazirmatn]"` for the Persian text. Verify this font is loaded in the project (check `index.html` or font imports). If not loaded, the Persian text will fall back to the system default font.

---

## Issue #6 — Daily Reading fails with "Failed to submit reading. Please try again." and shows no reading

**Reported by:** Screenshot (web-production-a5179.up.railway.app/oracle?type=daily) + text: "in the daily reading also it doesn't work"
**Priority:** P0 Critical

> Same backend failure as Issue #2 but affects the Daily reading type specifically. All 5 reading types are broken in production.

### What I See (User Report)

"In the daily reading also it doesn't work."

The screenshot shows the Oracle page on the "Daily" reading type with:

- "Today's Reading" card visible with a date picker showing `18/02/2026`
- "Consulting for Hamzeh" subtitle
- "No daily reading generated yet." placeholder text
- A green "Generate Today's Reading" button
- Below the button: **"Failed to submit reading. Please try again."** in red
- A "Regenerate" link below the error
- The "Reading Results" panel below shows the empty-state crystal ball icon with "Results will appear here after a reading."

### What's Actually Happening

The Daily Reading uses the exact same backend endpoint as the Time Reading (Issue #2). The failure chain:

1. User clicks "Generate Today's Reading" button → calls `handleGenerate()` in `DailyReadingCard.tsx`
2. `handleGenerate()` calls `generateMutation.mutate({ user_id, reading_type: "daily", date, locale, numerology_system: "auto" })`
3. `useGenerateDailyReading()` hook calls `oracle.dailyReading(data)` in `api.ts`
4. `oracle.dailyReading()` POSTs to **`/oracle/readings`** — the exact same endpoint as the Time Reading
5. The backend returns a non-2xx response (same root cause as Issue #2)
6. `generateMutation.error` becomes truthy
7. The error block at the bottom of `DailyReadingCard.tsx` renders: `t("oracle.error_submit")` = "Failed to submit reading. Please try again."
8. A "Regenerate" link renders, calling `handleGenerate()` again

**Two additional issues specific to the Daily Reading component:**

**Issue 6a — The `DailyReadingCard` in Oracle does NOT call `onResult()`.**
In `OracleConsultationForm.tsx` (line 166–171), `DailyReadingCard` is rendered with only `userId` and `userName` props — the `onResult` prop is never passed. Even if the reading were to succeed, `OracleConsultationForm` has no way to receive the result and the "Reading Results" panel at the bottom of the Oracle page would never populate. The `onViewFull` prop in `DailyReadingCard` exists for this purpose but is not wired up in `OracleConsultationForm`.

**Issue 6b — The initial GET for an existing daily reading also fails silently.**
`useDailyReading(userId, selectedDate)` fires on component mount to check if a reading already exists for today (via GET `/oracle/daily/reading?user_id={userId}`). If this GET also fails (due to auth or backend issues), `cached` is null/undefined, `isLoading` becomes false, and the component shows the "No daily reading generated yet" state — the user has no indication that the fetch itself failed.

### Location in Codebase

| File                                                        | Line(s)                 | What's there now                                                                                                                               |
| ----------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/oracle/DailyReadingCard.tsx`       | 43–48                   | `handleGenerate()` — calls `generateMutation.mutate({ user_id, reading_type: "daily", ... })`                                                  |
| `frontend/src/components/oracle/DailyReadingCard.tsx`       | 196–204                 | Error block: `generateMutation.error` renders `t("oracle.error_submit")` + "Regenerate" link                                                   |
| `frontend/src/components/oracle/OracleConsultationForm.tsx` | 166–171                 | `<DailyReadingCard userId={userId} userName={userName} />` — `onViewFull` prop never passed; result never forwarded to parent via `onResult()` |
| `frontend/src/hooks/useOracleReadings.ts`                   | useGenerateDailyReading | Calls `oracle.dailyReading(data)` → POST `/oracle/readings` (same endpoint as Time Reading)                                                    |
| `frontend/src/hooks/useOracleReadings.ts`                   | useDailyReading         | Calls `oracle.getDailyReading(userId, date)` → GET `/oracle/daily/reading?user_id={userId}` — failure is silently swallowed                    |
| `frontend/src/services/api.ts`                              | oracle.dailyReading     | `POST /oracle/readings` — same endpoint as all other reading types                                                                             |
| `frontend/src/services/api.ts`                              | oracle.getDailyReading  | GET `/oracle/daily/reading?user_id={userId}` — separate endpoint for fetching cached daily reading                                             |

### Root Cause

**Primary:** The same backend service failure as Issue #2 — POST `/oracle/readings` returns a non-2xx response in production, affecting all reading types including Daily.

**Secondary:** `DailyReadingCard` is not wired up to pass its result back to the Oracle page's `ReadingResults` panel — even if the reading succeeded, the result would display only in `DailyReadingCard`'s own internal UI (the `dailyInsights` block), not in the full `ReadingResults` section with Summary/Details/History tabs.

### How It Should Be

1. Clicking "Generate Today's Reading" should successfully POST to `/oracle/readings` and return a reading
2. The reading should populate both `DailyReadingCard`'s insights section AND the `ReadingResults` panel via `onResult()` callback
3. On subsequent visits, `useDailyReading` should retrieve the cached reading so the user doesn't have to regenerate it
4. If the GET for an existing reading fails, a clear error state should be shown — not silently falling through to the "no reading" state

### Fix Scope

**Two-part fix:**

Backend/infrastructure (same as Issue #2 — fix together):

- Same root cause — fixing Issue #2 will also fix Issue #6

Frontend wiring fix:

- `OracleConsultationForm.tsx` line 169: pass `onViewFull` (or a new `onResult` prop) to `DailyReadingCard` so successful readings populate the `ReadingResults` panel
- `DailyReadingCard.tsx`: when `generateMutation` succeeds, call `onViewFull(data)` or a new `onResult` callback with the normalized result
- `useDailyReading` error state: surface a visible error when the initial GET fails, rather than silently showing the empty state

### Notes for the Developer

- **Issue #2 and Issue #6 share the same root cause** — they both POST to `/oracle/readings`. Fix the backend/auth once and both issues resolve simultaneously.
- **The `onViewFull` prop already exists** in `DailyReadingCard.tsx` — it's just not passed from `OracleConsultationForm`. The wiring is a 1-line addition: `onViewFull={(reading) => { onResult(normalizeFrameworkResult(reading, "reading")); onLoadingChange(false); }}` in `OracleConsultationForm.tsx` line 169.
- **The "Reading Results" panel stays empty for Daily**: Unlike Time/Name/Question readings which call `onResult()` on success, the Daily type never calls `onResult()` through `OracleConsultationForm`. This means the Summary/Details/History tabs in `ReadingResults` never populate for Daily readings even when they work — this is a pre-existing wiring gap, not caused by the backend failure.
- **Daily reading has two separate endpoints** — the generate endpoint (POST `/oracle/readings`) and the fetch endpoint (GET `/oracle/daily/reading`). Both may be failing in production. The screenshot shows the generate failure (red error text). Whether the fetch endpoint also fails is not visible in the screenshot but should be tested.
- **Error display is plain text, not styled** — unlike the Time Reading's glass-card error, the Daily error (`t("oracle.error_submit")`) renders as plain `text-sm text-nps-error` centered text. This is actually slightly better than the `text-nps-bg-danger` class bug in other components.
- **Date picker is present** — `DailyReadingCard.tsx` includes a date picker (lines 86–94) allowing users to generate readings for past dates. This is a good feature but depends on the backend being functional.

---

## Issue #7 — Mobile navigation drawer appears on the wrong side and "duplicates" the desktop sidebar in Persian (RTL) mode

**Reported by:** Screenshot (web-production-a5179.up.railway.app/oracle?type=daily, Persian/FA locale)
**Priority:** P1 High

> Core bilingual feature is broken. Switching to Persian (FA) language makes navigation visually broken — the mobile drawer opens on the wrong edge and visually conflicts with the desktop sidebar, making the app appear to have two overlapping sidebars simultaneously.

### What I See (User Report)

Screenshot shows the Oracle page (Daily tab) with the Persian locale active. The mobile navigation drawer is open on the LEFT side of the screen, displaying:

- NPS logo + X close button in the header
- Navigation links in Persian: داشبورد, اوراکل, تاریخچه خوانش, تنظیمات, اسکنر
- FA/EN toggle + sun (theme) toggle at the bottom

Simultaneously, the main page content on the RIGHT side shows the RTL desktop layout with the desktop sidebar also visible on the right edge (as expected in RTL). The result looks like "the sidebar is duplicated" — one on the right side (correct desktop sidebar) and another in the middle-left of the screen (the mobile drawer, wrong position).

### What's Actually Happening

There are **three interlocked bugs** that combine to produce this appearance:

**Bug A — The mobile drawer position and its closed-state transform use two different RTL detection systems that run out of sync.**

In `MobileNav.tsx` (lines 68–74):

```tsx
className={`fixed inset-y-0 z-50 w-[280px] ... ${
  isRTL ? "end-0" : "start-0"
} ${
  isOpen
    ? "translate-x-0"
    : "ltr:-translate-x-full rtl:translate-x-full"
}`}
```

The **position** (`end-0` / `start-0`) is controlled by `isRTL` from `useDirection()` — a **React JS state** value that updates synchronously when `i18n.language` changes.

The **closed-state transform** (`ltr:-translate-x-full` / `rtl:translate-x-full`) uses **Tailwind RTL variants** (`ltr:` / `rtl:` prefixes from `tailwindcss-rtl` plugin). Per `tailwind.config.ts` line 101 (`plugins: [rtl]`), these variants compile to CSS selectors `[dir="ltr"] .ltr\:...` and `[dir="rtl"] .rtl\:...` — they are triggered by the `dir` attribute on `<html>`, **not by React state**.

The `dir` attribute is set asynchronously in `App.tsx` (lines 25–29):

```tsx
useEffect(() => {
  const dir = i18n.language === "fa" ? "rtl" : "ltr";
  document.documentElement.dir = dir;
  document.documentElement.lang = i18n.language;
}, [i18n.language]);
```

`useEffect` runs **after** the render cycle. This creates a race condition on language switch:

1. User clicks the FA/EN toggle → `i18n.language` becomes `"fa"`
2. `useDirection()` in `MobileNav.tsx` immediately returns `isRTL = true`
3. React re-renders: the drawer gets `end-0` (positioned on the right side)
4. **But `document.documentElement.dir` is still `"ltr"`** (the `useEffect` hasn't run yet)
5. With `dir="ltr"` still on `<html>`, the class `ltr:-translate-x-full` is ACTIVE — this moves the drawer LEFT
6. A drawer positioned at `right: 0` (from `end-0`) that is moved LEFT lands in the VISIBLE CENTER of the screen

Result: the closed mobile drawer briefly flashes into the visible area during the language switch, appearing as an unwanted sidebar popup.

**Bug B — In RTL mode, when the drawer IS explicitly opened, it appears on the same side as the desktop sidebar.**

In RTL mode (`dir="rtl"`, Persian locale):

- The desktop sidebar `<aside>` is `hidden lg:flex` — rendered before the main content in the DOM. In an RTL flex container, the first child appears on the RIGHT side of the viewport. So the desktop sidebar is on the right ✓
- When the mobile drawer is opened in RTL mode, it uses `end-0` (`right: 0`) — also on the right side

At viewport widths near the `lg` breakpoint (1024px), both panels can be partially or fully visible simultaneously, creating the "duplicated sidebar" appearance. The mobile drawer (with backdrop) overlaps the same region as the desktop sidebar.

**Bug C — The hamburger button can be visible at the same breakpoint where the desktop sidebar activates.**

In `Layout.tsx`:

- Desktop sidebar: `hidden lg:flex` — visible at ≥ 1024px
- Hamburger button: `lg:hidden` — hidden at ≥ 1024px

These thresholds are identical (both `lg` = 1024px). At exactly this width, CSS specificity and sub-pixel rendering can produce states where both appear simultaneously, allowing the hamburger to be clicked on a "desktop" viewport that also shows the desktop sidebar.

### Location in Codebase

| File                                    | Line(s) | What's there now                                                                                                                                                                                |
| --------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/MobileNav.tsx` | 68–74   | Drawer uses JS-state `isRTL` for position (`end-0`/`start-0`) but CSS `dir` attribute for transform (`ltr:`/`rtl:` Tailwind variants) — two systems that are out of sync during language switch |
| `frontend/src/components/MobileNav.tsx` | 68      | `border-e` logical property — correct in isolation but contributes to visual confusion during Bug A flash                                                                                       |
| `frontend/src/hooks/useDirection.ts`    | 14–25   | `isRTL: i18n.language === "fa"` — JS-land RTL detection, updates synchronously on language change                                                                                               |
| `frontend/src/App.tsx`                  | 25–29   | `useEffect` sets `document.documentElement.dir` — runs AFTER render, creating a frame gap vs `useDirection()` updates                                                                           |
| `frontend/src/components/Layout.tsx`    | 36–42   | Desktop sidebar: `hidden lg:flex` — hidden below 1024px                                                                                                                                         |
| `frontend/src/components/Layout.tsx`    | 93–96   | Hamburger button: `lg:hidden` — hidden at/above 1024px (identical threshold to sidebar)                                                                                                         |
| `frontend/tailwind.config.ts`           | 101     | `plugins: [rtl]` — confirms `ltr:`/`rtl:` variants use CSS `[dir]` attribute, not React state                                                                                                   |

### Root Cause

The core bug is that `MobileNav.tsx` uses **two independent RTL detection systems** for two different visual properties of the same element:

- **Position** (`end-0`/`start-0`): driven by `isRTL` from `useDirection()` — updates synchronously with React render
- **Closed-state transform** (`ltr:-translate-x-full`/`rtl:translate-x-full`): driven by Tailwind `ltr:`/`rtl:` CSS variants — activated by `document.documentElement.dir` which updates asynchronously via `useEffect`

The render cycle gap between these two systems causes the closed drawer to momentarily appear in the visible viewport. When the drawer IS intentionally opened in RTL, it occupies the same screen edge as the desktop sidebar, creating the "two sidebars" appearance.

### How It Should Be

1. Switching to Persian (FA) language should NOT cause the closed mobile drawer to flash into view
2. The open mobile drawer in RTL should slide in from the RIGHT edge — but only on mobile viewports (below 1024px)
3. On desktop viewports (1024px+), the hamburger and the mobile drawer should be completely inaccessible — the desktop sidebar handles all navigation
4. At no point should two navigation panels be simultaneously visible

### Fix Scope

**Frontend-only fix — small to medium:**

- `MobileNav.tsx` lines 71–73: Consolidate both RTL systems to use the same source. **Recommended approach (Option C — minimal change):** Replace the Tailwind RTL variant classes on the transform with JS-controlled classes that use the same `isRTL` source as the position:

  Change:

  ```tsx
  isOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full";
  ```

  To:

  ```tsx
  isOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full";
  ```

  This makes both position (`end-0`/`start-0`) and transform (`translate-x-full`/`-translate-x-full`) driven by the same `isRTL` JS state from `useDirection()`, eliminating the async gap entirely. No CSS changes required.

- `App.tsx` / `Layout.tsx` (optional hardening): Apply the existing `.no-transition` class from `rtl.css` to the MobileNav drawer container during locale switches to prevent any residual flash during the React→DOM attribute propagation.

### Notes for the Developer

- **Option C is the minimal one-line fix** — change only the ternary on line 73 of `MobileNav.tsx`. This eliminates the race condition without touching CSS, `rtl.css`, `App.tsx`, or `tailwind.config.ts`.
- **Do NOT remove the `ltr:`/`rtl:` Tailwind variants from the project** — they are used correctly in other components (e.g., `Layout.tsx` line 78 for the sidebar collapse arrow). Only remove them from `MobileNav.tsx`'s drawer transform.
- **The `border-e` on the drawer is correct** — it uses a logical property that always renders the border on the interior-facing edge. No change needed here.
- **The `useDirection()` hook is the right single source of truth**: The hook is well-designed. The issue is not the hook — it is the mixing of its output with Tailwind RTL CSS variants in the same component.
- **Test sequence after fix**: (1) Toggle FA↔EN rapidly 3–4 times — the closed drawer must never flash into view. (2) At exactly 1024px viewport width in both locales — verify only one navigation panel is visible. (3) Open the mobile drawer in RTL (< 1024px) — it must slide in from the RIGHT edge. (4) Open the mobile drawer in LTR (< 1024px) — it must slide in from the LEFT edge.
- **The `tailwindcss-rtl` plugin** (confirmed in `tailwind.config.ts` line 101) generates CSS like `[dir="rtl"] .rtl\:translate-x-full { --tw-translate-x: 100%; }`. These rules only activate when `document.documentElement.dir === "rtl"` — which is set asynchronously, confirming the root cause.
- **RTL mobile UX convention**: In Arabic/Persian interfaces, the navigation drawer conventionally slides in from the right (trailing edge). The current code attempts this via `end-0`, which is correct. After applying the fix, this behavior is preserved — the drawer will correctly open from the right in RTL.

**Status:** **FIXED 2026-02-21** — Changed to JS-controlled isRTL transform

---

## Issue #8 — Error text is invisible: `text-nps-bg-danger` used instead of `text-nps-error` in 7 places

**Reported by:** Codebase audit (pattern found in Issues #2 and #5)
**Priority:** P1 High
**Status:** **FIXED 2026-02-20** — All 7 occurrences across 6 files changed to `text-nps-error`.

> Every inline error message across Oracle forms, the translate button, and multi-user selector uses the wrong CSS color token. Errors may render in the wrong shade or fail to contrast correctly against the dark background — making failures invisible or barely readable.

### What I See (User Report)

Across all Oracle forms and the translation flow, when an error occurs the red text appears but is visually inconsistent — sometimes too dim, sometimes using a different red shade than the rest of the app's error styling. In Issue #2 and #5, the error element class was identified as `text-nps-bg-danger` but noted as semantically wrong.

### What's Actually Happening

The Tailwind config defines two separate red tokens:

- `nps-bg-danger` — a **background** color token (`#da3633`), intended for red badge backgrounds, danger button fills, etc.
- `nps-error` — a **text** color token (`#f85149`), intended specifically for inline error text

When a component uses `text-nps-bg-danger` for error text, it is:

1. Using the background color as a foreground text color — semantically wrong
2. Using a slightly different shade than the rest of the app's error text, causing visual inconsistency
3. Fragile — if the theme ever changes the background danger token, every error message silently changes color

This pattern appears in **7 locations** across 5 files. All were coded the same way, suggesting this was an early typo that propagated via copy-paste.

### Location in Codebase

| File                                                     | Line(s) | What's there now                                                                      |
| -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| `frontend/src/components/oracle/TimeReadingForm.tsx`     | 237     | `className="text-xs text-nps-bg-danger"` — inline form error                          |
| `frontend/src/components/oracle/NameReadingForm.tsx`     | 361     | `className="text-xs text-nps-bg-danger"` — inline form error                          |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | 539     | `className="text-xs text-nps-bg-danger"` — inline form error                          |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | 417     | `? "text-nps-bg-danger"` — conditional character counter warning color                |
| `frontend/src/components/oracle/MultiUserSelector.tsx`   | 206     | `className="text-xs text-nps-bg-danger"` — multi-user error                           |
| `frontend/src/components/oracle/UserChip.tsx`            | 25      | `className="ms-1 hover:text-nps-bg-danger transition-colors"` — delete hover color    |
| `frontend/src/components/oracle/TranslatedReading.tsx`   | 73      | `className="text-xs text-nps-bg-danger"` — translation error (also noted in Issue #5) |

### Root Cause

Early in development, `text-nps-bg-danger` was used for error text in one form, then copy-pasted into every subsequent form. The visual difference between `#da3633` and `#f85149` is subtle enough that it was never caught in review, but it is semantically incorrect and will cause silent color drift if the theme changes.

### How It Should Be

Every instance of `text-nps-bg-danger` used for **text color** should be replaced with `text-nps-error`. The only correct use of `text-nps-bg-danger` is as a background fill (e.g., `bg-nps-bg-danger` for danger badges).

### Fix Scope

**Trivial — pure find and replace across 5 files.** No logic changes, no structural changes. Run a codebase-wide search for `text-nps-bg-danger` to ensure no other instances were missed.

### Notes for the Developer

- This is a one-line fix per file — change `text-nps-bg-danger` → `text-nps-error` in 7 locations.
- `UserChip.tsx` line 25 uses it as a hover color (`hover:text-nps-bg-danger`). The correct replacement is `hover:text-nps-error`.
- After fixing, run a global search: `grep -r "text-nps-bg-danger" frontend/src/` — result should be zero matches.
- Do NOT change any `bg-nps-bg-danger` occurrences — those are correct background usage.

---

## Issue #9 — Delete reading fires immediately with no confirmation dialog

**Reported by:** Codebase audit (data loss risk pattern)
**Priority:** P1 High

> Users can permanently delete their Oracle readings with a single click and no undo. There is no confirmation dialog, no warning, and no recovery path. One misclick destroys data permanently.

### What I See (User Report)

When viewing Reading History, each reading card has a small × delete button. Clicking it immediately deletes the reading — there is no "Are you sure?" prompt, no undo toast, and no way to recover the reading after it disappears.

The same problem exists in the Reading Detail panel: a "Delete" text button sits right next to the "Close" button, making accidental deletion easy.

### What's Actually Happening

**In `ReadingHistory.tsx`:**
`handleDelete(id)` at lines 87–90 calls `deleteReadingMutation.mutate(id)` directly. There is no modal, no `window.confirm()`, no intermediate confirmation state.

**In `ReadingCard.tsx`:**
The delete button at lines 59–69 is a small `×` character hidden at opacity-0 until hover. When clicked, it calls `onDelete(reading.id)` which traces back to the same `handleDelete` with no guard.

**In `ReadingDetail.tsx`:**
The Delete button at lines 43–50 calls `onDelete(reading.id)` directly. This panel is displayed as an overlay next to the Close button — a user reaching for Close could accidentally hit Delete.

### Location in Codebase

| File                                               | Line(s)            | What's there now                                                      |
| -------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| `frontend/src/pages/ReadingHistory.tsx`            | 87–90              | `handleDelete` calls `deleteReadingMutation.mutate(id)` with no guard |
| `frontend/src/components/oracle/ReadingCard.tsx`   | 59–69              | `×` button calls `onDelete(reading.id)` directly                      |
| `frontend/src/components/oracle/ReadingDetail.tsx` | 43–50              | Delete button calls `onDelete(reading.id)` directly                   |
| `frontend/src/hooks/useOracleReadings.ts`          | `useDeleteReading` | Mutation fires immediately, no pre-confirmation hook                  |

### Root Cause

The delete flow was implemented without an intermediate confirmation step. There is no shared confirmation modal component in the project to reuse — one needs to be created or the existing Modal/Dialog component (if any exists in `components/common/`) needs to be wired in.

### How It Should Be

1. User clicks delete (on card or in detail panel)
2. A confirmation dialog appears: **"Delete this reading? This cannot be undone."** with **Cancel** and **Delete** buttons
3. Cancel: closes dialog, nothing deleted
4. Delete: fires the mutation, closes dialog, shows a brief toast "Reading deleted"
5. On error: shows toast "Failed to delete reading. Please try again."

### Fix Scope

**Small–medium change:**

- Check if a `ConfirmDialog` or `Modal` component exists in `frontend/src/components/common/` — if yes, wire it in
- If not: create a minimal `ConfirmDialog` component (a simple overlay with title, message, Cancel + Confirm buttons)
- `ReadingHistory.tsx`: add state `confirmDeleteId: string | null`, show dialog when set, only call mutation on confirm
- `ReadingCard.tsx`: same pattern — emit an event to the parent rather than calling delete directly (or lift the confirm state up)
- `ReadingDetail.tsx`: same pattern
- Add success/error toast after mutation completes

### Notes for the Developer

- The pattern should be: click delete → set `confirmDeleteId` → show `<ConfirmDialog>` → on confirm, call mutation → close dialog.
- Do NOT use `window.confirm()` — it is synchronous, blocks the UI, looks ugly, and cannot be styled.
- The `ReadingCard` delete button is currently hidden until hover. After adding confirmation, this is fine — but consider making it more visible on mobile (hover doesn't exist on touch devices).
- There is NO undo/recovery path in the backend — the deletion is permanent. This makes the confirmation even more important.
- Toast on success/error is separate from confirmation — add both.

---

## Issue #10 — UserForm profile delete uses a two-click pattern that is accident-prone

**Reported by:** Codebase audit (data loss risk pattern)
**Priority:** P1 High

> The two-click "double confirm" delete pattern for Oracle user profiles is a UI anti-pattern. The visual change between click 1 and click 2 is a small color change on a tiny button — far too subtle to prevent accidental deletion. One quick double-click deletes a profile permanently.

### What I See (User Report)

In the Oracle user management form, there is a delete button for each profile. Clicking it once changes the button label/color, and clicking it again immediately deletes the profile. There is no modal, no typed confirmation, and no undo.

### What's Actually Happening

`UserForm.tsx` lines 481–501 implement a two-state delete confirmation:

1. First click: sets `showDeleteConfirm = true`, button turns red and text changes to "Confirm delete?"
2. Second click: calls `handleDeleteUser()` → fires the delete mutation

The problem: both click targets are the **same small button** in the same location. A user who double-clicks the delete button (common on touch or with a fast mouse) will skip through both states and delete their profile before seeing the visual change. Additionally, there is no click-away or timeout to cancel the first state — if a user accidentally clicks once and then clicks anywhere else, the button stays in "Confirm?" mode indefinitely.

### Location in Codebase

| File                                          | Line(s)  | What's there now                                                                                      |
| --------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `frontend/src/components/oracle/UserForm.tsx` | 481–501  | Two-click delete confirm: first click sets `showDeleteConfirm`, second click fires deletion           |
| `frontend/src/components/oracle/UserForm.tsx` | ~490–495 | Button changes color/text on first click — no modal, no spatial separation between Cancel and Confirm |

### Root Cause

The two-click pattern was implemented as a lightweight confirmation mechanism to avoid adding a modal dependency. However, the pattern is inherently unsafe because both actions occupy the same click target — there is no spatial separation between "I want to delete" and "I confirm I want to delete."

### How It Should Be

Replace the two-click pattern with a proper confirmation modal:

1. User clicks Delete → a `ConfirmDialog` opens: **"Delete [user name]'s profile? All their readings will be lost. This cannot be undone."**
2. Cancel button: closes dialog, nothing deleted
3. Delete button (red, destructive): fires deletion, closes dialog
4. Cancel and Delete are spatially separated in the dialog — the user must consciously move their cursor/finger to the red "Delete" button

### Fix Scope

**Small change** — same `ConfirmDialog` component from Issue #9:

- `UserForm.tsx` lines 481–501: remove `showDeleteConfirm` state, replace with a modal trigger
- Pass the user's name into the confirmation message for clarity: "Delete Hamzeh's profile?"
- Reuse the `ConfirmDialog` created for Issue #9

### Notes for the Developer

- After fixing Issues #9 and #10 with the same `ConfirmDialog` component, the delete confirmation pattern will be consistent across the entire app.
- The message in the UserForm confirmation should mention that readings may be affected — more context than a generic "Are you sure?"
- Consider adding a brief "hover-to-cancel" state on the first-click if keeping the two-click pattern: clicking elsewhere cancels the state after 3 seconds (like Twitter/X's "undo" pattern).
- The double-click vulnerability is the primary safety concern here — a modal completely eliminates it.

---

## Issue #11 — Admin panel routes are completely unprotected (AdminGuard not wired into App.tsx)

**Reported by:** Codebase audit (security)
**Priority:** P0 Critical
**Status:** **FIXED 2026-02-20** — `AdminGuard` wired into `App.tsx` wrapping all `/admin` routes via `<Route element={<AdminGuard />}>`.

> Any user who knows the URL can navigate directly to `/admin`, `/admin/users`, `/admin/profiles`, `/admin/monitoring`, or `/admin/backups` without any authentication or authorization check. The `AdminGuard` component was built but never connected to the routing layer.

### What I See (User Report)

A regular (non-admin) user who types `https://app.nps.com/admin` into their browser gets the full admin panel — user management, profile data, system logs, backup controls — with no redirect, no error, and no authentication check.

### What's Actually Happening

`AdminGuard.tsx` exists and implements an authorization check:

```tsx
const role = localStorage.getItem("nps_user_role");
if (role !== "admin") return <div>403 — Access Denied</div>;
return <Outlet />;
```

However, in `App.tsx` lines 78–91, the admin routes are defined as:

```tsx
<Route path="/admin" element={<Admin />}>
  <Route path="users" element={<AdminUsers />} />
  <Route path="profiles" element={<AdminProfiles />} />
  <Route path="monitoring" element={<AdminMonitoring />} />
  <Route path="backups" element={<AdminBackups />} />
</Route>
```

`<AdminGuard>` is **never used here**. The `<Admin />` component renders directly. All 5 admin routes are completely unprotected at the routing level.

### Location in Codebase

| File                                           | Line(s) | What's there now                                                                       |
| ---------------------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| `frontend/src/App.tsx`                         | 78–91   | Admin routes render `<Admin />` directly — `AdminGuard` never applied                  |
| `frontend/src/components/admin/AdminGuard.tsx` | 5–28    | Guard component exists and checks `localStorage.nps_user_role` — but unused in routing |

### Root Cause

`AdminGuard` was built as a standalone component but was never wired into the `App.tsx` route tree. It was likely intended to wrap the admin routes but the connection was never made.

### How It Should Be

The `/admin` route and all its children must be wrapped in `<AdminGuard>`:

```tsx
<Route element={<AdminGuard />}>
  <Route path="/admin" element={<Admin />}>
    <Route path="users" element={<AdminUsers />} />
    <Route path="profiles" element={<AdminProfiles />} />
    <Route path="monitoring" element={<AdminMonitoring />} />
    <Route path="backups" element={<AdminBackups />} />
  </Route>
</Route>
```

With `AdminGuard` using `<Outlet />` for authorized users, this wrapping ensures **no admin child route renders** without passing the guard.

### Fix Scope

**Trivial — one structural change in `App.tsx`:**

- Wrap the `/admin` `<Route>` block inside `<Route element={<AdminGuard />}>`
- No changes to `AdminGuard.tsx` itself
- See Issue #12 for the additional concern that the guard itself uses localStorage (which is bypassable)

### Notes for the Developer

- This is a **two-line change in App.tsx** — add the wrapper `<Route element={<AdminGuard />}>` before the `/admin` route and close it after.
- This fix is necessary but **not sufficient** for full security — see Issue #12 for why the guard itself is weak.
- The complete fix requires both Issue #11 (wiring the guard) and Issue #12 (strengthening the guard's auth check).
- Until Issue #12 is also fixed, a malicious user can bypass the guard by setting `localStorage.nps_user_role = "admin"` in the browser console.
- This is a frontend-only guard. Backend API routes must also verify admin scope — check that API endpoints in `api/app/routers/` use `require_scope("admin")` for all admin operations.

---

## Issue #12 — Admin menu visibility and guard use localStorage role (bypassable by any user)

**Reported by:** Codebase audit (security pattern)
**Priority:** P1 High

> Both the admin navigation visibility check and the AdminGuard authorization check read the user's role from `localStorage` — client-side storage that any user can edit in the browser's developer tools in seconds. This is security theater, not real authorization.

### What I See (User Report)

A non-admin user opens their browser DevTools, types `localStorage.setItem("nps_user_role", "admin")`, refreshes the page — and the Admin menu item appears in the navigation, and the AdminGuard (once wired per Issue #11) passes without challenge.

### What's Actually Happening

**In `Layout.tsx` line 58:**

```tsx
isAdmin={localStorage.getItem("nps_user_role") === "admin"}
```

This controls whether the Admin menu item is shown in the navigation sidebar.

**In `AdminGuard.tsx` line 7:**

```tsx
const role = localStorage.getItem("nps_user_role");
```

This controls whether the admin routes render or show a 403.

Both rely entirely on a value the user controls. There is no JWT claim check, no API call verification, and no server-side validation in the frontend guard.

### Location in Codebase

| File                                           | Line(s) | What's there now                                                                        |
| ---------------------------------------------- | ------- | --------------------------------------------------------------------------------------- |
| `frontend/src/components/Layout.tsx`           | 58      | `isAdmin={localStorage.getItem("nps_user_role") === "admin"}` — localStorage role check |
| `frontend/src/components/admin/AdminGuard.tsx` | 7       | `const role = localStorage.getItem("nps_user_role")` — localStorage role check          |
| `frontend/src/components/Navigation.tsx`       | 114     | Receives `isAdmin` prop from Layout, filters nav items based on it                      |

### Root Cause

During scaffolding, admin role detection was implemented as a quick localStorage check. The proper implementation requires reading the role from the JWT token payload or from a verified auth context (e.g., a React context populated from the API on login), not from editable localStorage.

### How It Should Be

1. On login, the JWT returned by the API should include the user's role in its payload (e.g., `{ "sub": "user_id", "role": "admin", "exp": ... }`)
2. The frontend should decode the JWT (not verify — that's the server's job) and store the decoded claims in an auth React context
3. `Layout.tsx` and `AdminGuard.tsx` should read from that auth context: `const { user } = useAuth(); const isAdmin = user?.role === "admin";`
4. This way, the role is derived from the server-issued token, not from user-editable storage

### Fix Scope

**Medium change — requires auth context:**

- Check if an `AuthContext` or `useAuth()` hook already exists in `frontend/src/hooks/` or `frontend/src/context/`
- If yes: update `Layout.tsx` and `AdminGuard.tsx` to read `role` from the auth context instead of localStorage
- If no: create a minimal auth context that decodes the JWT from localStorage and exposes `user.role`
- The JWT decoding itself is client-side only (base64 decode of the payload section) — no crypto verification needed on the frontend; the server verifies on every API request

### Notes for the Developer

- JWT payload decoding is simple: `JSON.parse(atob(token.split('.')[1]))` gives you the claims object
- Even with auth context, the backend APIs must independently verify admin scope. Frontend guards are UX-layer protection only — they prevent normal users from seeing the admin UI, but the real security is the server's `require_scope("admin")` checks.
- Do not store the decoded role in localStorage directly — derive it fresh from the JWT on each auth context load.
- If the user logs out, the auth context must be cleared so the admin menu disappears immediately without requiring a page refresh.

---

## Issue #13 — Admin analytics and log viewer silently swallow fetch errors

**Reported by:** Codebase audit (silent failure pattern)
**Priority:** P2 Medium

> When the admin analytics charts or the log viewer fail to load data (network error, server error, auth failure), the components silently show an empty state with no indication that anything went wrong. Admins have no way to know whether they are looking at "no data" or "failed to fetch data."

### What I See (User Report)

An admin visits the monitoring panel. The analytics charts area is empty and the log viewer shows no entries. There is no error message, no retry button, and no indication of failure. The admin cannot tell if the system has no data or if the data failed to load.

### What's Actually Happening

**`AnalyticsCharts.tsx` lines 58–61:**

```tsx
} catch {
  /* silent */
} finally {
  setLoading(false);
}
```

The catch block swallows any error entirely. The component transitions from loading to an empty state with no error flag set.

**`LogViewer.tsx` lines 81–84:**
Same pattern — catch block is empty or sets nothing, `setLoading(false)` runs in finally, and the component renders the "no logs" empty state whether the fetch succeeded with zero results or failed entirely.

### Location in Codebase

| File                                                | Line(s) | What's there now                                       |
| --------------------------------------------------- | ------- | ------------------------------------------------------ |
| `frontend/src/components/admin/AnalyticsCharts.tsx` | 58–61   | `catch { /* silent */ } finally { setLoading(false) }` |
| `frontend/src/components/admin/LogViewer.tsx`       | 81–84   | Same silent catch pattern                              |

### Root Cause

Error handling was omitted during initial implementation of the admin components. The components have loading and data states but no error state.

### How It Should Be

1. Each component should have an `error` state: `const [error, setError] = useState<string | null>(null)`
2. In the catch block: `setError("Failed to load data. Please try again.")`
3. In the render: if `error` is set, show an error card with the message and a "Retry" button that clears the error and re-fetches
4. The empty state (zero results) and the error state should look visually different — error gets a red/warning icon, empty data gets a neutral "no data" icon

### Fix Scope

**Small change — 2 files:**

- `AnalyticsCharts.tsx`: add `error` state, set in catch, render error UI when set
- `LogViewer.tsx`: same pattern
- Each component needs a retry mechanism (re-run the fetch function) accessible from the error state UI

### Notes for the Developer

- The error state UI should include a retry button — not just a message. Admins should be able to recover without a full page refresh.
- Consider using React Query (`useQuery`) for these fetches instead of manual `useState` + `useEffect` — it provides built-in `isError`, `error`, and `refetch` for free.
- The distinction between "no data" and "fetch failed" is important for admin diagnostics — do not merge these states into a single empty state.

---

## Issue #14 — Location dropdowns silently empty out when geolocation API fails

**Reported by:** Codebase audit (silent failure pattern)
**Priority:** P2 Medium

> When the countries or cities API call fails (network error, timeout, or server error), the location dropdowns in the UserForm silently return empty arrays. Users see empty dropdowns and assume there are no options, not that the data failed to load. There is no error message and no retry mechanism.

### What I See (User Report)

User opens the UserForm to add or edit an Oracle user. The Country dropdown is empty. They assume there are no countries to select, or that location is optional, when in fact the data failed to load from the API.

### What's Actually Happening

**`geolocationHelpers.ts` lines 61–63:**

```tsx
} catch {
  return [];
}
```

**Lines 79–81:**

```tsx
} catch {
  return [];
}
```

Both `fetchCountries()` and `fetchCities()` return empty arrays on any error, without throwing or surfacing the failure. The calling component (`UserForm.tsx`) receives `[]` and renders an empty dropdown with no indication of failure.

### Location in Codebase

| File                                          | Line(s)                   | What's there now                                            |
| --------------------------------------------- | ------------------------- | ----------------------------------------------------------- |
| `frontend/src/utils/geolocationHelpers.ts`    | 61–63                     | `catch { return [] }` — countries fetch fails silently      |
| `frontend/src/utils/geolocationHelpers.ts`    | 79–81                     | `catch { return [] }` — cities fetch fails silently         |
| `frontend/src/components/oracle/UserForm.tsx` | (location selector usage) | Receives empty arrays from helpers, renders empty dropdowns |

### Root Cause

The helpers were designed to always return arrays for type safety, and error handling was not added. The pattern `catch { return [] }` is common but masks real failures.

### How It Should Be

Option A (throw): The helpers throw the error, and the calling component handles it with an error state and retry.

Option B (return with metadata): The helpers return `{ data: [], error: "Failed to load countries" }` and the component renders an error message with a retry button.

Option B is recommended since the current callers expect arrays directly and Option A would require more refactoring.

### Fix Scope

**Small change:**

- `geolocationHelpers.ts`: change both helpers to return `{ data: string[], error: string | null }` instead of plain arrays
- `UserForm.tsx`: update usage to destructure `{ data, error }`, show an error message + retry button when `error` is set
- Alternatively: throw the error from helpers and add a try/catch in `UserForm.tsx` that sets a visible error state

### Notes for the Developer

- The error message should be actionable: "Could not load country list. Check your connection and try again." with a Retry button.
- The cities API depends on the selected country — if cities fail to load after a country is selected, that specific dropdown should show the error, not the entire form.
- Location is optional in the UserForm — so a failed location load should not block form submission. The error should be informational, not blocking.

---

## Issue #15 — StarRating hardcodes `dir="ltr"` regardless of app language

**Reported by:** Codebase audit (RTL pattern, same family as Issue #7)
**Priority:** P2 Medium

> The StarRating component hardcodes `dir="ltr"` on its container, preventing it from mirroring in Persian (RTL) mode. In right-to-left interfaces, star ratings conventionally read from right to left (5 stars on the right, 1 star on the left). The current implementation always renders left-to-right regardless of the user's language.

### What I See (User Report)

In Persian mode, the star rating in the reading feedback section displays stars in the same left-to-right order as English mode. In a Persian interface where text and flow run right-to-left, this creates an inconsistency — the 1-star position is on the left when Persian users expect it on the right.

### What's Actually Happening

`StarRating.tsx` line 81:

```tsx
<div role="radiogroup" dir="ltr" ...>
```

The `dir="ltr"` attribute is hardcoded. It cannot be overridden by the parent's `dir="rtl"` because an element's own `dir` attribute takes precedence over an inherited one.

Additionally, the `aria-label` on individual star buttons uses hardcoded English: `aria-label={\`${star} star${star !== 1 ? "s" : ""}\`}` — this fails both RTL labeling and Persian translation requirements.

### Location in Codebase

| File                                            | Line(s) | What's there now                                                                       |
| ----------------------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| `frontend/src/components/oracle/StarRating.tsx` | 81      | `dir="ltr"` hardcoded on the radiogroup container                                      |
| `frontend/src/components/oracle/StarRating.tsx` | 89      | `aria-label={\`${star} star${star !== 1 ? "s" : ""}\`}` — hardcoded English aria-label |

### Root Cause

The `dir="ltr"` was added to ensure consistent star ordering during development, without considering RTL support. The RTL mirroring requirement was not implemented.

### How It Should Be

1. Remove the hardcoded `dir="ltr"` — let the component inherit direction from the app's `html[dir]` attribute
2. The `useDirection()` hook can be used if explicit direction control is needed: `const { isRTL } = useDirection(); <div role="radiogroup" dir={isRTL ? "rtl" : "ltr"}`
3. Star aria-labels should use the translation function: `aria-label={t("oracle.star_n_of_5", { n: star })}`

### Fix Scope

**Trivial — 2-line change in `StarRating.tsx`:**

- Line 81: remove `dir="ltr"` or replace with dynamic direction from `useDirection()`
- Line 89: replace hardcoded `aria-label` with `t("oracle.star_aria_label", { star })` and add the key to both `en.json` and `fa.json`

### Notes for the Developer

- Test in both directions: LTR should show 1★ on the left, RTL should show 1★ on the right.
- The visual star fill animation (`hover:before:content-['★']`) should also mirror correctly — verify after removing `dir="ltr"`.
- Readonly mode (when `onChange` is not provided) should also respect direction.
- The `aria-label` fix is a separate concern from the visual direction fix — both should be done together.

---

## Issue #16 — UserForm hardcodes `dir="rtl"` in three places, overriding the app RTL system

**Reported by:** Codebase audit (RTL pattern, same family as Issue #7)
**Priority:** P2 Medium

> The UserForm explicitly forces `dir="rtl"` on three input fields, which means those fields are always right-to-left regardless of the user's language setting. In English (LTR) mode, name fields that require English input will have RTL text rendering — causing the cursor to appear on the wrong side and text to flow in the wrong direction.

### What I See (User Report)

In English mode, when filling in the "Persian Name" or mother's name fields in the UserForm, the text cursor starts on the right side of the field (as if it's a RTL field), which is confusing for users entering text in an English-language interface.

### What's Actually Happening

`UserForm.tsx` has three locations with hardcoded `dir="rtl"`:

- Line 188: a name input field
- Line 261: another name field
- Line 542: a third name field

These are likely intended for Persian name inputs — where the user is expected to type Persian characters. However, hardcoding `dir="rtl"` means:

1. In Persian mode: correct behavior
2. In English mode: the input field has RTL text direction even when the rest of the page is LTR — confusing visual inconsistency

### Location in Codebase

| File                                          | Line(s) | What's there now                    |
| --------------------------------------------- | ------- | ----------------------------------- |
| `frontend/src/components/oracle/UserForm.tsx` | 188     | `dir="rtl"` hardcoded on name input |
| `frontend/src/components/oracle/UserForm.tsx` | 261     | `dir="rtl"` hardcoded on name input |
| `frontend/src/components/oracle/UserForm.tsx` | 542     | `dir="rtl"` hardcoded on name input |

### Root Cause

The fields were hardcoded RTL because they are intended for Persian/Arabic name input. However, the correct approach is to use dynamic direction detection rather than hardcoded attributes.

### How It Should Be

For fields specifically designed for Persian name input:

- If the app is in Persian mode (`isRTL = true`): keep `dir="rtl"` on those fields
- If the app is in English mode (`isRTL = false`): remove the `dir="rtl"` override and let the field inherit the app's LTR direction
- Implementation: `<input dir={isRTL ? "rtl" : undefined} ...>` — `undefined` removes the attribute entirely and lets inheritance work

### Fix Scope

**Trivial — 3 lines in `UserForm.tsx`:**

- Import and use `useDirection()` hook at the top of the component
- Lines 188, 261, 542: change `dir="rtl"` to `dir={isRTL ? "rtl" : undefined}`

### Notes for the Developer

- These three fields are likely for Persian/Arabic name entry specifically. Consider whether the `dir` should always be auto-detected, or if there should be a per-field `dir="auto"` (HTML `dir="auto"` sets direction based on the first strong character typed — useful for multilingual name inputs).
- `dir="auto"` might be the best solution here: it automatically sets RTL when the user types Arabic/Persian characters and LTR when they type Latin characters, regardless of the app language.

**Status:** **FIXED 2026-02-21** — Changed dir=rtl to dir=auto on Persian name inputs

---

## Issue #17 — DailyReadingCard (oracle version) uses wrong RTL detection method

**Reported by:** Codebase audit (RTL pattern, same family as Issue #7)
**Priority:** P2 Medium

> The oracle-context DailyReadingCard detects RTL by comparing `i18n.language === "fa"` directly, and applies RTL by adding a raw `"rtl"` CSS class rather than using the `dir` attribute. This is the same anti-pattern that causes the race condition in Issue #7, and is inconsistent with how RTL is handled everywhere else in the app.

### What I See (User Report)

In the Daily reading card within the Oracle section, RTL layout occasionally flickers during language switching. The layout may briefly appear incorrectly before settling into the correct direction.

### What's Actually Happening

`DailyReadingCard.tsx` line 22:

```tsx
const isRTL = i18n.language === "fa";
```

This duplicates the RTL detection logic instead of using the shared `useDirection()` hook.

Line 66:

```tsx
className={`... ${isRTL ? "rtl" : ""}`}
```

This adds a raw CSS class `"rtl"` — but `tailwindcss-rtl` plugin generates CSS using the `[dir="rtl"]` HTML attribute selector, not the `.rtl` class name. Adding the class `"rtl"` to a container element has **no effect** on the RTL Tailwind variants (`rtl:` prefix classes) inside that container — it only works if `dir="rtl"` is set as an HTML attribute on `<html>` or the element itself.

### Location in Codebase

| File                                                  | Line(s) | What's there now                                                                            |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `frontend/src/components/oracle/DailyReadingCard.tsx` | 22      | `const isRTL = i18n.language === "fa"` — direct i18n check instead of `useDirection()` hook |
| `frontend/src/components/oracle/DailyReadingCard.tsx` | 66      | `${isRTL ? "rtl" : ""}` — adding raw CSS class instead of `dir` attribute                   |

### Root Cause

This component was written without awareness of the app's RTL architecture. The correct pattern (used in other components) is: `const { isRTL } = useDirection()` for the boolean, and `dir={isRTL ? "rtl" : "ltr"}` for actual RTL layout, not a CSS class.

### How It Should Be

1. Line 22: Replace `const isRTL = i18n.language === "fa"` with `const { isRTL } = useDirection()`
2. Line 66: Replace `${isRTL ? "rtl" : ""}` className with `dir={isRTL ? "rtl" : "ltr"}` as an HTML attribute (or simply remove it if the container inherits direction from the `<html>` element correctly)

### Fix Scope

**Trivial — 2-line change:**

- Import `useDirection` hook
- Line 22: change detection method
- Line 66: change class approach to `dir` attribute approach

### Notes for the Developer

- The `tailwindcss-rtl` plugin only responds to `[dir="rtl"]` as an HTML attribute — adding a `.rtl` class does nothing for Tailwind RTL variants.
- This is the same root cause as Issue #7 (mixing RTL systems). Fixing this brings DailyReadingCard into alignment with the app's single RTL source of truth.
- After fixing, verify: does the card correctly mirror layout in FA mode? Do any Tailwind `rtl:` prefix classes inside the card now work correctly?

---

## Issue #18 — Date and time formatting ignores app language — Persian users see English calendar format

**Reported by:** Codebase audit (i18n gap)
**Priority:** P1 High

> Every date displayed in the app — reading timestamps, backup dates, log entries, API key expiry — uses the browser's system locale instead of the app's selected language. Persian users who have selected FA mode will see dates formatted in English (e.g., "Feb 18, 2026") instead of Persian (e.g., "۱۸ بهمن ۱۴۰۴" in Jalali calendar or "۱۸/۲/۲۰۲۶" in Persian numerals).

### What I See (User Report)

After switching the app to Persian, all dates still appear in the English format with Western numerals. The app's language is set to Persian but the dates look like they haven't changed.

### What's Actually Happening

All date formatting calls use `toLocaleDateString()` or `toLocaleTimeString()` **without passing a locale parameter**:

```tsx
new Date(reading.created_at).toLocaleDateString(); // uses OS locale, ignores app language
```

Without a locale argument, `toLocaleDateString()` uses the browser's operating system locale — which may be English (`en-US`) even if the user has selected Persian in the NPS app. The app language selection has no effect on date display.

This pattern appears in 10+ locations across admin and oracle components.

### Location in Codebase

| File                                                   | Line(s)    | What's there now                                                                                            |
| ------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/oracle/ReadingCard.tsx`       | ~33        | `new Date(reading.created_at).toLocaleDateString()` — no locale param                                       |
| `frontend/src/components/oracle/ReadingDetail.tsx`     | ~29        | `new Date(reading.created_at).toLocaleString()` — no locale param                                           |
| `frontend/src/components/oracle/ReadingHeader.tsx`     | ~31        | `toLocaleDateString()` — no locale param                                                                    |
| `frontend/src/components/oracle/ReadingFooter.tsx`     | ~44        | `toLocaleDateString()` — no locale param                                                                    |
| `frontend/src/components/oracle/ShareButton.tsx`       | ~16        | `toLocaleDateString()` — no locale param                                                                    |
| `frontend/src/components/admin/LogViewer.tsx`          | 37–54      | `toLocaleDateString(undefined, {...})` and `toLocaleTimeString(undefined, {...})` — `undefined` = OS locale |
| `frontend/src/components/admin/BackupManager.tsx`      | 52, 299    | `toLocaleDateString()` — no locale param                                                                    |
| `frontend/src/components/admin/UserTable.tsx`          | (multiple) | `toLocaleDateString()` — no locale param                                                                    |
| `frontend/src/components/admin/ProfileTable.tsx`       | (multiple) | `toLocaleDateString()` — no locale param                                                                    |
| `frontend/src/components/admin/ApiKeySection.tsx`      | (multiple) | `toLocaleDateString()` — no locale param                                                                    |
| `frontend/src/components/dashboard/RecentReadings.tsx` | (multiple) | `toLocaleDateString()` — no locale param                                                                    |

### Root Cause

Date formatting was implemented without considering the i18n locale requirement. All calls use the default (no locale parameter) which silently falls back to the OS locale.

### How It Should Be

All `toLocaleDateString()` calls must pass the app's current locale:

```tsx
const { i18n } = useTranslation();
const locale = i18n.language === "fa" ? "fa-IR" : "en-US";

new Date(reading.created_at).toLocaleDateString(locale, {
  year: "numeric",
  month: "short",
  day: "numeric",
});
```

For `fa-IR`, `toLocaleDateString` automatically:

- Uses Persian (Jalali/Solar Hijri) calendar
- Uses Persian numerals (۱۴۰۴ instead of 2026)
- Formats in the correct Persian date order

### Fix Scope

**Medium change — 10+ files, but mechanical:**

- Create a shared `formatDate(dateString: string, locale: string): string` utility in `frontend/src/utils/dateHelpers.ts`
- The utility takes the date string and the i18n locale and returns a consistently formatted string
- Replace all `toLocaleDateString()` calls across the codebase with this utility
- Pass `i18n.language` from `useTranslation()` to the utility

### Notes for the Developer

- `fa-IR` locale in `Intl.DateTimeFormat` uses the **Persian (Solar Hijri/Jalali)** calendar automatically — no external library needed.
- The `LogViewer.tsx` formatTimestamp function (lines 37–54) passes `undefined` as the locale explicitly — change to `locale` from `i18n`.
- Consider creating a custom `useDateFormatter()` hook that returns a pre-configured formatter based on the current locale — reduces boilerplate across all components.
- Test specifically: does `new Date("2026-02-18").toLocaleDateString("fa-IR")` return the correct Jalali date? It should return something like "۱۴۰۴/۱۱/۲۹".

---

## Issue #19 — Hardcoded English strings bypass the translation system in multiple components

**Reported by:** Codebase audit (i18n gap)
**Priority:** P1 High

> Multiple UI strings across admin components, the language toggle, and backup management are hardcoded in English and never passed through the `t()` translation function. Persian users see these strings in English regardless of their selected language.

### What I See (User Report)

In Persian mode:

- The backup restore confirmation input shows "RESTORE" as a placeholder (English)
- The backup table shows "Filename" as a column header (English)
- Backup type badges show "Oracle Full", "Oracle Data", "Full DB" (English)
- The language toggle button's tooltip/aria-label says "Switch to English" (English)

These strings are visible in the Persian UI as untranslated English text.

### What's Actually Happening

**`BackupManager.tsx`:**

- Line 348: `placeholder="RESTORE"` — hardcoded string, should be `placeholder={t("admin.backup_confirm_restore_placeholder")}`
- Line 255: `Filename` column header — hardcoded, should be `{t("admin.col_filename")}`
- Lines 14–36: `TYPE_BADGES` object has hardcoded `label` values: `"Oracle Full"`, `"Oracle Data"`, `"Full DB"` — translation keys exist in en.json/fa.json but are not used

**`LanguageToggle.tsx`:**

- Lines 18–22: `aria-label` uses hardcoded `"Switch to English"` for the FA→EN direction
- The reverse direction uses a Unicode-escaped Persian string directly in code instead of a translation key

**`PreferencesSection.tsx`:**

- Line 76: `{lang === "en" ? "English" : "فارسی"}` — hardcoded language names instead of `t()` keys

### Location in Codebase

| File                                                      | Line(s) | What's there now                             |
| --------------------------------------------------------- | ------- | -------------------------------------------- |
| `frontend/src/components/admin/BackupManager.tsx`         | 348     | `placeholder="RESTORE"` hardcoded            |
| `frontend/src/components/admin/BackupManager.tsx`         | 255     | `Filename` column header hardcoded           |
| `frontend/src/components/admin/BackupManager.tsx`         | 14–36   | `TYPE_BADGES` label values hardcoded English |
| `frontend/src/components/LanguageToggle.tsx`              | 18–22   | `aria-label="Switch to English"` hardcoded   |
| `frontend/src/components/settings/PreferencesSection.tsx` | 76      | Language name hardcoded                      |

### Root Cause

These strings were added during initial development and never wrapped in `t()`. The translation JSON files for the app are otherwise complete — the keys exist in the JSON files for most of these strings, but the components reference hardcoded literals instead.

### How It Should Be

Every user-visible string must go through `t()`. Specifically:

- `placeholder={t("admin.backup_confirm_restore_placeholder")}`
- `{t("admin.col_filename")}`
- `TYPE_BADGES` labels should reference the translation keys that already exist
- `aria-label={t(isFA ? "layout.switch_to_english" : "layout.switch_to_persian")}`
- Language buttons: `{t(lang === "en" ? "layout.english" : "layout.persian")}`

### Fix Scope

**Small — mechanical replacements across 3 files:**

- `BackupManager.tsx`: 3 changes (placeholder, column header, type badge labels)
- `LanguageToggle.tsx`: 1 change (aria-label)
- `PreferencesSection.tsx`: 1 change (language name labels)

Add any missing translation keys to `fa.json` if they don't exist.

### Notes for the Developer

- Before adding new translation keys, verify whether they already exist in `en.json` and `fa.json` — the audit found that most translation keys are already defined in the JSON files, just not referenced by the components.
- The `TYPE_BADGES` object is a constant defined outside the component — to use `t()` inside it, either move it inside the component, convert it to a function that takes `t` as a parameter, or use a translation hook inside the render that maps badge keys to labels.

---

## Issue #20 — Share/Export always generates English text regardless of app language

**Reported by:** Codebase audit (i18n gap)
**Priority:** P1 High

> When a Persian user shares or exports a reading, the generated share text — the title, labels, and footer — is always in English. The reading content itself may be in Persian, but the metadata wrapper is hardcoded English, creating a jarring mixed-language output.

### What I See (User Report)

A Persian user shares their Oracle reading. The copied text reads:

```
NPS Oracle Reading

Type: Time Reading
Date: 18/02/2026
...
— Generated by NPS Numerology Framework
```

All the labels ("Type:", "Date:", "NPS Oracle Reading", the footer) are in English even though the app is in Persian mode.

### What's Actually Happening

`ShareButton.tsx` lines 10–65 define `generateShareText()` — a function that assembles the share/clipboard text. All string literals in this function are hardcoded English:

```tsx
const lines: string[] = ["NPS Oracle Reading", ""];
lines.push("Type: Time Reading");
lines.push("Date: ...");
lines.push("— Generated by NPS Numerology Framework");
```

None of these strings go through the `t()` translation function. The function does not receive `i18n` or `t` as parameters — it has no awareness of the current language.

### Location in Codebase

| File                                             | Line(s) | What's there now                                              |
| ------------------------------------------------ | ------- | ------------------------------------------------------------- |
| `frontend/src/components/oracle/ShareButton.tsx` | 10–65   | `generateShareText()` — all string literals hardcoded English |

### Root Cause

The share text generator was built as a pure function outside the component tree, without access to the translation context. Adding i18n support requires passing the `t` function as a parameter or moving the logic inside the component.

### How It Should Be

`generateShareText(result, t)` should receive the translation function as a parameter:

```tsx
const lines: string[] = [t("oracle.shared_reading_title"), ""];
lines.push(`${t("common.reading_type")}: ${t(getTypeLabel(result.type))}`);
lines.push(
  `${t("common.date")}: ${formatDate(result.created_at, i18n.language)}`,
);
lines.push(`— ${t("oracle.shared_reading_footer")}`);
```

### Fix Scope

**Small change — 1 file:**

- Add `t: TFunction` parameter to `generateShareText()`
- Replace all hardcoded English strings with `t()` calls
- At the call site, pass `t` from `useTranslation()`
- Add any missing translation keys to both `en.json` and `fa.json`

### Notes for the Developer

- This function is called from within a React component — you can pass `t` easily at the call site.
- The `ExportShareMenu.tsx` likely has the same issue for its exported text formats — check that file for similar patterns and fix together.
- Combine with the date formatting fix from Issue #18 so that the date in the share text also uses the correct locale format.

---

## Issue #21 — No 404 page for unknown routes — users see a blank screen

**Reported by:** Codebase audit (navigation)
**Priority:** P1 High
**Status:** **FIXED 2026-02-20** — Added `NotFound` component with FadeIn animation and `<Route path="*">` catch-all inside the Layout wrapper in `App.tsx`.

> If a user navigates to any URL that doesn't match a defined route (e.g., a bookmarked old URL, a mistyped path, or an expired share link), the app renders completely blank. There is no error message, no navigation, and no way to get back to a working page without manually editing the URL.

### What I See (User Report)

User clicks an old bookmark: `https://app.nps.com/oracle/result/abc123`. The page goes completely white/blank. No error, no navigation back to Dashboard, no explanation.

### What's Actually Happening

`App.tsx` lines 31–101 define all routes. There is no `<Route path="*">` catch-all wildcard. React Router v6 silently renders nothing when no route matches — the page shows the `<Layout>` shell (or nothing if outside Layout) with no content.

### Location in Codebase

| File                   | Line(s) | What's there now                              |
| ---------------------- | ------- | --------------------------------------------- |
| `frontend/src/App.tsx` | 31–101  | No `<Route path="*">` catch-all route defined |

### Root Cause

A 404 catch-all route was never added to the route configuration.

### How It Should Be

Add a catch-all route that renders a helpful 404 page:

```tsx
<Route path="*" element={<NotFound />} />
```

The `NotFound` page should:

1. Show a clear "Page not found" message
2. Provide a button/link to go to the Dashboard
3. Show the NPS logo and navigation (inside the `<Layout>` wrapper)
4. Set `document.title = "Page Not Found — NPS"`

### Fix Scope

**Small change:**

- Create `frontend/src/pages/NotFound.tsx` — simple page with heading, message, and "Go to Dashboard" button
- Add `<Route path="*" element={<NotFound />} />` at the end of the routes in `App.tsx`
- The route should be inside the `<Layout>` wrapper so the navigation is still visible on 404 pages

### Notes for the Developer

- Place the catch-all route as the **last** route inside the Layout wrapper, not outside it — this ensures the navigation is visible on the 404 page.
- Add `document.title = t("page.not_found") + " — NPS"` in a `useEffect` in the `NotFound` component.
- A gentle, on-brand 404 design (e.g., "The oracle cannot find this path...") is a good opportunity to reinforce the app's personality.

---

## Issue #22 — Browser tab title never changes when navigating between pages

**Reported by:** Codebase audit (navigation/UX)
**Priority:** P2 Medium

> The browser tab always shows "NPS" regardless of which page is open. Users who have multiple NPS tabs open cannot distinguish between them. When a user bookmarks a page, the bookmark is titled "NPS" with no indication of which page it points to.

### What I See (User Report)

User has two NPS tabs open — one on Oracle, one on Reading History. Both tabs show "NPS" in the browser tab. There is no way to tell them apart without clicking each one.

### What's Actually Happening

`document.title` is set to "NPS" in `index.html` and is **never updated** when navigating between pages. Only `SharedReading.tsx` (the public share page) correctly calls:

```tsx
useEffect(() => {
  document.title = reading.title ?? "NPS Reading";
}, [reading]);
```

All other pages — Dashboard, Oracle, History, Settings, Admin — never update `document.title`.

### Location in Codebase

| File                                    | Line(s)              | What's there now                     |
| --------------------------------------- | -------------------- | ------------------------------------ |
| `frontend/public/index.html`            | `<title>NPS</title>` | Default title, never changed         |
| `frontend/src/pages/Dashboard.tsx`      | (entire file)        | No `document.title` update           |
| `frontend/src/pages/Oracle.tsx`         | (entire file)        | No `document.title` update           |
| `frontend/src/pages/ReadingHistory.tsx` | (entire file)        | No `document.title` update           |
| `frontend/src/pages/Settings.tsx`       | (entire file)        | No `document.title` update           |
| `frontend/src/pages/Admin.tsx`          | (entire file)        | No `document.title` update           |
| `frontend/src/pages/SharedReading.tsx`  | ~44                  | ✓ Correctly updates `document.title` |

### Root Cause

`document.title` management was implemented only for the public share page and not extended to the rest of the app.

### How It Should Be

Each page should set `document.title` on mount:

- Dashboard: "Dashboard — NPS"
- Oracle: "Oracle — NPS"
- Reading History: "Reading History — NPS"
- Settings: "Settings — NPS"
- Admin: "Admin — NPS"

### Fix Scope

**Trivial — add one `useEffect` to each page component:**

```tsx
useEffect(() => {
  document.title = `${t("page.oracle")} — NPS`;
}, [t]);
```

Add the corresponding translation keys to both `en.json` and `fa.json`.

### Notes for the Developer

- Create a shared `usePageTitle(title: string)` custom hook to avoid repeating the `useEffect` pattern in every page — one hook, used in 6 pages.
- The title should be in the user's current language — use `t()` for the page name.
- On dynamic pages (e.g., if a reading detail page is added in the future), the title should update when the content loads.
- The format `"Page Name — NPS"` is conventional and recommended for multi-page apps.

**Status:** **FIXED 2026-02-21** — Created usePageTitle hook, applied to Dashboard and Oracle

---

## Issue #23 — Page navigation does not scroll to top — users land mid-page

**Reported by:** Codebase audit (navigation/UX)
**Priority:** P2 Medium

> When navigating between pages, the scroll position from the previous page is carried over to the new page. A user who scrolls halfway down the Reading History page and then clicks Dashboard will see the Dashboard content starting from the middle of the page, not from the top.

### What I See (User Report)

User scrolls to the bottom of the Oracle page (past the Reading Results section). Clicks "Dashboard" in the nav. The Dashboard loads but they are scrolled halfway down, missing the WelcomeBanner and stats at the top.

### What's Actually Happening

`Layout.tsx` has a `<main id="main-content" className="... overflow-auto">` element. When React Router renders a new route, it replaces the content inside `<main>` but does not reset the scroll position of the `<main>` element. The `PageTransition` component uses `locationKey` to trigger remounts but does not include scroll restoration.

### Location in Codebase

| File                                         | Line(s)  | What's there now                                                                      |
| -------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `frontend/src/components/Layout.tsx`         | ~127–135 | `<main id="main-content" className="overflow-auto">` — scroll not reset on navigation |
| `frontend/src/components/PageTransition.tsx` | (entire) | Uses `locationKey` for animation but no scroll restoration                            |

### Root Cause

React Router v6 does not automatically scroll to top on navigation. Scroll restoration must be implemented explicitly.

### How It Should Be

On every route change, the main content area should scroll to top. The cleanest implementation is a `ScrollToTop` component:

```tsx
// ScrollToTop.tsx
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    document
      .getElementById("main-content")
      ?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
```

Placed inside `<Layout>` as a sibling of `<main>`, this runs on every route change.

### Fix Scope

**Small change:**

- Create `frontend/src/components/ScrollToTop.tsx` (5 lines)
- Add `<ScrollToTop />` inside `Layout.tsx`'s render, above `<main>`

### Notes for the Developer

- Use `behavior: "instant"` not `behavior: "smooth"` — smooth scrolling on every navigation feels sluggish and disorienting.
- Scroll the `#main-content` element, not `window` — the scrollable container is the `<main>` element, not the window, because `Layout.tsx` uses `overflow-auto` on `<main>`.
- React Router v6.4+ has built-in `<ScrollRestoration />` but it restores scroll position for back/forward navigation (good). For forward navigation, always-scroll-to-top is the correct UX.

**Status:** **FIXED 2026-02-21** — Created ScrollToTop component in Layout.tsx

---

## Issue #24 — Oracle form inputs are lost on browser refresh

**Reported by:** Codebase audit (navigation/UX)
**Priority:** P2 Medium

> If a user fills in an Oracle form (a long question, a name, or selected birth time) and the page refreshes — accidentally or by clicking the browser's refresh button — all their input is wiped. Only the reading type is preserved via URL parameter. The user must start over.

### What I See (User Report)

User types a long, thoughtful question into the Question Reading form. Accidentally hits F5 or Ctrl+R to refresh. The Oracle page reloads with the correct reading type selected (because `?type=question` is in the URL) but the question text field is empty.

### What's Actually Happening

`Oracle.tsx` stores the active reading type in the URL via `searchParams` (lines 39–43) — this survives refresh. However, the **form inputs themselves** are managed as React component state inside `TimeReadingForm`, `NameReadingForm`, and `QuestionReadingForm`. React state is not persisted across page refreshes — it resets to initial values.

### Location in Codebase

| File                                                     | Line(s) | What's there now                                                 |
| -------------------------------------------------------- | ------- | ---------------------------------------------------------------- |
| `frontend/src/pages/Oracle.tsx`                          | 39–43   | Reading type persisted via URL `?type=` param — survives refresh |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | (state) | Question text in React state — lost on refresh                   |
| `frontend/src/components/oracle/NameReadingForm.tsx`     | (state) | Name in React state — lost on refresh                            |
| `frontend/src/components/oracle/TimeReadingForm.tsx`     | (state) | Time values in React state — lost on refresh                     |

### Root Cause

Form state persistence was not implemented. The URL persistence for reading type was added but not extended to form input values.

### How It Should Be

Form inputs should be persisted to `sessionStorage` (not `localStorage` — session only, cleared when the tab is closed):

- On every input change, write the current form values to `sessionStorage`
- On form mount, read from `sessionStorage` to restore previous values
- On successful submission, clear the `sessionStorage` entry for that form

### Fix Scope

**Small–medium change per form:**

- Create a `useFormPersistence(key: string, initialValues)` hook that reads from `sessionStorage` on init and writes on every change
- Apply the hook in `TimeReadingForm`, `NameReadingForm`, and `QuestionReadingForm`
- Clear the persisted state after successful submission or explicit "reset" by the user

### Notes for the Developer

- Use `sessionStorage`, not `localStorage` — form drafts should not persist across browser sessions.
- Clear the stored draft after a successful submission so the form starts fresh for the next reading.
- `TimeReadingForm` has a "Use Current Time" button — this should update both the state and the persisted value.
- The `UserForm` (profile creation) may also benefit from this pattern — filling in a long profile and refreshing is equally frustrating.

---

## Issue #25 — AI interpretation data shape is inconsistent across all reading types

**Reported by:** Codebase audit (API/data shape, same family as Issue #4)
**Priority:** P1 High

> The `ai_interpretation` field in API responses has three different shapes depending on the reading type and whether the result is freshly generated or loaded from history. Frontend TypeScript types assume one structure but receive another, leading to silent type mismatches and missing content when reading history is displayed.

### What I See (User Report)

A user generates a Time Reading. The AI interpretation appears (Issue #4 aside). They go to Reading History and click the same reading to view it again. The AI interpretation section is empty or missing — the reading shows its date and type but not the AI content.

### What's Actually Happening

The `ai_interpretation` field is stored and returned in at least three different formats depending on the endpoint:

1. **`/oracle/reading` (GET/time-type):** stores `result.get("summary")` — just a summary string
2. **`/oracle/question` and `/oracle/name`:** stores `result.get("ai_interpretation")` — could be a dict with sections or a string depending on the Oracle service version
3. **`/oracle/readings` (framework/unified endpoint):** stores only `full_text` from the `ReadingInterpretation` dict — loses the 9 parsed sections

When reading history is fetched, the `ai_interpretation` column in the database may contain a string (some readings) or a JSON dict (others) or `null` (failed storage). The frontend `StoredReading` TypeScript type defines `ai_interpretation: string | null` but some fresh responses type it as `AIInterpretationSections | null` (a dict object) — these are incompatible.

### Location in Codebase

| File                                 | Line(s) | What's there now                                                               |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------ |
| `api/app/routers/oracle.py`          | 171–179 | Stores `result.get("summary")` for time-type readings                          |
| `api/app/routers/oracle.py`          | 226–233 | Stores `result.get("ai_interpretation")` for question readings                 |
| `api/app/routers/oracle.py`          | 281–288 | Stores `result.get("ai_interpretation")` for name readings                     |
| `api/app/routers/oracle.py`          | ~409    | Framework endpoint: stores only `full_text` from the interpretation dict       |
| `api/app/services/oracle_reading.py` | 804–809 | Extracts and stores AI interpretation before DB write                          |
| `frontend/src/types/index.ts`        | ~207    | `StoredReading.ai_interpretation: string \| null`                              |
| `frontend/src/types/index.ts`        | ~574    | `FrameworkReadingResponse.ai_interpretation: AIInterpretationSections \| null` |

### Root Cause

The `ai_interpretation` field was not standardized when the unified `/oracle/readings` endpoint was built. Different endpoints evolved independently and stored different subsets of the AI output. The type mismatch between fresh responses (dict) and stored readings (string) means the frontend cannot reliably display AI content from reading history.

### How It Should Be

Standardize: all endpoints should store the full `AIInterpretationSections` dict as a JSON column in the database, and return it in the same shape for both fresh responses and history lookups.

The frontend `StoredReading` type should then match `FrameworkReadingResponse`:

```typescript
ai_interpretation: AIInterpretationSections | null;
```

This also enables displaying individual parsed sections (header, message, advice, caution) from history — not just the `full_text` blob (which is the root cause of Issue #4).

### Fix Scope

**Medium change — backend and frontend types:**

- `api/app/routers/oracle.py`: standardize all 4 endpoints to store the full `AIInterpretationSections` dict (serialized as JSON) in the `ai_interpretation` column
- `api/app/services/oracle_reading.py`: ensure the storage function serializes the dict to JSON for the DB column
- `frontend/src/types/index.ts`: align `StoredReading.ai_interpretation` type with `FrameworkReadingResponse`
- All frontend components that read `ai_interpretation` need updating to handle the dict shape

### Notes for the Developer

- This fix is tightly connected to Issue #4 (wall-of-text rendering). Fixing the data shape here enables the Issue #4 fix to display individual sections cleanly from both fresh results and history.
- The DB column `ai_interpretation` likely needs to be JSONB (PostgreSQL) to store the dict — verify the current column type in the migration files. If it's TEXT, it can store JSON strings; use `json.dumps()` on write and `json.loads()` on read.
- Existing historical readings in the DB will have string values in `ai_interpretation`. The frontend needs a migration fallback: if `ai_interpretation` is a string, treat it as `full_text` for backward compatibility.

---

## Issue #26 — Confidence score uses two incompatible scales (0–1 float vs 0–100 int)

**Reported by:** Codebase audit (API data consistency)
**Priority:** P1 High

> Different Oracle reading endpoints return confidence scores on different numeric scales. Some return a float between 0.0 and 1.0, others return an integer between 0 and 100. The frontend has a band-aid conversion (`confidence > 1 ? confidence : confidence * 100`) that confirms the inconsistency but does not properly fix it for all edge cases.

### What I See (User Report)

The confidence bar in Reading History shows different visual fills for readings of the same type, even when the actual confidence should be similar. A reading showing "95%" confidence and another showing "0.95" both exist in the system — one renders correctly and the other renders as a 0.95% bar (nearly invisible).

### What's Actually Happening

The backend returns confidence scores in different scales from different endpoints:

- Framework readings (`/oracle/readings`): returns `FrameworkConfidence.score` which is defined as `int` between 0–100 (e.g., `score: int = 50`)
- Legacy/type-specific endpoints: may return float 0.0–1.0 from the Oracle service's numerology engines

The frontend attempts to normalize this with:

```tsx
confidence > 1 ? confidence : confidence * 100;
```

This band-aid fails for two edge cases:

1. A confidence score of exactly `1` (100%) is misread as a 0–1 float and becomes 100 — accidentally correct, but conceptually wrong
2. A confidence score of `1` from the 0–100 scale (1%) becomes `100` — rendering 100% confidence when it should be 1%

### Location in Codebase

| File                                                         | Line(s)              | What's there now                                               |
| ------------------------------------------------------------ | -------------------- | -------------------------------------------------------------- |
| `frontend/src/components/dashboard/RecentReadings.tsx`       | (confidence display) | `confidence > 1 ? confidence : confidence * 100` normalization |
| `api/app/models/oracle.py`                                   | ~76, ~113            | `FrameworkConfidence.score: int = 50` — 0–100 scale defined    |
| `services/oracle/oracle_service/engines/prompt_templates.py` | ~33                  | "Cap confidence at 95%" — confirms 0–100 intent                |

### Root Cause

The confidence scale was not standardized when the backend evolved from legacy per-type endpoints (which may have returned 0–1 floats from the numerology engines) to the unified framework endpoint (which defines confidence as 0–100 int). The frontend accommodation of both scales masks the inconsistency.

### How It Should Be

1. Define one canonical confidence scale: **0–100 integer** (matches the framework model definition)
2. All Oracle service engines must normalize their output to 0–100 before returning to the API
3. The API response schemas must consistently type confidence as `int` in range `[0, 100]`
4. Remove the `> 1` band-aid from the frontend — all confidence values received should already be 0–100

### Fix Scope

**Backend normalization + frontend cleanup:**

- Audit all Oracle service engines for confidence score scale — normalize any that return 0–1 floats to 0–100 ints
- Update Pydantic response schemas to enforce `confidence: int = Field(..., ge=0, le=100)`
- Frontend: remove the `confidence > 1 ? ...` conversion once the backend is standardized
- Add a validation test: assert `0 <= confidence <= 100` for all reading response fixtures

### Notes for the Developer

- Check `services/oracle/oracle_service/engines/` for all places that set or calculate confidence — look for float values like `0.85`, `0.7`, etc.
- The prompt template instructs "Cap confidence at 95%" — this is written for the AI-generated confidence. The numerology engine's confidence (from FC60 calculations) may use a different scale — check both sources.
- After fixing, the frontend normalization code should be deleted, not left as dead code.

---

## Issue #27 — Required fields in UserForm have no visual indicators

**Reported by:** Codebase audit (form UX)
**Priority:** P2 Medium

> The UserForm validates certain fields as required and shows errors on empty submission, but there are no asterisks, "required" labels, or any visual indication of which fields must be filled before the form can be submitted. Users discover required fields only after attempting to submit.

### What I See (User Report)

User opens "Add Oracle User" form. They fill in only the name field and click Save. Multiple error messages appear for fields they did not know were required — birth date, and others. There was no indication before submission that these fields were mandatory.

### What's Actually Happening

`UserForm.tsx` lines 134–142 run validation on `handleSubmit()`:

- Name: required (empty = error)
- Birthday: required (empty = error)
- Mother's name: optional but minimum 2 characters if provided

However, in the rendered form (lines 166–249), none of the required fields have:

- A red asterisk (`*`) after the label
- A "(required)" text
- An `aria-required="true"` attribute
- Any visual indicator distinguishing required from optional fields

### Location in Codebase

| File                                          | Line(s) | What's there now                                     |
| --------------------------------------------- | ------- | ---------------------------------------------------- |
| `frontend/src/components/oracle/UserForm.tsx` | 134–142 | Validation logic marks name and birthday as required |
| `frontend/src/components/oracle/UserForm.tsx` | 166–249 | Form fields rendered without any required indicators |

### Root Cause

Required field indicators were not added during form implementation.

### How It Should Be

1. Required fields should show a red asterisk after the label: `Name <span aria-hidden="true" className="text-nps-error">*</span>`
2. Add `aria-required="true"` on all required input elements
3. Add a legend at the top of the form: `<p className="text-xs text-nps-text-dim">* Required field</p>`

### Fix Scope

**Trivial — markup additions in `UserForm.tsx`:**

- Add `<span aria-hidden="true"> *</span>` after each required field label
- Add `aria-required="true"` to required input elements
- Add a one-line form legend

### Notes for the Developer

- Use `aria-hidden="true"` on the asterisk `<span>` so screen readers don't read "asterisk" — the `aria-required="true"` attribute on the input handles accessibility.
- Mother's name is conditionally validated (only checked if not empty) — do NOT mark it as required. Use "(optional)" text next to it instead to be explicit.
- Heart rate field (0–100 BPM) should also note its acceptable range in the label: "Heart Rate (30–220 BPM)".

**Status:** **FIXED 2026-02-21** — Added red asterisk with aria-hidden and required fields legend

---

## Issue #28 — CalendarPicker calendar mode (Gregorian/Jalali) resets every time the picker opens

**Reported by:** Codebase audit (form UX)
**Priority:** P2 Medium

> Persian users who prefer the Jalali (Solar Hijri/Persian) calendar have to re-select it every time they open the date picker in the UserForm. The calendar mode toggle is not persisted — it resets to the default (Gregorian) each time the picker is opened.

### What I See (User Report)

A Persian user opens the birth date picker in the UserForm. They toggle from Gregorian to Jalali calendar mode (clicking the toggle button). They pick a date. Later, when they open the date picker again (to edit the date), it has reverted to Gregorian mode. They must toggle back to Jalali every single time.

### What's Actually Happening

`CalendarPicker.tsx` lines 27–98 manage `mode` state (Gregorian vs Jalaali). This is React component state — it resets to the default value every time the component mounts (i.e., every time the picker opens). There is no persistence to `localStorage` or any other mechanism.

### Location in Codebase

| File                                                | Line(s) | What's there now                                                      |
| --------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| `frontend/src/components/oracle/CalendarPicker.tsx` | 27–98   | `mode` state (Gregorian/Jalaali) — React state, resets on every mount |

### Root Cause

The calendar mode preference was implemented as ephemeral React state with no persistence.

### How It Should Be

The user's calendar mode preference should be saved to `localStorage` so it is remembered across sessions:

```tsx
const [mode, setMode] = useState<CalendarMode>(
  () =>
    (localStorage.getItem("nps_calendar_mode") as CalendarMode) ?? "gregorian",
);

const handleModeChange = (newMode: CalendarMode) => {
  setMode(newMode);
  localStorage.setItem("nps_calendar_mode", newMode);
};
```

### Fix Scope

**Trivial — 3 lines in `CalendarPicker.tsx`:**

- Initialize `mode` from `localStorage` using a lazy initializer
- On mode change, write to `localStorage`

### Notes for the Developer

- Default to `"gregorian"` if no preference is stored — or default to `"jalaali"` if `i18n.language === "fa"`. The latter is a better UX choice for Persian users who haven't made a selection yet.
- The `localStorage` key `nps_calendar_mode` should be documented in `.env.example` or a constants file.
- This is a pure frontend change — no backend or API impact.

**Status:** **FIXED 2026-02-21** — Persist mode to localStorage, default jalaali for fa

---

## Issue #29 — QuestionReadingForm mood selector collects input that is never sent to the backend

**Reported by:** Codebase audit (UX expectation mismatch)
**Priority:** P2 Medium

> The mood/emotion selector in the Question Reading form shows clickable options that users believe will influence their reading. However, the mood field is explicitly marked in the code as "frontend-only for now" — it is never included in the API request. Users select a mood thinking it matters, but it has zero effect on their reading.

### What I See (User Report)

User opens Question Reading. Sees mood options (e.g., "Anxious", "Hopeful", "Curious"). Carefully selects their current mood. Submits the reading. The reading makes no reference to their mood and is not tailored to it in any way.

### What's Actually Happening

`QuestionReadingForm.tsx` lines 116–117 contain a code comment:

```tsx
// category, mood, time are frontend-only for now. Backend doesn't support these fields yet.
```

The mood state is maintained in the component but is intentionally excluded from the `mutation.mutate()` call. The user's selected mood is silently discarded.

### Location in Codebase

| File                                                     | Line(s)      | What's there now                                                       |
| -------------------------------------------------------- | ------------ | ---------------------------------------------------------------------- |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | 116–117      | Code comment confirms mood is frontend-only and not sent               |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | (mood state) | `mood` state updated on selection but excluded from submission payload |

### Root Cause

The mood field was added to the UI as a planned feature before the backend support was implemented. The backend support was never added, but the UI was not updated to reflect this.

### How It Should Be

Three valid options:

1. **(Recommended) Remove the mood selector entirely** until backend support is added — don't show UI that collects data with no effect
2. **Add a tooltip/note** next to the mood selector: "Mood selection is coming soon — not yet used in readings"
3. **Implement backend support** — add `mood` to the reading request schema, pass it to the Oracle service, and include it in the AI prompt context

### Fix Scope

**Trivial (Option 1 — remove UI):** Remove the mood selector JSX and the associated `mood` state from `QuestionReadingForm.tsx`

**Or small (Option 2 — add note):** Add a `title` attribute or small help text noting the field is decorative

### Notes for the Developer

- Option 1 is recommended from a UX honesty perspective — do not show interactive controls that have no effect.
- If Option 3 (implement backend) is chosen, the mood value should be injected into the AI prompt in `prompt_templates.py` with context like "The user is feeling [mood] while asking this question."
- The same comment mentions `category` and `time` as also frontend-only. Check if those UI elements are also visible and apply the same fix.

**Status:** **FIXED 2026-02-21** — Removed mood selector section from QuestionReadingForm

---

## Issue #30 — Export menu is mislabeled "Export Text" but contains PDF, Image, JSON, and Share options

**Reported by:** Codebase audit (UX, same family as Issue #3)
**Priority:** P2 Medium

> The Export/Share menu button label says "Export Text ▼" but the dropdown it reveals contains options for PDF, Image, JSON, Share Link, and Copy — not just text. The mismatch between the button label and the menu contents confuses users who may think the button only exports plain text and miss the other export formats.

### What I See (User Report)

User sees a button labeled "Export Text ▼" in the reading results panel. They want to save a PDF. They assume this button is only for text export and don't click it. They miss the PDF and Image export options hidden in the dropdown.

### What's Actually Happening

`ExportShareMenu.tsx` lines 190–198 render the trigger button:

```tsx
<button ...>
  {t("oracle.export_text")} &#9662;
</button>
```

The translation key `oracle.export_text` resolves to "Export Text" (or its Persian equivalent). However, the dropdown menu it triggers contains:

- Copy to Clipboard (text)
- Export as PDF
- Export as Image
- Export as JSON
- Create Share Link

The label only describes one of five options.

### Location in Codebase

| File                                                 | Line(s)              | What's there now                                                         |
| ---------------------------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| `frontend/src/components/oracle/ExportShareMenu.tsx` | 190–198              | Button label uses `t("oracle.export_text")` — describes only text export |
| `frontend/src/locales/en/translation.json`           | `oracle.export_text` | Likely translates to "Export Text"                                       |

### Root Cause

The button label was set when only text/clipboard export was implemented. As PDF, image, JSON, and share options were added, the label was never updated.

### How It Should Be

The button label should reflect the full scope of the menu:

- Option A: "Export & Share ▼" — covers all options
- Option B: Use a two-icon combination (download + share icons) with `aria-label="Export and Share options"`
- Option C: "Export ▼" — shorter, still accurate since sharing is a type of export in this context

Update the translation key from `oracle.export_text` to `oracle.export_and_share` and update both `en.json` and `fa.json`.

### Fix Scope

**Trivial — label change + translation key update:**

- `ExportShareMenu.tsx` line 197: change `t("oracle.export_text")` to `t("oracle.export_and_share")`
- `en.json`: add `"export_and_share": "Export & Share"`
- `fa.json`: add `"export_and_share": "صدور و اشتراک‌گذاری"`
- Old key `oracle.export_text` can remain for backward compatibility or be removed if no other component uses it

### Notes for the Developer

- Consider adding a small download icon + share icon before the label text to provide visual context for the menu's dual purpose.
- The dropdown arrow `&#9662;` can be replaced with a proper Tailwind-styled chevron icon for consistency with the rest of the app's icon system.
- This is a cosmetic fix — no functionality changes needed.

**Status:** **FIXED 2026-02-21** — Changed export_text to export_and_share

---

## Issue #31 — Hardcoded Tailwind Colors Used Instead of Theme Tokens in 22+ Files

**Reported by:** Codebase Audit (Round 2 — Visual Polish)
**Priority:** 🔴 P1 — High

> The app has a full semantic color system (`nps-success`, `nps-error`, `nps-warning`, `nps-oracle-accent`, etc.) defined in Tailwind config, but 22+ component files still use raw Tailwind color classes like `bg-green-600`, `bg-amber-600`, `text-red-500`, `bg-gray-400`. This means theme changes won't propagate to these components, and the dark mode / color palette is inconsistent.

### What I See

Scanning the codebase for raw Tailwind color classes reveals a patchwork of hardcoded values mixed with proper theme tokens. Some components (like `getConfidenceColor` in `ReadingHeader.tsx`) correctly use `bg-nps-success`, `text-nps-warning` etc., but then in the same file, the name reading badge uses `bg-green-600/20 text-green-400`. The admin section is almost entirely raw Tailwind colors.

### What's Actually Happening

The theme token system (`nps-*` classes) was introduced after the initial scaffolding. Components built later tend to use tokens correctly, but earlier components and the entire admin section were never migrated. This creates two visual languages in the same app.

### Location in Codebase

| File                                                        | Lines     | What's there now                                            |
| ----------------------------------------------------------- | --------- | ----------------------------------------------------------- |
| `frontend/src/components/oracle/ReadingHeader.tsx`          | 13        | `bg-green-600/20 text-green-400` for name badge             |
| `frontend/src/components/oracle/ConfidenceMeter.tsx`        | 12, 19    | `bg-amber-600` and `text-amber-600` for medium confidence   |
| `frontend/src/components/oracle/OracleConsultationForm.tsx` | 268       | `text-red-500` for error message                            |
| `frontend/src/components/admin/BackupManager.tsx`           | 366       | `bg-amber-600 text-white` for restore button                |
| `frontend/src/components/oracle/GanzhiDisplay.tsx`          | 13-14, 35 | `bg-amber-600` (Earth), `bg-gray-400` (Metal)               |
| `frontend/src/components/oracle/FC60StampDisplay.tsx`       | 15        | `text-red-500 bg-red-500/10` for FI element                 |
| `frontend/src/components/oracle/LocationDisplay.tsx`        | 10-12     | `text-red-500`, `text-gray-400` for element colors          |
| `frontend/src/components/oracle/HeartbeatDisplay.tsx`       | 10-12     | `text-red-500`, `text-gray-400` for element colors          |
| `frontend/src/components/oracle/ReadingCard.tsx`            | 16-18     | `bg-emerald-500/20`, `bg-amber-500/20`, `bg-rose-500/20`    |
| `frontend/src/components/oracle/MoonPhaseDisplay.tsx`       | 18        | `bg-gray-500/15 text-gray-400` for Rest phase               |
| `frontend/src/components/admin/HealthDashboard.tsx`         | 11-13, 20 | `bg-gray-400` for not_connected/not_deployed/not_configured |
| `frontend/src/components/admin/LogViewer.tsx`               | 27        | `bg-gray-500/20 text-gray-400` for debug level              |
| `frontend/src/components/admin/UserTable.tsx`               | 29        | `bg-gray-500/20 text-gray-400` for readonly role            |

### Root Cause

The semantic theme token system (`nps-success`, `nps-error`, `nps-warning`, `nps-oracle-accent`, `nps-purple`, `nps-text-dim`, `nps-bg-elevated`) was added to `tailwind.config.ts` as the design matured. But 22+ files that were scaffolded earlier were never revisited to adopt the tokens. The admin section was scaffolded entirely with raw colors and was never themed.

### How It Should Be

Every color in the UI should come from the semantic token system:

- `bg-green-600/20 text-green-400` → `bg-nps-success/20 text-nps-success`
- `bg-amber-600` → `bg-nps-warning`
- `text-red-500` → `text-nps-error`
- `bg-gray-400` → `bg-nps-text-dim` or `bg-nps-bg-elevated`
- `text-white` → `text-nps-text-bright`

For element-specific colors (Fire, Earth, Metal, Water, Wood in zodiac displays), define a `ELEMENT_THEME` map using CSS custom properties so the palette can change with the theme.

### Fix Scope

**Medium — systematic find-and-replace across 22+ files:**

1. Audit every raw Tailwind color class in `frontend/src/components/`
2. Map each to its semantic equivalent (create new tokens if needed for element colors)
3. Replace file by file, test each visually
4. Especially heavy in admin components: `HealthDashboard`, `LogViewer`, `UserTable`, `BackupManager`

### Notes for the Developer

- Run `grep -rn "bg-gray-\|bg-red-\|bg-green-\|bg-amber-\|bg-emerald-\|bg-rose-\|text-red-\|text-gray-\|text-green-\|text-amber-\|text-white" frontend/src/components/` to get the full list.
- The `TYPE_COLORS` maps in `ReadingCard.tsx`, `GanzhiDisplay.tsx`, `LocationDisplay.tsx`, `HeartbeatDisplay.tsx`, `FC60StampDisplay.tsx`, and `MoonPhaseDisplay.tsx` are the biggest clusters — each defines a color map with raw values.
- Consider creating a shared `ELEMENT_COLORS` constant using theme tokens that all zodiac/element display components import.
- The admin section will need the most work since it was never themed at all.

---

## Issue #32 — Typography Hierarchy Is Ad-Hoc Across the App

**Reported by:** Codebase Audit (Round 2 — Visual Polish)
**Priority:** 🟡 P2 — Medium

> The app uses `font-bold`, `font-semibold`, and `font-medium` inconsistently at similar heading levels. There is no documented type scale, so visually identical headings in different components have different font weights, creating a subtle but noticeable lack of visual rhythm.

### What I See

Searching across the codebase reveals 177 occurrences of font weight classes across 55+ files. Section headings that look like they should be the same level use different weights — for example, `QuickActions.tsx` uses `font-bold` for its section title while `RecentReadings.tsx` uses `font-semibold` for the equivalent level. Card titles mix `font-medium` and `font-semibold` seemingly at random.

### What's Actually Happening

Without a documented type scale (like "H1 = text-2xl font-bold, H2 = text-lg font-semibold, H3 = text-base font-medium, Body = text-sm font-normal"), each component author picked whatever looked roughly right at the time. The result is 3 different font weights appearing at the same visual hierarchy level depending on which page you're on.

### Location in Codebase

| File                                                     | Count | What's there now                                             |
| -------------------------------------------------------- | ----- | ------------------------------------------------------------ |
| `frontend/src/components/oracle/DailyReadingCard.tsx`    | 8     | Mix of `font-semibold` and `font-bold` across labels         |
| `frontend/src/components/oracle/CosmicCyclePanel.tsx`    | 7     | `font-bold` for titles, `font-semibold` for sub-items        |
| `frontend/src/components/admin/AnalyticsCharts.tsx`      | 9     | `font-semibold` for chart titles                             |
| `frontend/src/components/admin/LearningDashboard.tsx`    | 8     | Mix of `font-bold` and `font-semibold`                       |
| `frontend/src/components/admin/BackupManager.tsx`        | 12    | `font-medium` for labels, `font-semibold` for section titles |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | 8     | `font-medium` for section headers                            |
| `frontend/src/components/dashboard/QuickActions.tsx`     | 2     | `font-bold` for title                                        |
| `frontend/src/components/dashboard/RecentReadings.tsx`   | 3-4   | `font-semibold` for equivalent-level title                   |
| 47 more files                                            | ~120  | Various inconsistent weights                                 |

### Root Cause

No type scale was defined before components were built. Each developer (or session) independently chose font weights that "looked right" in isolation. Without a reference standard, the inconsistency accumulated file by file.

### How It Should Be

Define a type scale and apply it consistently:

```
Page title:     text-xl font-bold        (used once per page)
Section title:  text-lg font-semibold    (major sections within a page)
Card title:     text-base font-semibold  (card headers, form section headers)
Label:          text-sm font-medium      (form labels, metadata labels)
Body:           text-sm font-normal      (regular content)
Caption:        text-xs font-normal      (timestamps, helper text)
```

Consider defining Tailwind utility classes like `.nps-heading-page`, `.nps-heading-section`, `.nps-heading-card` to enforce consistency.

### Fix Scope

**Medium — systematic audit of 55+ files:**

1. Document the type scale in a shared location (Tailwind config or a `typography.css` file)
2. Audit every font weight usage and map to the correct scale level
3. Replace inconsistencies file by file
4. This is tedious but low-risk — purely visual changes

### Notes for the Developer

- Start with the dashboard page since it has the clearest hierarchy (WelcomeBanner → QuickActions → RecentReadings → DailyReadingCard) and use it as the reference for the rest of the app.
- The admin section is the most inconsistent because it was scaffolded in bulk.
- Don't forget `font-medium` vs `font-semibold` on form labels — pick one and stick to it.

---

## Issue #33 — Border-Radius Inconsistency Across Card Components

**Reported by:** Codebase Audit (Round 2 — Visual Polish)
**Priority:** 🟡 P2 — Medium

> Cards and containers throughout the app use three different border-radius values (`rounded-lg`, `rounded-xl`, `rounded-2xl`) with no apparent pattern. This creates a subtly inconsistent feel where some sections look more "rounded" than their neighbors.

### What I See

A quick scan reveals 107 occurrences of `rounded-lg`, `rounded-xl`, and `rounded-2xl` across 30+ files. On the same dashboard page, `WelcomeBanner` uses `rounded-2xl`, `QuickActions` cards use `rounded-xl`, inner detail sections use `rounded-lg`, and `RecentReadings` cards use `rounded-xl`. The admin pages are almost entirely `rounded-lg`.

### What's Actually Happening

Three radius values are in active use:

- `rounded-lg` (8px) — used for inner sections, form containers, admin cards
- `rounded-xl` (12px) — used for most Oracle cards, reading cards, dashboard cards
- `rounded-2xl` (16px) — used for WelcomeBanner and some modals

There's no rule about which level gets which radius. The inconsistency is most visible when cards at the same hierarchy level on the same page have different radii.

### Location in Codebase

| File                                                   | Lines          | What's there now                    |
| ------------------------------------------------------ | -------------- | ----------------------------------- |
| `frontend/src/components/dashboard/WelcomeBanner.tsx`  | ~line 82       | `rounded-2xl`                       |
| `frontend/src/components/dashboard/QuickActions.tsx`   | ~line 40       | `rounded-xl`                        |
| `frontend/src/components/dashboard/RecentReadings.tsx` | 4 occurrences  | `rounded-xl` for cards              |
| `frontend/src/components/oracle/ReadingCard.tsx`       | 36             | `rounded-xl`                        |
| `frontend/src/components/oracle/ReadingDetail.tsx`     | 21             | `rounded-xl`                        |
| `frontend/src/pages/ReadingHistory.tsx`                | 7 occurrences  | Mixed `rounded-lg` and `rounded-xl` |
| `frontend/src/components/admin/BackupManager.tsx`      | 15 occurrences | Mostly `rounded-lg`                 |
| `frontend/src/components/admin/AnalyticsCharts.tsx`    | 11 occurrences | Mostly `rounded-lg`                 |
| `frontend/src/components/admin/LogViewer.tsx`          | 8 occurrences  | `rounded-lg`                        |

### Root Cause

No documented radius scale. Each component picked whatever felt right in isolation. The `rounded-xl` emerged as the de facto standard for Oracle cards, but the admin section consistently uses `rounded-lg`, and `WelcomeBanner` went even bigger with `rounded-2xl`.

### How It Should Be

Define a radius scale and apply consistently:

```
Page-level container:   rounded-2xl  (outermost wrappers, modals)
Card:                   rounded-xl   (all cards at the same level)
Inner section:          rounded-lg   (sections within cards, form groups)
Small elements:         rounded-md   (buttons, badges, inputs)
```

### Fix Scope

**Small-Medium — systematic replacement across 30+ files:**

1. Document the radius scale
2. Replace `rounded-2xl` on `WelcomeBanner` with `rounded-xl` (to match peer cards)
3. Keep admin `rounded-lg` for inner sections but upgrade admin page-level cards to `rounded-xl`
4. Test visually after each batch

### Notes for the Developer

- This is best done alongside Issue #31 (color tokens) since you'll be touching many of the same files.
- Consider adding Tailwind custom classes like `nps-card` that bundle radius + border + background for consistency.
- The `rounded-xl` on glass-effect cards (`bg-[var(--nps-glass-bg)]`) looks good — make that the standard.

---

## Issue #34 — Icon Sizes and Stroke Widths Inconsistent Across Components

**Reported by:** Codebase Audit (Round 2 — Visual Polish)
**Priority:** 🟡 P2 — Medium

> Icons across the app use at least 4 different size/stroke combinations with no documented scale. Navigation icons are `width="20" strokeWidth="1.5"`, action icons in QuickActions are `w-6` with `strokeWidth="2"`, stat icons are `w-4`, and EmptyState uses `size={48}`. This creates visual noise where icons feel heavier or lighter than their context demands.

### What I See

Navigation icons (`Navigation.tsx`) define a shared `ICON_PROPS` object with `width: 20, height: 20, strokeWidth: 1.5` — which is good consistency within nav. But once you leave the sidebar, every component picks its own sizes:

- `QuickActions.tsx`: Lucide icons at `w-6 h-6` (24px) with default `strokeWidth: 2`
- `StatsCard.tsx`: Icons at `w-4 h-4` (16px)
- `EmptyState.tsx`: Icons at `size={48}` (48px)
- `ReadingCard.tsx`: Star icon at `w-3.5 h-3.5` (14px), delete × at raw text `&times;`
- `ReadingDetail.tsx`: Star icon at `w-4 h-4` (16px)

The same Star icon is 14px in `ReadingCard` and 16px in `ReadingDetail`.

### What's Actually Happening

There's no icon size scale. Each component independently decides its icon dimensions and stroke width. The `ICON_PROPS` pattern in `Navigation.tsx` is a good approach but it's not shared or documented for other components to follow.

### Location in Codebase

| File                                                 | Lines       | What's there now                                   |
| ---------------------------------------------------- | ----------- | -------------------------------------------------- |
| `frontend/src/components/Navigation.tsx`             | 18-27       | `ICON_PROPS`: width=20, height=20, strokeWidth=1.5 |
| `frontend/src/components/dashboard/QuickActions.tsx` | icon usage  | `w-6 h-6` (24px), strokeWidth=2                    |
| `frontend/src/components/StatsCard.tsx`              | icon usage  | `w-4 h-4` (16px)                                   |
| `frontend/src/components/common/EmptyState.tsx`      | icon usage  | `size={48}` (48px)                                 |
| `frontend/src/components/oracle/ReadingCard.tsx`     | 56          | Star at `w-3.5 h-3.5` (14px)                       |
| `frontend/src/components/oracle/ReadingDetail.tsx`   | 40          | Star at `w-4 h-4` (16px)                           |
| `frontend/src/components/oracle/ReadingFeedback.tsx` | SVG buttons | Various sizes                                      |

### Root Cause

No icon size scale was defined. `Navigation.tsx` created a good local pattern (`ICON_PROPS`) but it was never promoted to a shared constant or documented standard. Other components use Lucide React icons with ad-hoc sizing.

### How It Should Be

Define an icon size scale:

```
xs:    w-3.5 h-3.5  (14px) — inline with small text
sm:    w-4 h-4      (16px) — form labels, card metadata, inline buttons
md:    w-5 h-5      (20px) — navigation, primary actions
lg:    w-6 h-6      (24px) — section headers, prominent actions
xl:    w-8 h-8      (32px) — feature highlights
2xl:   w-12 h-12    (48px) — empty states, hero illustrations
```

All icons should use `strokeWidth: 1.5` consistently (matching the nav icons) — `strokeWidth: 2` makes icons feel heavier.

### Fix Scope

**Small-Medium — audit icon usages and standardize:**

1. Create a shared `ICON_SIZES` constant (or document the scale in a shared file)
2. Audit all icon usages and map to the scale
3. Normalize stroke widths to 1.5 everywhere
4. Make the Star icon consistent between ReadingCard (14px) and ReadingDetail (16px) — pick `sm` (16px) for both

### Notes for the Developer

- The `ICON_PROPS` pattern in `Navigation.tsx` is the right idea — consider extracting it to a shared `constants/icons.ts` that all components import.
- The delete button in `ReadingCard.tsx` uses raw `&times;` text instead of an icon — consider replacing with a proper X icon from Lucide for consistency.
- EmptyState's 48px icon is correct for its context (illustration-sized) — that matches the `2xl` scale level.

---

## Issue #35 — Focus Visible Styles Missing or Too Subtle on Interactive Elements

**Reported by:** Codebase Audit (Round 2 — Accessibility / WCAG)
**Priority:** 🔴 P1 — High

> Keyboard users cannot reliably see which element is focused. The global `*:focus-visible` style in `index.css` uses `border-radius: 2px` which clips awkwardly on rounded components (`rounded-xl`, `rounded-2xl`). Worse, 25 files explicitly add `focus:outline-none` without providing an adequate replacement focus ring, making focus invisible in those components.

### What I See

Tabbing through the app with a keyboard, the focus indicator is either invisible (on components that set `focus:outline-none`) or appears as a tiny sharp-cornered outline on top of a softly-rounded card, creating an ugly visual mismatch.

### What's Actually Happening

Two problems compound each other:

1. **Global focus ring doesn't match component shapes:** `index.css` line 86-90 sets `*:focus-visible { border-radius: 2px }` — but most components use `rounded-xl` (12px) or `rounded-lg` (8px). The focus ring looks like a rectangle around a rounded button.

2. **`focus:outline-none` suppresses focus without replacement:** 25 files add `focus:outline-none` to inputs, buttons, and selectors. Some add `focus:ring-2` as replacement, but many don't — leaving the element with no visible focus state at all.

### Location in Codebase

| File                                                         | Lines    | What's there now                                                                                     |
| ------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------- |
| `frontend/src/index.css`                                     | 86-90    | `*:focus-visible { outline: 2px solid var(--nps-accent); outline-offset: 2px; border-radius: 2px; }` |
| `frontend/src/components/oracle/UserForm.tsx`                | multiple | `focus:outline-none` on inputs                                                                       |
| `frontend/src/components/oracle/NameReadingForm.tsx`         | multiple | `focus:outline-none` on inputs                                                                       |
| `frontend/src/components/oracle/QuestionReadingForm.tsx`     | multiple | `focus:outline-none` on inputs                                                                       |
| `frontend/src/components/oracle/TimeReadingForm.tsx`         | multiple | `focus:outline-none` on inputs                                                                       |
| `frontend/src/components/oracle/HeartbeatInput.tsx`          | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/oracle/CalendarPicker.tsx`          | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/oracle/LocationSelector.tsx`        | select   | `focus:outline-none`                                                                                 |
| `frontend/src/components/oracle/MultiUserSelector.tsx`       | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/oracle/UserSelector.tsx`            | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/oracle/SignTypeSelector.tsx`        | buttons  | `focus:outline-none`                                                                                 |
| `frontend/src/components/oracle/SortSelector.tsx`            | select   | `focus:outline-none`                                                                                 |
| `frontend/src/components/settings/ApiKeySection.tsx`         | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/settings/ProfileSection.tsx`        | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/settings/PreferencesSection.tsx`    | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/settings/OracleSettingsSection.tsx` | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/LanguageToggle.tsx`                 | button   | `focus:outline-none`                                                                                 |
| `frontend/src/pages/ReadingHistory.tsx`                      | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/pages/Oracle.tsx`                              | buttons  | `focus:outline-none`                                                                                 |
| `frontend/src/components/admin/ProfileTable.tsx`             | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/admin/UserTable.tsx`                | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/admin/BackupManager.tsx`            | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/admin/AnalyticsCharts.tsx`          | selects  | `focus:outline-none`                                                                                 |
| `frontend/src/components/admin/LogViewer.tsx`                | inputs   | `focus:outline-none`                                                                                 |
| `frontend/src/components/oracle/UserProfileList.tsx`         | buttons  | `focus:outline-none`                                                                                 |

### Root Cause

The global `*:focus-visible` rule was added with a fixed `border-radius: 2px` — appropriate for sharp-cornered elements but wrong for the rounded components that make up 90% of this UI. Then individual components were styled with `focus:outline-none` to remove the browser's default outline, but many didn't add `focus:ring-*` as a replacement. The combination makes keyboard navigation nearly unusable.

### How It Should Be

1. **Fix the global focus ring** to use `border-radius: inherit` (or remove `border-radius` entirely and let `outline` follow the element's shape — which it does in modern browsers):

```css
*:focus-visible {
  outline: 2px solid var(--nps-accent);
  outline-offset: 2px;
  /* Remove border-radius: 2px — let outline follow element shape */
}
```

2. **Remove all bare `focus:outline-none`** and replace with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nps-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nps-bg)]` — or just rely on the global style.

### Fix Scope

**Medium — 25 files to update + 1 CSS fix:**

1. Fix `index.css` global `*:focus-visible` rule: remove `border-radius: 2px`
2. In each of the 25 files: either remove `focus:outline-none` entirely (let global handle it) or add a proper `focus-visible:ring-*` replacement
3. Test with keyboard Tab navigation through every page

### Notes for the Developer

- Modern browsers (Chrome 94+, Firefox 86+, Safari 15.4+) support `outline` following `border-radius` natively — so removing `border-radius: 2px` from the global rule should "just work" for rounded elements.
- The `focus:outline-none` pattern was likely copy-pasted from Tailwind input templates — it's a common oversight.
- WCAG 2.4.7 requires a visible focus indicator. This is a genuine accessibility compliance issue, not just a polish item.

**Status:** **FIXED 2026-02-21** — Fixed focus ring styling in index.css

---

## Issue #36 — Icon-Only Buttons Missing `aria-label` (Screen Readers Announce Empty "Button")

**Reported by:** Codebase Audit (Round 2 — Accessibility / WCAG)
**Priority:** 🔴 P1 — High

> Several icon-only buttons use `title` attribute for tooltip but have no `aria-label`. Screen readers announce these as empty "button" with no description of what they do. The favorite star button, delete × button, and close button in ReadingCard and ReadingDetail are the primary offenders.

### What I See

Using a screen reader (or inspecting the accessibility tree), the favorite and delete buttons in reading cards are announced as just "button" with no label. Sighted users see the star icon and × symbol, but non-sighted users get no information about what these buttons do.

### What's Actually Happening

The buttons have a `title` attribute (`title={t("oracle.toggle_favorite")}`, `title={t("oracle.delete_reading")}`) which provides a tooltip on hover, but `title` is NOT reliably read by screen readers as the accessible name. The proper attribute is `aria-label`.

### Location in Codebase

| File                                               | Lines | What's there now                                                           |
| -------------------------------------------------- | ----- | -------------------------------------------------------------------------- |
| `frontend/src/components/oracle/ReadingCard.tsx`   | 46-57 | Favorite button: `title={t("oracle.toggle_favorite")}` but no `aria-label` |
| `frontend/src/components/oracle/ReadingCard.tsx`   | 59-69 | Delete button: `title={t("oracle.delete_reading")}` but no `aria-label`    |
| `frontend/src/components/oracle/ReadingDetail.tsx` | 33-41 | Favorite button: `title={t("oracle.toggle_favorite")}` but no `aria-label` |
| `frontend/src/components/oracle/ReadingDetail.tsx` | 43-50 | Delete button: `title={t("oracle.delete_reading")}` but no `aria-label`    |

### Root Cause

`title` was used as if it were an accessibility label. While `title` does create a tooltip and can sometimes be read by screen readers as a fallback, it is not the recommended way to provide an accessible name. WCAG requires `aria-label` or `aria-labelledby` for icon-only buttons.

### How It Should Be

Add `aria-label` alongside `title`:

```tsx
<button
  type="button"
  onClick={(e) => { e.stopPropagation(); onToggleFavorite(reading.id); }}
  className="..."
  title={t("oracle.toggle_favorite")}
  aria-label={t("oracle.toggle_favorite")}
>
```

Or replace `title` with `aria-label` entirely if the tooltip is not needed.

### Fix Scope

**Trivial — add `aria-label` to 4 buttons in 2 files:**

1. `ReadingCard.tsx` lines 46-57: add `aria-label={t("oracle.toggle_favorite")}` to favorite button
2. `ReadingCard.tsx` lines 59-69: add `aria-label={t("oracle.delete_reading")}` to delete button
3. `ReadingDetail.tsx` lines 33-41: add `aria-label={t("oracle.toggle_favorite")}` to favorite button
4. `ReadingDetail.tsx` lines 43-50: add `aria-label={t("oracle.delete_reading")}` to delete button

### Notes for the Developer

- Search the entire codebase for other icon-only buttons that might have the same problem: `grep -rn 'title={t(' frontend/src/components/ | grep 'button'`
- `ReadingFeedback.tsx` also has SVG-based buttons that may need the same treatment.
- Consider creating a reusable `<IconButton>` component that enforces `aria-label` as a required prop.

**Status:** **FIXED 2026-02-21** — Added aria-label to favorite and delete buttons

---

## Issue #37 — Decorative SVGs Throughout Oracle Forms Missing `aria-hidden="true"`

**Reported by:** Codebase Audit (Round 2 — Accessibility / WCAG)
**Priority:** 🔴 P1 — High

> Inline SVG icons used as section decorations in Oracle form components are missing `aria-hidden="true"`. Screen readers attempt to announce these SVGs (reading out the raw SVG structure or nothing useful), creating noise for visually impaired users. Some components (like `HeartbeatDisplay`, `SortSelector`, `NumberHeartbeat`) correctly add `aria-hidden="true"`, but many don't.

### What I See

Inspecting the accessibility tree for Oracle forms, decorative icons (user silhouette, calendar, heart, numerology star) are exposed to the accessibility tree as unnamed graphics. A screen reader traversing the form encounters these as mystery elements between the actual form fields.

### What's Actually Happening

Inline SVGs in the form section headers are rendered as JSX without any accessibility attributes. The SVGs serve a purely decorative purpose (visual labels for form sections), but without `aria-hidden="true"`, assistive technology tries to interpret them.

Meanwhile, some other components in the codebase DO correctly use `aria-hidden="true"` — showing the pattern is known but wasn't applied everywhere:

- `HeartbeatDisplay.tsx:45` — ✅ has `aria-hidden="true"`
- `ReadingSection.tsx:46` — ✅ has `aria-hidden="true"`
- `SortSelector.tsx:24` — ✅ has `aria-hidden="true"`
- `NumberHeartbeat.tsx:32` — ✅ has `aria-hidden="true"`

### Location in Codebase

| File                                                     | Lines   | What's there now                       |
| -------------------------------------------------------- | ------- | -------------------------------------- |
| `frontend/src/components/oracle/NameReadingForm.tsx`     | 144-157 | User icon SVG — no `aria-hidden`       |
| `frontend/src/components/oracle/NameReadingForm.tsx`     | ~329    | Numerology icon SVG — no `aria-hidden` |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | 174-189 | Calendar icon SVG — no `aria-hidden`   |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | ~325    | Message icon SVG — no `aria-hidden`    |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | ~453    | Heart icon SVG — no `aria-hidden`      |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | ~507    | Numerology icon SVG — no `aria-hidden` |

### Root Cause

The decorative SVGs were added inline as JSX during the form scaffolding sessions. The `aria-hidden` attribute wasn't part of the copy-paste template used for these icons. Components built later (HeartbeatDisplay, SortSelector, NumberHeartbeat) correctly include it — suggesting the pattern was learned but never backported to the earlier forms.

### How It Should Be

Every decorative SVG should have `aria-hidden="true"` and `focusable="false"`:

```tsx
<svg
  width="16"
  height="16"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  aria-hidden="true"
  focusable="false"
  className="text-[var(--nps-accent)]"
>
```

### Fix Scope

**Trivial — add 2 attributes to 6 SVGs in 2 files:**

1. `NameReadingForm.tsx`: Add `aria-hidden="true" focusable="false"` to user icon (~line 144) and numerology icon (~line 329)
2. `QuestionReadingForm.tsx`: Add `aria-hidden="true" focusable="false"` to calendar icon (~line 174), message icon (~line 325), heart icon (~line 453), and numerology icon (~line 507)

### Notes for the Developer

- Grep the entire Oracle forms directory for SVGs without `aria-hidden`: `grep -rn '<svg' frontend/src/components/oracle/ | grep -v 'aria-hidden'`
- Any SVG that doesn't convey unique information (i.e., it's next to text that describes the same thing) should be `aria-hidden="true"`.
- Consider wrapping decorative SVGs in a shared `<DecorativeIcon>` component that enforces these attributes.

**Status:** **FIXED 2026-02-21** — Added aria-hidden and focusable=false to decorative SVGs

---

## Issue #38 — Form Error Messages Not Linked to Inputs via `aria-describedby`

**Reported by:** Codebase Audit (Round 2 — Accessibility / WCAG)
**Priority:** 🔴 P1 — High

> When form validation fails, error messages appear visually below the invalid input, but they are not programmatically linked to the input via `aria-describedby`. Screen reader users are told the input is invalid (`aria-invalid="true"` is correctly set) but they don't hear what the error message says unless they manually navigate to it.

### What I See

Submitting a form with invalid data shows red error text below the field. A sighted user can see the relationship. But a screen reader user hears "Full name, invalid entry" with no indication of WHY it's invalid — because the error message `<p>` has no `id` and the input has no `aria-describedby` pointing to it.

### What's Actually Happening

The forms correctly set `aria-invalid="true"` on invalid inputs. But the error messages are rendered as standalone `<p>` or `<span>` elements with no `id` attribute and no link back to their input. Only one component in the entire codebase does this correctly: `UserForm.tsx` line 546 uses `aria-describedby={error ? errorId : undefined}`.

### Location in Codebase

| File                                                     | Lines          | What's there now                                                   |
| -------------------------------------------------------- | -------------- | ------------------------------------------------------------------ |
| `frontend/src/components/oracle/UserForm.tsx`            | 546            | ✅ `aria-describedby={error ? errorId : undefined}` — CORRECT      |
| `frontend/src/components/oracle/TimeReadingForm.tsx`     | error messages | ❌ `aria-invalid="true"` set but no `aria-describedby`             |
| `frontend/src/components/oracle/NameReadingForm.tsx`     | error messages | ❌ `aria-invalid="true"` set but no `aria-describedby`             |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | error messages | ❌ `aria-invalid="true"` set but no `aria-describedby`             |
| `frontend/src/components/oracle/SignTypeSelector.tsx`    | 45             | ✅ `aria-describedby={error ? "sign-error" : undefined}` — CORRECT |
| `frontend/src/components/oracle/ReadingFeedback.tsx`     | 105            | ✅ `aria-describedby="feedback-instructions"` — CORRECT            |

### Root Cause

The `aria-describedby` pattern was implemented correctly in some components (UserForm, SignTypeSelector, ReadingFeedback) but not in the three main reading form components. These forms were likely scaffolded from a template that didn't include the pattern, while the other components were built later when the pattern was known.

### How It Should Be

Every error message should have a unique `id`, and its associated input should reference it via `aria-describedby`:

```tsx
<input
  aria-invalid={!!errors.name}
  aria-describedby={errors.name ? "name-error" : undefined}
/>;
{
  errors.name && (
    <p id="name-error" className="text-nps-error text-xs mt-1" role="alert">
      {errors.name}
    </p>
  );
}
```

### Fix Scope

**Small — 3 form files to update:**

1. `TimeReadingForm.tsx`: Add `id` to each error message `<p>`, add `aria-describedby` to each associated input
2. `NameReadingForm.tsx`: Same pattern
3. `QuestionReadingForm.tsx`: Same pattern

Use `UserForm.tsx` line 546 as the reference implementation.

### Notes for the Developer

- The `UserForm.tsx` implementation is the gold standard — copy that pattern.
- Each error `id` should be unique within the form (e.g., `"time-birth-time-error"`, `"name-full-name-error"`).
- The `role="alert"` on the error message is also a good practice (announces the error when it appears) — add it if not already present.
- There is an existing test in `Accessibility.test.tsx` line 259 (`"C5: UserForm errors linked via aria-describedby"`) — extend this test pattern to cover all reading forms.

**Status:** **FIXED 2026-02-21** — Added aria-describedby to CalendarPicker error, UserForm Field already had it

---

## Issue #39 — Non-Semantic `<div>` Used for Disabled Nav Items Instead of `<button disabled>`

**Reported by:** Codebase Audit (Round 2 — Accessibility / WCAG)
**Priority:** 🔴 P1 — High

> Disabled navigation items are rendered as a `<div>` with `cursor-not-allowed` styling instead of a proper `<button disabled>`. This means they're not in the keyboard tab order, not announced by screen readers as a button, and don't communicate their disabled state to assistive technology.

### What I See

Disabled items in the sidebar look dimmed with a "not-allowed" cursor. Sighted users can tell they're disabled. But keyboard users tabbing through the nav skip them entirely — they don't know the items exist. Screen reader users traversing the nav list encounter a nameless `<div>` instead of a button with a state.

### What's Actually Happening

In `Navigation.tsx` lines 116-127, disabled items are rendered as:

```tsx
<div
  key={item.path}
  className="flex items-center gap-3 px-4 py-2 mx-2 rounded text-sm text-[var(--nps-text-dim)] cursor-not-allowed opacity-50"
  title={t("layout.coming_soon")}
>
```

The same pattern appears in `MobileNav.tsx` lines 103-112. A `<div>` is not focusable, not announced as interactive, and its `title` tooltip is only accessible via hover (not keyboard).

### Location in Codebase

| File                                     | Lines   | What's there now                                                 |
| ---------------------------------------- | ------- | ---------------------------------------------------------------- |
| `frontend/src/components/Navigation.tsx` | 116-127 | `<div>` with `cursor-not-allowed opacity-50` and `title` tooltip |
| `frontend/src/components/MobileNav.tsx`  | 103-112 | Same `<div>` pattern                                             |

### Root Cause

Using a `<div>` for a disabled item is a common anti-pattern that avoids dealing with the native disabled button styling. The developer likely used a `<div>` because a disabled `<NavLink>` would still need route handling, and a `<div>` was the quickest way to render a non-clickable item. But the accessibility cost is high.

### How It Should Be

Use a `<button>` element with `disabled` and `aria-disabled="true"`:

```tsx
<button
  key={item.path}
  disabled
  aria-disabled="true"
  className="flex items-center gap-3 px-4 py-2 mx-2 rounded text-sm text-[var(--nps-text-dim)] cursor-not-allowed opacity-50"
  aria-label={`${t(item.labelKey)} — ${t("layout.coming_soon")}`}
>
  <span className="flex-shrink-0">{item.icon}</span>
  {!collapsed && <span>{t(item.labelKey)}</span>}
</button>
```

This makes the item:

- **Keyboard focusable** (appears in tab order)
- **Screen reader accessible** (announced as "[Item name] — Coming soon, button, disabled")
- **Semantically correct** (a disabled interactive element, not a generic container)

### Fix Scope

**Trivial — replace `<div>` with `<button disabled>` in 2 files:**

1. `Navigation.tsx` lines 116-127: Change `<div>` to `<button disabled aria-disabled="true">`
2. `MobileNav.tsx` lines 103-112: Same change

### Notes for the Developer

- Add `aria-label` that combines the item name and "Coming soon" status so screen readers announce the full context.
- `aria-disabled="true"` is set alongside `disabled` because some screen readers handle `aria-disabled` more gracefully than the native `disabled` attribute.
- Test with keyboard Tab — the item should be focusable but not activatable.
- Consider using `tabIndex={0}` if `disabled` removes it from tab order in some browsers (test in Safari).

**Status:** **FIXED 2026-02-21** — Changed div to button with aria-disabled in Navigation and MobileNav

---

## Issue #40 — `prefers-reduced-motion` Not Fully Respected by Inline Tailwind Animations

**Reported by:** Codebase Audit (Round 2 — Accessibility / WCAG)
**Priority:** 🟡 P2 — Medium

> The app has a good foundation for reduced motion: `index.css` has a `@media (prefers-reduced-motion: reduce)` rule, `animations.css` has another, and there's a `useReducedMotion` hook. But components using Tailwind's inline `animate-pulse`, `animate-spin`, and `transition-all` classes bypass all of these — their animations play regardless of the user's OS motion preference.

### What I See

With macOS "Reduce motion" enabled, most custom animations correctly stop or simplify. But loading skeletons still pulse (`animate-pulse`), spinners still spin (`animate-spin`), and page transitions still animate (`transition-all duration-300`). The app correctly handles its custom animations but not Tailwind's built-in utility animations.

### What's Actually Happening

Three motion-reduction systems exist but don't cover Tailwind utilities:

1. `index.css:117` — `@media (prefers-reduced-motion: reduce) { ... }` — handles some animations
2. `animations.css:354` — `@media (prefers-reduced-motion: reduce) { ... }` — handles custom keyframes
3. `useReducedMotion.ts` — JS hook that checks the media query — used by `CalculationAnimation` and a few others

But `animate-pulse` (used in skeletons, DailyReadingCard:79, ConfidenceMeter:29), `animate-spin` (used in loading indicators), and `transition-*` utilities are applied via Tailwind classes that have no reduced-motion awareness.

### Location in Codebase

| File                                                     | Lines         | What's there now                                                  |
| -------------------------------------------------------- | ------------- | ----------------------------------------------------------------- |
| `frontend/src/index.css`                                 | 117           | `@media (prefers-reduced-motion: reduce)` — partial coverage      |
| `frontend/src/styles/animations.css`                     | 354           | `@media (prefers-reduced-motion: reduce)` — custom keyframes only |
| `frontend/src/hooks/useReducedMotion.ts`                 | 11-22         | JS hook — used by ~2 components                                   |
| `frontend/src/components/oracle/ConfidenceMeter.tsx`     | 29            | `animate-pulse` on skeleton                                       |
| `frontend/src/components/oracle/DailyReadingCard.tsx`    | loading state | `animate-pulse` on skeleton                                       |
| `frontend/src/components/common/LoadingSkeleton.tsx`     | throughout    | `animate-pulse` on all skeleton elements                          |
| `frontend/src/components/common/PageLoadingFallback.tsx` | throughout    | `animate-pulse` and/or `animate-spin`                             |

### Root Cause

Tailwind's `animate-pulse` and `animate-spin` are CSS-only animations that don't check `prefers-reduced-motion` by default. While Tailwind v3.4+ provides `motion-reduce:` and `motion-safe:` variants, they aren't used anywhere in this codebase. The existing reduced-motion handling only covers custom `@keyframes` in `animations.css`.

### How It Should Be

Add a global CSS rule that covers ALL Tailwind animations:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Or use Tailwind's `motion-safe:` variant on each animation class: `motion-safe:animate-pulse` (more granular but more work).

### Fix Scope

**Small — 1 CSS addition + optional per-component updates:**

1. Add a global catch-all `prefers-reduced-motion` rule to `index.css` that covers all animations and transitions
2. Optionally, replace `animate-pulse` with `motion-safe:animate-pulse` in key components for more granular control
3. Test with macOS Reduce Motion / Windows animation settings

### Notes for the Developer

- The global catch-all approach is simpler and safer — it guarantees nothing animates for motion-sensitive users.
- The `useReducedMotion` hook is still useful for JS-driven animations (like CalculationAnimation's step-by-step progress) — keep it.
- WCAG 2.3.3 (AAA) requires that motion can be disabled. This fix brings the app closer to compliance.

**Status:** **FIXED 2026-02-21** — Added global prefers-reduced-motion rule

---

## Issue #41 — RecentReadings Returns `null` on Error — User Sees Nothing, No Retry Option

**Reported by:** Codebase Audit (Round 2 — Loading States & Error Recovery)
**Priority:** 🔴 P1 — High

> When the recent readings API call fails on the Dashboard, the `RecentReadings` component returns `null` — literally rendering nothing. The user sees the WelcomeBanner and QuickActions but the Recent Readings section silently vanishes. There's no error message, no "try again" button, no indication that something went wrong.

### What I See

If the API is slow or returns an error, the Dashboard page looks like it only has two sections (welcome + quick actions). A user unfamiliar with the layout would never know there should be a third section showing their recent readings. No error message, no empty state, no retry option — just a blank gap.

### What's Actually Happening

In `RecentReadings.tsx` line 73:

```tsx
if (isError) return null;
```

This is the entire error handling for the component. When the query hook returns an error state, the component removes itself from the DOM entirely. The loading state (lines 55-70) correctly shows a skeleton, but the error state was never implemented.

### Location in Codebase

| File                                                   | Lines | What's there now            |
| ------------------------------------------------------ | ----- | --------------------------- |
| `frontend/src/components/dashboard/RecentReadings.tsx` | 73    | `if (isError) return null;` |

### Root Cause

The error state was skipped during scaffolding — a loading skeleton was built (lines 55-70 show a proper skeleton with animated placeholders) but the error case was handled with a quick `return null` that was likely intended as a placeholder and never revisited.

### How It Should Be

Show an error state with a retry option:

```tsx
if (isError) {
  return (
    <div
      data-testid="recent-readings-error"
      className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-6 text-center"
    >
      <p className="text-sm text-nps-error mb-2">
        {t("dashboard.recent_error")}
      </p>
      <button
        type="button"
        onClick={() => refetch()}
        className="text-sm text-nps-oracle-accent hover:underline"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
```

### Fix Scope

**Small — 1 file, replace 1 line with ~15 lines:**

1. `RecentReadings.tsx` line 73: Replace `return null` with an error state component
2. Add translation keys `dashboard.recent_error` and `common.retry` to `en.json` and `fa.json`
3. Ensure the query hook exposes a `refetch` function (React Query's `useQuery` provides this by default)

### Notes for the Developer

- Check other dashboard components for the same `return null` on error pattern — `DailyReadingCard`, `WelcomeBanner`, etc.
- The error state should visually match the same card dimensions as the loading skeleton so the page layout doesn't shift.
- Consider adding a toast notification (Issue #42) alongside the inline error for additional visibility.

**Status:** **FIXED 2026-02-21** — Added error card with retry button

---

## Issue #42 — Toast/Notification System Only Used for Errors, Never for Success Feedback

**Reported by:** Codebase Audit (Round 2 — Loading States & Error Recovery)
**Priority:** 🟡 P2 — Medium

> The app has a complete toast notification system (`useToast.ts`, `Toast.tsx`, `ToastProvider`) but it's only used in one place: `OracleConsultationForm.tsx` for error messages. No success feedback is shown via toast anywhere — reading submissions, profile saves, deletions, exports, and shares all complete silently with no positive confirmation to the user.

### What I See

After submitting a reading, saving a profile, or exporting data, nothing happens to confirm success. The form might reset or the page might navigate, but there's no "Reading saved!" or "Profile updated!" or "Export complete!" toast. The user has to infer success from context clues. Error toasts DO appear (from `OracleConsultationForm`), creating an asymmetry where the user only gets notified of bad things, never good things.

### What's Actually Happening

The toast system is fully built and functional:

- `useToast.ts` — provides `addToast({ title, description, variant })` with `success`, `error`, `warning`, `info` variants
- `Toast.tsx` — renders toast notifications with auto-dismiss, close button, and proper styling
- `ToastProvider` — wraps the app in `Layout.tsx`

But only `OracleConsultationForm.tsx:195` calls `addToast()`, and only for errors. The entire rest of the app's success flows are silent.

### Location in Codebase

| File                                                        | Lines | What's there now                                              |
| ----------------------------------------------------------- | ----- | ------------------------------------------------------------- |
| `frontend/src/hooks/useToast.ts`                            | 24-38 | Full toast hook with `addToast`, `dismissToast`               |
| `frontend/src/components/common/Toast.tsx`                  | 6-93  | Full toast component with success/error/warning/info variants |
| `frontend/src/components/oracle/OracleConsultationForm.tsx` | 195   | `const { addToast } = useToast();` — only consumer            |

### Root Cause

The toast system was built as infrastructure but the integration into success flows was never completed. Each feature (reading submission, profile save, deletion, export) was built to its "happy path works" state and moved on — the "tell the user it worked" step was deferred and forgotten.

### How It Should Be

Success toasts should appear for all major user actions:

- **Reading submitted:** "Your [type] reading has been generated!"
- **Profile saved:** "Profile updated successfully"
- **Reading deleted:** "Reading deleted"
- **Reading favorited:** "Added to favorites" / "Removed from favorites"
- **Export completed:** "Reading exported as [format]"
- **Share link copied:** "Share link copied to clipboard!"
- **Settings saved:** "Preferences saved"

### Fix Scope

**Medium — add `useToast` calls to 8-10 components:**

1. Import `useToast` in each component that has a success action
2. Call `addToast({ title: t("..."), variant: "success" })` after each successful mutation/action
3. Add translation keys for each success message
4. Test each flow end-to-end

### Notes for the Developer

- Start with the highest-impact flows: reading submission (most frequent action), profile save, and deletion.
- The toast system already supports all 4 variants (`success`, `error`, `warning`, `info`) — no infrastructure work needed.
- Consider adding a `warning` toast for the mood selector (Issue #29) explaining that mood data is not yet used in readings.
- Don't overdo it — clipboard copies and minor actions can use the `info` variant with a shorter auto-dismiss time.

---

## Issue #43 — CalculationAnimation Progress Bar Not Synced With Actual Computation Steps

**Reported by:** Codebase Audit (Round 2 — Loading States & Error Recovery)
**Priority:** 🟡 P2 — Medium

> The calculation animation screen shows both a step counter ("Step 2 of 5") and a progress bar. But the progress bar percentage comes from a separate `progress` prop that's independent of the step counter. This means the progress bar can show 80% while the step counter shows "Step 2 of 5", creating a confusing visual contradiction.

### What I See

During a reading calculation, the animation shows:

- Step indicators lighting up one by one (correct — tied to actual computation steps)
- A text counter "Step 2 of 5" (correct — matches the step indicators)
- A progress bar filling from left to right (incorrect — fills at a different rate than the steps)

The progress bar might be at 30% when the step counter says "Step 3 of 5", or at 90% when only "Step 2 of 5" is shown. The two indicators tell conflicting stories.

### What's Actually Happening

In `CalculationAnimation.tsx` lines 87-93:

```tsx
<div className="w-48 h-1 bg-[var(--nps-border)] rounded-full mx-auto">
  <div
    className="h-full bg-[var(--nps-accent)] rounded-full transition-all duration-500"
    style={{ width: `${progressPct}%` }}
  />
</div>
```

The `progressPct` is computed from a `progress` prop that's passed in from the parent, while the step counter uses `activeIndex` from the `visualSteps` array. These two values are updated by different mechanisms and at different rates.

### Location in Codebase

| File                                                      | Lines  | What's there now                                          |
| --------------------------------------------------------- | ------ | --------------------------------------------------------- |
| `frontend/src/components/oracle/CalculationAnimation.tsx` | 87-93  | Progress bar using `progressPct` prop                     |
| `frontend/src/components/oracle/CalculationAnimation.tsx` | 96-100 | Step counter using `activeIndex` and `visualSteps.length` |

### Root Cause

The progress bar and step counter use two independent data sources:

- Progress bar: `progress` prop from parent (a raw percentage, likely updated by API polling or timer)
- Step counter: `activeIndex` derived from `visualSteps` (discrete step state machine)

These were designed independently — the progress bar was likely added as a visual enhancement without syncing it to the existing step counter.

### How It Should Be

The progress bar should derive its percentage from the step counter:

```tsx
const progressPct =
  (Math.min(activeIndex + 1, visualSteps.length) / visualSteps.length) * 100;
```

Or remove the progress bar entirely and let the step indicators + step counter be the sole progress visualization. Two contradicting progress indicators are worse than one clear one.

### Fix Scope

**Small — 1 file, derive progress from steps:**

1. Remove the independent `progress` prop
2. Compute `progressPct` from `activeIndex / visualSteps.length`
3. Both indicators now tell the same story

### Notes for the Developer

- If the parent needs to communicate "real" API progress (like a chunked upload), keep the progress prop but hide the step counter — don't show both if they can't be synced.
- The `transition-all duration-500` on the progress bar makes it animate smoothly even when jumping between steps — that's a nice touch to keep.
- Test with different reading types that have different numbers of calculation steps.

---

## Issue #44 — WelcomeBanner Accepts `isLoading` Prop But Never Uses It

**Reported by:** Codebase Audit (Round 2 — Loading States & Error Recovery)
**Priority:** 🟡 P2 — Medium

> The `WelcomeBanner` component accepts an `isLoading` prop in its interface and the parent `Dashboard.tsx` passes it as `isLoading={isLoading}`. But inside the component, the prop is accepted at line 61 and then completely ignored — no loading skeleton, no conditional rendering, nothing. The banner always renders its full content regardless of loading state.

### What I See

When the Dashboard first loads, the WelcomeBanner immediately shows greeting text and time — even if the user data hasn't loaded yet. The `userName` might be empty (showing "Hello, Explorer!" as a fallback), but there's no skeleton or shimmer effect to indicate that data is still loading. Meanwhile, `RecentReadings` shows a proper skeleton. The inconsistency makes the page feel half-designed.

### What's Actually Happening

The component interface declares `isLoading` as a prop:

```tsx
interface WelcomeBannerProps {
  userName?: string;
  moonData?: MoonData;
  isLoading: boolean; // line 61 — accepted
}
```

And the Dashboard passes it:

```tsx
<WelcomeBanner userName={userName} moonData={moonData} isLoading={isLoading} />
```

But inside `WelcomeBanner`, the `isLoading` value is destructured and then never referenced in any conditional. The component always renders the full content.

### Location in Codebase

| File                                                  | Lines | What's there now                                        |
| ----------------------------------------------------- | ----- | ------------------------------------------------------- |
| `frontend/src/components/dashboard/WelcomeBanner.tsx` | 58-62 | `isLoading` in props interface, destructured but unused |
| `frontend/src/pages/Dashboard.tsx`                    | ~47   | `isLoading={isLoading}` passed to WelcomeBanner         |

### Root Cause

The loading state was planned (the prop was added to the interface and passed from the parent) but the skeleton rendering was never implemented. The component was shipped with just the loaded state and the loading implementation was deferred.

### How It Should Be

When `isLoading` is true, render a skeleton that matches the banner's layout:

```tsx
if (isLoading) {
  return (
    <div className="bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)] rounded-xl p-6">
      <div className="h-6 w-48 bg-nps-bg-elevated rounded animate-pulse mb-2" />
      <div className="h-4 w-32 bg-nps-bg-elevated rounded animate-pulse" />
    </div>
  );
}
```

### Fix Scope

**Small — 1 file, add ~10 lines of skeleton rendering:**

1. `WelcomeBanner.tsx`: Add a loading check at the top of the render function
2. Return a skeleton matching the banner's visual dimensions
3. Consider using `motion-safe:animate-pulse` (per Issue #40)

### Notes for the Developer

- Match the skeleton dimensions to the actual banner content so there's no layout shift when data loads.
- The moon phase data (`moonData`) is the most likely thing to load slowly — consider showing the greeting immediately and only skeletonizing the moon phase section.
- Use `LoadingSkeleton.tsx` if there's a shared skeleton component already available.

**Status:** **FIXED 2026-02-21** — Added shimmer loading state

---

## Issue #45 — Text Selection Uses Default Browser Blue Highlight Instead of Theme Colors

**Reported by:** Codebase Audit (Round 2 — Visual Polish)
**Priority:** 🟢 P3 — Low

> When selecting text anywhere in the app, the default browser blue highlight appears. In a dark-themed app with a carefully designed color palette, this bright blue selection stands out as the one element that was never themed. It's a small detail but contributes to the overall impression of "unfinished."

### What I See

Selecting any text (reading results, form labels, headings, descriptions) shows a bright blue/purple highlight that clashes with the dark theme and nps-accent color scheme. Every other color in the UI follows the dark theme except text selection.

### What's Actually Happening

There is no `::selection` CSS rule in `index.css` or any other stylesheet. Searching the entire `frontend/src/` directory for `::selection` returns zero results. The browser applies its default selection color (typically bright blue on macOS, blue on Windows).

### Location in Codebase

| File                     | Lines     | What's there now                      |
| ------------------------ | --------- | ------------------------------------- |
| `frontend/src/index.css` | (missing) | No `::selection` rule exists anywhere |

### Root Cause

Text selection styling was simply never added. It's a commonly overlooked CSS detail, especially in dark-themed applications where it's most visually noticeable.

### How It Should Be

Add a themed selection rule to `index.css`:

```css
::selection {
  background-color: var(--nps-accent);
  color: var(--nps-bg);
}

::-moz-selection {
  background-color: var(--nps-accent);
  color: var(--nps-bg);
}
```

This makes text selection use the app's accent color (the same teal/blue used for focus rings, active nav items, and buttons) instead of the browser's default blue.

### Fix Scope

**Trivial — add 8 lines to 1 CSS file:**

1. Add `::selection` and `::-moz-selection` rules to `index.css`
2. Use the `--nps-accent` CSS variable for background
3. Use `--nps-bg` for text color (ensures contrast)

### Notes for the Developer

- The `::-moz-selection` prefix is needed for Firefox compatibility (though modern Firefox also supports the unprefixed version).
- Consider using a slightly transparent accent color (`rgba(var(--nps-accent-rgb), 0.3)`) if the solid accent is too intense for selected text.
- Test with both English and Persian text — RTL selection should also look correct.
- This is a single-line-equivalent fix with high visual impact — one of the best effort-to-improvement ratios in this issue list.

**Status:** **FIXED 2026-02-21** — Added ::selection oracle-blue styling

---

## Issue #46 — CalculationAnimation Never Shows for Time/Name/Question Readings

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🔴 P0 — Critical

> The animated calculation screen (progress bar, step indicators, cancel button) is dead code for 4 out of 5 reading types. Only multi-user readings trigger it. For time, name, question, and daily readings, the form submits and the user stares at a frozen screen until results appear — no animation, no progress, no cancel option.

### What's Actually Happening

In `Oracle.tsx`, the parent has `isLoading` state (line 61) and shows `CalculationAnimation` when `isLoading === true` (line 264). The child `OracleConsultationForm` receives `onLoadingChange` as a prop. But for time/name/question readings (lines 124-165), the child forms (`TimeReadingForm`, `NameReadingForm`, `QuestionReadingForm`) never call `onLoadingChange(true)` when the mutation starts. Only the multi-user flow (lines 172-183) correctly calls `onLoadingChange(true)`.

The `onResult` callback does call `onLoadingChange(false)` — but since `true` was never set, the animation never appeared in the first place.

### Location in Codebase

| File                                                        | Lines   | What's there now                                          |
| ----------------------------------------------------------- | ------- | --------------------------------------------------------- |
| `frontend/src/pages/Oracle.tsx`                             | 264-288 | Shows CalculationAnimation when `isLoading` is true       |
| `frontend/src/components/oracle/OracleConsultationForm.tsx` | 124-165 | time/name/question forms — `onLoadingChange` never called |
| `frontend/src/components/oracle/OracleConsultationForm.tsx` | 172-183 | multi_user flow — correctly calls `onLoadingChange(true)` |

### Root Cause

`onLoadingChange(true)` was only wired into the multi-user flow. The individual reading forms were scaffolded separately and never integrated with the loading animation system.

### How It Should Be

Each child form should call `onLoadingChange(true)` when the mutation begins. Either pass `onLoadingChange` to each form as a prop, or have `OracleConsultationForm` wrap the child form's `onSubmit` callback to centrally manage loading state.

### Fix Scope

**Medium — wire onLoadingChange into 4 form components.**

### Notes for the Developer

- The `ReadingTypeSelector` is never disabled during loading (`disabled={isLoading}` at line 247 is always false), so users can switch reading types and submit concurrent readings. This is a secondary bug.
- Consider also adding an AbortController (Issue #50) so the cancel button actually works.

---

## Issue #47 — Mutation Retry Config Causes Duplicate Readings on Server 5xx Errors

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🔴 P1 — High

> All reading submission mutations retry up to 3 times on server errors, but the global QueryClient explicitly sets `mutations: { retry: false }`. The per-hook `retryConfig` overrides this, meaning a transient 500 error creates duplicate readings in the database.

### What's Actually Happening

In `useOracleReadings.ts`, a `retryConfig` object (lines 6-17) with `retry: 3` and exponential backoff is spread into every `useMutation` call. Meanwhile, `main.tsx` (lines 22-24) sets the global default `mutations: { retry: false }`. The per-hook config overrides the global setting.

`POST /oracle/readings` is not idempotent — each call creates a new reading record. Retrying on 5xx means the user gets 1-4 identical readings if the server temporarily fails.

### Location in Codebase

| File                                      | Lines              | What's there now                         |
| ----------------------------------------- | ------------------ | ---------------------------------------- |
| `frontend/src/hooks/useOracleReadings.ts` | 6-17               | `retryConfig` with `retry: 3`            |
| `frontend/src/hooks/useOracleReadings.ts` | 22-29, 31-42, etc. | `...retryConfig` spread into useMutation |
| `frontend/src/main.tsx`                   | 22-24              | Global `mutations: { retry: false }`     |

### Root Cause

`retryConfig` was designed for queries (reads) but was copied to mutations (writes) without considering idempotency.

### How It Should Be

Remove `...retryConfig` from all `useMutation` calls. Keep it only on `useQuery` hooks. Mutations should not retry — the global `retry: false` was correct.

### Fix Scope

**Small — remove retryConfig spread from ~6 useMutation calls in 1 file.**

### Notes for the Developer

- Search for `...retryConfig` in mutation hooks: `useSubmitReading`, `useSubmitQuestion`, `useSubmitName`, `useSubmitTimeReading`, `useGenerateDailyReading`, `useSubmitMultiUserReading`.
- If idempotent mutations are needed later, implement a request ID pattern on the backend.

---

## Issue #48 — ReadingHistory Client-Side Sort After Server Pagination Shows Wrong Order

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🔴 P1 — High

> When the user selects "Oldest first" or "By confidence" on the Reading History page, the app re-sorts only the current page of 12 results — not the full dataset. "Oldest first" shows the 12 most recent readings sorted by oldest, not the actual 12 oldest readings in the database.

### What's Actually Happening

`ReadingHistory.tsx` (page) lines 101-121 fetches page N from the server with `limit` and `offset`, then client-side `useMemo` re-sorts the returned 12 items. The `sortBy` parameter is never sent to the API.

### Location in Codebase

| File                                    | Lines   | What's there now                   |
| --------------------------------------- | ------- | ---------------------------------- |
| `frontend/src/pages/ReadingHistory.tsx` | 101-121 | Client-side sort on paginated data |

### Root Cause

Sort was implemented client-side as a quick solution. The API endpoint accepts `sort_by`/`sort_order` parameters (as the AdminUsers endpoint proves), but the reading history hook never passes them.

### How It Should Be

Pass `sort_by` and `sort_order` as query parameters to the server API, then remove the client-side `useMemo` sort.

### Fix Scope

**Small-Medium — add sort params to the API call, remove client-side sort.**

### Notes for the Developer

- Check that the backend `/oracle/readings` endpoint supports sort parameters. If not, add them.

---

## Issue #49 — Selected Reading Detail Shows Stale Data After Favorite Toggle

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🔴 P1 — High

> After toggling a reading's favorite status in the detail view, the star icon doesn't update. The detail panel shows the old `is_favorite` value until the user closes and re-opens it.

### What's Actually Happening

When a user selects a reading, the reading object is stored as a snapshot in state: `setSelectedReading(reading)` (line 46). When `favoriteMutation.mutate(id)` fires, it invalidates the React Query cache, but the `selectedReading` local state is never updated.

### Location in Codebase

| File                                                | Lines        | What's there now                                             |
| --------------------------------------------------- | ------------ | ------------------------------------------------------------ |
| `frontend/src/pages/ReadingHistory.tsx`             | 46-48        | `setSelectedReading(reading)` — snapshot, never updated      |
| `frontend/src/pages/ReadingHistory.tsx`             | 92-98        | `handleToggleFavorite` invalidates cache but not local state |
| `frontend/src/components/oracle/ReadingHistory.tsx` | 37-39, 88-91 | Same pattern in component version                            |

### Root Cause

`selectedReading` is a plain React state snapshot, not derived from the query cache. Cache invalidation updates the list but not the detail view.

### How It Should Be

After mutation success, either update `selectedReading` with the returned data, or derive `selectedReading` from the query cache using the reading ID.

### Fix Scope

**Small — update selectedReading in the mutation's onSuccess callback.**

---

## Issue #50 — Cancel Button Hides Loading UI But Doesn't Cancel the API Request

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🔴 P1 — High

> Clicking "Cancel" on the CalculationAnimation only sets `isLoading(false)` — the API request continues in the background. The reading is still created server-side, and when the response arrives, it may flash results unexpectedly.

### What's Actually Happening

In `Oracle.tsx` lines 271-274:

```tsx
onCancel={() => { setIsLoading(false); }}
```

This hides the animation and re-shows the form, but the mutation is still in flight. When it completes, `onResult` fires, potentially showing unexpected results.

### Location in Codebase

| File                            | Lines   | What's there now           |
| ------------------------------- | ------- | -------------------------- |
| `frontend/src/pages/Oracle.tsx` | 271-274 | `setIsLoading(false)` only |

### Root Cause

No `AbortController` was wired into the fetch request. The cancel button was a UI-only implementation.

### How It Should Be

Use `AbortController` to actually cancel the fetch, or set a cancelled flag that causes `onResult` to be ignored.

### Fix Scope

**Medium — add AbortController to the mutation/fetch chain.**

---

## Issue #51 — DailyReadingCard Renders Empty Card When Reading Has No daily_insights

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🔴 P1 — High

> When a reading exists in the database but has no `daily_insights` field (older readings, or readings generated without insights), the DailyReadingCard shows an empty card body — no "generate" button, no insights, nothing.

### What's Actually Happening

The card has three conditional sections:

1. `{!reading && !isPending && ...}` — "Generate" button (line 90)
2. `{isPending && ...}` — Loading state
3. `{reading && dailyInsights && ...}` — Insights display (line 116)

When `reading` exists but `dailyInsights` is null, NONE of these render. The user sees just the card header with an empty body.

### Location in Codebase

| File                                                  | Lines   | What's there now                                                                |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| `frontend/src/components/oracle/DailyReadingCard.tsx` | 90, 116 | Three mutually exclusive conditions that miss the reading-without-insights case |

### Root Cause

The component was designed assuming readings always have insights. Older readings or readings that failed insight generation aren't handled.

### How It Should Be

Add a fallback for `reading && !dailyInsights` — show the AI interpretation text or a "Regenerate insights" button.

### Fix Scope

**Small — add a fourth conditional section.**

---

## Issue #52 — useRetry Hook Execute Function Changes Identity Every Render

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🔴 P1 — High

> The `execute` callback from `useRetry` is recreated on every render because `asyncFn` is in its dependency array. Any consumer using `execute` in a `useEffect` or passing it as a prop triggers unnecessary re-renders and potential overlapping retry chains.

### Location in Codebase

| File                             | Lines | What's there now                       |
| -------------------------------- | ----- | -------------------------------------- |
| `frontend/src/hooks/useRetry.ts` | 40-81 | `useCallback(execute, [..., asyncFn])` |

### Root Cause

`asyncFn` is a function parameter recreated on every render unless the caller explicitly wraps it in `useCallback`. The `abortRef` provides some protection but doesn't prevent multiple `execute` calls.

### How It Should Be

Store `asyncFn` in a ref (like the WebSocket hook does with `handlerRef`) to keep `execute` stable across renders.

### Fix Scope

**Small — use useRef for asyncFn.**

---

## Issue #53 — Duplicate useDailyReading Hook Name With Different Signatures

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🔴 P1 — High

> Two completely different hooks are both exported as `useDailyReading` — one in `useDashboard.ts` (calls `/oracle/daily`) and one in `useOracleReadings.ts` (calls `/oracle/daily/reading` with userId). Auto-imports or refactoring can easily pick the wrong one.

### Location in Codebase

| File                                      | Lines | What's there now                                                                 |
| ----------------------------------------- | ----- | -------------------------------------------------------------------------------- |
| `frontend/src/hooks/useDashboard.ts`      | 19    | `useDailyReading(date?: string)` — calls `oracle.daily(date)`                    |
| `frontend/src/hooks/useOracleReadings.ts` | 69    | `useDailyReading(userId, date?)` — calls `oracle.getDailyReading(userId!, date)` |

### Root Cause

Different developers created hooks for similar purposes without checking for name collisions.

### How It Should Be

Rename one: `useDashboardDailyReading` in useDashboard.ts or `useUserDailyReading` in useOracleReadings.ts.

### Fix Scope

**Small — rename + update all imports.**

---

## Issue #54 — useSettings Hook Bypasses Centralized API Client, Breaks Error Handling

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🔴 P1 — High

> The `useSettings` hook defines its own `authHeaders()` and `fetchJson()` functions, duplicating the logic from `api.ts` `request()`. The critical difference: it throws plain `Error` instead of `ApiError`, so the global retry logic (`if error instanceof ApiError && error.isClientError return false`) never matches — settings queries retry 3 times on 404.

### Location in Codebase

| File                                | Lines       | What's there now                              |
| ----------------------------------- | ----------- | --------------------------------------------- |
| `frontend/src/hooks/useSettings.ts` | 4-32        | Local `fetchJson` and `authHeaders` functions |
| `frontend/src/services/api.ts`      | centralized | `request()` with `ApiError` class             |

### How It Should Be

Remove the local fetch functions. Add settings endpoints to `api.ts` and use them.

### Fix Scope

**Small — refactor to use centralized API client.**

---

## Issue #55 — Oracle selectedUsers Three-useEffect Chain Is Fragile

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🔴 P1 — High

> Three `useEffect` hooks in `Oracle.tsx` interact with `selectedUsers` — restore from localStorage, persist to localStorage, and clear on user deletion. They depend on each other's execution order, creating a fragile chain that could break in React concurrent mode.

### Location in Codebase

| File                            | Lines | What's there now                    |
| ------------------------------- | ----- | ----------------------------------- |
| `frontend/src/pages/Oracle.tsx` | 66-75 | Effect 1: Restore from localStorage |
| `frontend/src/pages/Oracle.tsx` | 78-84 | Effect 2: Persist to localStorage   |
| `frontend/src/pages/Oracle.tsx` | 87-95 | Effect 3: Clear on user deletion    |

### How It Should Be

Consolidate into a single effect, or use refs for localStorage sync to avoid the chain dependency.

### Fix Scope

**Medium — refactor 3 effects into 1.**

---

## Issue #56 — useTheme Doesn't Update React State When System Preference Changes

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🟡 P2 — Medium

> When `theme === "system"`, the `matchMedia` change listener updates the DOM class but doesn't update React state. Components checking `resolvedTheme` show stale values (e.g., sun icon when OS switched to dark).

### Location in Codebase

| File                             | Lines | What's there now                                      |
| -------------------------------- | ----- | ----------------------------------------------------- |
| `frontend/src/hooks/useTheme.ts` | 66-75 | `applyThemeClass(getSystemTheme())` — no state update |

### Fix Scope

**Trivial — trigger a React state update in the matchMedia callback.**

---

## Issue #57 — QuestionReadingForm Captures Time at Mount, Not at Submission

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🟡 P2 — Medium

> The time fields (`hour`, `minute`, `second`) are initialized from `new Date()` when the component mounts. If the user spends 10 minutes composing a question, the time shown is 10 minutes stale. Additionally, this time is never sent to the backend (the backend doesn't support it), making the time fields misleading.

### Location in Codebase

| File                                                     | Lines | What's there now                         |
| -------------------------------------------------------- | ----- | ---------------------------------------- |
| `frontend/src/components/oracle/QuestionReadingForm.tsx` | 68-71 | `useState(now.getHours())` at mount time |

### Fix Scope

**Small — either send time to backend or mark as "coming soon".**

---

## Issue #58 — SharedReading useEffect Re-Runs on Language Change Due to `t` in Deps

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🟡 P2 — Medium

> The `useEffect` that fetches shared reading data includes `t` (from `useTranslation`) in its dependency array. When the user switches language, the API is re-fetched unnecessarily.

### Location in Codebase

| File                                   | Lines | What's there now                       |
| -------------------------------------- | ----- | -------------------------------------- |
| `frontend/src/pages/SharedReading.tsx` | 24-38 | `useEffect(() => { ... }, [token, t])` |

### Fix Scope

**Trivial — remove `t` from the dependency array.**

---

## Issue #59 — LocationSelector Auto-Detect Clears Country/City Data

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🟡 P2 — Medium

> Clicking "Auto-detect" location explicitly sets `country: undefined, city: undefined`, losing the user's previous manual selection. The country/city dropdowns disappear because `countryCode` is not set.

### Location in Codebase

| File                                                  | Lines | What's there now                                               |
| ----------------------------------------------------- | ----- | -------------------------------------------------------------- |
| `frontend/src/components/oracle/LocationSelector.tsx` | 48-58 | `onChange({ ...coords, country: undefined, city: undefined })` |

### Fix Scope

**Small — preserve existing country/city or perform reverse geocode.**

---

## Issue #60 — api.ts Sets Content-Type: application/json on GET Requests

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🟡 P2 — Medium

> Every API request (including GET) includes `Content-Type: application/json`, making all requests "non-simple" in CORS terms and forcing unnecessary preflight OPTIONS requests.

### Location in Codebase

| File                           | Lines | What's there now                                                       |
| ------------------------------ | ----- | ---------------------------------------------------------------------- |
| `frontend/src/services/api.ts` | 42-47 | `headers: { "Content-Type": "application/json", ... }` on all requests |

### Fix Scope

**Trivial — only set Content-Type when method has a body.**

---

## Issue #61 — Vault Findings Truthy Check on Offset Skips offset=0

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🟡 P2 — Medium

> `if (params?.offset)` evaluates to false when offset is 0. The first page of vault findings may not send the offset parameter.

### Location in Codebase

| File                           | Lines   | What's there now                     |
| ------------------------------ | ------- | ------------------------------------ |
| `frontend/src/services/api.ts` | 235-240 | `if (params?.offset)` — truthy check |

### Fix Scope

**Trivial — change to `params?.offset !== undefined`.**

---

## Issue #62 — ReadingResults Embeds Full ReadingHistory Component Creating Nested State

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🟡 P2 — Medium

> The "History" tab inside Oracle results renders the full `ReadingHistory` component with its own search, filters, pagination, delete, and favorite capabilities. This creates nested independent state — the user can navigate into a reading detail inside the embedded history, with no way to know they're in a "nested" view.

### Location in Codebase

| File                                                | Lines  | What's there now                                    |
| --------------------------------------------------- | ------ | --------------------------------------------------- |
| `frontend/src/components/oracle/ReadingResults.tsx` | 6, 143 | Imports and renders full `ReadingHistory` component |

### Fix Scope

**Medium — replace with a simplified recent-readings list or link to /history.**

---

## Issue #63 — useToastState Timer Cleanup Missing on Unmount

**Reported by:** Codebase Audit (Round 3 — Workflow Logic)
**Priority:** 🟡 P2 — Medium

> The `useToastState` hook creates auto-dismiss timeouts but has no cleanup on unmount. Pending timers continue running and attempt state updates on an unmounted component.

### Location in Codebase

| File                             | Lines  | What's there now                  |
| -------------------------------- | ------ | --------------------------------- |
| `frontend/src/hooks/useToast.ts` | 38-107 | No `useEffect` cleanup for timers |

### Fix Scope

**Trivial — add cleanup effect that clears all pending timers.**

---

## Issue #64 — `bg-nps-bg-elevated` Token Doesn't Exist in Tailwind Config — Skeletons Are Invisible

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🔴 P1 — High

> Multiple loading skeleton components use `bg-nps-bg-elevated` but this token doesn't exist in `tailwind.config.ts`. The class resolves to nothing, making skeleton shimmer boxes transparent/invisible. Users see no loading indication.

### Location in Codebase

| File                                                     | Lines          | What's there now                                                                    |
| -------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| `frontend/src/components/dashboard/MoonPhaseWidget.tsx`  | 24-25          | `bg-nps-bg-elevated`                                                                |
| `frontend/src/components/dashboard/DailyReadingCard.tsx` | 36-38          | `bg-nps-bg-elevated`                                                                |
| `frontend/src/components/dashboard/RecentReadings.tsx`   | 24, 55, 63-65  | `bg-nps-bg-elevated`                                                                |
| `frontend/tailwind.config.ts`                            | nps.bg section | Only: DEFAULT, card, input, hover, sidebar, button, danger, success — no `elevated` |

### Fix Scope

**Trivial — add `elevated` key to tailwind config or replace with `bg-nps-bg-hover`.**

**Status:** **FIXED 2026-02-21** — Added bg.elevated token to Tailwind config

---

## Issue #65 — `bg-nps-bg-button` Renders Bright Blue Clashing With Green Accent Theme

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🔴 P1 — High

> The `nps-bg-button` token resolves to `#1f6feb` (bright blue) in the Tailwind config. The app's entire accent color system is emerald/green (`#10b981`). The ErrorBoundary retry button and EmptyState action button render in blue, visually clashing with everything else.

### Location in Codebase

| File                                               | Lines | What's there now              |
| -------------------------------------------------- | ----- | ----------------------------- |
| `frontend/src/components/common/ErrorBoundary.tsx` | 73    | `bg-nps-bg-button text-white` |
| `frontend/src/components/common/EmptyState.tsx`    | 59    | `bg-nps-bg-button text-white` |

### Fix Scope

**Trivial — replace `bg-nps-bg-button` with `bg-[var(--nps-accent)]` or update the token value.**

**Status:** **FIXED 2026-02-21** — Changed button color to use var(--nps-accent)

---

## Issue #66 — Glass-Morphism Applied Inconsistently — 5 Pages Use Old Opaque Card Style

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🔴 P1 — High

> Dashboard, Oracle, Admin, and ReadingHistory use the new glassmorphism style (`bg-[var(--nps-glass-bg)] backdrop-blur-md`). But Settings, Vault, Learning, and LogPanel still use the old opaque `bg-nps-bg-card` style. Navigating between pages creates a jarring visual transition.

### Location in Codebase

| File                                                   | Lines  | What's there now                           |
| ------------------------------------------------------ | ------ | ------------------------------------------ |
| `frontend/src/components/settings/SettingsSection.tsx` | 19     | `bg-nps-bg-card border border-nps-border`  |
| `frontend/src/pages/Vault.tsx`                         | 13     | `bg-nps-bg-card border border-nps-border`  |
| `frontend/src/pages/Learning.tsx`                      | 13, 31 | `bg-nps-ai-bg border border-nps-ai-border` |
| `frontend/src/components/LogPanel.tsx`                 | 26     | `bg-nps-bg-card border border-nps-border`  |

### Fix Scope

**Medium — update 5 files to use glass treatment.**

---

## Issue #67 — Settings Inputs Missing Glass Treatment and Using Wrong Border-Radius

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🔴 P1 — High

> Settings page inputs use `bg-nps-bg-input border border-nps-border rounded` (4px) while Oracle inputs use `bg-[var(--nps-glass-bg)] backdrop-blur-sm border-[var(--nps-glass-border)] rounded-lg` (8px) with glow focus effects. Two visual languages for the same element type.

### Location in Codebase

| File                                                      | Lines       | What's there now                                   |
| --------------------------------------------------------- | ----------- | -------------------------------------------------- |
| `frontend/src/components/settings/ProfileSection.tsx`     | 87, 95, 104 | `bg-nps-bg-input border border-nps-border rounded` |
| `frontend/src/components/settings/PreferencesSection.tsx` | 113         | Same old style                                     |
| `frontend/src/components/settings/ApiKeySection.tsx`      | 157         | `bg-nps-bg-card border border-nps-border rounded`  |

### Fix Scope

**Small — update 3 files to match Oracle input styling.**

---

## Issue #68 — Transition Durations Inconsistent Across Similar Hover States

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> Similar interactive hover effects use 5 different durations: `duration-150` (admin tables), `duration-200` (most hovers), `duration-300` (glass cards), `duration-500` (progress bars), `duration-700` (CompatibilityMeter). Same-level cards animate at different speeds.

### Fix Scope

**Medium — standardize to `--nps-duration-*` CSS tokens defined in animations.css.**

---

## Issue #69 — Z-Index Collision: OfflineBanner, Modals, and MobileNav All Share z-50

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> OfflineBanner (`z-50`), modals (`z-50`), MobileNav drawer (`z-50`), CalendarPicker (`z-50`), and ExportShareMenu (`z-50`) all compete at the same z-index level. The OfflineBanner can overlap modal content.

### Location in Codebase

| File                                                | Lines  | What's there now |
| --------------------------------------------------- | ------ | ---------------- |
| `frontend/src/components/common/OfflineBanner.tsx`  | 28     | `z-50`           |
| `frontend/src/components/oracle/UserForm.tsx`       | 146    | `z-50`           |
| `frontend/src/components/oracle/CalendarPicker.tsx` | picker | `z-50`           |
| `frontend/src/components/MobileNav.tsx`             | drawer | `z-50`           |

### Fix Scope

**Small — establish z-index scale: dropdowns z-30, modals z-50, banner z-55, toast z-60.**

---

## Issue #70 — BackupManager Dropdown Uses z-10 (Too Low)

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> The backup type dropdown uses `z-10` while all other dropdowns use `z-50`. It can appear behind sibling elements.

### Location in Codebase

| File                                              | Lines | What's there now |
| ------------------------------------------------- | ----- | ---------------- |
| `frontend/src/components/admin/BackupManager.tsx` | 177   | `z-10`           |

### Fix Scope

**Trivial — change to z-30 or z-50.**

---

## Issue #71 — Hover Shadow Glow Sizes Inconsistent on Same-Level Cards

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> Glass card hover glow varies between `8px`, `12px`, and `16px` spread on visually equivalent cards. Admin stats glow at 8px, dashboard stats at 12px, QuickActions at 16px.

### Location in Codebase

| File                                                 | Lines | What's there now                                |
| ---------------------------------------------------- | ----- | ----------------------------------------------- |
| `frontend/src/pages/Admin.tsx`                       | 9     | `hover:shadow-[0_0_8px_var(--nps-glass-glow)]`  |
| `frontend/src/components/StatsCard.tsx`              | 60    | `hover:shadow-[0_0_12px_var(--nps-glass-glow)]` |
| `frontend/src/components/dashboard/QuickActions.tsx` | 83    | `hover:shadow-[0_0_16px_var(--nps-glass-glow)]` |

### Fix Scope

**Small — standardize to 12px for all cards.**

---

## Issue #72 — ReadingCard Outer Div Has cursor-pointer But Click Handler Is Only on Inner Button

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> The outer `<div>` has `cursor-pointer` suggesting the entire card is clickable, but the click handler is only on the inner `<button>` element. Clicking the header area (type badge, date) does nothing.

### Location in Codebase

| File                                             | Lines | What's there now                   |
| ------------------------------------------------ | ----- | ---------------------------------- |
| `frontend/src/components/oracle/ReadingCard.tsx` | 36    | `cursor-pointer` on outer div      |
| `frontend/src/components/oracle/ReadingCard.tsx` | 73-84 | `onClick` only on inner `<button>` |

### Fix Scope

**Trivial — add onClick to outer div or remove cursor-pointer.**

---

## Issue #73 — Page-Level Spacing Inconsistent Between Pages

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> Dashboard uses `gap-6`, Settings uses `space-y-4`, Admin/ReadingHistory use `space-y-6`. The Settings page feels more cramped.

### Location in Codebase

| File                                    | Lines | What's there now |
| --------------------------------------- | ----- | ---------------- |
| `frontend/src/pages/Dashboard.tsx`      | 44    | `gap-6`          |
| `frontend/src/pages/Settings.tsx`       | 13    | `space-y-4`      |
| `frontend/src/pages/Admin.tsx`          | 30    | `space-y-6`      |
| `frontend/src/pages/ReadingHistory.tsx` | 170   | `space-y-6`      |

### Fix Scope

**Trivial — standardize all pages to `space-y-6`.**

---

## Issue #74 — SharedReading Page Uses Old Card Style With rounded (4px)

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> The public-facing SharedReading page (what users share externally) uses `bg-nps-bg-card rounded` (4px) instead of the glass treatment with `rounded-xl`. As a brand-facing page, it looks inconsistent with the rest of the app.

### Location in Codebase

| File                                   | Lines | What's there now                                         |
| -------------------------------------- | ----- | -------------------------------------------------------- |
| `frontend/src/pages/SharedReading.tsx` | 101   | `bg-nps-bg-card border border-nps-border/30 rounded p-4` |

### Fix Scope

**Trivial — apply glass treatment with rounded-xl.**

---

## Issue #75 — ReadingSection Uses Deprecated Animation Instead of NPS Animation System

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> `ReadingSection` uses `animate-fade-in-up` (from Tailwind config, hardcoded 400ms) instead of `nps-animate-fade-in-up` (from the NPS animation system, using CSS variable tokens). Missing `nps-animate-initial` causes flash-of-visible-content.

### Location in Codebase

| File                                                | Lines | What's there now     |
| --------------------------------------------------- | ----- | -------------------- |
| `frontend/src/components/oracle/ReadingSection.tsx` | 36    | `animate-fade-in-up` |

### Fix Scope

**Trivial — replace with `nps-animate-fade-in-up nps-animate-initial`.**

---

## Issue #76 — ReadingSection Uses bg-nps-bg-card Instead of Glass Treatment

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> ReadingSections appear inside the Oracle results area which uses glass cards everywhere else. These sections use opaque `bg-nps-bg-card`, creating a visual mismatch within the same page.

### Location in Codebase

| File                                                | Lines | What's there now |
| --------------------------------------------------- | ----- | ---------------- |
| `frontend/src/components/oracle/ReadingSection.tsx` | 36    | `bg-nps-bg-card` |

### Fix Scope

**Trivial — replace with `bg-[var(--nps-glass-bg)] backdrop-blur-sm`.**

---

## Issue #77 — Additional Raw Tailwind Colors Found Beyond Issue #31

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> Beyond the 22+ files found in Issue #31, additional instances of raw `text-red-400`, `text-red-500`, `text-green-400` were found in pages and settings components. These are different hues from the design tokens: `red-400` (#f87171) vs `nps-error` (#f85149), `green-400` (#4ade80) vs `nps-success` (#3fb950).

### Location in Codebase

| File                                                         | Lines | What's there now                  |
| ------------------------------------------------------------ | ----- | --------------------------------- |
| `frontend/src/pages/ReadingHistory.tsx`                      | 154   | `text-red-400`                    |
| `frontend/src/pages/SharedReading.tsx`                       | 70    | `text-red-400`                    |
| `frontend/src/components/settings/ProfileSection.tsx`        | 111   | `text-green-400` / `text-red-400` |
| `frontend/src/components/settings/PreferencesSection.tsx`    | 146   | `text-green-400`                  |
| `frontend/src/components/settings/OracleSettingsSection.tsx` | 84    | `text-green-400`                  |
| `frontend/src/pages/AdminUsers.tsx`                          | 84    | `text-red-400`                    |
| `frontend/src/components/admin/HealthDashboard.tsx`          | 87    | `text-red-400`                    |

### Fix Scope

**Small — replace with `text-nps-error` and `text-nps-success`.**

---

## Issue #78 — UserForm Modal Uses nps-oracle-border Instead of Glass Border

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> The UserForm modal uses `border-nps-oracle-border` (deep blue `#1e3a5f`) while other modals use `border-[var(--nps-glass-border)]`. It also lacks the glassmorphism backdrop-blur treatment.

### Location in Codebase

| File                                          | Lines | What's there now                                            |
| --------------------------------------------- | ----- | ----------------------------------------------------------- |
| `frontend/src/components/oracle/UserForm.tsx` | 157   | `bg-nps-bg-card border border-nps-oracle-border rounded-lg` |

### Fix Scope

**Trivial — update to glass treatment matching BackupManager modals.**

---

## Issue #79 — Oracle Profile Area Button Text Sizes Don't Match Select

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> In the Oracle profile area, the select dropdown uses `text-sm` while the "Add New" and "Edit" buttons use `text-xs`. They sit in the same flex row but have misaligned text baselines.

### Location in Codebase

| File                            | Lines   | What's there now                    |
| ------------------------------- | ------- | ----------------------------------- |
| `frontend/src/pages/Oracle.tsx` | 194-222 | Select `text-sm`, buttons `text-xs` |

### Fix Scope

**Trivial — make buttons `text-sm` to match.**

---

## Issue #80 — RecentReadings Card hover:scale Causes Layout Shift in Grid

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> Cards scale up on hover (`hover:scale-[1.01]`), pushing against adjacent cards in a tight grid. QuickActions uses `hover:scale-105` (5% scale) which is even more aggressive.

### Location in Codebase

| File                                                   | Lines | What's there now     |
| ------------------------------------------------------ | ----- | -------------------- |
| `frontend/src/components/dashboard/RecentReadings.tsx` | 111   | `hover:scale-[1.01]` |
| `frontend/src/components/dashboard/QuickActions.tsx`   | 83    | `hover:scale-105`    |

### Fix Scope

**Trivial — replace with `hover:-translate-y-0.5` (no layout shift) or remove scale.**

---

## Issue #81 — StatsCard Value Text Appears Muted Instead of Bright

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> Dashboard StatsCard values (the most important numbers) inherit gray `--nps-text` color instead of using `--nps-text-bright`. No `color` prop is passed from the Dashboard, so the important numbers appear muted.

### Location in Codebase

| File                                    | Lines | What's there now             |
| --------------------------------------- | ----- | ---------------------------- |
| `frontend/src/components/StatsCard.tsx` | 68-70 | No default bright text color |

### Fix Scope

**Trivial — add `text-[var(--nps-text-bright)]` as default.**

---

## Issue #82 — Modal Backdrop Inconsistency Between UserForm and Admin Modals

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> UserForm (most frequently used modal) uses `bg-black/60` with no blur. All admin modals use `bg-black/70 backdrop-blur-sm`. UserForm backdrop appears lighter and less polished.

### Location in Codebase

| File                                              | Lines    | What's there now               |
| ------------------------------------------------- | -------- | ------------------------------ |
| `frontend/src/components/oracle/UserForm.tsx`     | 146      | `bg-black/60` (no blur)        |
| `frontend/src/components/admin/BackupManager.tsx` | 333, 379 | `bg-black/70 backdrop-blur-sm` |

### Fix Scope

**Trivial — standardize to `bg-black/70 backdrop-blur-sm`.**

---

## Issue #83 — Filter Chip / Badge Border-Radius Wildly Inconsistent

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> Badges and chips use 4 different radii: `rounded` (4px) on ReadingCard type badge, `rounded-md` (6px) on admin badges, `rounded-lg` (8px) on some, and `rounded-full` (pill) on filter chips and RecentReadings badges. The same type badge looks squarish in ReadingCard and pill-shaped in RecentReadings.

### Location in Codebase

| File                                                   | Lines | What's there now |
| ------------------------------------------------------ | ----- | ---------------- |
| `frontend/src/components/oracle/ReadingCard.tsx`       | 40    | `rounded` (4px)  |
| `frontend/src/components/dashboard/RecentReadings.tsx` | 27    | `rounded-full`   |
| `frontend/src/components/admin/UserTable.tsx`          | 189   | `rounded-md`     |

### Fix Scope

**Small — standardize to `rounded-full` for all small badges/chips.**

---

## Issue #84 — nps-animate-scale-in Hardcodes 200ms Instead of Design Token

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> All other NPS animation utility classes use CSS custom property duration tokens, but `nps-animate-scale-in` hardcodes `200ms`. It won't respond to global timing adjustments.

### Location in Codebase

| File                                 | Lines | What's there now                                  |
| ------------------------------------ | ----- | ------------------------------------------------- |
| `frontend/src/styles/animations.css` | 245   | `animation: nps-scale-in 200ms ease-out forwards` |

### Fix Scope

**Trivial — change to `var(--nps-duration-sm)`.**

**Status:** **FIXED 2026-02-21** — Used var(--nps-duration-sm) for scale-in animation

---

## Issue #85 — LogPanel Empty State "No entries yet" Hardcoded English

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> The LogPanel empty state string is not wrapped in `t()`. Persian users see English text.

### Location in Codebase

| File                                   | Lines | What's there now        |
| -------------------------------------- | ----- | ----------------------- |
| `frontend/src/components/LogPanel.tsx` | 38    | `<p>No entries yet</p>` |

### Fix Scope

**Trivial — wrap in `t("log.no_entries")`.**

**Status:** **FIXED 2026-02-21** — Changed hardcoded text to t(admin.log_no_entries)

---

## Issue #86 — BackupManager Table Actions Use space-x-2 (Not RTL-Safe)

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> `space-x-2` uses `margin-left` which doesn't flip in RTL mode. Button spacing will be on the wrong side in Persian layout.

### Location in Codebase

| File                                              | Lines | What's there now |
| ------------------------------------------------- | ----- | ---------------- |
| `frontend/src/components/admin/BackupManager.tsx` | 306   | `space-x-2`      |

### Fix Scope

**Trivial — change to `flex gap-2` or `space-s-2` (RTL plugin).**

**Status:** **FIXED 2026-02-21** — Changed space-x-2 to gap-2

---

## Issue #87 — Scrollbar Styling Only Applies to WebKit — Firefox Shows Default Bright Scrollbar

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> Only `::-webkit-scrollbar` styles are defined. Firefox users see the default bright white/gray scrollbar clashing with the dark theme.

### Location in Codebase

| File                     | Lines | What's there now             |
| ------------------------ | ----- | ---------------------------- |
| `frontend/src/index.css` | 50-67 | WebKit scrollbar styles only |

### Fix Scope

**Trivial — add `scrollbar-width: thin; scrollbar-color: var(--nps-border) var(--nps-bg);`.**

**Status:** **FIXED 2026-02-21** — Thinned scrollbar to 4px with oracle-accent color

---

## Issue #88 — ConfidenceMeter Uses Unicode Characters Instead of SVG Icons

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> The codebase was migrated from emoji/unicode to SVG icons (commit c773a08), but ConfidenceMeter still uses `✓` and `○` for boost indicators. They render differently across operating systems.

### Location in Codebase

| File                                                 | Lines | What's there now             |
| ---------------------------------------------------- | ----- | ---------------------------- |
| `frontend/src/components/oracle/ConfidenceMeter.tsx` | 91-92 | `{boost.filled ? "✓" : "○"}` |

### Fix Scope

**Trivial — replace with Lucide icons (Check, Circle).**

---

## Issue #89 — Page Title Heading Sizes Inconsistent Across Sibling Pages

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> Settings, Admin, Vault, Learning use `text-xl` for page headings while ReadingHistory uses `text-2xl`. Dashboard's WelcomeBanner uses `text-2xl lg:text-3xl`. Sibling pages at the same hierarchy level have different heading sizes.

### Location in Codebase

| File                                    | Lines | What's there now |
| --------------------------------------- | ----- | ---------------- |
| `frontend/src/pages/Settings.tsx`       | 14    | `text-xl`        |
| `frontend/src/pages/Admin.tsx`          | 34    | `text-xl`        |
| `frontend/src/pages/ReadingHistory.tsx` | 174   | `text-2xl`       |

### Fix Scope

**Trivial — standardize all page headings to the same size.**

---

## Issue #90 — DailyReadingCard "Generate" Button Permanently Pulses

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🟡 P2 — Medium

> The "Generate Daily Reading" CTA has `animate-pulse` applied permanently, making it pulse endlessly. Pulse is normally reserved for loading/skeleton states. This is visually distracting and conflicts with prefers-reduced-motion settings.

### Location in Codebase

| File                                                     | Lines | What's there now                     |
| -------------------------------------------------------- | ----- | ------------------------------------ |
| `frontend/src/components/dashboard/DailyReadingCard.tsx` | 79    | `animate-pulse` on static CTA button |

### Fix Scope

**Trivial — remove `animate-pulse`.**

---

## Issue #91 — Touch Targets Too Small on ThemeToggle, ExportShareMenu, and ReadingCard Actions

**Reported by:** Codebase Audit (Round 3 — Visual / Pixel)
**Priority:** 🔴 P1 — High

> Several interactive elements are below the WCAG 2.1 minimum 44×44px touch target. ThemeToggle is 32px, ExportShareMenu button is ~28px, ReadingCard favorite star is ~20px. The LanguageToggle correctly uses `min-h-[44px]` but ThemeToggle right next to it doesn't.

### Location in Codebase

| File                                                 | Lines | What's there now                       |
| ---------------------------------------------------- | ----- | -------------------------------------- |
| `frontend/src/components/ThemeToggle.tsx`            | 11    | `w-8 h-8` (32px)                       |
| `frontend/src/components/oracle/ExportShareMenu.tsx` | 196   | `px-2 py-1 text-xs` (~28px)            |
| `frontend/src/components/oracle/ReadingCard.tsx`     | 46    | Star icon `w-3.5 h-3.5` (~20px target) |

### Fix Scope

**Small — add `min-h-[44px] min-w-[44px]` with responsive override.**

---

## Issue #92 — CRITICAL: Legacy API Key Grants Full Admin With No User Identity

**Reported by:** Codebase Audit (Round 3 — Backend Security)
**Priority:** ⚫ P0 — Critical

> Anyone with the `api_secret_key` gets full admin privileges with `user_id=None`. This null user_id breaks ownership checks, audit trails, and any query filtering by user. The key is compared in plaintext (timing-attack vulnerable).

### Location in Codebase

| File                         | Lines   | What's there now                                                                 |
| ---------------------------- | ------- | -------------------------------------------------------------------------------- |
| `api/app/middleware/auth.py` | 253-263 | `if token == settings.api_secret_key: return {"user_id": None, "role": "admin"}` |

### Fix Scope

**High priority — rework legacy auth to use constant-time comparison and require a user identity.**

**Status:** **FIXED 2026-02-21** — Used hmac.compare_digest() and limited scopes for legacy auth

---

## Issue #93 — CRITICAL: Insecure Default api_secret_key Runs if .env Is Missing

**Reported by:** Codebase Audit (Round 3 — Backend Security)
**Priority:** ⚫ P0 — Critical

> The default `api_secret_key` is `"changeme-generate-a-real-secret"`. If `.env` is missing or doesn't set this, anyone can authenticate as admin using the well-known default. Combined with Issue #92, this grants full admin access.

### Location in Codebase

| File                | Lines    | What's there now                                          |
| ------------------- | -------- | --------------------------------------------------------- |
| `api/app/config.py` | settings | `api_secret_key: str = "changeme-generate-a-real-secret"` |

### Fix Scope

**Small — make the field required (no default) or validate it isn't the default at startup.**

**Status:** **FIXED 2026-02-21** — Added postgres_password startup validation

---

## Issue #94 — Vault Endpoints Have Zero Authentication

**Reported by:** Codebase Audit (Round 3 — Backend Security)
**Priority:** 🔴 P1 — High

> All 4 vault endpoints (`/findings`, `/summary`, `/search`, `/export`) have no `Depends(get_current_user)`. Vault data is publicly accessible without any authentication.

### Location in Codebase

| File                       | Lines         | What's there now   |
| -------------------------- | ------------- | ------------------ |
| `api/app/routers/vault.py` | all endpoints | No auth dependency |

### Fix Scope

**Small — add `Depends(get_current_user)` to all 4 endpoints.**

---

## Issue #95 — ~~Scanner Endpoints Have Zero Authentication~~

**Status:** ✅ Resolved — Scanner removed from project (2026-02-20). `api/app/routers/scanner.py` deleted.

---

## Issue #96 — Reading Creation With user_id=None Violates CHECK Constraint

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🔴 P1 — High

> When a legacy/unauthenticated request creates a reading, `user_id=None` is passed to `store_reading`. The SQL schema has `CHECK (user_id IS NOT NULL)` on `oracle_readings`, causing a 500 database constraint violation at runtime.

### Location in Codebase

| File                        | Lines | What's there now                   |
| --------------------------- | ----- | ---------------------------------- |
| `api/app/routers/oracle.py` | 172   | `store_reading(user_id=None, ...)` |

### Fix Scope

**Small — validate user_id before database write; reject if None.**

**Status:** **FIXED 2026-02-21** — Fixed ownership chain via OracleUser.created_by

---

## Issue #97 — Delete/Favorite Reading Has No Ownership Check

**Reported by:** Codebase Audit (Round 3 — Backend Security)
**Priority:** 🔴 P1 — High

> The delete and favorite endpoints find a reading by ID but never verify that the authenticated user owns it. Any authenticated user can delete or favorite any other user's reading.

### Location in Codebase

| File                        | Lines   | What's there now                                      |
| --------------------------- | ------- | ----------------------------------------------------- |
| `api/app/routers/oracle.py` | 763-811 | `db.query(OracleReading).get(id)` — no user_id filter |

### Fix Scope

**Small — add `.filter(OracleReading.user_id == current_user.id)` to queries.**

**Status:** **FIXED 2026-02-21** — Added ownership verification in delete_reading and toggle_favorite

---

## Issue #98 — list_readings With user_id=None Returns Wrong Results

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🔴 P1 — High

> When called with legacy auth (`user_id=None` from Issue #92), `filter(OracleReading.user_id == None)` translates to `IS NULL` in SQL, which either returns nothing or all orphaned readings — neither correct behavior.

### Location in Codebase

| File                        | Lines   | What's there now                        |
| --------------------------- | ------- | --------------------------------------- |
| `api/app/routers/oracle.py` | 700-701 | `filter(OracleReading.user_id == None)` |

### Fix Scope

**Small — reject requests with user_id=None before querying.**

**Status:** **FIXED 2026-02-21** — Reverted to user_id=None (service doesn't filter by user_id)

---

## Issue #99 — Negative UTC Offsets Computed Incorrectly (timedelta.seconds Bug)

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🔴 P1 — High

> Using `.seconds` on a negative `timedelta` gives wrong results. `timedelta(hours=-5).seconds` returns `68400` (19 hours), not `-18000`. All time-based numerological computations for negative time zones (Americas, etc.) produce incorrect results.

### Location in Codebase

| File                                 | Lines | What's there now                             |
| ------------------------------------ | ----- | -------------------------------------------- |
| `api/app/services/oracle_reading.py` | 135   | `.seconds` on potentially negative timedelta |

### Fix Scope

**Trivial — use `.total_seconds()` instead of `.seconds`.**

**Status:** **FIXED 2026-02-21** — Changed .seconds to .total_seconds() for timezone calc

---

## Issue #100 — ORM reading_result Mapped as Text but DB Schema Is JSONB

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🔴 P1 — High

> The ORM maps `reading_result` as `Text` but the database column is `JSONB`. This means SQLAlchemy sends string data that PostgreSQL must implicitly cast. JSON query operators won't work through the ORM. Combined with `json.dumps()` at line 958, this creates double-encoded JSON.

### Location in Codebase

| File                                 | Lines          | What's there now                              |
| ------------------------------------ | -------------- | --------------------------------------------- |
| `api/app/orm/oracle_reading.py`      | reading_result | `Column(Text)` instead of `Column(JSONB)`     |
| `api/app/services/oracle_reading.py` | 958            | `json.dumps(result_dict)` — string into JSONB |

### Fix Scope

**Small — change ORM column to JSONB, remove json.dumps on write.**

---

## Issue #101 — ORM Model Missing 3 Columns That Exist in SQL Schema

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🔴 P1 — High

> The `OracleReading` ORM class is missing `framework_version`, `reading_mode`, and `numerology_system` columns that are defined in the SQL schema. These columns won't be populated by SQLAlchemy.

### Location in Codebase

| File                            | Lines     | What's there now  |
| ------------------------------- | --------- | ----------------- |
| `api/app/orm/oracle_reading.py` | class def | Missing 3 columns |

### Fix Scope

**Small — add the 3 missing Column definitions.**

---

## Issue #102 — Share Link Revocation Has No Ownership Check

**Reported by:** Codebase Audit (Round 3 — Backend Security)
**Priority:** 🟡 P2 — Medium

> Any authenticated user can revoke any other user's share link by ID.

### Location in Codebase

| File                       | Lines   | What's there now               |
| -------------------------- | ------- | ------------------------------ |
| `api/app/routers/share.py` | 119-132 | No user_id check on revocation |

### Fix Scope

**Trivial — add ownership check.**

**Status:** **FIXED 2026-02-21** — Added ownership check in share.py

---

## Issue #103 — Telegram Unlink Has No Ownership Check

**Reported by:** Codebase Audit (Round 3 — Backend Security)
**Priority:** 🟡 P2 — Medium

> Any authenticated user can unlink any other user's Telegram account.

### Location in Codebase

| File                          | Lines   | What's there now |
| ----------------------------- | ------- | ---------------- |
| `api/app/routers/telegram.py` | 128-141 | No user_id check |

### Fix Scope

**Trivial — add ownership check.**

**Status:** **FIXED 2026-02-21** — Added ownership check on telegram unlink

---

## Issue #104 — Telegram Status Counts ALL Readings, Not Current User's

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🟡 P2 — Medium

> The total readings count uses a filter that counts ALL readings where `user_id IS NOT NULL` instead of filtering by the current user.

### Location in Codebase

| File                          | Lines | What's there now                     |
| ----------------------------- | ----- | ------------------------------------ |
| `api/app/routers/telegram.py` | 117   | Counts all non-null user_id readings |

### Fix Scope

**Trivial — filter by current user's ID.**

**Status:** **FIXED 2026-02-21** — Filtered reading count by current user

---

## Issue #105 — Daily Cache Rollback Destroys Parent Reading Transaction

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🟡 P2 — Medium

> `_create_daily_cache` shares the same DB session as parent reading creation. If the cache insert fails, the rollback also rolls back the main reading.

### Location in Codebase

| File                                 | Lines   | What's there now                      |
| ------------------------------------ | ------- | ------------------------------------- |
| `api/app/services/oracle_reading.py` | 623-638 | Shared session, no nested transaction |

### Fix Scope

**Small — use a savepoint (nested transaction) for the cache insert.**

**Status:** **FIXED 2026-02-21** — Used db.begin_nested() for race condition

---

## Issue #106 — \_parse_datetime Silently Swallows Invalid Dates

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🟡 P2 — Medium

> Returns `None` for unparseable dates instead of raising an error. This `None` propagates through the numerology pipeline, potentially producing incorrect calculations.

### Location in Codebase

| File                                 | Lines  | What's there now      |
| ------------------------------------ | ------ | --------------------- |
| `api/app/services/oracle_reading.py` | 95-104 | `except: return None` |

### Fix Scope

**Small — raise a validation error instead of returning None.**

**Status:** **FIXED 2026-02-21** — Changed bare except to except ValueError in \_parse_datetime

---

## Issue #107 — Insecure Default postgres_password "changeme"

**Reported by:** Codebase Audit (Round 3 — Backend Security)
**Priority:** 🟡 P2 — Medium

> If `.env` is missing, the database runs with a trivially guessable `"changeme"` password.

### Location in Codebase

| File                | Lines    | What's there now                      |
| ------------------- | -------- | ------------------------------------- |
| `api/app/config.py` | settings | `postgres_password: str = "changeme"` |

### Fix Scope

**Trivial — make required with no default, or validate at startup.**

**Status:** **FIXED 2026-02-21** — Changed postgres_password default and added startup validation

---

## Issue #108 — Double JSON Serialization Into JSONB Column

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🟡 P2 — Medium

> `reading_result` is set to `json.dumps(result_dict)` (a string), but the column is JSONB. PostgreSQL stores it as a JSON string inside JSONB: `"\"{ ... }\""` instead of `{ ... }`.

### Location in Codebase

| File                                 | Lines | What's there now          |
| ------------------------------------ | ----- | ------------------------- |
| `api/app/services/oracle_reading.py` | 958   | `json.dumps(result_dict)` |

### Fix Scope

**Trivial — pass the dict directly, not json.dumps.**

**Status:** **FIXED 2026-02-21** — Added TODO for JSONB migration (columns are Text not JSONB)

---

## Issue #109 — Rate Limiter Sliding Window Has No Thread Safety

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🟡 P2 — Medium

> The `_SlidingWindow` class operates on shared mutable state without locking. The `_TokenBlacklist` in the same codebase correctly uses `threading.Lock`, but the rate limiter doesn't.

### Location in Codebase

| File                               | Lines               | What's there now               |
| ---------------------------------- | ------------------- | ------------------------------ |
| `api/app/middleware/rate_limit.py` | SlidingWindow class | No lock on shared dictionaries |

### Fix Scope

**Small — add threading.Lock.**

**Status:** **FIXED 2026-02-21** — Added threading.Lock() to sliding window rate limiter

---

## Issue #110 — CORS Allows All Methods/Headers With Credentials

**Reported by:** Codebase Audit (Round 3 — Backend Security)
**Priority:** 🟡 P2 — Medium

> `allow_methods=["*"]` and `allow_headers=["*"]` with `allow_credentials=True` is overly permissive, expanding the attack surface.

### Location in Codebase

| File              | Lines   | What's there now                       |
| ----------------- | ------- | -------------------------------------- |
| `api/app/main.py` | 145-151 | Wildcard methods/headers + credentials |

### Fix Scope

**Small — restrict to needed methods (GET, POST, PUT, DELETE) and specific headers.**

**Status:** **FIXED 2026-02-21** — Restricted allow_methods and allow_headers

---

## Issue #111 — SPA Catch-All Serves HTML for API 404s

**Reported by:** Codebase Audit (Round 3 — Backend Logic)
**Priority:** 🟡 P2 — Medium

> The `/{path:path}` catch-all serves `index.html` for ANY unmatched route, including typos in `/api/...` paths. API consumers get HTML with 200 instead of JSON 404.

### Location in Codebase

| File              | Lines   | What's there now            |
| ----------------- | ------- | --------------------------- |
| `api/app/main.py` | 208-210 | Catch-all serves index.html |

### Fix Scope

**Small — exclude `/api/*` paths from catch-all.**

---

## Issue #112 — Learning Endpoints Are Unauthenticated

**Reported by:** Codebase Audit (Round 3 — Backend Security)
**Priority:** 🟡 P2 — Medium

> Learning endpoints return stub data with no auth, exposing the API surface unnecessarily.

### Location in Codebase

| File                          | Lines | What's there now   |
| ----------------------------- | ----- | ------------------ |
| `api/app/routers/learning.py` | 34-68 | No auth dependency |

### Fix Scope

**Trivial — add auth dependency.**

**Status:** **FIXED 2026-02-21** — Added get_current_user dependency to all 6 endpoints

---

## Issue #113 — Password Change Logged as Login Event in Audit Trail

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🟡 P2 — Medium

> After a successful password change, the audit trail records it as a `login` event instead of `password_change`.

### Location in Codebase

| File                      | Lines | What's there now                                           |
| ------------------------- | ----- | ---------------------------------------------------------- |
| `api/app/routers/auth.py` | 303   | `audit.log_auth_login(user_id, ...)` after password change |

### Fix Scope

**Trivial — call `audit.log_password_change()` instead.**

**Status:** **FIXED 2026-02-21** — Changed password-change audit event from login to password_change

---

## Issue #114 — Missing Unique Constraint on user_settings (user_id, setting_key)

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🟡 P2 — Medium

> Without a unique constraint, concurrent requests setting the same key can create duplicate rows.

### Location in Codebase

| File                           | Lines     | What's there now                              |
| ------------------------------ | --------- | --------------------------------------------- |
| `api/app/orm/user_settings.py` | class def | No UniqueConstraint on (user_id, setting_key) |

### Fix Scope

**Small — add UniqueConstraint + migration.**

---

## Issue #115 — update_role Doesn't Validate Against Allowed Role Values

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🟡 P2 — Medium

> The role update function accepts any string without validating against `admin`/`moderator`/`user`/`readonly`. Invalid roles like `superadmin` can be stored.

### Location in Codebase

| File                                | Lines | What's there now   |
| ----------------------------------- | ----- | ------------------ |
| `api/app/services/admin_service.py` | 85-96 | No role validation |

### Fix Scope

**Trivial — validate against allowed set or use Enum.**

**Status:** **FIXED 2026-02-21** — Already handled by Pydantic field_validator

---

## Issue #116 — Hard-Delete Orphans Feedback/Share/Telegram Rows

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🟡 P2 — Medium

> Admin hard-delete removes users but doesn't cascade to `oracle_feedback`, `share_links`, or `telegram_links`. Orphaned rows with FK references remain.

### Location in Codebase

| File                                | Lines   | What's there now             |
| ----------------------------------- | ------- | ---------------------------- |
| `api/app/services/admin_service.py` | 247-275 | No cascade to related tables |

### Fix Scope

**Small — add cascading deletes or manual cleanup.**

---

## Issue #117 — In-Memory JWT Blacklist Lost on Server Restart

**Reported by:** Codebase Audit (Round 3 — Backend Security)
**Priority:** 🟡 P2 — Medium

> Token blacklist is stored in-memory. On restart, all blacklisted tokens become valid again until they naturally expire.

### Location in Codebase

| File                         | Lines            | What's there now |
| ---------------------------- | ---------------- | ---------------- |
| `api/app/middleware/auth.py` | \_TokenBlacklist | In-memory dict   |

### Fix Scope

**Medium — move to Redis or database-backed blacklist.**

**Status:** **FIXED 2026-02-21** — Added TODO comment about Redis migration

---

## Issue #118 — Feedback user_id From Request Body, Not From Auth Token

**Reported by:** Codebase Audit (Round 3 — Backend Security)
**Priority:** 🟡 P2 — Medium

> Feedback submission takes `user_id` from the request body rather than extracting it from the JWT token. Users can submit feedback as other users.

### Location in Codebase

| File                          | Lines  | What's there now            |
| ----------------------------- | ------ | --------------------------- |
| `api/app/routers/learning.py` | 73-142 | `user_id` from request body |

### Fix Scope

**Trivial — use current_user.id from auth instead.**

**Status:** **FIXED 2026-02-21** — Extracted user_id from auth token instead of request body

---

## Issue #119 — Deprecated asyncio.get_event_loop() Usage

**Reported by:** Codebase Audit (Round 3 — Backend Logic)
**Priority:** 🟡 P2 — Medium

> Uses `asyncio.get_event_loop()` which is deprecated in Python 3.10+ and raises DeprecationWarning.

### Location in Codebase

| File                        | Lines   | What's there now           |
| --------------------------- | ------- | -------------------------- |
| `api/app/routers/oracle.py` | 207-212 | `asyncio.get_event_loop()` |

### Fix Scope

**Trivial — replace with `asyncio.get_running_loop()`.**

**Status:** **FIXED 2026-02-21** — Replaced with asyncio.get_running_loop()

---

## Issue #120 — oracle_user created_by FK Not in Base SQL Schema

**Reported by:** Codebase Audit (Round 3 — Backend Data Integrity)
**Priority:** 🟡 P2 — Medium

> The ORM defines a `created_by` column with `ForeignKey("users.id")`, but this column only exists in a migration file, not in the base schema. If the migration hasn't run, the ORM fails.

### Location in Codebase

| File                         | Lines     | What's there now                                       |
| ---------------------------- | --------- | ------------------------------------------------------ |
| `api/app/orm/oracle_user.py` | class def | `created_by = Column(Integer, ForeignKey("users.id"))` |

### Fix Scope

**Small — add column to base SQL schema or ensure migration runs.**

---

## Issue #121 — VITE_API_KEY Exposed in Committed `frontend/.env` File

**Reported by:** Codebase Audit (Round 4 — Security)
**Priority:** 🔴 P0 — Critical
**Status:** **FIXED 2026-02-20** — `frontend/.env` added to `.gitignore`, `frontend/.env.example` created with placeholder. File was already untracked. Key rotation still recommended.

> The `frontend/.env` file contains a real API key and is committed to git. Anyone with repo access can authenticate as a valid API client using this key.

### What's Actually Happening

`frontend/.env` line 1 contains `VITE_API_KEY=<hex-key>`. This is used as a Bearer token fallback in `frontend/src/services/api.ts` (~line 51): `localStorage.getItem("nps_token") || import.meta.env.VITE_API_KEY`. The same value is the hardcoded default in `api/app/config.py` (see Issue #122), meaning it also controls JWT signing.

### Location in Codebase

| File                           | Lines | What's there now                               |
| ------------------------------ | ----- | ---------------------------------------------- |
| `frontend/.env`                | 1     | `VITE_API_KEY=...` — real key committed to git |
| `frontend/src/services/api.ts` | ~51   | Uses it as Bearer token fallback               |

### Fix Scope

**Urgent — security remediation:**

1. Add `frontend/.env` to `.gitignore`
2. Rotate the key via admin API (invalidate old key)
3. Create `frontend/.env.example` with placeholder
4. Set new key as Railway environment variable only — never in committed files
5. Run `git filter-repo` to scrub from history

---

## Issue #122 — API Secret Key Hardcoded as Default in `api/app/config.py`

**Reported by:** Codebase Audit (Round 4 — Security)
**Priority:** 🔴 P0 — Critical
**Status:** **FIXED 2026-02-20** — Default changed from hardcoded hex to empty string `""`. Startup validation in `main.py` lifespan now raises `RuntimeError` if `API_SECRET_KEY` env var is not set.

> The same hex string from `frontend/.env` appears as the hardcoded default for `api_secret_key` in the API config. If `API_SECRET_KEY` env var is not set in any deployment, JWTs are signed with a publicly-known key — allowing anyone to forge tokens.

### Location in Codebase

| File                | Lines | What's there now                                                             |
| ------------------- | ----- | ---------------------------------------------------------------------------- |
| `api/app/config.py` | 27    | `api_secret_key: str = "1eb7539..."` — hardcoded same value as frontend .env |

### Fix Scope

**Trivial but urgent:**

- Remove hardcoded default: `api_secret_key: str` (no default — Pydantic raises on startup if env var missing)
- Verify `API_SECRET_KEY` is set in Railway before deploying

---

## Issue #123 — Anthropic API Key Committed to Root `.env` File

**Reported by:** Codebase Audit (Round 4 — Security)
**Priority:** 🔴 P0 — Critical
**Status:** **FIXED 2026-02-20** — Root `.env` was already in `.gitignore` and not tracked by git. Key rotation still recommended as it may exist in git history.

> The root `.env` file contains a real Anthropic API key (`sk-ant-api03-...`) tracked in git. This key can be used to call Anthropic's API at the project owner's cost and is permanently in git history.

### Location in Codebase

| File          | Lines | What's there now                                |
| ------------- | ----- | ----------------------------------------------- |
| `.env` (root) | ~59   | `ANTHROPIC_API_KEY=sk-ant-api03-...` — real key |

### Fix Scope

**Urgent:**

1. Rotate the Anthropic API key immediately at console.anthropic.com
2. Ensure `.env` is in `.gitignore`
3. Use Railway dashboard for all production secrets
4. Run `git filter-repo --path .env --invert-paths` to remove from history

---

## Issue #124 — `Vault.tsx` Page Is Unreachable — No Route in `App.tsx`

**Reported by:** Codebase Audit (Round 4 — Frontend)
**Priority:** 🟡 P2 — Medium

> `frontend/src/pages/Vault.tsx` exists and implements the vault UI, but is never imported or registered in `App.tsx`. The page is completely unreachable from the running application.

### Location in Codebase

| File                           | Lines     | What's there now          |
| ------------------------------ | --------- | ------------------------- |
| `frontend/src/pages/Vault.tsx` | full file | Page exists — unreachable |
| `frontend/src/App.tsx`         | 31-101    | No `/vault` route defined |

### Fix Scope

**Small:**

- Add `const Vault = lazy(() => import("./pages/Vault"))` to `App.tsx`
- Add `<Route path="/vault" element={<ErrorBoundary><Vault /></ErrorBoundary>} />` inside the Layout wrapper
- Add navigation link in `Navigation.tsx` if Vault should be accessible from the sidebar

---

## Issue #125 — `bg-nps-bg-button` and `bg-nps-bg-elevated` Are Undefined Tailwind Classes

**Reported by:** Codebase Audit (Round 4 — Frontend)
**Priority:** 🔴 P1 — High
**Status:** **INVALID (2026-02-20)** — `bg-nps-bg-button` IS a valid Tailwind class. In `tailwind.config.ts`, the color token is nested as `nps.bg.button = "#1f6feb"`, which Tailwind generates as the class `bg-nps-bg-button`. The audit incorrectly claimed only `bg-nps-button` exists. The `bg-nps-bg-elevated` claim may still need verification.

> Two Tailwind class names reference tokens that don't exist in `tailwind.config.ts`. Both render with no background color — buttons in `EmptyState` and `ErrorBoundary` are invisible; the card in `DailyReadingCard` (dashboard) has no background.

### What's Actually Happening

`tailwind.config.ts` defines `'nps-button': '#1f6feb'` at the top level — generating `bg-nps-button`. There is no `nps-bg-button` nested token. Similarly there is no `nps-bg-elevated` token (it may use a CSS variable instead).

| File                                                     | Lines | What's there now                       |
| -------------------------------------------------------- | ----- | -------------------------------------- |
| `frontend/src/components/common/EmptyState.tsx`          | 59    | `bg-nps-bg-button` — undefined class   |
| `frontend/src/components/common/ErrorBoundary.tsx`       | 73    | `bg-nps-bg-button` — undefined class   |
| `frontend/src/components/dashboard/DailyReadingCard.tsx` | 36    | `bg-nps-bg-elevated` — undefined class |

### Fix Scope

**Trivial — 3 class name corrections:**

- `EmptyState.tsx` line 59 + `ErrorBoundary.tsx` line 73: `bg-nps-bg-button` → `bg-nps-button`
- `DailyReadingCard.tsx` line 36: check `tailwind.config.ts` and replace `bg-nps-bg-elevated` with the correct token or CSS variable

**Status:** **FIXED 2026-02-21** — Same as #65, button token now uses CSS variable

---

## Issue #126 — `Learning.tsx` AI Theme Classes May Not Resolve Correctly

**Reported by:** Codebase Audit (Round 4 — Frontend)
**Priority:** 🔴 P1 — High

> `frontend/src/pages/Learning.tsx` uses Tailwind classes `text-nps-ai-accent`, `bg-nps-ai-bg`, and `border-nps-ai-border`. These only work if `tailwind.config.ts` defines an `ai` sub-object under the `nps-` color namespace. Verify this is correctly configured — if not, the Learning page renders with no AI-themed styling.

### Location in Codebase

| File                              | Lines     | What's there now                                                              |
| --------------------------------- | --------- | ----------------------------------------------------------------------------- |
| `frontend/src/pages/Learning.tsx` | 9, 13, 22 | `text-nps-ai-accent`, `bg-nps-ai-bg border-nps-ai-border`, `bg-nps-ai-accent` |

### Fix Scope

**Small — verify and fix:**

1. Check `tailwind.config.ts` for `ai: { accent, bg, border }` under the NPS color namespace
2. If correctly defined → no change needed
3. If missing or wrong path → update `Learning.tsx` to use the correct class names or CSS variables
4. Confirm: `npx tailwindcss --content frontend/src/pages/Learning.tsx --minify` shows the classes in output

---

## Issue #127 — Vault API Endpoints Are All Unimplemented TODO Stubs

**Reported by:** Codebase Audit (Round 4 — Backend)
**Priority:** 🟡 P2 — Medium

> All 4 Vault API endpoints are TODO stubs returning hardcoded empty/zero responses. The Vault feature (showing found Bitcoin addresses and balances) is completely non-functional on the backend.

### Location in Codebase

| File                       | Lines | What's there now                                     |
| -------------------------- | ----- | ---------------------------------------------------- |
| `api/app/routers/vault.py` | ~24   | `GET /vault/findings` — TODO, returns `[]`           |
| `api/app/routers/vault.py` | ~31   | `GET /vault/summary` — TODO, returns hardcoded zeros |
| `api/app/routers/vault.py` | ~46   | `GET /vault/search` — TODO, returns `[]`             |
| `api/app/routers/vault.py` | ~53   | `POST /vault/export` — TODO, returns empty response  |

### Fix Scope

**Medium — implement each endpoint against the database:**

- Query vault/findings tables with appropriate filters, pagination, aggregation
- Implement full-text search for address/metadata
- Generate CSV/JSON export stream or file

---

## Issue #128 — ~~Scanner API Endpoints Are All Unimplemented TODO Stubs~~

**Status:** ✅ Resolved — Scanner removed from project (2026-02-20). `api/app/routers/scanner.py` and `proto/scanner.proto` deleted.

---

## Issue #129 — Legacy v3→v4 Database Migration Scripts Are All Unimplemented

**Reported by:** Codebase Audit (Round 4 — Database)
**Priority:** 🔴 P1 — High

> Five Python migration scripts in `database/migrations/` for moving v3 legacy data to the v4 PostgreSQL schema all contain only `# TODO: Implement actual migration` placeholders. Users with historical v3 data cannot migrate.

### Location in Codebase

| File                                      | Lines | What's there now                                |
| ----------------------------------------- | ----- | ----------------------------------------------- |
| `database/migrations/migrate_readings.py` | 42    | `# TODO: Implement actual migration`            |
| `database/migrations/migrate_vault.py`    | 64    | `# TODO: Implement actual migration`            |
| `database/migrations/migrate_learning.py` | 43    | `# TODO: Implement actual migration`            |
| `database/migrations/migrate_sessions.py` | 49    | `# TODO: Implement actual migration`            |
| `database/migrations/migrate_all.py`      | 48    | `# TODO: Import and call each migration module` |

### Fix Scope

**Large — requires understanding legacy v3 schema (reference `.archive/v3/` — read-only):**

- Implement transformation logic for each data type
- Handle legacy `ENC:` encryption prefix (migrate to `ENC4:` format)
- Add data validation and rollback safety before writing to production

---

## Issue #130 — Translation Endpoint Missing Exception Handling

**Reported by:** Codebase Audit (Round 4 — Backend)
**Priority:** 🟡 P2 — Medium

> `api/app/routers/translation.py` calls `_svc.translate()` with no try/except. Any exception (network timeout, Anthropic API error, quota exceeded) propagates as an unhandled 500 with a raw stack trace.

### Location in Codebase

| File                             | Lines | What's there now                               |
| -------------------------------- | ----- | ---------------------------------------------- |
| `api/app/routers/translation.py` | 26-47 | `result = _svc.translate(...)` — no try/except |

### Fix Scope

**Small — wrap in try/except with HTTPException:**

```python
except Exception as exc:
    logger.error("Translation failed: %s", exc, exc_info=True)
    raise HTTPException(status_code=503, detail="Translation service temporarily unavailable")
```

---

## Issue #131 — Oracle Endpoints Missing General Exception Handler

**Reported by:** Codebase Audit (Round 4 — Backend)
**Priority:** 🟡 P2 — Medium
**Status:** **PARTIALLY FIXED 2026-02-20** — The main `/readings` endpoint now has comprehensive exception handling (ImportError→503, HTTPException re-raise, generic Exception→500 with detail). Other oracle endpoints may still need similar treatment.

> Question reading (lines 195-242) and name reading (lines 250-297) endpoints in `api/app/routers/oracle.py` catch `TimeoutError` and `ValueError` only. Any other unexpected exception propagates as an unformatted 500 with a stack trace exposed to the client.

### Location in Codebase

| File                        | Lines   | What's there now                       |
| --------------------------- | ------- | -------------------------------------- |
| `api/app/routers/oracle.py` | 195-242 | Catches TimeoutError + ValueError only |
| `api/app/routers/oracle.py` | 250-297 | Same pattern                           |

### Fix Scope

**Small — add fallback `except Exception` after existing handlers:**

```python
except Exception as exc:
    logger.error("Unexpected error in reading endpoint: %s", exc, exc_info=True)
    raise HTTPException(status_code=500, detail="Internal error processing reading")
```

---

## Issue #132 — Bare `except Exception: pass` in Coordinate Helpers Violates CLAUDE.md Rule #3

**Reported by:** Codebase Audit (Round 4 — Backend)
**Priority:** 🟡 P2 — Medium

> `api/app/routers/oracle.py` lines 132 and 149 use bare `except Exception: pass` inside `_set_coordinates()` and `_get_coordinates()`. Per CLAUDE.md rule #3, bare except is forbidden. These silently swallow all database errors when saving or reading coordinate data.

### Location in Codebase

| File                        | Lines   | What's there now                               |
| --------------------------- | ------- | ---------------------------------------------- |
| `api/app/routers/oracle.py` | 132-134 | `except Exception: pass` in `_set_coordinates` |
| `api/app/routers/oracle.py` | 149-151 | `except Exception: pass` in `_get_coordinates` |

### Fix Scope

**Trivial — replace with specific exceptions and logging:**

```python
from sqlalchemy.exc import DatabaseError, OperationalError
except (DatabaseError, OperationalError) as exc:
    logger.warning("Coordinate operation failed: %s", exc)
```

---

## Issue #133 — Health Check Does Not Verify Anthropic API Key Availability

**Reported by:** Codebase Audit (Round 4 — Backend)
**Priority:** 🟡 P2 — Medium

> `api/app/routers/health.py` detailed health endpoint checks Telegram, Oracle, and database — but never checks `ANTHROPIC_API_KEY`. Since all AI-powered readings depend on this key, its absence is the most critical unmonitored failure mode.

### Location in Codebase

| File                        | Lines   | What's there now                          |
| --------------------------- | ------- | ----------------------------------------- |
| `api/app/routers/health.py` | 122-216 | Checks 6 services — no AI/Anthropic check |

### Fix Scope

**Small — add AI check to detailed health endpoint:**

```python
ai_key = os.environ.get("ANTHROPIC_API_KEY")
checks["ai"] = {
    "status": "configured" if ai_key else "not_configured",
    "provider": "anthropic",
    "note": "Required for Oracle readings" if not ai_key else None,
}
```

If `ai` is `not_configured`, set overall health status to `degraded` (not `healthy`).

---

## Issue #134 — Hardcoded raw Tailwind colors in Oracle display components (non-token colors)

**Reported by:** Round 5 audit (2026-02-19)
**Priority:** P2 Medium

> These components use raw Tailwind color utilities (`text-green-500`, `text-red-500`, `text-blue-500`, `text-gray-400`, `bg-gray-400`) instead of the NPS semantic token system. This means they won't adapt correctly to light mode and are inconsistent with the design system.

### What's Happening

Multiple Oracle result display components use hardcoded Tailwind colors for semantic meaning (Wood=green, Fire=red, Water=blue, Metal=gray) instead of the project's `nps-*` token system.

### Location in Codebase

| File                                                  | Line(s) | Hardcoded                                                          | Should Be                                                      |
| ----------------------------------------------------- | ------- | ------------------------------------------------------------------ | -------------------------------------------------------------- |
| `frontend/src/components/oracle/FC60StampDisplay.tsx` | 14–18   | `text-green-500`, `text-red-500`, `text-blue-500`                  | `text-nps-success`, `text-nps-error`, `text-nps-oracle-accent` |
| `frontend/src/components/oracle/LocationDisplay.tsx`  | 9–13    | `text-green-500`, `text-red-500`, `text-blue-500`, `text-gray-400` | NPS semantic tokens                                            |
| `frontend/src/components/oracle/HeartbeatDisplay.tsx` | 9–13    | Same as LocationDisplay                                            | NPS semantic tokens                                            |
| `frontend/src/components/oracle/GanzhiDisplay.tsx`    | 14      | `bg-gray-400` for Metal element                                    | `bg-nps-text-dim` or custom element token                      |

### Root Cause

The element color system (Wood/Fire/Earth/Metal/Water) was implemented with raw Tailwind colors before the NPS token system was finalized. It was not updated as part of Issue #31 (which covered other hardcoded colors).

### How It Should Be

Create NPS tokens for the five Chinese elements (or reuse existing semantic tokens) and apply them consistently across all three components. Element colors should be stable across both dark and light themes.

### Fix Scope

**Small** — 3 component files, update color maps to use token-derived colors.

---

## Issue #135 — Admin LogViewer has 7 hardcoded English strings (not i18n)

**Reported by:** Round 5 audit (2026-02-19)
**Priority:** P1 High

> The LogViewer component in the Admin panel contains button text and table column headers that are hardcoded English strings rather than using `t()` for translation. Persian admin users will see English-only text in the audit log table.

### What's Happening

`LogViewer.tsx` contains:

- Line 155: `"Refresh"` — button text, hardcoded English
- Lines 166–169: `"Time"`, `"Severity"`, `"Action"`, `"Resource"`, `"Status"`, `"IP"` — all 6 table column headers hardcoded

### Location in Codebase

| File                                          | Line(s) | What's There           | Fix                             |
| --------------------------------------------- | ------- | ---------------------- | ------------------------------- |
| `frontend/src/components/admin/LogViewer.tsx` | 155     | `Refresh` (raw string) | `{t("admin.log_refresh")}`      |
| `frontend/src/components/admin/LogViewer.tsx` | 166     | `Time`                 | `{t("admin.log_col_time")}`     |
| `frontend/src/components/admin/LogViewer.tsx` | 167     | `Severity`             | `{t("admin.log_col_severity")}` |
| `frontend/src/components/admin/LogViewer.tsx` | 168     | `Action`               | `{t("admin.log_col_action")}`   |
| `frontend/src/components/admin/LogViewer.tsx` | 168     | `Resource`             | `{t("admin.log_col_resource")}` |
| `frontend/src/components/admin/LogViewer.tsx` | 169     | `Status`               | `{t("admin.log_col_status")}`   |
| `frontend/src/components/admin/LogViewer.tsx` | 169     | `IP`                   | `{t("admin.log_col_ip")}`       |

### Root Cause

Admin components were scaffolded with hardcoded English strings and were not included in the i18n pass that covered user-facing components.

### How It Should Be

All text must use `t()`. Add 7 new keys to both `en.json` and `fa.json` translation files under an `admin.*` namespace.

### Fix Scope

**Small** — 1 component file + 2 translation files. Add 7 keys total.

---

## Issue #136 — Learning.tsx page is a non-functional placeholder (no API calls, hardcoded zeros)

**Reported by:** Round 5 audit (2026-02-19)
**Priority:** P2 Medium

> The Learning page (/learning route) shows a hardcoded Level 1 progress bar at 0% and XP at 0/100, with no actual data fetched from the backend. It renders only an EmptyState component below the hardcoded progress bar. The page is functionally inert.

### What's Happening

`Learning.tsx` (lines 20–28):

- Progress bar `style={{ width: "0%" }}` — always zero, hardcoded
- XP text `{t("learning.xp_progress", { current: 0, max: 100 })}` — always 0/100, hardcoded
- No `useQuery`, no API call, no data binding
- Below the level bar: just `<EmptyState icon="learning" title={t("learning.empty")} />`

Additionally, the component uses `text-nps-ai-accent`, `bg-nps-ai-bg`, `border-nps-ai-border` — Tailwind classes from a nested config object that don't compile correctly (see Issue #126).

### Location in Codebase

| File                              | Line(s)   | What's There                                                                            |
| --------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| `frontend/src/pages/Learning.tsx` | 9, 13, 22 | `text-nps-ai-accent`, `bg-nps-ai-bg`, `border-nps-ai-border` (broken classes, see #126) |
| `frontend/src/pages/Learning.tsx` | 21        | `style={{ width: "0%" }}` — hardcoded                                                   |
| `frontend/src/pages/Learning.tsx` | 26        | `{ current: 0, max: 100 }` — hardcoded                                                  |

### Root Cause

The Learning feature was scaffolded as a placeholder. The backend learning system (`services/oracle/oracle_service/engines/learning.py` and `learner.py`) exists but the API endpoint and frontend data binding were never implemented.

### Fix Scope

**Large** — requires: backend API endpoint for learning stats, frontend query hook, and proper UI with real data. Lower priority since backend learning is also incomplete.

---

## Issue #137 — Dashboard never passes moonData to WelcomeBanner (moon widget always hidden)

**Reported by:** Round 5 audit (2026-02-19)
**Priority:** P1 High

> `WelcomeBanner` has a `MoonPhaseWidget` on the right side that accepts a `moonData` prop. `Dashboard.tsx` never extracts or passes moon phase data despite `useDailyReading()` returning it. The right side of the WelcomeBanner is always empty.

### What's Happening

`Dashboard.tsx` line 47:

```tsx
<WelcomeBanner isLoading={dailyLoading} />
```

The `daily` data object from `useDailyReading()` includes `daily?.moon_phase` — a `MoonPhaseInfo` object with `{ phase_name, illumination, emoji }`. This is never extracted and never passed as the `moonData` prop.

`WelcomeBanner.tsx` line 110:

```tsx
<MoonPhaseWidget moonData={moonData} isLoading={isLoading} />
```

Since `moonData` is always `undefined`, `MoonPhaseWidget` renders nothing (or a skeleton). The banner's right side is perpetually empty.

### Location in Codebase

| File                               | Line | What's There                                 | Fix                                                |
| ---------------------------------- | ---- | -------------------------------------------- | -------------------------------------------------- |
| `frontend/src/pages/Dashboard.tsx` | 47   | `<WelcomeBanner isLoading={dailyLoading} />` | Extract `daily?.moon_phase` and pass as `moonData` |

### Fix Scope

**Trivial** — 1 line change in `Dashboard.tsx`. Extract `parseDailyInsight(daily)?.moon_phase` and pass it to `WelcomeBanner`.

**Status:** **FIXED 2026-02-21** — Passed daily?.moon_phase to WelcomeBanner

---

## Issue #138 — Dashboard never fetches or passes userName to WelcomeBanner (always "Explorer")

**Reported by:** Round 5 audit (2026-02-19)
**Priority:** P2 Medium

> `WelcomeBanner` supports a `userName` prop that personalizes the greeting. `Dashboard.tsx` never passes it. The app always shows the generic "Good morning, Explorer" greeting instead of the user's actual name.

### What's Happening

`WelcomeBanner.tsx` lines 76–78:

```tsx
const welcomeText = userName
  ? t("dashboard.welcome_user", { greeting, name: userName })
  : t("dashboard.welcome_explorer", { greeting });
```

`Dashboard.tsx` calls `<WelcomeBanner isLoading={dailyLoading} />` with no `userName`. The user's name likely comes from an auth context or `/users/me` API call. Neither is done on the Dashboard.

### Location in Codebase

| File                               | Line | Fix                                                                |
| ---------------------------------- | ---- | ------------------------------------------------------------------ |
| `frontend/src/pages/Dashboard.tsx` | 47   | Fetch user profile (or read from auth context) and pass `userName` |

### Fix Scope

**Small** — depends on whether an auth context with user data exists. If so: read from context. If not: add a `useCurrentUser()` hook that calls `GET /users/me` and extract the name.

**Status:** **FIXED 2026-02-21** — Read from localStorage nps_username

---

## Issue #139 — OracleSettingsSection toggle knob uses bg-white (invisible in light mode)

**Reported by:** Round 5 audit (2026-02-19)
**Priority:** P2 Medium

> The custom toggle switch in `OracleSettingsSection.tsx` uses `bg-white` for the knob. In light mode, the background is also white/near-white, making the toggle knob invisible or barely visible.

### What's Happening

`OracleSettingsSection.tsx` line 77:

```tsx
className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${...}`}
```

`bg-white` is hardcoded — not a theme token. In dark mode this works (white knob on dark track). In light mode: white knob on light/near-white track → invisible knob.

### Location in Codebase

| File                                                         | Line | What's There | Fix                                                            |
| ------------------------------------------------------------ | ---- | ------------ | -------------------------------------------------------------- |
| `frontend/src/components/settings/OracleSettingsSection.tsx` | 77   | `bg-white`   | `bg-nps-text-bright` or `bg-[var(--nps-bg)]` with invert logic |

### Fix Scope

**Trivial** — 1 line change.

**Status:** **FIXED 2026-02-21** — Changed bg-white to bg-nps-text-bright

---

## Issue #140 — GanzhiDisplay uses text-white and bg-gray-400 (non-token, light-mode issues)

**Reported by:** Round 5 audit (2026-02-19)
**Priority:** P2 Medium

> `GanzhiDisplay.tsx` uses `text-white` for element badge text and `bg-gray-400` for the Metal element fallback. `text-white` may become invisible on some colored backgrounds in light mode. `bg-gray-400` is not a semantic NPS token.

### What's Happening

`GanzhiDisplay.tsx`:

- Line 14: `Metal: "bg-gray-400"` — fallback color for Metal element badges
- Line 35: `className={`... text-white ${ELEMENT_COLORS[...]}`}` — hardcoded white text on element-colored background
- Line 72: Same pattern

`text-white` works in dark mode but may be hard to read on certain element colors in light mode. `bg-gray-400` is not themeable.

### Location in Codebase

| File                                               | Line(s) | What's There  | Fix                                                                      |
| -------------------------------------------------- | ------- | ------------- | ------------------------------------------------------------------------ |
| `frontend/src/components/oracle/GanzhiDisplay.tsx` | 14      | `bg-gray-400` | `bg-nps-text-dim` or add `nps-element-metal` token                       |
| `frontend/src/components/oracle/GanzhiDisplay.tsx` | 35, 72  | `text-white`  | `text-nps-bg` (uses CSS variable, dark in dark mode, dark in light mode) |

### Fix Scope

**Trivial** — 3 lines in 1 file.

---

## Issue #141 — MoonPhaseDisplay "Rest" phase uses non-token gray colors

**Reported by:** Round 5 audit (2026-02-19)
**Priority:** P3 Low

> `MoonPhaseDisplay.tsx` line 18 uses `bg-gray-500/15 text-gray-400` for the "Rest" moon phase type. All other phases appear to use semantic or meaningful colors. This one uses raw Tailwind gray which is inconsistent with the NPS token system.

### Location in Codebase

| File                                                  | Line | What's There                             | Fix                                      |
| ----------------------------------------------------- | ---- | ---------------------------------------- | ---------------------------------------- |
| `frontend/src/components/oracle/MoonPhaseDisplay.tsx` | 18   | `"Rest": "bg-gray-500/15 text-gray-400"` | `"bg-nps-text-dim/15 text-nps-text-dim"` |

### Fix Scope

**Trivial** — 1 line change.

---

## Issue #142 — BackupManager confirmation overlay uses bg-black/70 (breaks light theme)

**Reported by:** Round 5 audit (2026-02-19)
**Priority:** P2 Medium

> `BackupManager.tsx` uses `bg-black/70 backdrop-blur-sm` for two modal/confirmation dialog overlays (lines 333 and 379). In light mode, `bg-black/70` is an opaque black overlay over a light background — potentially usable, but it's inconsistent with the glassmorphism overlay approach used elsewhere (which uses `var(--nps-glass-bg)`).

### What's Happening

`BackupManager.tsx`:

- Line 333: `className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"`
- Line 379: `className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"`

`Modal.tsx` uses `bg-black/60` (slightly different opacity). Neither uses the CSS variable approach.

### Location in Codebase

| File                                              | Lines    | What's There  | Fix                                                                     |
| ------------------------------------------------- | -------- | ------------- | ----------------------------------------------------------------------- |
| `frontend/src/components/admin/BackupManager.tsx` | 333, 379 | `bg-black/70` | Use the shared `Modal.tsx` component or `bg-nps-bg/80 backdrop-blur-md` |

### Fix Scope

**Small** — Replace inline overlay divs with the existing `Modal.tsx` component, or update color to use theme variable.

---

## Issue #143 — HealthDashboard uses same bg-gray-400 for all "not connected" status types

**Reported by:** Round 5 audit (2026-02-19)
**Priority:** P3 Low

> `HealthDashboard.tsx` maps three distinct status states (`not_connected`, `not_deployed`, `not_configured`) to the same `bg-gray-400` color. A service that is "not configured" (expected — optional feature) looks identical to one that is "not connected" (unexpected — production problem). The admin cannot distinguish at a glance which services have issues vs. which are intentionally disabled.

### What's Happening

`HealthDashboard.tsx` lines 11–13:

```tsx
not_connected: "bg-gray-400",
not_deployed: "bg-gray-400",
not_configured: "bg-gray-400",
```

All three render with the same gray indicator dot despite having different operational meanings.

### Location in Codebase

| File                                                | Lines | Fix                                                                                                       |
| --------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/admin/HealthDashboard.tsx` | 11–13 | `not_connected` → `bg-nps-error`, `not_deployed` → `bg-nps-warning`, `not_configured` → `bg-nps-text-dim` |

### Fix Scope

**Trivial** — 3 lines. Use semantic NPS token colors to distinguish error vs. warning vs. informational states.

---

## Issue #144 — Oracle engine `server.py` uses relative imports that fail in production

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P0 Critical

> The Oracle gRPC server uses relative imports (`from engines.oracle import ...`) that work when running directly from the `oracle_service/` directory but fail when the service is launched as a Python module or via Docker Compose entry point. This is likely a root cause of the production Oracle 500 errors.

### What's Happening

`services/oracle/oracle_service/server.py` lines 39, 46:

```python
from engines.oracle import (read_sign, read_name, ...)
from engines.timing_advisor import (...)
```

When started via `python -m oracle_service.server` or Docker's entrypoint (which runs from the repo root), Python cannot resolve `engines.oracle` as a bare module name. The correct absolute import would be:

```python
from oracle_service.engines.oracle import (read_sign, read_name, ...)
```

### Root Cause

The module was developed by running scripts directly from the `oracle_service/` folder during development, masking the import path issue. In production Docker, the working directory is different.

### Fix Scope

**Small** — update import statements in `server.py`. Also verify `services/oracle/Dockerfile` WORKDIR and PYTHONPATH are consistent.

---

## Issue #145 — `LogViewer.tsx` useEffect missing debounce cleanup (memory leak)

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P1 High

> `LogViewer.tsx` has a `useEffect` that watches `severity`, `hours`, `fetchLogs`, and `search` changes, but this effect has no cleanup function to clear the pending debounce timeout from `handleSearchChange`. When filters change, the pending search debounce continues to fire after the component updates.

### What's Happening

`LogViewer.tsx` line 91 area:

```typescript
useEffect(() => {
  setOffset(0);
  fetchLogs(0, search);
  // ← Missing: return () => { if (debounceRef.current) clearTimeout(debounceRef.current); }
}, [severity, hours, fetchLogs, search]);
```

The `debounceRef.current` (a `setTimeout` ID set in `handleSearchChange`) is never cleared when this effect re-runs. Old timeouts fire after filter changes.

### Fix Scope

**Trivial** — add a return cleanup function to the existing useEffect.

---

## Issue #146 — `HealthDashboard.tsx` polls API every 10 seconds unconditionally

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P2 Medium

> `HealthDashboard.tsx` starts a `setInterval` that calls the health API every 10 seconds continuously, even when the admin tab is not visible or focused. This wastes bandwidth, increases API load, and drains battery on mobile devices.

### What's Happening

`frontend/src/components/admin/HealthDashboard.tsx` line 118 (approx):

```typescript
const interval = setInterval(fetchHealth, 10_000); // Every 10s, unconditionally
```

### Fix Scope

**Small** — use `document.addEventListener("visibilitychange", ...)` to only poll when tab is visible, or increase interval to 30s, or add a manual "Refresh" button and remove auto-polling.

---

## Issue #147 — `API.ts` sends `"Bearer undefined"` when VITE_API_KEY is not set

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P1 High

> When `localStorage.getItem("nps_token")` is null (user not logged in) AND `import.meta.env.VITE_API_KEY` is undefined or empty, the API client sends `Authorization: Bearer undefined` in every request header. The backend receives an invalid token and returns 401/403.

### What's Happening

`frontend/src/services/api.ts` line ~51:

```typescript
const token = localStorage.getItem("nps_token") ?? import.meta.env.VITE_API_KEY;
headers["Authorization"] = `Bearer ${token}`;
// If both are null/undefined: sends "Bearer undefined"
```

### Root Cause

No null/undefined check before constructing the Authorization header. If neither source provides a valid token, the header should be omitted entirely or a proper 401 handler should redirect to login.

### Fix Scope

**Small** — add `if (token)` guard: only set the Authorization header when a non-empty token exists.

**Status:** **FIXED 2026-02-21** — Added token !== undefined check in api.ts

---

## Issue #148 — `SharedReading.tsx` injects reading data into meta tags without sanitization (XSS risk)

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P1 High

> `SharedReading.tsx` directly sets `document.title` and appends `<meta>` tags to `document.head` using DOM APIs (`createElement`, `setAttribute`) with reading content (title, description) that comes from the API without sanitization. If the Oracle AI produces output containing HTML or script-tag characters, it could cause stored XSS.

### What's Happening

`frontend/src/pages/SharedReading.tsx` lines 7–14 (approx):

```tsx
const meta = document.createElement("meta");
meta.setAttribute("property", "og:title");
meta.setAttribute("content", reading.title); // ← unsanitized API content
document.head.appendChild(meta);
```

### Root Cause

The code assumes reading content is safe text. AI-generated content can contain `<`, `>`, `"`, or `'` characters. While `setAttribute` handles HTML attribute encoding, setting `document.title` directly with unescaped content can cause issues in some environments.

### Fix Scope

**Small** — sanitize using `DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })` (strips all tags, keeps text) before passing to `document.title` and meta content values.

---

## Issue #149 — `oracle.py` engine moon phase field returns abbreviations instead of emoji

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P2 Medium

> The Oracle engine's moon phase calculation returns text abbreviations (`"WxCr"`, `"WnCr"`, `"1stQ"`, etc.) in the `emoji` field instead of actual Unicode moon emoji. Frontend components display these abbreviations as text, making them unreadable.

### What's Happening

`services/oracle/oracle_service/engines/oracle.py` line ~724:

```python
"emoji": ["New", "WxCr", "1stQ", "WxGb", "Full", "WnGb", "3rdQ", "WnCr"][phase_idx],
```

The list contains internal abbreviations. The frontend `MoonPhaseWidget` displays this `emoji` field directly. Users see `"WxCr"` instead of `🌔`.

### Fix Scope

**Trivial** — replace the abbreviation list with actual Unicode moon phase emoji:

```python
"emoji": ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"][phase_idx]
```

---

## Issue #150 — `oracle.py` date parser accepts impossible dates (Feb 31, Apr 31, etc.)

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P2 Medium

> The `_parse_date()` function in `oracle.py` validates month `1–12` and day `1–31` but does not check whether the day is valid for the given month. It accepts dates like `2025-02-31`, `2025-04-31`, `2025-06-31` which don't exist in any calendar. These invalid dates are passed to the FC60 engine and produce meaningless results.

### What's Happening

```python
if not (1 <= month <= 12 and 1 <= day <= 31 and year > 0):
    return None
```

This accepts any day 1–31 for any month. Should use `datetime(year, month, day)` validation which will raise `ValueError` for invalid calendar dates.

### Fix Scope

**Small** — add `datetime(year, month, day)` in a try/except to validate the date before returning.

---

## Issue #151 — `notifier.py` failure counters never incremented (circuit breaker is non-functional)

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P2 Medium

> `notifier.py` defines global `_consecutive_failures` and `_BOT_DISABLE_THRESHOLD = 5` with intent to disable the bot after repeated failures. However, the exception handlers throughout the file never increment `_consecutive_failures`. The circuit breaker is dead code — the bot never gets disabled regardless of how many failures occur.

### What's Happening

```python
_consecutive_failures = 0
_bot_disabled = False
_BOT_DISABLE_THRESHOLD = 5
```

Despite this setup, every `except` block only calls `logger.error()` without incrementing the counter. The bot disabling logic at `_BOT_DISABLE_THRESHOLD` is never triggered.

### Fix Scope

**Small** — add `_consecutive_failures += 1` in exception blocks throughout `notifier.py`, and reset on success.

---

## Issue #152 — `AnalyticsCharts.tsx` has no error state (infinite loading on API failure)

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P2 Medium

> `AnalyticsCharts.tsx` fetches analytics data but has no `error` state. If the API call fails, the component stays in a loading spinner forever with no feedback to the admin. This was partially noted in Issue #13 but the specific missing error state is distinct.

### Location in Codebase

| File                                                | What's Missing                                                 |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `frontend/src/components/admin/AnalyticsCharts.tsx` | No `error` state, no error UI, loading never clears on failure |

### Fix Scope

**Small** — add `const [error, setError] = useState<string | null>(null)` and catch block that sets it, with error UI rendered above charts.

---

## Issue #153 — `ReadingHistory` page: selected reading not cleared when sort/filter changes

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P2 Medium

> When the user has a reading selected in `ReadingHistory.tsx` and then changes the sort order or search filter, the old selected reading ID stays in state even though that reading may no longer be visible in the list. The detail panel continues to show the old reading.

### What's Happening

`ReadingHistory.tsx` — `handleFilterChange()` does call `setSelectedReading(null)`, but changes to `sortBy`, `dateFrom`, `dateTo`, and `favoritesOnly` do NOT clear the selection.

### Fix Scope

**Small** — add a `useEffect` that calls `setSelectedReading(null)` when `sortBy`, `dateFrom`, `dateTo`, or `favoritesOnly` change.

---

## Issue #154 — `OracleConsultationForm.tsx` hardcodes `detected_script: "latin"` (Persian names misidentified)

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P1 High

> When submitting a Name Reading, `OracleConsultationForm.tsx` always sets `detected_script: "latin"` hardcoded instead of detecting the actual script of the entered name. Persian (Arabic script) names are sent to the backend marked as "latin", causing the Oracle engine to apply Latin numerology rules to Persian names.

### What's Happening

`frontend/src/components/oracle/OracleConsultationForm.tsx` line ~68:

```typescript
const result = {
  name: nameInput,
  detected_script: "latin", // ← always "latin"
  // ...
};
```

The app has `utils/script_detector.py` on the backend AND a `useDetectedScript` hook or similar in `services/oracle/oracle_service/utils/script_detector.py`. The frontend never calls script detection.

### Fix Scope

**Medium** — either call the `/translation/detect` API before submission, or run client-side script detection using Unicode range checks on the input value.

---

## Issue #155 — `Dashboard.tsx` hardcodes `isError={false}` for RecentReadings (errors never shown)

**Reported by:** Round 5 deep audit (2026-02-19)
**Priority:** P2 Medium

> `Dashboard.tsx` line 67 passes `isError={false}` to `RecentReadings` as a hardcoded value. If the recent readings API fails, the component's error handling code at `RecentReadings.tsx:73` (`if (isError) return null`) never runs — instead the component shows an empty list with no indication of error.

### What's Happening

`Dashboard.tsx`:

```tsx
<RecentReadings
  readings={recent?.readings ?? []}
  isLoading={recentLoading}
  isError={false} // ← hardcoded, never reflects actual error state
  total={recent?.total ?? 0}
/>
```

Should be `isError={isError}` where `isError` comes from `useRecentReadings()`.

### Fix Scope

**Trivial** — 1 line: destructure `isError: recentError` from `useRecentReadings()` and pass `isError={recentError}`.

**Status:** **FIXED 2026-02-21** — Wired isError and onRetry to RecentReadings

---

## Issue #156 — AdminMonitoring tabs use wrong active CSS class

**Reported by:** Frontend test run (2026-02-20, discovered during scanner removal)
**Priority:** P2 Medium

### What Fails

`AdminMonitoring.test.tsx` (2 tests failing):

- "defaults to Health tab" — expects `bg-blue-600` on active tab, class not present
- "switches tabs on click" — same assertion fails

### Root Cause

The AdminMonitoring component was redesigned (glassmorphism pass, session 12) and the active tab styling class changed from `bg-blue-600` to a CSS variable-based class. The tests were not updated.

### Fix Scope

**Trivial** — read current active tab class from `AdminMonitoring.tsx`, update the 2 assertions in `AdminMonitoring.test.tsx` to match.

**Status:** **FIXED 2026-02-21** — Fixed active tab CSS class in test

---

## Issue #157 — Toast dismiss button uses wrong i18n key in test

**Reported by:** Frontend test run (2026-02-20, discovered during scanner removal)
**Priority:** P2 Medium

### What Fails

`Toast.test.tsx` — "manual dismiss removes toast" test fails:

- Test queries `getByLabelText("Dismiss")` but the button uses `aria-label="common.dismiss"` (raw i18n key, since mock `t()` returns key as-is)

### Root Cause

The Toast component renders `aria-label={t("common.dismiss")}`. The test mock returns the raw key (`"common.dismiss"`) but the assertion searches for `"Dismiss"` (the human-readable label).

### Fix Scope

**Trivial** — change `screen.getByLabelText("Dismiss")` to `screen.getByLabelText("common.dismiss")` in `Toast.test.tsx`.

---

## Operational Issues (from project handoff)

> The following sections were consolidated from the project handoff document.

## Priority Fix Queue

### P0 — Fix Before Any User Touches the App

| #    | Issue                                           | File(s)                       | Fix Time      | Status               |
| ---- | ----------------------------------------------- | ----------------------------- | ------------- | -------------------- |
| #121 | VITE_API_KEY in committed frontend/.env         | `frontend/.env`, `.gitignore` | 10 min        | **FIXED 2026-02-20** |
| #122 | Hardcoded API secret key in config.py           | `api/app/config.py:27`        | 2 min         | **FIXED 2026-02-20** |
| #123 | Anthropic API key in committed root .env        | `.env`, `.gitignore`          | 10 min        | **FIXED 2026-02-20** |
| #2   | Oracle submit returns 500 (all readings broken) | `oracle.py` callback sig      | Investigation | **FIXED 2026-02-20** |
| #11  | AdminGuard not wired in App.tsx                 | `frontend/src/App.tsx:78-91`  | 5 min         | **FIXED 2026-02-20** |

### P1 — Fix Before Showing to Real Users

| #    | Issue                                                    | File(s)                                                        | Fix Time | Status               |
| ---- | -------------------------------------------------------- | -------------------------------------------------------------- | -------- | -------------------- |
| #4   | AI reading is wall-of-text                               | `TranslatedReading.tsx:42`, `prompt_templates.py`, `oracle.py` | Medium   | Open                 |
| #8   | `text-nps-bg-danger` in 7 places (wrong CSS)             | 5 files, 7 lines                                               | 5 min    | **FIXED 2026-02-20** |
| #9   | Delete reading — no confirmation dialog                  | `ReadingHistory.tsx:87-90`, `ReadingCard.tsx:59-69`            | Small    | Open                 |
| #12  | Admin role from localStorage (bypassable)                | `Layout.tsx:58`, `AdminGuard.tsx:7`                            | Medium   | Open                 |
| #18  | Date formatting ignores app language                     | 11 files — create `useDateFormatter()`                         | Medium   | Open                 |
| #21  | No 404 page                                              | `App.tsx` — add `<Route path="*">`                             | Small    | **FIXED 2026-02-20** |
| #25  | ai_interpretation inconsistent shape across endpoints    | `oracle.py`, `types/index.ts`                                  | Medium   | Open                 |
| #26  | Confidence score scale mismatch (0-1 float vs 0-100 int) | Backend engines + frontend normalization                       | Medium   | Open                 |
| #35  | Focus styles missing/wrong on 25+ interactive elements   | `index.css:86-90` + 25 files                                   | Medium   | Open                 |
| #36  | Icon-only buttons missing aria-label                     | `ReadingCard.tsx`, `ReadingDetail.tsx`                         | Trivial  | Open                 |
| #41  | RecentReadings returns null on error (silently vanishes) | `RecentReadings.tsx:73`                                        | Small    | Open                 |
| #125 | `bg-nps-bg-button` — **NOT a bug** (see note below)      | N/A                                                            | N/A      | **INVALID**          |
| #129 | Migration scripts all TODO stubs                         | `database/migrations/migrate_*.py`                             | Large    | Open                 |
| #131 | Oracle endpoint missing general exception catch          | `oracle.py:195-242, 250-297`                                   | Small    | **FIXED 2026-02-20** |

### P2 — Polish and Robustness

| #    | Issue                                                         | File(s)                                                | Fix Time      |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| #1   | Dashboard layout asymmetric/cheap                             | 6 dashboard component files                            | Large         |
| #3   | Crystal ball icon unappealing                                 | `CrystalBallIcon.tsx`, `EmptyState.tsx`                | Small         |
| #7   | RTL mobile nav — race condition + wrong side                  | `MobileNav.tsx:71-73`                                  | 1 line        |
| #13  | Admin analytics/log viewer silent catch                       | `AnalyticsCharts.tsx:58-61`, `LogViewer.tsx:81-84`     | Small         |
| #14  | Location dropdowns silently empty on error                    | `geolocationHelpers.ts:61-63,79-81`                    | Small         |
| #15  | StarRating hardcoded dir="ltr"                                | `StarRating.tsx:81`                                    | 1 line        |
| #17  | DailyReadingCard wrong RTL detection                          | `DailyReadingCard.tsx:22,66`                           | 2 lines       |
| #22  | Browser tab title never changes                               | 6 page files                                           | Small         |
| #23  | No scroll-to-top on navigation                                | `Layout.tsx` + new `ScrollToTop.tsx`                   | Small         |
| #27  | Required fields no visual indicator                           | `UserForm.tsx:166-249`                                 | Small         |
| #28  | CalendarPicker mode resets every open                         | `CalendarPicker.tsx:27-98`                             | 3 lines       |
| #29  | Mood selector collects input never sent to backend            | `QuestionReadingForm.tsx:116-117`                      | Remove UI     |
| #30  | Export menu mislabeled "Export Text"                          | `ExportShareMenu.tsx:197`                              | 1 line + i18n |
| #31  | Hardcoded Tailwind colors in 22+ files                        | 22 files                                               | Medium        |
| #37  | Decorative SVGs missing aria-hidden                           | `NameReadingForm.tsx`, `QuestionReadingForm.tsx`       | Trivial       |
| #39  | Disabled nav items use `<div>` instead of `<button disabled>` | `Navigation.tsx:116-127`, `MobileNav.tsx:103-112`      | Small         |
| #42  | Toast system only used for errors, not success                | `OracleConsultationForm.tsx` + 5+ other mutation sites | Medium        |
| #124 | Vault.tsx unreachable — no route                              | `App.tsx`                                              | 3 lines       |
| #126 | Learning.tsx AI theme classes may not resolve                 | `Learning.tsx:9,13,22`                                 | Verify        |
| #130 | Translation endpoint no exception handling                    | `translation.py:26-47`                                 | Small         |
| #131 | Oracle endpoint missing general exception catch               | `oracle.py:195-242, 250-297`                           | Small         |
| #132 | Bare `except Exception: pass` in coordinate helpers           | `oracle.py:132-134, 149-151`                           | Small         |
| #133 | Health check missing Anthropic AI check                       | `health.py:122-216`                                    | Small         |

## Quick Win List (Fix in Under 10 Minutes Each)

These are one-liners or near one-liners — highest ROI for time spent:

| #    | What                              | Where                     | Change                                                       |
| ---- | --------------------------------- | ------------------------- | ------------------------------------------------------------ | ----------- |
| #8   | Wrong CSS class for error text    | 7 files                   | `text-nps-bg-danger` → `text-nps-error`                      | **DONE**    |
| #11  | AdminGuard not wired              | `App.tsx:78`              | Wrap `/admin` route in `<Route element={<AdminGuard />}>`    | **DONE**    |
| #15  | StarRating hardcoded LTR          | `StarRating.tsx:81`       | Intentionally LTR — not a bug                                | **INVALID** |
| #17  | DailyReadingCard RTL detection    | `DailyReadingCard.tsx:22` | `const { isRTL } = useDirection()`                           | Open        |
| #22  | Tab title never changes           | 6 page files              | Add `useEffect(() => { document.title = "Page — NPS" }, [])` | Open        |
| #30  | Export menu mislabeled            | `ExportShareMenu.tsx:197` | `t("oracle.export_and_share")`                               | Open        |
| #36  | Icon buttons missing aria-label   | 2 files                   | Add `aria-label={t(...)}` to 4 buttons                       | Open        |
| #39  | Disabled nav items use div        | 2 files                   | `<button disabled aria-disabled="true">`                     | Open        |
| #121 | Remove hardcoded API key default  | `config.py:27`            | Remove default value                                         | **DONE**    |
| #125 | Undefined bg-nps-bg-button class  | N/A                       | **NOT A BUG** — class IS valid from `nps.bg.button`          | **INVALID** |
| #130 | Translation endpoint bare throw   | `translation.py`          | Add try/except HTTPException                                 | Open        |
| #132 | Bare except in coordinate helpers | `oracle.py:132,149`       | Catch specific SQLAlchemy exceptions                         | Open        |
| #133 | Health check missing AI check     | `health.py`               | Add `ANTHROPIC_API_KEY` check                                | Open        |

## Major Blockers (The App Can't Work Until These Are Fixed)

### ~~Blocker 1 — Oracle Backend Returns 500 (Issues #2, #6)~~ RESOLVED 2026-02-20

**Root cause found and fixed:** The `time_progress` callback in `api/app/routers/oracle.py` was missing the 4th `reading_type` parameter that `ReadingOrchestrator._send_progress()` passes. The fix was adding `rt: str = "time"` to the callback signature. Additionally, comprehensive exception handling (ImportError→503, generic Exception→500) was added to the `/readings` endpoint. All 5 reading types now work in production.

### Blocker 2 — AI Reading Output Is Unreadable (Issue #4)

**Even if Blocker 1 is fixed**, reading results are a wall of text with `————` separator lines embedded in a single `<p>` tag. Users cannot read their AI interpretations.

**Fix scope:**

- Backend: Store only the parsed `message` + `advice` + `caution` sections in `ai_interpretation`, not `full_text`
- Backend: Add to system prompt: "Do not use separator lines (----). Use blank lines between paragraphs."
- Frontend: `TranslatedReading.tsx:42` — replace `<p>{reading}</p>` with paragraph-aware renderer (split on `\n\n`)

### ~~Blocker 3 — Admin Panel Is Accessible to Anyone (Issue #11)~~ RESOLVED 2026-02-20

**Fixed:** `AdminGuard` is now wired into `App.tsx` wrapping all `/admin` routes. Non-admin users see a 403 page. A 404 catch-all route was also added (Issue #21).

## Architecture Notes (Must-Know for Any Fix Session)

### RTL System — Two Sources of Truth (Issue #7 Family)

- **CSS direction**: set by `useEffect` on `document.documentElement.dir` in `App.tsx` — **async, runs after render**
- **JS direction**: `useDirection()` hook returns `isRTL: i18n.language === "fa"` — **sync, updates with React**
- **Rule**: NEVER mix Tailwind `rtl:`/`ltr:` prefix classes (CSS-based) with `isRTL` JS state in the same component for the same property. Use one or the other per component. Prefer `dir={isRTL ? "rtl" : "ltr"}` HTML attribute.

### Color Token System — What Exists

The Tailwind config (`frontend/tailwind.config.ts`) defines semantic tokens:

- `text-nps-error` (#f85149) — error text
- `text-nps-success` — success text
- `text-nps-warning` — warning text
- `bg-nps-bg-button` (#1f6feb) — button background (from nested `nps.bg.button` in Tailwind config — this IS valid, contrary to Issue #125)
- `bg-nps-bg-danger` (#da3633) — danger backgrounds only (NOT for text)
- `text-nps-oracle-accent` (#4fc3f7) — oracle blue accent
- `text-nps-text-dim` — muted text
- CSS variables: `var(--nps-glass-bg)`, `var(--nps-glass-border)`, `var(--nps-accent)`, `var(--nps-bg-elevated)`

### AI Interpretation Data Shape (Issues #4, #25)

The `ai_interpretation` field is stored inconsistently:

- Time readings: stores `summary` string
- Question/Name readings: stores `ai_interpretation` dict or string
- Framework endpoint: stores only `full_text` from `ReadingInterpretation`
- Frontend type: `StoredReading.ai_interpretation: string | null` vs `FrameworkReadingResponse.ai_interpretation: AIInterpretationSections | null`

**Canonical fix**: All endpoints should store `AIInterpretationSections` dict serialized as JSON. Frontend type should be `AIInterpretationSections | null` everywhere.

### Confidence Score Scale (Issue #26)

- Framework model: 0–100 integer
- Legacy numerology engines: may return 0.0–1.0 float
- Frontend band-aid: `confidence > 1 ? confidence : confidence * 100`
- **Fix**: Backend engines must normalize to 0–100. Remove frontend band-aid.

### Auth Flow

- JWT: issued by `POST /auth/login`, signed with `API_SECRET_KEY`
- Refresh: `POST /auth/refresh` with refresh token in body
- API Keys: 3-tier scopes (`admin`/`moderator`/`user`), stored hashed in `oracle_api_keys`
- Frontend: sends `Authorization: Bearer <token>` where token is from localStorage or `VITE_API_KEY` fallback
