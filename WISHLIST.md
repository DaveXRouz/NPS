# WISHLIST — NPS Design Vision

> Forward-looking design specifications and feature wishes.
> Extracted from the original handoff document.
> Last updated: 2026-02-20

---

## Design Vision — Beast to Beauty: The Complete Design Surgery

> This section is a surgical specification. Every item references exact files, exact CSS values,
> exact Tailwind classes, and exact changes needed. Future sessions treat this as a designer's
> blueprint — not a wishlist, but a prescription.
>
> Inspiration level: buzzworthystudio.com (Awwwards SOTD 2024 — dark premium, GSAP/WebGL, bold
> typography, cinematic scroll) and poppr.be (Belgian creative agency — immersive, parallax, sticky
> full-screen nav, video hero, "conversion through immersion").
> These are the **floor** — not the ceiling.

---

### THE DESIGN PROBLEM: 14-DIMENSION GAP ANALYSIS

| Dimension     | Current State                             | Target State                                        |
| ------------- | ----------------------------------------- | --------------------------------------------------- |
| Typography    | Inter everywhere, same weight             | Cinzel Decorative (display) + Lora (body)           |
| Color depth   | 3 flat layers (#0a0a0a, #111111, #1e1e1e) | 5-tier depth with ambient glow orbs                 |
| Glassmorphism | `blur(8px)` + `rgba(17,17,17,0.6)`        | `blur(16px) saturate(150%)` + `rgba(8,12,20,0.70)`  |
| Card borders  | `rgba(79,195,247,0.15)` — barely visible  | `rgba(79,195,247,0.18)` + top-edge shine            |
| Background    | Flat `#0a0a0a`                            | Base + radial glow orbs + ambient temperature       |
| Animations    | CSS keyframes, load-time only             | Scroll-triggered reveals, CountUp on view entry     |
| Stats cards   | 4 identical grey cards                    | Each card: unique accent, glow halo, per-stat color |
| Loading state | Pulsing orb + progress bar                | Oracle Awakening — 5-act cinematic sequence         |
| Navigation    | Flat links + 2px start border             | Illuminated active state, gradient sweep, icon glow |
| Empty states  | Generic icon + text                       | Domain-specific cosmic illustrated states           |
| Buttons       | Gradient emerald, plain hover             | Glow hover, lift effect, branded focus              |
| Selection     | None                                      | Oracle-accent branded text selection                |
| Scrollbar     | 8px grey thumb                            | 4px oracle-accent thumb                             |
| Focus rings   | 2px solid outline                         | 2px outline + glow shadow, larger offset            |

---

### PHASE 1 — TYPOGRAPHY SURGERY

#### The Font System

```
Display: "Cinzel Decorative" — Roman inscriptions, ceremonial, Google Fonts free
         Use for: hero headings, Oracle results title, WelcomeBanner greeting
         Weights needed: 400 (regular), 700 (bold)

Body:    "Lora" — elegant serif, designed for screen reading, excellent dark-mode contrast
         Replaces: Inter for all body text (NOT for data/numbers/code)
         Weights needed: 400 (regular), 500 (medium), 600 (semibold), 400 italic

Code:    "JetBrains Mono" — keep as-is (already installed)

Persian: "Vazirmatn" — keep as-is (already installed, Cinzel is Latin-only)
         IMPORTANT: Cinzel Decorative must NEVER be applied to Persian/RTL text
```

#### FILE: `frontend/index.html`

Add inside `<head>` before existing scripts:

```html
<!-- Premium typography: Cinzel Decorative (display) + Lora (body) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap"
  rel="stylesheet"
/>
```

#### FILE: `frontend/src/index.css`

Replace body font stack:

```css
/* BEFORE */
body {
  font-family: "Inter", "Segoe UI", "Helvetica", sans-serif;
  background-color: var(--nps-bg);
  color: var(--nps-text);
  -webkit-font-smoothing: antialiased;
}

/* AFTER */
body {
  font-family: "Lora", "Georgia", "Times New Roman", serif;
  background-color: var(--nps-bg);
  color: var(--nps-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  font-feature-settings:
    "liga" 1,
    "kern" 1;
}

/* RTL font override — Cinzel is Latin-only, always use Vazirmatn for RTL */
html[dir="rtl"] body {
  font-family: "Vazirmatn", "Tahoma", sans-serif;
}
```

Add font variables (add to `:root` in index.css or theme.css):

```css
/* Typography tokens */
--nps-font-display: "Cinzel Decorative", serif;
--nps-font-body: "Lora", "Georgia", serif;
--nps-font-mono: "JetBrains Mono", "Consolas", monospace;
--nps-font-persian: "Vazirmatn", "Tahoma", sans-serif;
```

#### FILE: `frontend/tailwind.config.ts`

Replace fontFamily:

```typescript
fontFamily: {
  sans: ['"Lora"', '"Georgia"', 'serif'],
  display: ['"Cinzel Decorative"', 'serif'],
  mono: ['"JetBrains Mono"', '"Consolas"', 'monospace'],
},
```

#### Apply Display Font — Exact Locations

- `WelcomeBanner.tsx:98` — h1 greeting text:

  ```tsx
  // BEFORE: className="text-2xl lg:text-3xl font-bold text-nps-text-bright truncate"
  // AFTER:
  className="text-2xl lg:text-3xl font-bold text-nps-text-bright truncate tracking-tight"
  style={{ fontFamily: 'var(--nps-font-display)', letterSpacing: '-0.02em' }}
  ```

- `DailyReadingCard.tsx` — card section title (the "Daily Reading" / oracle section header):
  Add `style={{ fontFamily: 'var(--nps-font-display)' }}` to the title element

- Oracle `SummaryTab.tsx` — main numerology number display (the large center number):
  Add `font-display` class and `tracking-tight`

- `StatsCards.tsx` — stat value numbers (the big bold numbers like "42", "87%"):
  Keep JetBrains Mono for numbers — they're data values, monospace is correct
  Change LABEL text (the small uppercase labels) to `tracking-widest text-xs`

#### Letter Spacing Rules

```
Display font headings:  letter-spacing: -0.02em  (tracking-tight or inline style)
Large stat numbers:     letter-spacing: -0.03em  (tighter, more elegant)
Section labels (UPPER): letter-spacing: 0.1em    (tracking-widest — more breathing room)
Body text:              letter-spacing: 0         (Lora's default is correct)
```

---

### PHASE 2 — COLOR DEPTH SYSTEM

#### Current Problem

The app has 3 depth levels: `#0a0a0a` (bg), `#111111` (card), `#1e1e1e` (input).
This is too flat. Premium dark UIs have 5+ levels with ambient color temperature.
The oracle accent `#4fc3f7` (sky blue) never actually glows — it exists only as a text color.

#### FILE: `frontend/src/styles/theme.css`

Add ALL of the following to `:root` (dark mode default):

```css
/* ===== DEPTH SYSTEM UPGRADE (Phase 2) ===== */

/* 5-tier background depth — replaces 3-tier flat system */
--nps-bg-void: #050508; /* Page base — deepest layer, slight blue tint */
--nps-bg-surface: #080b14; /* App shell background */
--nps-bg-card: #0d1117; /* Cards, panels (replace #111111) */
--nps-bg-raised: #161b27; /* Elevated panels, active states */
--nps-bg-overlay: #1e2433; /* Modal backgrounds, high hover */
--nps-bg-input: #0d1117; /* Form inputs — aligned with card */
--nps-bg-hover: #1a2035; /* Hover state — distinct from card */
--nps-bg-sidebar: #060810; /* Sidebar — slightly different temperature */

/* Glassmorphism — 3 depth tiers (explicit blur values) */
--nps-glass-blur-sm: blur(8px) saturate(120%);
--nps-glass-blur-md: blur(16px) saturate(150%);
--nps-glass-blur-lg: blur(24px) saturate(180%);

/* Glassmorphism background per tier */
--nps-glass-bg-sm: rgba(13, 17, 23, 0.5);
--nps-glass-bg-md: rgba(8, 12, 20, 0.7);
--nps-glass-bg-lg: rgba(5, 8, 14, 0.85);

/* Glassmorphism borders — 3 intensity levels */
--nps-glass-border-subtle: rgba(79, 195, 247, 0.08);
--nps-glass-border-std: rgba(79, 195, 247, 0.18);
--nps-glass-border-active: rgba(79, 195, 247, 0.4);

/* Top-edge shine (for premium glass cards — apply as second background) */
--nps-glass-shine: linear-gradient(
  180deg,
  rgba(255, 255, 255, 0.04) 0%,
  transparent 40%
);

/* Glow intensity system */
--nps-glow-xs: 0 0 4px rgba(79, 195, 247, 0.12);
--nps-glow-sm: 0 0 8px rgba(79, 195, 247, 0.18);
--nps-glow-md:
  0 0 20px rgba(79, 195, 247, 0.2), 0 0 40px rgba(79, 195, 247, 0.08);
--nps-glow-lg:
  0 0 32px rgba(79, 195, 247, 0.25), 0 0 60px rgba(79, 195, 247, 0.1);

/* Oracle-specific glow variants */
--nps-oracle-glow-subtle: 0 0 8px rgba(79, 195, 247, 0.15);
--nps-oracle-glow-medium:
  0 0 20px rgba(79, 195, 247, 0.2), 0 0 40px rgba(79, 195, 247, 0.08);
--nps-oracle-glow-strong:
  0 0 32px rgba(79, 195, 247, 0.3), 0 0 64px rgba(79, 195, 247, 0.12);

/* Gradient palette */
--nps-gradient-oracle: linear-gradient(
  135deg,
  #080d1a 0%,
  #0e1526 50%,
  #061018 100%
);
--nps-gradient-hero: linear-gradient(
  135deg,
  rgba(8, 13, 26, 0.95) 0%,
  rgba(79, 195, 247, 0.06) 100%
);
--nps-gradient-accent-h: linear-gradient(90deg, #10b981 0%, #4fc3f7 100%);
--nps-gradient-gold: linear-gradient(
  90deg,
  #b8860b 0%,
  #f8b400 50%,
  #b8860b 100%
);

/* Ambient orb colors (for radial-gradient use on body/page backgrounds) */
--nps-orb-oracle: rgba(79, 195, 247, 0.04);
--nps-orb-emerald: rgba(16, 185, 129, 0.03);
--nps-orb-purple: rgba(139, 92, 246, 0.03);

/* Per-stat-card accent colors */
--nps-stat-readings: #4fc3f7; /* Oracle blue — Total Readings */
--nps-stat-confidence: #10b981; /* Emerald — Avg Confidence */
--nps-stat-type: #a78bfa; /* Purple — Most Used Type */
--nps-stat-streak: #f8b400; /* Gold — Streak Days */
```

Also **update these existing variables** (replace current flat values):

```css
--nps-bg: var(--nps-bg-void); /* #050508 not #0a0a0a */
--nps-border: rgba(255, 255, 255, 0.06); /* More elegant than #1f1f1f */
--nps-glass-bg: var(--nps-glass-bg-md); /* Tiered glass system */
--nps-glass-border: var(--nps-glass-border-std); /* Tiered border */
--nps-glass-glow: rgba(79, 195, 247, 0.15); /* Slightly stronger than 0.10 */
```

---

### PHASE 3 — AMBIENT BACKGROUND SYSTEM

#### What Premium Sites Do

buzzworthystudio.com and poppr.be both have backgrounds that "breathe."
Not flat black — layered radial orbs that create depth and color temperature.
This is CSS-only. Zero performance cost. Massive visual impact.

#### FILE: `frontend/src/index.css`

Add to `body` rule:

```css
body {
  /* ... existing properties ... */

  /* Ambient depth: three color temperature orbs, fixed to viewport */
  background-image:
    radial-gradient(
      ellipse 80% 50% at 20% 0%,
      var(--nps-orb-oracle) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 60% 40% at 80% 100%,
      var(--nps-orb-emerald) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 40% 60% at 50% 50%,
      var(--nps-orb-purple) 0%,
      transparent 70%
    );
  background-attachment: fixed;
}
```

#### Add `::selection` Styling (missing entirely)

```css
/* Branded text selection — oracle accent */
::selection {
  background: rgba(79, 195, 247, 0.2);
  color: #f9fafb;
}
::-moz-selection {
  background: rgba(79, 195, 247, 0.2);
  color: #f9fafb;
}
```

#### Upgrade Scrollbar (in same file)

```css
/* BEFORE: 8px wide, grey thumb */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-thumb {
  background: var(--nps-border);
  border-radius: 4px;
}

/* AFTER: 4px, oracle-accent colored */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(79, 195, 247, 0.15);
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(79, 195, 247, 0.4);
}
```

#### Upgrade Focus Ring (in same file)

```css
/* BEFORE */
*:focus-visible {
  outline: 2px solid var(--nps-accent);
  outline-offset: 2px;
  border-radius: 2px;
}

/* AFTER — adds glow shadow, larger offset, themed to oracle */
*:focus-visible {
  outline: 2px solid rgba(79, 195, 247, 0.8);
  outline-offset: 3px;
  border-radius: 4px;
  box-shadow: 0 0 0 5px rgba(79, 195, 247, 0.1);
}
```

---

### PHASE 4 — GLASSMORPHISM DEEP UPGRADE

#### The Standard Glass Card Pattern

Every card in NPS uses this pattern:

```
bg-[var(--nps-glass-bg)] backdrop-blur-md border border-[var(--nps-glass-border)]
```

**New standard pattern** (replace in all card wrappers):

```
bg-[var(--nps-glass-bg-md)]
[backdrop-filter:var(--nps-glass-blur-md)]
border border-[var(--nps-glass-border-std)]
shadow-[var(--nps-glow-xs)]
```

For hover states, replace:

```
hover:shadow-[0_0_12px_var(--nps-glass-glow)]
```

with:

```
hover:shadow-[var(--nps-glow-md)]
hover:border-[var(--nps-glass-border-active)]
hover:-translate-y-0.5
transition-all duration-400
```

#### Per-Component Glass Upgrades

**`WelcomeBanner.tsx` (lines 84-90) — inline style:**

```tsx
// BEFORE:
style={{ background: "linear-gradient(135deg, rgba(15, 26, 46, 0.9) 0%, rgba(79, 195, 247, 0.08) 100%)" }}

// AFTER:
style={{ background: "var(--nps-gradient-hero)" }}
// className: remove backdrop-blur-sm → add [backdrop-filter:var(--nps-glass-blur-md)]
// className: border → border-[var(--nps-glass-border-std)]
```

**`DailyReadingCard.tsx` — gradient background:**

```tsx
// BEFORE:
background: "linear-gradient(135deg, rgba(15, 26, 46, 0.85) 0%, rgba(79, 195, 247, 0.06) 100%)";

// AFTER:
background: "var(--nps-gradient-oracle)";
// Plus add: boxShadow: "var(--nps-oracle-glow-subtle)"
// Hover: shadow-[var(--nps-oracle-glow-medium)]
```

**`QuickActions.tsx` buttons — add unique glow per action:**

```tsx
// Oracle/time button: hover:shadow-[0_0_20px_rgba(79,195,247,0.20)]
// Question button:   hover:shadow-[0_0_20px_rgba(248,180,0,0.15)]
// Name button:       hover:shadow-[0_0_20px_rgba(16,185,129,0.20)]
```

---

### PHASE 5 — ANIMATION UPGRADE (Scroll-Triggered)

#### Current Problem

All animations fire on page load via delay-based CSS. Nothing responds to scroll.
CountUp exists but isn't wired to Intersection Observer — numbers count up even off-screen.

#### NEW FILE: `frontend/src/hooks/useInView.ts`

Create this hook (30 lines, no dependencies beyond React):

```typescript
import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useInView({
  threshold = 0.1,
  rootMargin = "0px",
  triggerOnce = true,
}: UseInViewOptions = {}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) observer.unobserve(element);
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, inView };
}
```

#### UPGRADE `CountUp.tsx`

Add prop `startOnView?: boolean` (default: `true`):

```typescript
// When startOnView=true:
// 1. Import useInView hook
// 2. Attach ref to the <span> element
// 3. Only start animation when inView === true
// 4. While not in view, render '0' (or prefix+'0'+suffix)
// Current: animation starts immediately on mount
// New: animation starts when element scrolls into viewport
```

#### UPGRADE `StatsCards.tsx`

Wire each card to count up on view entry:

```tsx
// Each StatsCard wraps its container with useInView
// Passes inView state to CountUp's startOnView prop
// Stagger: card 1 = nps-delay-1, card 2 = nps-delay-2, etc.
```

#### UPGRADE `animations.css` — New Keyframes

Add to end of file:

```css
/* Premium entrance: used for stats cards, oracle results reveals */
@keyframes nps-rise-in {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.97);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

/* Glimmer: scanning light across progress bars and card tops */
@keyframes nps-glimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Typewriter cursor: for Oracle loading state */
@keyframes nps-cursor-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* Pulsing ring: for Oracle waiting / empty states */
@keyframes nps-ring-pulse {
  0% {
    transform: scale(0.85);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.3;
  }
  100% {
    transform: scale(0.85);
    opacity: 0.8;
  }
}

/* Orbital slow rotation: for decorative rings */
@keyframes nps-orbit-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
```

Add new utility classes:

```css
.nps-animate-rise-in {
  animation: nps-rise-in var(--nps-duration-reveal) var(--nps-ease-premium)
    forwards;
}
.nps-animate-glimmer {
  background: linear-gradient(
    90deg,
    transparent 25%,
    rgba(255, 255, 255, 0.06) 50%,
    transparent 75%
  );
  background-size: 200% 100%;
  animation: nps-glimmer 2s ease infinite;
}
.nps-animate-ring-pulse {
  animation: nps-ring-pulse 2.5s ease-in-out infinite;
}
.nps-animate-orbit-slow {
  animation: nps-orbit-slow 60s linear infinite;
}
```

Add new duration/easing variables to `:root` in `animations.css`:

```css
:root {
  /* ... existing ... */
  --nps-duration-reveal: 600ms;
  --nps-ease-premium: cubic-bezier(0.16, 1, 0.3, 1); /* Fast in, graceful out */
  --nps-ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

---

### PHASE 6 — COMPONENT SURGICAL TRANSFORMATIONS

#### 6.1 WelcomeBanner — From Greeting Card to Hero Sanctuary

**Current:** Dark gradient card, h1 greeting, date line, time, MoonPhaseWidget (always empty)
**Target:** Full-width hero. Display font. Orbital ring. Moon always visible.

```tsx
// Step 1: Fix Issue #137 — wire moonData
// In Dashboard.tsx:47:
// BEFORE: <WelcomeBanner isLoading={dailyLoading} />
// AFTER:  <WelcomeBanner
//           isLoading={dailyLoading}
//           moonData={daily?.moon_phase ?? null}
//           userName={user?.display_name ?? user?.username}
//         />

// Step 2: Upgrade h1 typography (WelcomeBanner.tsx:98)
// Add: style={{ fontFamily: 'var(--nps-font-display)', letterSpacing: '-0.02em' }}
// Change: text-2xl lg:text-3xl → text-3xl lg:text-4xl

// Step 3: Add decorative orbital ring (background element)
// Add this BEFORE the content div (absolute positioned, pointer-events-none):
<div
  className="absolute end-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-[0.06]"
  aria-hidden="true"
>
  <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
    {/* 3 concentric dashed rings, center dot */}
    <circle
      cx="100"
      cy="100"
      r="90"
      stroke="currentColor"
      strokeWidth="1"
      strokeDasharray="4 8"
      className="nps-animate-orbit-slow"
    />
    <circle
      cx="100"
      cy="100"
      r="65"
      stroke="currentColor"
      strokeWidth="1"
      strokeDasharray="3 6"
      style={{ animationDirection: "reverse", animationDuration: "40s" }}
    />
    <circle
      cx="100"
      cy="100"
      r="40"
      stroke="currentColor"
      strokeWidth="1"
      strokeDasharray="2 4"
      className="nps-animate-orbit-slow"
      style={{ animationDuration: "25s" }}
    />
    <circle cx="100" cy="100" r="4" fill="currentColor" opacity="0.6" />
  </svg>
</div>

// Step 4: Upgrade time display
// Add: nps-animate-number-reveal on currentTime element when it first loads

// Step 5: Upgrade glass overlay
// BEFORE: backdrop-blur-sm
// AFTER: [backdrop-filter:var(--nps-glass-blur-md)]
```

#### 6.2 StatsCards — From Data Grid to Intelligence Dashboard

**Current:** 4 identical glass cards. All grey. CountUp fires on mount.
**Target:** Each card unique. Own color identity. Numbers count up on scroll entry.

```tsx
// In StatsCards.tsx — add configuration:
const STAT_CONFIG = {
  totalReadings: {
    accent: "#4fc3f7",
    glowColor: "rgba(79, 195, 247, 0.15)",
    borderColor: "rgba(79, 195, 247, 0.30)",
    borderSolid: "#4fc3f7",
  },
  avgConfidence: {
    accent: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.30)",
    borderSolid: "#10b981",
  },
  mostUsedType: {
    accent: "#a78bfa",
    glowColor: "rgba(167, 139, 250, 0.12)",
    borderColor: "rgba(167, 139, 250, 0.25)",
    borderSolid: "#a78bfa",
  },
  streakDays: {
    accent: "#f8b400",
    glowColor: "rgba(248, 180, 0, 0.12)",
    borderColor: "rgba(248, 180, 0, 0.25)",
    borderSolid: "#f8b400",
  },
} as const;

// Each StatsCard receives its config and:
// 1. Left border: border-s-2 with borderSolid color (inline style)
// 2. Icon container: 40x40 circle, accent color at 12% opacity
// 3. Icon: accent color
// 4. Value text: accent color (NOT generic text-bright)
// 5. Hover glow: shadow using glowColor
// 6. CountUp: startOnView=true (fires on scroll entry)
// 7. Stagger: nps-delay-1 through nps-delay-4 on each card
// 8. Class: nps-animate-rise-in applied when card enters view
```

#### 6.3 QuickActions — From Button Stack to Horizontal Action Hub

**Current:** `grid-cols-1 sm:grid-cols-3 lg:grid-cols-1` — collapses to vertical on desktop
**Target:** `grid-cols-1 sm:grid-cols-3 lg:grid-cols-3` — always horizontal on desktop

```tsx
// Layout fix: remove the lg:grid-cols-1 override

// Per-button identity (update className for each button):
// 1. Oracle/Time button:
//    icon: text-nps-oracle-accent
//    hover glow: hover:shadow-[0_0_20px_rgba(79,195,247,0.18)]
//    subtle bg tint: hover:bg-[rgba(79,195,247,0.04)]
//    label: "Time Reading" + subtitle: "Full cosmic analysis"

// 2. Question button:
//    icon: text-nps-warning (amber #d29922)
//    hover glow: hover:shadow-[0_0_20px_rgba(248,180,0,0.15)]
//    hover bg tint: hover:bg-[rgba(248,180,0,0.04)]
//    label: "Ask Oracle" + subtitle: "Get direct guidance"

// 3. Name button:
//    icon: text-[var(--nps-accent)] (emerald)
//    hover glow: hover:shadow-[0_0_20px_rgba(16,185,129,0.18)]
//    hover bg tint: hover:bg-[rgba(16,185,129,0.04)]
//    label: "Name Reading" + subtitle: "Decode your name"

// Add arrow that slides right on hover (inside each button):
// <span className="opacity-0 translate-x-0 group-hover:opacity-100 group-hover:translate-x-1
//                  transition-all duration-200 text-current">→</span>
```

#### 6.4 DailyReadingCard — From Info Card to Oracle Portal

**Current:** Glass card with text content. Empty state is just EmptyState component.
**Target:** Oracle portal feel. Edge glow. FC60 stamp with animation. Rich empty state.

```tsx
// Card wrapper: add left accent border
// className: add "border-s-2 border-s-nps-oracle-accent/50"
// className: add shadow-[var(--nps-oracle-glow-subtle)]
// hover: shadow-[var(--nps-oracle-glow-medium)] transition-all duration-500

// When reading loads: apply nps-animate-stamp to FC60 badge

// FC60 stamp badge: add slow pulse animation (very subtle)
// className: add "nps-animate-glow-pulse" (already exists — 3s ease infinite)

// Empty state upgrade:
// Replace EmptyState component with inline content:
// - Large crystal ball icon (w-20 h-20)
// - Wrapped in double-ring: outer ring nps-animate-ring-pulse at 2.5s
//   inner ring nps-animate-ring-pulse at 3.5s (reversed, offset timing)
// - Title: styled with font-display
// - Subtitle: evocative ("The Oracle awaits...")
// - CTA button: bg-gradient-to-r from oracle-accent/20 to oracle-accent/10
//   border: border-nps-oracle-accent/30
//   hover: border-nps-oracle-accent/60 shadow-[0_0_12px_rgba(79,195,247,0.15)]
```

#### 6.5 RecentReadings — From List to Reading Archive

**Current:** Grid of reading cards. Confidence bar always oracle-blue. No type color.
**Target:** Reading type expressed visually. Confidence bar color reflects actual score.

```tsx
// Per-reading-type left border (add to ReadingCard or reading card wrapper):
// time:       border-s-2 border-s-[#4fc3f7]
// name:       border-s-2 border-s-[#10b981]
// question:   border-s-2 border-s-[#d29922]
// daily:      border-s-2 border-s-[#3fb950]
// multi_user: border-s-2 border-s-[#a371f7]

// Confidence bar color fix:
// BEFORE: always "from-nps-oracle-accent/60 to-nps-oracle-accent"
// AFTER: dynamic color based on confidence value:
//   confidence < 40:  "from-nps-error/60 to-nps-error"      (red)
//   confidence 40-70: "from-nps-warning/60 to-nps-warning"  (amber)
//   confidence 70-90: "from-nps-success/60 to-nps-success"  (green)
//   confidence > 90:  "from-nps-score-peak/60 to-nps-score-peak" (gold)
// (Note: nps.score.peak = #d4a017 in tailwind config)

// Hover: border color brightens to type accent
// group-hover:border-[type-color] (use inline style for dynamic color)

// Section heading "Recent Readings":
// Add subtitle in smaller text: "Your last {total} readings"
```

#### 6.6 Navigation Sidebar — From Links to Illuminated Pathways

**Current:** `bg-[var(--nps-accent)]/10 border-s-2` active state (flat)
**Target:** Gradient sweep + glow effect active state

```tsx
// Active link: replace current className
// BEFORE: "bg-[var(--nps-accent)]/10 text-[var(--nps-accent)] border-s-2 border-[var(--nps-accent)]"
// AFTER:
//   bg: inline style: background: "linear-gradient(90deg, rgba(16,185,129,0.12) 0%, transparent 100%)"
//   border: border-s-2 border-[var(--nps-accent)] (keep)
//   text: text-[var(--nps-accent)] (keep)
//   text glow: inline style: textShadow: "0 0 8px rgba(16,185,129,0.35)"
//   icon glow: inline style on icon: filter: "drop-shadow(0 0 4px rgba(16,185,129,0.5))"

// Inactive hover:
// BEFORE: hover:bg-[var(--nps-bg-hover)]
// AFTER: hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--nps-text)]

// Sidebar background:
// BEFORE: bg-[var(--nps-bg-sidebar)] (solid)
// AFTER: add background-image (inline or new class):
//   background: "linear-gradient(180deg, var(--nps-bg-sidebar) 0%, rgba(5,8,14,0.98) 100%)"

// Logo text (NPS):
// Add style={{ fontFamily: 'var(--nps-font-display)' }}
```

#### 6.7 Oracle Loading — From Spinner to Awakening Ritual

**Current:** `LoadingAnimation.tsx` — pulsing 3-layer orb, flat progress bar, text, cancel
**Target:** The Oracle Awakening — cinematic 5-act sequence

```tsx
// Complete redesign of LoadingAnimation.tsx:
//
// ACT 1 — The Rings (always visible):
//   3 concentric SVG rings orbiting at different speeds
//   Outer: 8s orbit, 140px diameter, rgba(79,195,247,0.12), dashed
//   Mid:   5s counter-orbit, 96px diameter, rgba(79,195,247,0.20), dashed
//   Inner: 3s orbit, 52px diameter, rgba(79,195,247,0.35), dashed
//   Center: 16px solid #4fc3f7 orb, nps-animate-orb-pulse
//
// ACT 2 — Step Messages (typewriter):
//   Each message types character by character using CSS animation:
//   - Apply steps() timing to width from 0 to 100%
//   - cursor blink (nps-cursor-blink) on right border of text
//   - Message container: overflow:hidden, white-space:nowrap
//   - When message is done, fade it out (opacity 0, 300ms)
//   - Fade in next message
//
// ACT 3 — Progress track:
//   Height: 2px (h-0.5) instead of 4px (h-1)
//   Fill: oracle-accent with nps-animate-glimmer shimmer
//   Track glow: box-shadow: 0 0 8px rgba(79,195,247,0.30) on fill element
//   Width: transition-all duration-700 (smoother than 500ms)
//
// ACT 4 — Step dots (replace "Step X of Y" text):
//   Row of N dots (N = total steps)
//   Past steps: filled #4fc3f7 circle, 8px
//   Current: 12px, bright #4fc3f7, box-shadow glow
//   Future: 8px, rgba(79,195,247,0.25) border, transparent fill
//   Transition between dots: 300ms scale + color
//
// ACT 5 — Cancel link:
//   Position: bottom, mt-8 (more breathing room)
//   Style: text-xs text-nps-text-dim
//   Hover: text-nps-oracle-accent
//   Add: subtle "✕ Cancel" with x icon
```

#### 6.8 Oracle Page — The Sacred Space

**Current:** Oracle.tsx — two-panel layout, white background, standard glass cards
**Target:** Oracle page has its own ambient background — entering the Oracle feels different

```tsx
// Add to Oracle.tsx wrapper div:
// data-page="oracle" attribute

// In index.css:
[data-page="oracle"] {
  background-image:
    radial-gradient(ellipse 100% 60% at 50% 0%,
      rgba(79, 195, 247, 0.07) 0%, transparent 70%),
    radial-gradient(ellipse 60% 80% at 0% 100%,
      rgba(16, 185, 129, 0.04) 0%, transparent 60%),
    radial-gradient(ellipse 80% 50% at 20% 0%,
      var(--nps-orb-oracle) 0%, transparent 60%);
}
// Note: these are additive on top of body's ambient orbs

// User profile card title: add font-display
// Reading type selector — active tab upgrade:
// BEFORE: bg-[var(--nps-accent)] text-white font-medium shadow-[0_0_8px_var(--nps-glass-glow)]
// AFTER: same + add subtle gradient to active tab bg:
//   background: "linear-gradient(135deg, var(--nps-accent) 0%, var(--nps-accent-hover) 100%)"
//   box-shadow: "0 0 12px rgba(16,185,129,0.25)"
```

---

### PHASE 7 — INTERACTION POLISH

#### Button Hover States

```css
/* Add to index.css */
/* Primary (gradient) button lift effect */
.nps-btn-primary,
[class*="bg-gradient-to-r"][class*="from-"][class*="to-"] {
  transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.nps-btn-primary:hover,
[class*="from-nps-accent"]:hover {
  box-shadow:
    0 0 24px rgba(16, 185, 129, 0.25),
    0 4px 20px rgba(0, 0, 0, 0.3);
  transform: translateY(-1px);
}

.nps-btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.15);
}
```

#### Input Focus States

```css
/* Add to index.css — replace current focus border pattern */
input:focus,
textarea:focus {
  border-color: rgba(79, 195, 247, 0.6) !important;
  box-shadow:
    0 0 0 3px rgba(79, 195, 247, 0.1),
    0 0 8px rgba(79, 195, 247, 0.08);
  outline: none;
}
```

#### Card Hover Depth (Global Pattern)

```css
/* The universal card hover — works for all glass cards */
/* Cards already have hover:scale, hover:shadow — but upgrade to: */
.nps-card-hover {
  transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
}
.nps-card-hover:hover {
  transform: translateY(-2px);
  box-shadow: var(--nps-glow-md);
  border-color: rgba(79, 195, 247, 0.28);
}
```

---

### PHASE 8 — TAILWIND CONFIG UPGRADES

**FILE: `frontend/tailwind.config.ts`**

```typescript
// fontFamily — replace current:
fontFamily: {
  sans: ['"Lora"', '"Georgia"', 'serif'],
  display: ['"Cinzel Decorative"', 'serif'],
  mono: ['"JetBrains Mono"', '"Consolas"', 'monospace'],
},

// Add to colors.nps:
stat: {
  readings:   '#4fc3f7',
  confidence: '#10b981',
  type:       '#a78bfa',
  streak:     '#f8b400',
},

// Add new keyframe animations:
animation: {
  // ... existing ...
  'nps-rise-in':      'nps-rise-in 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
  'nps-glimmer':      'nps-glimmer 2s ease infinite',
  'nps-ring-pulse':   'nps-ring-pulse 2.5s ease-in-out infinite',
  'nps-orbit-slow':   'nps-orbit-slow 60s linear infinite',
},
keyframes: {
  // ... existing ...
  'nps-rise-in': {
    from: { opacity: '0', transform: 'translateY(24px) scale(0.97)', filter: 'blur(4px)' },
    to:   { opacity: '1', transform: 'translateY(0) scale(1)',        filter: 'blur(0)' },
  },
  'nps-glimmer': {
    '0%':   { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  'nps-ring-pulse': {
    '0%':   { transform: 'scale(0.85)', opacity: '0.8' },
    '50%':  { transform: 'scale(1.20)', opacity: '0.3' },
    '100%': { transform: 'scale(0.85)', opacity: '0.8' },
  },
  'nps-orbit-slow': {
    from: { transform: 'rotate(0deg)' },
    to:   { transform: 'rotate(360deg)' },
  },
},
```

---

### PHASE 9 — RTL/PERSIAN SAFEGUARDS

All design changes must preserve Persian (RTL) support:

1. **Font rule:** Cinzel Decorative is LATIN ONLY. The `html[dir="rtl"]` override
   in `index.css` ensures Persian users always get Vazirmatn. This must not be removed.

2. **Gradient directions:** Use `to right` for LTR and `to left` for RTL.
   To handle this CSS-logically: use `to inline-end` (CSS logical property).
   Or in Tailwind: `bg-gradient-to-r` + `rtl:bg-gradient-to-l`.

3. **Orbital ring animation:** Rotation is direction-neutral. Safe on RTL.

4. **Border sides:** Continue using `border-s-*` not `border-l-*` for start-side borders.
   `border-s-2` is RTL-aware (flips to right side in RTL). All existing components use this correctly.

5. **Ambient orb positioning:** The `at 20% 0%` coordinates in the body radial-gradient are
   position values, not directional — they work the same in RTL. No change needed.

6. **Text shadows / glows:** Use symmetric blur (equal on all sides) like
   `text-shadow: 0 0 8px rgba(...)` — NOT directional like `-2px 0 8px rgba(...)`.

7. **Navigation gradient:** `linear-gradient(90deg, ...)` is directional.
   In RTL sidebar, reverse: use `270deg` or `to right` via Tailwind `rtl:` variant.

---

### IMMEDIATE WINS TABLE

These can be done in a single 2-hour session and provide massive visual lift:

| What                   | File + Location                    | Exact Change                                    | Impact                  | Time  |
| ---------------------- | ---------------------------------- | ----------------------------------------------- | ----------------------- | ----- |
| Connect moonData       | `Dashboard.tsx:47`                 | Add `moonData={daily?.moon_phase ?? null}` prop | High — fills empty slot | 5min  |
| Connect userName       | `Dashboard.tsx:47` + useAuth       | Add `userName={user?.display_name}` prop        | Medium                  | 10min |
| Add `::selection`      | `index.css`                        | 5 lines of CSS shown in Phase 3                 | Polish                  | 2min  |
| Upgrade scrollbar      | `index.css`                        | 8px→4px, oracle-accent color                    | Premium feel            | 5min  |
| Add ambient orbs       | `index.css` → `body`               | `background-image:` with 3 radial-gradients     | Depth                   | 5min  |
| Add font imports       | `index.html`                       | Google Fonts link for Cinzel + Lora             | Character               | 5min  |
| Switch body font       | `index.css`                        | `"Inter"` → `"Lora"`                            | Identity                | 5min  |
| h1 display font        | `WelcomeBanner.tsx:98`             | Add inline `fontFamily` style                   | Premium heading         | 3min  |
| Deepen glass blur      | `theme.css`                        | Add `--nps-glass-blur-md` var, update uses      | Visible depth           | 10min |
| Add glow vars          | `theme.css`                        | Add `--nps-glow-xs/sm/md/lg` variables          | Enables all hover glows | 10min |
| Upgrade border opacity | `theme.css`                        | `--nps-glass-border: rgba(...0.18)` from 0.15   | Crispness               | 2min  |
| Add stat colors        | `StatsCards.tsx`                   | 4-entry config, per-stat accent color           | High visual impact      | 30min |
| CountUp on scroll      | `CountUp.tsx` + new `useInView.ts` | Add startOnView prop + hook                     | Delight                 | 30min |
| Upgrade focus ring     | `index.css`                        | Add `box-shadow` glow to focus-visible rule     | Accessibility + polish  | 5min  |

Total for immediate wins: ~3 hours → **app looks 70% better**

---

### WHAT "BEAUTY" LOOKS LIKE WHEN DONE

When all 9 phases are complete alongside ISSUES.md fixes:

**On first page load:**
The background breathes — oracle blue at top-left, emerald at bottom-right, subtle purple at center.
Not flat black. Alive.

**The greeting:**
"Cinzel Decorative" typeface. The welcome message looks like it was carved in stone, not typed.
The moon phase always shows (Issue #137 fixed). The orbital ring spins slowly in the background.

**Scrolling to stats:**
The four stat cards appear one by one — counting up from zero. Each glows its own color:
oracle blue, emerald, purple, gold. This is mission control, not a table.

**Quick actions:**
Three horizontal tiles. Hovering one shifts its glow color and a small arrow slides right.
Each has a subtitle. Each knows what it is.

**Entering the Oracle:**
The page gains a deeper blue ambient layer. Form inputs glow oracle-accent on focus.
The reading type tabs have a gradient active state.

**Submitting a reading:**
Three concentric rings orbit. A message types itself. A dot advances in the step sequence.
This is not a spinner. The Oracle is awakening.

**Reading results:**
Each section fades in staggered. The big number blurs-in with scale. The FC60 stamp stamps.
The confidence bar is gold (high confidence). The tab navigation is a premium pill.

**Hovering anything:**
Cards lift 2px. Borders brighten. Glows expand outward. Nothing is static.

**Text selection:**
Highlight text — it's oracle blue. Even selection is branded.

**The scrollbar:**
4px thin. Oracle accent. Premium restraint.

The NPS app, after this transformation, does not look like an app someone built.
It looks like a world someone designed.
