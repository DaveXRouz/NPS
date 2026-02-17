# NPS UI Overhaul — Master Fix Plan

> **Purpose:** Complete UI/UX overhaul based on owner feedback + deep codebase audit.
> **Status:** READY FOR EXECUTION
> **How to use:** Open this file in a new Claude Code session. Say "continue" or "do step N". Work through steps in order — each step is self-contained but builds on the previous.
> **Deep Audit:** Each step includes a "Deep Audit Findings" section with hidden issues discovered by scanning ~90 components across the entire frontend. These are problems NOT visible in screenshots but that WILL surface when working on that step.

---

## Original Issues (from screenshots)

| #   | Source  | Summary                                                                        |
| --- | ------- | ------------------------------------------------------------------------------ |
| 1   | SS-1    | Emojis on Oracle page (crystal ball in empty state) — replace with SVG         |
| 2   | SS-1    | "Submit Reading" button non-functional                                         |
| 3   | SS-1    | "Use current time" button non-functional                                       |
| 4   | SS-1    | Reading Results section (Summary/Details/History) — poor design, needs rebuild |
| 5   | SS-2    | Edit Profile modal backdrop doesn't cover full viewport                        |
| 6   | SS-3    | Name Reading form missing "Mother's Name" field                                |
| 7   | SS-4    | Question Reading form too bare — needs time, category, mood inputs             |
| 8   | SS-5    | Name Reading page — full layout redesign needed                                |
| 9   | SS-6    | Reading History page is a stub ("coming in Session 21")                        |
| 10  | SS-7    | Invisible inputs in dark mode (Settings timezone, and project-wide)            |
| 11  | SS-8    | Dashboard design is flat/boring — needs futuristic modern redesign             |
| 12  | SS-9    | FA/RTL mode: duplicate sidebar, broken layout across all pages                 |
| 13  | SS-10   | NEW FEATURE: Animated calculation visualization for all reading types          |
| 14  | Request | NEW FEATURE: Admin user management panel with role system                      |
| 15  | Request | GLOBAL: Full responsive + polish pass on every page and breakpoint             |

---

## Execution Plan — Ordered Steps

> **IMPORTANT:** Steps are ordered by dependency. Later steps depend on earlier ones being done. Each step lists exactly which files to touch and what to verify.

---

### STEP 1: Fix Global Dark-Mode Input Visibility (Issue #10)

**Why first:** This is a CSS-level problem that affects EVERY page. Fix it once at the theme/global level before touching any individual pages.

**Root cause:** `--nps-bg-input: #1a1a1a` is too close to `--nps-bg-card: #111111`. Select/dropdown native styling also inherits OS dark colors making text invisible.

**Files to modify:**

- `frontend/src/styles/theme.css` — Adjust `--nps-bg-input` to lighter value (e.g., `#222` or `#252525`), ensure `--nps-text` is applied as default text color for inputs
- `frontend/src/index.css` — Add global input/select/textarea reset styles: explicit `background-color: var(--nps-bg-input)`, `color: var(--nps-text)`, `border-color: var(--nps-border)`
- `frontend/tailwind.config.ts` — Verify `nps.bg.input` mapping is correct

**Project-wide audit after:**

- Search ALL `.tsx` files for `<select`, `<input`, `<textarea` — verify they use themed classes
- Check `frontend/src/components/settings/PreferencesSection.tsx` — timezone dropdown specifically
- Check `frontend/src/components/oracle/UserForm.tsx` — all form fields in Edit Profile
- Check `frontend/src/components/oracle/NameReadingForm.tsx`, `QuestionReadingForm.tsx`, `TimeReadingForm.tsx`
- Check `frontend/src/components/oracle/LocationSelector.tsx` — country/city dropdowns
- Check `frontend/src/components/admin/UserTable.tsx`, `ProfileTable.tsx` — filter dropdowns

**Verify:** Every input/select/textarea is readable in both dark AND light themes. No invisible text anywhere.

#### Deep Audit Findings (Step 1)

| Finding                      | File                        | Detail                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UNDEFINED CSS CLASS**      | `tailwind.config.ts`        | `bg-nps-bg-main` is used in **13+ component files** but is **NOT DEFINED** in the Tailwind config. It maps to nothing — likely renders as transparent. Must either define it or replace all usages with a valid class like `bg-nps-bg` or `bg-nps-bg-card`.                                                                                                                             |
| Undefined class usage        | `ProfileSection.tsx`        | Uses `bg-nps-bg-main` on 3 input elements — all invisible in dark mode.                                                                                                                                                                                                                                                                                                                 |
| Undefined class usage        | `OracleSettingsSection.tsx` | Uses `bg-nps-bg-main` on `<select>` element — invisible in dark mode.                                                                                                                                                                                                                                                                                                                   |
| Unstyled `<option>` elements | `PreferencesSection.tsx`    | Timezone `<select>` has `<option>` elements with **NO explicit styling** — browser defaults make them invisible on dark backgrounds. Must add `bg-nps-bg-input text-nps-text` to `<option>` elements or use a global CSS rule.                                                                                                                                                          |
| No global form reset         | `index.css` / `theme.css`   | There is NO global CSS reset for `select`, `input`, `textarea` background/color. Every component must manually apply theme classes — easy to miss. Add a global reset rule.                                                                                                                                                                                                             |
| Missing focus indicators     | ~20 components              | `focus:outline-none` is used project-wide to remove browser focus ring, but only **some** inputs add a custom focus border (like `focus:border-nps-accent`). Screen reader and keyboard users lose all focus indication on inputs that only remove the ring without replacement. Audit ALL inputs: every `focus:outline-none` must have a companion `focus:ring-*` or `focus:border-*`. |

**Action items for this step:**

1. Define `bg-nps-bg-main` in `tailwind.config.ts` OR search-and-replace all 13+ usages with `bg-nps-bg-card`
2. Add global CSS form element reset in `index.css`
3. Style `<option>` elements globally
4. Audit every `focus:outline-none` and add companion focus styles

---

### STEP 2: Fix RTL/Persian Layout — Duplicate Sidebar + Broken Layout (Issue #12)

**Why second:** Layout/sidebar is the shell everything lives in. If RTL is broken, testing anything else in FA mode is impossible.

**Root cause:** `Layout.tsx` likely renders sidebar unconditionally in both directions, and `MobileNav.tsx` drawer may also render. CSS `border-e` and RTL directional classes may conflict.

**Files to modify:**

- `frontend/src/components/Layout.tsx` — Fix sidebar: ensure only ONE sidebar renders regardless of direction. Use logical CSS properties (`border-inline-end` via Tailwind `border-e`). Verify `flex` direction doesn't double-render with RTL
- `frontend/src/components/MobileNav.tsx` — Ensure drawer slides from correct side in RTL (right→left in LTR, left→right in RTL)
- `frontend/src/components/Navigation.tsx` — Verify nav items align correctly in RTL, icons don't overlap text
- `frontend/src/styles/rtl.css` — Review all RTL overrides, remove conflicting rules that may cause double-sidebar
- `frontend/src/i18n/config.ts` — Verify `document.documentElement.dir` is set correctly on language change

**Ripple-effect files to check:**

- `frontend/src/components/common/OfflineBanner.tsx` — positioning in RTL
- `frontend/src/components/ThemeToggle.tsx` — icon position in RTL header
- `frontend/src/components/LanguageToggle.tsx` — toggle position in RTL header
- `frontend/src/components/dashboard/QuickActions.tsx` — card layout in RTL (was cut off in screenshot)
- `frontend/src/components/dashboard/WelcomeBanner.tsx` — text alignment in RTL
- `frontend/src/components/dashboard/StatsCards.tsx` — card grid in RTL
- `frontend/src/components/dashboard/RecentReadings.tsx` — card layout in RTL

**Verify:** Switch EN→FA and back multiple times. Only one sidebar visible. All content properly mirrored. No overflow/cutoff.

#### Deep Audit Findings (Step 2)

| Finding                                     | File:Line                     | Detail                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CRITICAL: Drawer slides wrong direction** | `MobileNav.tsx:68-76`         | `translate-x-full` is **NOT RTL-aware** in Tailwind. The conditional `isRTL ? "translate-x-full" : "-translate-x-full"` inverts the close direction but doesn't account for the physical direction properly. In RTL mode the drawer slides off-screen to the wrong side. Fix: use `ltr:translate-x-full rtl:-translate-x-full` or logical transform classes. |
| Overcomplicated collapse icon               | `Layout.tsx:78`               | Sidebar collapse icon rotation uses `className={`transition-transform ${sidebarCollapsed ? "rotate-180 rtl:rotate-0" : "rtl:rotate-180"}`}` — this logic is convoluted and inverts behavior in RTL. Simplify to a single `ltr:rotate-180`/`rtl:rotate-0` pattern.                                                                                            |
| Hardcoded physical padding                  | `NameReadingForm.tsx:98`      | Uses `pr-10` (physical right padding) — should be `pe-10` (logical end padding) for correct RTL behavior.                                                                                                                                                                                                                                                    |
| Hardcoded physical padding                  | `QuestionReadingForm.tsx:111` | Same issue: `pr-10` instead of `pe-10`.                                                                                                                                                                                                                                                                                                                      |
| Physical positioning                        | `PersianKeyboard.tsx:70`      | Uses `left-0 right-0` instead of `start-0 end-0`. While both sides are covered, any future change to one-sided positioning will break in RTL.                                                                                                                                                                                                                |
| Unused transition classes                   | `rtl.css`                     | Has `.sidebar-enter` transition classes that are **not used by any component** — potential conflict with sidebar animations. Remove or integrate properly.                                                                                                                                                                                                   |
| Plugin underutilization                     | `tailwindcss-rtl` plugin      | The RTL plugin is installed and provides `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-` classes, but components overwhelmingly use manual `isRTL ?` ternaries instead. This makes RTL support fragile and inconsistent. Gradually replace manual conditionals with plugin utilities.                                                                           |

**Action items for this step:**

1. Fix MobileNav drawer transform to be RTL-aware
2. Simplify Layout.tsx collapse icon rotation
3. Search-and-replace `pl-`/`pr-` with `ps-`/`pe-` in oracle form components
4. Replace `left-0 right-0` with `start-0 end-0` in PersianKeyboard
5. Clean up unused rtl.css transition classes
6. Identify top-priority `isRTL ?` ternaries and replace with Tailwind RTL utilities

---

### STEP 3: Fix Edit Profile Modal Backdrop (Issue #5)

**Why here:** Modals are shared infrastructure. Fix before redesigning any forms.

**Root cause:** Modal overlay likely uses `absolute` instead of `fixed`, or doesn't have `inset-0` / `top-0 left-0 w-screen h-screen`.

**Files to modify:**

- `frontend/src/components/oracle/UserForm.tsx` — This renders the Edit Profile modal. Fix: overlay must be `fixed inset-0 z-50 bg-black/60 flex items-center justify-center`. Modal content needs `max-h-[90vh] overflow-y-auto` for scrollable content on small screens
- If there's a shared Modal component, fix it there instead (check `frontend/src/components/common/` for Modal.tsx)

**Ripple-effect files to check:**

- Any other component that renders a modal/overlay (search for `z-50`, `backdrop`, `overlay` in all .tsx files)
- `frontend/src/components/oracle/ExportShareMenu.tsx` — may have similar overlay issues
- `frontend/src/components/admin/UserActions.tsx` — confirmation dialogs

**Verify:** Open Edit Profile on desktop, tablet, and mobile viewport. Backdrop covers entire screen. Modal scrolls if content overflows. Clicking backdrop closes modal.

#### Deep Audit Findings (Step 3)

| Finding                     | File                              | Detail                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DOUBLE SCROLL ZONES**     | `UserForm.tsx`                    | The modal has TWO competing scroll regions: the outer fixed backdrop has `overflow-y-auto`, AND the inner modal content has `max-h-[85vh] overflow-y-auto`. This creates a confusing UX where sometimes the backdrop scrolls and sometimes the modal content scrolls. Fix: remove `overflow-y-auto` from the backdrop (use `overflow-hidden` or just `overflow-y-auto` on the inner container only). |
| **Toast z-index collision** | `Toast.tsx` + all modals          | Toast notifications use `z-50` — the SAME z-index as modal backdrops. When a modal is open and a toast fires, the toast can appear UNDER the modal backdrop and be invisible. Fix: toasts should use `z-[60]` or higher to always float above modals.                                                                                                                                                |
| No shared Modal component   | `frontend/src/components/common/` | There is NO reusable Modal component. Every modal is hand-rolled with inconsistent patterns (different z-indexes, different backdrop behavior, different scroll handling). Consider creating a shared `Modal.tsx` component during this step that all modals can use. This will prevent the same bugs from recurring in Steps 8, 9, 12.                                                              |

**Action items for this step:**

1. Fix UserForm.tsx double-scroll by removing outer `overflow-y-auto`
2. Raise Toast z-index above modals (z-[60] or z-[100])
3. Consider creating a shared `Modal.tsx` component in `common/` for reuse

---

### STEP 4: Fix Oracle Submit & Use Current Time Buttons (Issues #2, #3)

**Why here:** Core functionality must work before redesigning the UI around it.

**Root cause analysis:**

- "Use current time" → `TimeReadingForm.tsx` line 56-61: `handleUseCurrentTime` exists and looks correct. Likely a rendering issue — the button may not be inside the `<form>` properly, or the parent `Oracle.tsx` may not be passing `onResult` callback correctly, or the API endpoint `oracle.timeReading()` is failing silently.
- "Submit Reading" → `TimeReadingForm.tsx` line 63-85: `handleSubmit` calls `mutation.mutate()` which calls `oracle.timeReading(data)`. If the API backend `/api/oracle/readings/time` endpoint isn't implemented or returns an error, the button appears non-functional.

**Files to investigate & fix:**

- `frontend/src/components/oracle/TimeReadingForm.tsx` — Debug submit handler. Add error display from `mutation.error`. Ensure `onResult` callback is wired
- `frontend/src/pages/Oracle.tsx` — Verify `onResult` prop is passed to `TimeReadingForm` and updates `consultationResult` state
- `frontend/src/components/oracle/OracleConsultationForm.tsx` — This may wrap TimeReadingForm; check prop passing chain
- `frontend/src/services/api.ts` — Verify `oracle.timeReading()` endpoint URL matches backend
- `frontend/src/hooks/useOracleReadings.ts` — Verify `useSubmitTimeReading` mutation function
- `api/app/routers/oracle.py` (backend) — Verify `/oracle/readings/time` POST endpoint exists and works

**Also fix for ALL reading types (not just time):**

- `frontend/src/components/oracle/NameReadingForm.tsx` — verify submit works
- `frontend/src/components/oracle/QuestionReadingForm.tsx` — verify submit works

**Verify:** Click "Use current time" → time updates to current. Click "Submit Reading" → either shows result OR shows clear error message. No silent failures.

#### Deep Audit Findings (Step 4)

| Finding                                        | File                        | Detail                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ALL mutation hooks silently swallow errors** | `useOracleReadings.ts`      | `useSubmitTimeReading`, `useSubmitName`, and `useSubmitQuestion` ALL lack `onError` handlers. When the API returns an error, React Query catches it but nothing displays to the user. The button appears non-functional. Fix: add `onError` callback to every mutation that shows a toast or inline error message.                                                                                                                |
| `useSubmitName` missing parameter              | `useOracleReadings.ts`      | The `useSubmitName` hook does NOT accept or pass a `mother_name` parameter. This blocks the Name Reading form fix in Step 8. Fix here so Step 8 can use it.                                                                                                                                                                                                                                                                       |
| **Redundant WebSocket connection**             | `TimeReadingForm.tsx:37-53` | The component creates its OWN WebSocket connection on mount (lines 37-53). This is **redundant** with the global `useWebSocket` hook used elsewhere. The local connection may fail silently (no error handling for WS connection failure), and having two WS connections to the same server wastes resources. Fix: remove the local WS and use the global `useWebSocket` hook, or verify the local one has proper error handling. |
| API errors thrown but not caught               | `api.ts`                    | The API service in `api.ts` throws errors on non-2xx responses, but the form components have no try/catch or error state display. The mutation's `onError` gap (above) means these thrown errors are caught by React Query but never shown.                                                                                                                                                                                       |

**Action items for this step:**

1. Add `onError` handlers to ALL mutation hooks in `useOracleReadings.ts`
2. Add `mother_name` parameter to `useSubmitName`
3. Remove or fix redundant WebSocket in TimeReadingForm.tsx
4. Add visible error state to all reading form components (toast or inline error)

---

### STEP 5: Remove All Emojis — Replace with SVG Icons (Issue #1)

**Why here:** Visual cleanup before major redesigns.

**Emojis come from the backend API** (`moon.emoji` field) AND from some frontend components. Both sources need fixing.

**Frontend files to modify:**

- `frontend/src/components/oracle/FC60StampDisplay.tsx` — Replace moon/sun emojis with SVG moon/sun icons
- `frontend/src/components/oracle/MoonPhaseDisplay.tsx` — Replace moon phase emojis with SVG moon phase icons (or a CSS-based moon visualization)
- `frontend/src/components/oracle/DailyReadingCard.tsx` — Replace emoji rendering with SVG
- `frontend/src/components/oracle/SummaryTab.tsx` — Replace emoji in summary
- `frontend/src/components/oracle/DetailsTab.tsx` — Replace emoji in details
- `frontend/src/components/oracle/ShareButton.tsx` — Replace emoji in share text
- `frontend/src/components/dashboard/MoonPhaseWidget.tsx` — Replace emoji with SVG
- `frontend/src/components/dashboard/WelcomeBanner.tsx` — Replace emoji with SVG
- `frontend/src/components/oracle/ReadingResults.tsx` — Check for crystal ball emoji in empty state → replace with SVG/illustration

**New files to create:**

- `frontend/src/components/common/icons/MoonPhaseIcon.tsx` — SVG component that renders correct moon phase based on a `phase` prop (new, waxing-crescent, first-quarter, waxing-gibbous, full, waning-gibbous, last-quarter, waning-crescent)
- `frontend/src/components/common/icons/SunMoonIcon.tsx` — SVG for day/night indicator
- `frontend/src/components/common/icons/CrystalBallIcon.tsx` — SVG to replace empty-state crystal ball emoji

**Backend consideration:**

- `api/app/services/moon_service.py` or equivalent — The API sends `emoji` field. Keep it for backward compat but frontend should ignore it and use SVG icons based on `phase` field instead.

**Verify:** Search entire `frontend/src/` for emoji characters (Unicode ranges). Zero emoji characters should remain in rendered output.

#### Deep Audit Findings (Step 5)

| Finding                                    | File                       | Detail                                                                                                                                                                                                                                               |
| ------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EmptyState has 6 hardcoded emojis**      | `EmptyState.tsx`           | The `EmptyState` component has a hardcoded emoji map for ALL empty states: crystal ball (`\uD83D\uDD2E`), person, lock, magnifying glass, brain, package. This component is used across multiple pages. ALL 6 emojis need SVG replacements.          |
| **SummaryTab has 7 emoji Unicode escapes** | `SummaryTab.tsx`           | Uses 7 emoji Unicode escapes as section heading icons: globe (`\uD83C\uDF0D`), numbers, clock, link, sparkles, bulb, warning. Each needs an SVG icon replacement.                                                                                    |
| Down-arrow Unicode in Details              | `DetailsTab.tsx:31`        | Uses Unicode `\u25BC` (black down-pointing triangle) as an accordion open/close indicator. Replace with a proper chevron SVG icon that can animate rotation.                                                                                         |
| **Emoji string comparison in logic**       | `FC60StampDisplay.tsx:149` | Contains `stamp.time?.half === "☀"` — a hardcoded emoji STRING COMPARISON in business logic. If the backend ever changes the emoji, this breaks silently. Fix: compare against a semantic value (e.g., `"day"` / `"night"`) not the emoji character. |
| No icons directory exists                  | `frontend/src/`            | There is no `frontend/src/icons/` or `frontend/src/components/common/icons/` directory. Must create it from scratch for the new SVG icon components.                                                                                                 |

**Action items for this step:**

1. Create `frontend/src/components/common/icons/` directory
2. Replace all 6 EmptyState emojis with SVG icon components
3. Replace all 7 SummaryTab emoji Unicode escapes with SVG icons
4. Replace DetailsTab down-arrow Unicode with animated chevron SVG
5. Fix FC60StampDisplay emoji comparison to use semantic value (not emoji character)
6. Create icon components: MoonPhaseIcon, SunMoonIcon, CrystalBallIcon, plus section icons (globe, numbers, clock, link, sparkles, bulb, warning, person, lock, magnifying glass, brain, package)

---

### STEP 6: Dashboard Full Redesign (Issue #11)

**Why here:** Dashboard is the first page users see. Sets the visual tone for everything else.

**Design direction:** Futuristic dark theme. Subtle gradients, glow effects, animated counters, glassmorphism cards, modern typography hierarchy.

**Files to rewrite:**

- `frontend/src/pages/Dashboard.tsx` — Restructure layout grid
- `frontend/src/components/dashboard/WelcomeBanner.tsx` — Modern hero-style greeting with gradient background, animated time display, moon phase SVG, personalized message
- `frontend/src/components/dashboard/StatsCards.tsx` — Glassmorphism cards with glow borders, animated CountUp numbers, subtle hover effects, icon improvements
- `frontend/src/components/dashboard/RecentReadings.tsx` — Modern card list with colored type badges, confidence meter, hover preview, smooth transitions
- `frontend/src/components/dashboard/QuickActions.tsx` — Prominent action cards with icon animations on hover, gradient borders, clear CTAs
- `frontend/src/components/dashboard/DailyReadingCard.tsx` — Featured card with moon visualization (SVG from Step 5), today's key numbers
- `frontend/src/components/dashboard/MoonPhaseWidget.tsx` — Visual moon phase SVG (from Step 5), not emoji

**New styles to add:**

- `frontend/src/styles/animations.css` — Add new keyframes: glow-pulse, gradient-shift, number-reveal
- `frontend/src/styles/theme.css` — Add glassmorphism variables (`--nps-glass-bg`, `--nps-glass-border`)

**Ripple-effect check:**

- Ensure dashboard looks correct in both EN and FA (RTL from Step 2)
- Ensure dashboard is responsive (mobile/tablet/desktop)
- Verify light theme also looks good (not just dark)

**Verify:** Dashboard feels alive — animated stats, smooth transitions, modern aesthetic. Works on mobile/tablet/desktop. Works in EN and FA.

#### Deep Audit Findings (Step 6)

| Finding                   | File                         | Detail                                                                                                                                                                                                                                                                          |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No CSS Grid layout        | `Dashboard.tsx`              | Uses simple `space-y-6` vertical stack — no CSS Grid for responsive stat card arrangement. The dashboard will look like a plain vertical list on large screens. Use CSS Grid with `grid-cols-1 md:grid-cols-2 xl:grid-cols-4` for proper responsive layout.                     |
| Confidence formatting bug | `StatsCards.tsx` (suspected) | Screenshot shows "AVG CONFIDENCE" displaying `8,500%` — this is likely a formatting bug where `0.85` is multiplied by `100` to get `85` but then formatted with a thousands separator, yielding `8,500%` instead of `85.00%` or `85%`. Investigate the number formatting logic. |
| StatsCards internal grid  | `StatsCards.tsx`             | May contain its own internal grid. Verify before restructuring Dashboard.tsx to avoid conflicting grid systems.                                                                                                                                                                 |

**Action items for this step:**

1. Restructure Dashboard.tsx with CSS Grid layout
2. Fix confidence percentage formatting bug
3. Verify StatsCards grid doesn't conflict with parent layout

---

### STEP 7: Oracle Page — Time Reading Redesign (Issues #4, #8 partial)

**Why here:** Oracle is the core page. Time Reading is the default tab.

**Files to rewrite:**

- `frontend/src/components/oracle/TimeReadingForm.tsx` — Modern time picker design (not just 3 dropdowns). Consider: visual clock-face picker, larger touch targets, gradient submit button with loading animation, clear "Use current time" button styled as pill/chip
- `frontend/src/components/oracle/ReadingResults.tsx` — Complete rebuild: modern tab design, glassmorphism container, animated tab transitions
- `frontend/src/components/oracle/SummaryTab.tsx` — Modern summary layout: key numbers in highlight cards, confidence meter with animation, moon phase SVG, FC60 stamp visual
- `frontend/src/components/oracle/DetailsTab.tsx` — Structured detail sections with collapsible panels, number cards, interpretation text with AI styling
- `frontend/src/components/oracle/ReadingHistory.tsx` (oracle-specific, not page) — History tab within results showing past readings for this user

**Also update the Oracle page layout:**

- `frontend/src/pages/Oracle.tsx` — Review overall grid layout (left sidebar profile + reading type selector, right main content). Ensure proper spacing and visual hierarchy
- `frontend/src/components/oracle/ReadingTypeSelector.tsx` — Modern tab/pill selector instead of plain list

**Verify:** Time reading form looks modern and polished. Submit works (from Step 4). Results display beautifully with animations.

#### Deep Audit Findings (Steps 7-9 shared)

| Finding                       | File:Line                     | Detail                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complex responsive borders    | `ReadingTypeSelector.tsx:149` | Active state uses `border-s-0 md:border-s-2 border-b-2 md:border-b-0` — this complex responsive border logic switches between bottom-border (mobile) and start-border (desktop) for the active indicator. When redesigning, simplify this or ensure the new design handles both breakpoints cleanly. |
| Missing wrapper component     | `OracleConsultationForm.tsx`  | This component may have been removed or renamed during earlier work — audit couldn't locate it. If TimeReadingForm references it as a wrapper, the import will fail. Verify whether this component exists and is needed.                                                                             |
| **PRESERVE ARIA tabs**        | `ReadingResults.tsx`          | The current implementation uses proper ARIA attributes: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`. These are CORRECT and must be preserved in the redesign. Do not remove accessibility attributes.                                                        |
| Oracle ReadingHistory vs Page | `oracle/ReadingHistory.tsx`   | The oracle-specific `ReadingHistory.tsx` component (inside `components/oracle/`) is a DIFFERENT file from the `pages/ReadingHistory.tsx` stub. The oracle component is functional with pagination, search, and favorites. Don't duplicate logic — reuse or promote to page in Step 11.               |

---

### STEP 8: Oracle Page — Name Reading Redesign (Issues #6, #8)

**Why here:** Builds on Oracle page improvements from Step 7.

**Files to modify:**

- `frontend/src/components/oracle/NameReadingForm.tsx` — Add Mother's Name input field (required). Add "Use Profile Name" and "Use Profile Mother's Name" quick-fill buttons. Redesign layout: grouped sections (Identity, Numerology System), modern input styling, visual system selector (cards instead of radio buttons)

**New fields needed:**

- Mother's name input (text)
- Mother's name "Use from profile" button
- Both names should support Persian input with script detection

**Backend ripple-effect:**

- `api/app/routers/oracle.py` — Verify name reading endpoint accepts `mother_name` parameter
- `frontend/src/services/api.ts` — Verify `oracle.name()` API call includes mother_name
- `frontend/src/hooks/useOracleReadings.ts` — Update `useSubmitName` to pass mother_name
- `frontend/src/types/index.ts` — Update `NameReadingRequest` type to include `mother_name`

**Verify:** Name reading form shows both name and mother's name. "Use Profile" buttons work. Numerology system selector looks modern. Submit produces results.

_(See Deep Audit Findings under Step 7 — shared findings for Steps 7-9)_

---

### STEP 9: Oracle Page — Question Reading Enhancement (Issue #7)

**Why here:** Continues Oracle page improvements.

**Files to modify:**

- `frontend/src/components/oracle/QuestionReadingForm.tsx` — Major enhancement:
  - Add time picker (when did the question arise?) — reuse time picker component from Step 7
  - Add category selector: Love, Career, Health, Finance, Family, Spiritual, General — styled as pill/tag buttons
  - Add optional mood/urgency selector: calm, anxious, curious, desperate — subtle tone indicator
  - Keep the question textarea but make it richer (larger, better placeholder, character count with visual bar)
  - Auto-detect language (already exists) — keep but style better

**Backend ripple-effect:**

- `api/app/routers/oracle.py` — Verify question endpoint accepts `category`, `time`, `mood` parameters
- `frontend/src/services/api.ts` — Update `oracle.question()` to pass new fields
- `frontend/src/types/index.ts` — Update `QuestionReadingRequest` type
- `frontend/src/locales/en.json` — Add translation keys for categories and mood options
- `frontend/src/locales/fa.json` — Add Persian translations for categories and mood options

**Verify:** Question form has all new inputs. Category selection works. Time picker works. Submit produces results with richer context.

_(See Deep Audit Findings under Step 7 — shared findings for Steps 7-9)_

---

### STEP 10: Animated Calculation Visualization (Issue #13)

**Why here:** After all reading forms work (Steps 4, 7, 8, 9), add the animation layer.

**This is a NEW FEATURE — needs new components.**

**New files to create:**

- `frontend/src/components/oracle/CalculationAnimation.tsx` — Main animation container. Shows step-by-step:
  1. Input numbers appear (heartbeat pulse animation)
  2. Numbers flow through calculation pipeline (arrows/lines connecting steps)
  3. Each calculation step highlights (FC60 reduction, numerology mapping, etc.)
  4. Intermediate results appear with fade-in
  5. Final result lands with celebration effect
- `frontend/src/components/oracle/CalculationStep.tsx` — Individual step component (label, input number, output number, connection line)
- `frontend/src/components/oracle/NumberHeartbeat.tsx` — Animated number that pulses like a heartbeat before resolving

**Integration points:**

- `frontend/src/components/oracle/TimeReadingForm.tsx` — After submit, before results, show CalculationAnimation
- `frontend/src/components/oracle/NameReadingForm.tsx` — Same pattern
- `frontend/src/components/oracle/QuestionReadingForm.tsx` — Same pattern
- `frontend/src/pages/Oracle.tsx` — Manage animation state between form submit and result display

**Animation data source:**

- The backend reading response should include a `calculation_steps` array (or the frontend can derive it from the result data)
- Reference: `logic/FC60_ALGORITHM.md` for time reading calculation steps
- Reference: `logic/NUMEROLOGY_SYSTEMS.md` for name reading calculation steps

**Verify:** Submit any reading → see animated step-by-step calculation → results appear. Animation respects `prefers-reduced-motion`. Works for all 5 reading types.

#### Deep Audit Findings (Step 10)

| Finding                          | File                      | Detail                                                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Existing animation component** | `LoadingAnimation.tsx`    | A `LoadingAnimation.tsx` component already exists with a pulsing orb, progress bar, step counter, and cancel button. This can be **extended** rather than replaced — add the calculation step visualization as a layer on top of or alongside the existing loading animation. |
| **Existing progress hook**       | `useReadingProgress` hook | A `useReadingProgress` hook already exists for tracking WebSocket progress events during readings. Reuse this hook for driving the calculation animation steps instead of building a new progress tracking system.                                                            |

**Action items for this step:**

1. Extend `LoadingAnimation.tsx` rather than building from scratch
2. Use `useReadingProgress` hook to drive animation state
3. Create new CalculationStep and NumberHeartbeat as composable sub-components

---

### STEP 11: Reading History Page — Full Implementation (Issue #9)

**Why here:** Now that readings work and look good, build the history page.

**Files to rewrite:**

- `frontend/src/pages/ReadingHistory.tsx` — Complete rewrite from stub. Needs:
  - Search bar (by content, question text, name)
  - Filter chips: by reading type (Time, Name, Question, Daily, Multi), by date range, by favorites
  - Sort: newest first, oldest first, highest confidence
  - Reading cards in a grid/list layout (reuse `ReadingCard.tsx` with modern styling from Step 7)
  - Pagination or infinite scroll
  - Empty state with SVG illustration (not emoji)
  - Click card → expand to full detail (or navigate to reading detail view)

**Existing components to leverage:**

- `frontend/src/components/oracle/ReadingCard.tsx` — Update styling to match new design
- `frontend/src/components/oracle/ReadingDetail.tsx` — Full reading detail view
- `frontend/src/components/oracle/ReadingHistory.tsx` (oracle component) — May overlap with page; consolidate logic

**API integration:**

- `frontend/src/hooks/useOracleReadings.ts` — `useReadingHistory()` hook with search/filter/pagination params
- `frontend/src/services/api.ts` — `oracle.history(params)` already exists
- `frontend/src/types/index.ts` — Verify `ReadingSearchParams` type has all needed fields

**Verify:** History page loads with real data. Search works. Filters work. Pagination works. Cards look modern. Click opens detail.

#### Deep Audit Findings (Step 11)

| Finding                                      | File                                   | Detail                                                                                                                                                                                                                                         |
| -------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page is a 17-line stub**                   | `pages/ReadingHistory.tsx:13`          | The page contains hardcoded English text: `"Reading History page coming in Session 21."` — a literal placeholder with NO components, NO API calls, NO layout. Complete rewrite required.                                                       |
| **Oracle component has full implementation** | `components/oracle/ReadingHistory.tsx` | This is a DIFFERENT file from the page. It has a working implementation with pagination, search, and favorites. **Promote this component's logic to the page** instead of rewriting from scratch. Extract the data fetching and display logic. |
| **Hook already exists**                      | `useReadingHistory` hook               | The `useReadingHistory` hook in `useOracleReadings.ts` already supports search/filter/pagination params. Wire this into the page.                                                                                                              |

**Action items for this step:**

1. Promote `oracle/ReadingHistory.tsx` component logic into the `pages/ReadingHistory.tsx` page
2. Wire `useReadingHistory` hook with search/filter/pagination params
3. Remove hardcoded English placeholder text
4. Add modern page-level layout, search bar, filter chips

---

### STEP 12: Admin User Management Panel (Issue #14)

**Why here:** Independent feature, but should match the new design language established in Steps 6-11.

**Existing files to verify/update:**

- `frontend/src/pages/Admin.tsx` — Admin hub already exists. Verify "Users" route is accessible
- `frontend/src/pages/AdminUsers.tsx` — Already exists with UserTable. Verify it works and update design
- `frontend/src/components/admin/AdminGuard.tsx` — Route guard already exists. Verify it checks role correctly
- `frontend/src/components/admin/UserTable.tsx` — Already exists. Update: modern table design, role badges with colors (admin=red, moderator=yellow, user=green), search, sort, action buttons
- `frontend/src/components/admin/UserActions.tsx` — Already exists. Verify: change role dropdown, activate/deactivate toggle, reset password

**Files to update for sidebar visibility:**

- `frontend/src/components/Navigation.tsx` — Verify "Admin" / "User Management" link appears only when `isAdmin` is true. The `isAdmin` prop comes from `Layout.tsx` checking `localStorage.getItem("nps_user_role")`

**Backend verification:**

- `api/app/routers/admin.py` — Verify admin endpoints exist: list users, update role, toggle active
- `api/app/middleware/auth.py` — Verify admin role check middleware

**Design:**

- Table with modern dark styling consistent with new design language
- Role selector as dropdown or pill buttons
- Confirmation modals for destructive actions (deactivate, delete)
- User detail expansion/modal

**Verify:** Login as admin → see User Management in sidebar. Table loads with users. Can change roles. Can search/filter. Non-admin users cannot access.

#### Deep Audit Findings (Step 12)

| Finding                  | File                               | Detail                                                                                                                                                                                                                                                                                                    |
| ------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AdminUsers may be a stub | `AdminUsers.tsx`                   | Like `ReadingHistory.tsx`, this page may be a minimal stub. Verify actual content before deciding whether to extend or rewrite.                                                                                                                                                                           |
| Admin components exist   | `UserTable.tsx`, `UserActions.tsx` | Admin components already exist with search, sort, and role filtering functionality. Don't rebuild — update their design to match the new visual language.                                                                                                                                                 |
| **Insecure auth check**  | `AdminGuard.tsx`                   | Checks `localStorage.getItem("nps_user_role")` — this is a CLIENT-SIDE check only. Any user can set `localStorage` to `"admin"` and bypass the guard. The real security must come from backend API role validation. Note this as a known limitation and ensure backend endpoints have proper role checks. |

**Action items for this step:**

1. Verify AdminUsers.tsx content (stub vs functional)
2. Update existing admin components with new design language
3. Document the AdminGuard localStorage limitation — ensure backend enforces role checks

---

### STEP 13: Full Responsive & Polish Pass (Issue #15)

**Why LAST:** This is the final quality sweep after all features are built.

**Test at these breakpoints:**

- Mobile: 375px (iPhone SE), 390px (iPhone 14), 414px (iPhone Plus)
- Tablet: 768px (iPad), 1024px (iPad Pro)
- Desktop: 1280px, 1440px, 1920px

**Page-by-page checklist:**

**Dashboard (`/dashboard`):**

- [ ] Stats cards stack on mobile, 2-col on tablet, 4-col on desktop
- [ ] Welcome banner text doesn't overflow
- [ ] Quick actions responsive grid
- [ ] Recent readings cards stack properly
- [ ] All text readable at every size

**Oracle (`/oracle`):**

- [ ] Sidebar (user profile + reading type) collapses to top section on mobile
- [ ] Time picker usable on mobile (touch targets ≥44px)
- [ ] Name/Question forms fill width properly
- [ ] Reading results tabs work on mobile
- [ ] Calculation animation scales down gracefully
- [ ] All form labels and hints visible

**Reading History (`/history`):**

- [ ] Search bar full width on mobile
- [ ] Filter chips wrap properly
- [ ] Cards single column on mobile, grid on desktop
- [ ] Pagination controls accessible

**Settings (`/settings`):**

- [ ] Sections stack properly
- [ ] All inputs full width on mobile
- [ ] Toggle buttons touchable
- [ ] API keys section handles long keys with truncation

**Admin (`/admin/*`):**

- [ ] Table scrolls horizontally on mobile (not breaks)
- [ ] Action buttons accessible
- [ ] Charts resize properly

**Global checks:**

- [ ] Sidebar: collapses to hamburger on mobile (< lg), drawer from correct side in RTL
- [ ] Header: language/theme toggles always accessible
- [ ] Modals: centered, max-width, scrollable content, backdrop covers full screen
- [ ] Toast notifications: positioned correctly in both LTR and RTL
- [ ] All text: no truncation without tooltip, no overflow, proper contrast
- [ ] All interactive elements: min 44px touch target on mobile
- [ ] Focus states: visible keyboard focus ring on all interactive elements
- [ ] Persian text: Vazirmatn font loading, proper alignment, numbers convert to Persian digits

**Verify:** Test every page at 375px, 768px, and 1440px in both EN and FA. Zero visual bugs.

#### Deep Audit Findings (Step 13)

| Finding                               | File                          | Detail                                                                                                                                                                                                                                     |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hardcoded English placeholder         | `pages/ReadingHistory.tsx:13` | If Step 11 didn't fully replace the stub, the hardcoded `"Reading History page coming in Session 21."` text will still be visible. Verify removal.                                                                                         |
| Untranslated aria-label               | `ReadingResults.tsx:59`       | Hardcoded `aria-label="Reading results"` — not run through i18n. Screen readers in Persian mode will hear English. Replace with `t('oracle.readingResults')` or equivalent.                                                                |
| English-only API errors               | `api.ts`                      | All error messages in the API service (`api.ts`) are English-only strings. When the app is in Persian mode, error toasts will show English text. Consider using i18n error keys or at minimum mapping common errors to translated strings. |
| Untranslated aria-labels project-wide | Multiple components           | Several components likely have hardcoded English `aria-label` attributes. During the polish pass, search for `aria-label=` across all `.tsx` files and verify each one either uses `t()` or is language-neutral.                           |

**Action items for this step:**

1. Verify all stubs are replaced with real implementations
2. Search and fix all untranslated `aria-label` attributes
3. Localize API error messages or map to i18n keys
4. Full breakpoint testing at 375px, 768px, 1440px in EN + FA

---

## Quick Reference — Files Changed Per Step

| Step | Files (approximate count)                       |
| ---- | ----------------------------------------------- |
| 1    | 3 core + audit ~15 component files              |
| 2    | 5 layout files + 7 dashboard components         |
| 3    | 1-2 modal files + audit others                  |
| 4    | 3-5 form files + 2 API files + 1 backend        |
| 5    | 8 emoji files + 3 new SVG icon files            |
| 6    | 7 dashboard files + 2 style files               |
| 7    | 6 oracle files + 1 page file                    |
| 8    | 1 form file + 4 API/type files                  |
| 9    | 1 form file + 4 API/type files + 2 locale files |
| 10   | 3 new files + 4 integration files               |
| 11   | 1 page rewrite + 3 component files + 1 hook     |
| 12   | 4-5 admin files + 1 navigation file             |
| 13   | Testing only — no new files, fixes across all   |

---

## Dependencies Between Steps

```
Step 1 (dark inputs) ──→ ALL other steps (foundation)
Step 2 (RTL fix) ──────→ ALL other steps (layout foundation)
Step 3 (modal fix) ────→ Steps 8, 12 (modals used in forms & admin)
Step 4 (buttons work) ─→ Steps 7, 8, 9, 10 (forms must submit)
Step 5 (emojis→SVG) ──→ Steps 6, 7 (dashboard & oracle use icons)
Step 6 (dashboard) ────→ Step 13 (polish)
Step 7 (time reading) ─→ Steps 8, 9, 10 (shared patterns)
Step 8 (name reading) ─→ Step 10 (animation)
Step 9 (question) ─────→ Step 10 (animation)
Step 10 (animation) ───→ Step 13 (polish)
Step 11 (history) ─────→ Step 13 (polish)
Step 12 (admin) ───────→ Step 13 (polish)
Step 13 (polish) ──────→ DONE
```

---

## Session Instructions

When starting a new Claude Code session to work on this plan:

1. Read `CLAUDE.md` (project rules)
2. Read this file (`TODO_PLAN.md`)
3. Identify which step to work on next (first incomplete step)
4. Show a brief plan for that specific step
5. Execute after approval
6. Mark step complete in this file when done
7. Run tests + verify before marking done
