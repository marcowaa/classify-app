# Brand Visual System - Classify

This document is the visual source of truth for UI work in Classify.
It defines how pages should look, feel, and behave based on audience and intent.

## 1) Brand Intent

- Product mission: safe, guided, confidence-building educational experience for children and parents.
- Emotional tone: trust first, then motivation, then delight.
- Design target: premium but warm, with clear hierarchy and low cognitive load.

## 2) Primary Audiences

- Parent/Guardian: needs trust, control, clarity, predictable actions.
- Child: needs excitement, clarity, playful guidance, quick rewards.
- Admin/School/Teacher/Library: needs efficiency, data density, lower decoration.

## 3) Core Color Identity

Use these as primary brand references across landing/auth/age-gate surfaces.

- Deep background base: `#061a2b`
- Deep background mid: `#0b2238`
- Accent cyan: `#06b6d4`
- Accent teal: `#14b8a6`
- Child trial accent: `#8b5cf6`
- Child trial accent deep: `#7c3aed`
- Neutral surface glass: `rgba(255,255,255,0.05)`
- Border glass: `rgba(255,255,255,0.15)`

### Semantic Use

- Parent/guardian primary actions: cyan -> teal gradients.
- Child/trial playful path: violet gradients.
- Trust chips and policy confidence labels: cyan/emerald/violet tinted badges.
- Error actions: keep red system styles only for validation/error states.

## 4) Typography

- Arabic-first stack for auth/onboarding: `"Cairo","Noto Kufi Arabic","Segoe UI",sans-serif`
- Mixed playful/support pages: `"Tajawal","Baloo 2","Cairo","Segoe UI",sans-serif`
- Title style: bold to black (`font-bold` to `font-black`) with compact line-height.
- Body style: high contrast (`text-white/70+` on dark surfaces).

## 5) Surface Language

- Radius system:
  - Hero cards: 28-30px
  - Sections: 16-20px
  - Inputs/buttons: 12-16px
- Glass pattern:
  - `bg-white/5` + `backdrop-blur-2xl` for major cards
  - `border-white/10` to `border-white/20` for depth
- Elevation:
  - Primary card shadow: strong soft shadow with dark blue tint

## 6) Motion System

- Use short transitions (150-250ms) for hover/press state.
- Buttons: micro-scale only (`hover:scale-[1.01]`, `active:scale-[0.99]`).
- Reveal sections: opacity + y-translation, avoid heavy transforms.
- Avoid excessive animation loops on task-critical pages.

## 7) Component Recipes

### A) Parent/Auth-Like Pages (Trust + Conversion)

- Background: deep navy with cyan/teal radial glows.
- CTA: cyan/teal gradient.
- Form card: glassmorphism with high readability.
- Message hierarchy: value proposition > form > reassurance chips > legal link.

### B) Age Gate (Decision + Routing)

- Large central age value with clear intent label.
- Slider with major ticks and threshold marker (parent threshold).
- Dynamic CTA text based on selected route.
- Optional policy hub in collapsible format with crawlable links.

### C) Child-Facing Discovery

- Keep playful accents and friendlier icon density.
- Preserve readability and avoid over-noise.
- Reward cues and progress bars should be vivid but not flashing.

### D) Admin/Operational Pages

- Reduce decorative gradients.
- Increase table/form clarity and predictable spacing.
- Keep action colors consistent with status semantics.

## 8) Layout Rules

- Mobile-first.
- Keep primary action visible without long scrolling when possible.
- Use sticky CTA only for critical one-step funnels on mobile.
- Keep floating third-party buttons from obscuring CTA/input areas.

## 9) Accessibility Rules

- Maintain readable contrast on every critical label and action.
- Focus states must remain visible on dark surfaces.
- Arabic RTL support is mandatory for all structural updates.
- Use clear labels, not icon-only actions for critical decisions.

## 10) SEO-Aware UI Rules

- Important policy links should be direct anchors when possible.
- Public-facing entry screens should include crawlable links to legal pages.
- Route metadata should map to user intent (`age-gate`, `parent-auth`, etc.).

## 11) Do / Don't

### Do

- Reuse cyan/teal trust palette for parent conversion flows.
- Use violet accents for child-trial route cues.
- Keep titles explicit and action text outcome-oriented.

### Don't

- Mix random new palettes per page.
- Use low-contrast helper text on dark cards.
- Hide critical route context from users (parent vs child path).

## 12) Decision Matrix (What style fits what)

- If page goal is trust + account action -> Parent/Auth visual language.
- If page goal is route selection for age/persona -> AgeGate language with split cues.
- If page goal is child engagement -> playful child accents with clear guardrails.
- If page goal is operations/data -> admin utility style over decoration.

## 13) Implementation Checklist for Future UI Work

- Confirm audience: parent / child / admin.
- Select palette branch: trust cyan-teal / playful violet.
- Ensure CTA text describes exact next result.
- Validate RTL and mobile sticky-safe spacing.
- Add/verify legal discoverability on public funnels.
- Keep translations updated across all app locales.

