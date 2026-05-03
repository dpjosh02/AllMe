# AllMe Design System

AllMe should feel like a personal command ledger: calm, data-first, and quick to scan. The interface should not chase decorative SaaS trends. It should make daily decisions obvious.

## Research Synthesis

Reference products and sources reviewed:

- Vercel Geist emphasizes consistent foundations, strong component contracts, restrained surfaces, and tabular numeric treatment for technical dashboards: https://vercel.com/geist/introduction and https://vercel.com/design/guidelines
- Stripe's color-system writing prioritizes accessible contrast and semantic color roles over decoration: https://stripe.com/in/blog/accessible-color-systems
- Linear's redesign notes support generated theme systems and minimal surfaces that still handle many states: https://linear.app/now/how-we-redesigned-the-linear-ui
- Mercury's transactions work shows finance UX benefits from spreadsheet-like density, cash-flow grouping, and transaction-first controls: https://mercury.com/blog/updated-transactions-page
- General dashboard guidance reinforces a stable grid, whitespace, and color used as meaning rather than ornament: https://www.datawirefra.me/blog/dashboard-design-best-practices

Extracted principles:

- Use color to encode meaning: green for inflow, red for outflow, amber for warning/review, and one brand accent for focus.
- Prefer neutral surfaces and high-quality spacing over gradients, illustrations, and visual noise.
- Use tabular numbers for money, counts, dates, and metrics.
- Keep frequently scanned data at card/list level; hide deeper workflows in modals or compact disclosure panels.
- Dark mode needs its own token system, not inverted light colors.

## Design Philosophy

AllMe is a quiet operating system, not a marketing dashboard.

- `High-signal`: every visible element should answer "what changed?" or "what should I do?"
- `Ledger-grade`: money, schedules, chores, and health are records, so typography and alignment must feel precise.
- `Personal, not playful`: the visual language can be distinctive, but it should not feel gamified.
- `Dark-first`: dark mode is the primary working environment; light mode is supported but secondary.
- `Progressive disclosure`: filters, rule builders, and editing workflows stay collapsed until requested.

## Color System

Core dark tokens:

- `--background`: deep green-black app canvas.
- `--panel`: primary elevated card surface.
- `--panel-strong`: selected/hover card surface.
- `--empty`: recessed surface for row hovers and secondary containers.
- `--line`: low-contrast divider and border.
- `--accent`: glacier blue used for primary focus and icon emphasis, not decoration.
- `--success`: positive money/inflow.
- `--danger`: negative money/outflow/destructive.
- `--warn`: review-needed and caution states.

Rules:

- Accent is for current focus, primary actions, and selected affordances.
- Money never depends on color alone; keep sign/direction visible in text.
- Avoid more than one saturated non-semantic accent in a single viewport.
- Avoid neon yellow in dark mode unless it is a deliberate warning/highlight state; it competes too aggressively with money colors.

Accent directions considered:

- `Glacier blue` current: calm, technical, crisp against dark green-black.
- `Mineral teal`: closer to finance/productivity conventions, slightly safer but less distinctive.
- `Soft copper`: warm and premium, but risks colliding with warning/review states.
- Borders should define structure before shadows do.

## Typography

Current stack:

```css
"Avenir Next", "Aptos", "Segoe UI", "Helvetica Neue", sans-serif
```

Scale:

- Page display: `text-4xl` to `text-6xl`, `font-semibold`, tight tracking.
- Section title: `text-2xl`, `font-semibold`, slight negative tracking.
- Metric values: `text-3xl`, `font-semibold`, tabular numbers.
- Labels/kickers: `0.72rem`, uppercase, wide letter spacing, muted.
- Body/helper text: `text-sm`, muted, line-height 1.5-1.6.

Rules:

- Use uppercase only for compact labels, never body copy.
- Metric numerals should align visually via tabular numbers.
- Prefer fewer weights: regular, medium/semibold, bold only for rare emphasis.

## Spacing And Layout

- Base rhythm: 4px/8px increments.
- Page gutters: 20px mobile, 32px tablet, 40px desktop.
- Section gap: 28px.
- Card padding: 20-24px.
- Dense row padding: 12px vertical, 12px horizontal.
- Card radius: 18px for primary cards, 14px for nested cards, 12px for controls.

Rules:

- Major regions should read as a small set of calm blocks.
- Lists should be denser than cards but still have hover/focus affordance.
- Filters should be row-by-row disclosure, not a full-width control wall.

## Component Patterns

Cards:

- Use `.allme-card` for elevated sections.
- Use `.allme-card-subtle` for nested panels and empty states.
- Avoid nested heavy shadows.
- Component headers should rely on eyebrow, title, icon, and layout context. Avoid rendering descriptive subtext inside card headers unless a specific workflow needs clarification.

Metric tiles:

- Kicker, icon, large value, one-line explanation.
- Use semantic money color only on the value.

Transaction list:

- Row hover uses `--empty`.
- Category is a compact badge.
- Details live in modal, not in the row.

Navigation:

- The long-term app shell should use a persistent left rail for Finance, Calendar, Notes, Tasks, Activity.
- Current page-level breadcrumb style should remain until the shell exists.

Filters/search:

- Search remains visible because it is high-frequency.
- Filters are grouped under one button.
- Filter groups are collapsed by default and expand one row at a time.

Tags/badges:

- Tags use a colored border/dot plus label.
- Tag color is category identity, not semantic status unless the category itself is semantic.

## Finance Screen Directions

These are four viable AllMe finance screens. The first is currently implemented.

1. `Command Ledger`: dark-first, compact, account list plus ledger list, direct actions, minimal glow. Best for day-to-day use.
2. `Morning Brief`: finance summary as a daily narrative, with "needs review", "cash moved", and "top changes" cards above transactions. Best for daily check-in.
3. `Balance Sheet`: account/net-worth first, holdings and balances dominate, transactions become supporting evidence. Best once investment holdings are fully modeled.
4. `Review Queue`: uncategorized and rule-training first, optimized for cleaning data and building personal automation. Best as an L2 workflow.

## Implementation Notes

- Global token classes live in `src/app/globals.css`.
- Finance currently uses the `Command Ledger` direction.
- Future sections should reuse `.allme-page`, `.allme-card`, `.allme-card-subtle`, `.allme-control`, and `.allme-kicker`.
- Avoid adding one-off colors in components unless they become semantic tokens.
