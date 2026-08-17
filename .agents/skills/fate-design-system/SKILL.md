---
name: fate-design-system
description: Apply the Fate consumer front-end design system when explicitly invoked for Nuxt/Vue UI work, CSS changes, reusable components, loading, snackbars, buttons, forms, overlays, surfaces, or empty/error/offline states. Use only for the consumer-facing app; exclude /cms. Do not invoke implicitly.
---

# Fate Design System

Keep Fate front-end changes visually consistent, reusable, accessible, and compatible with the existing Nuxt 3 application. Preserve the paper, mountain-green, jade, tea, gold, and cinnabar visual language.

## Required workflow

1. Confirm the changed UI is outside `/cms`. Stop using this skill for CMS-only work.
2. Inspect `assets/css/main.css`, relevant `App*` components, and nearby usages before designing a new pattern.
3. Read [design-tokens.md](references/design-tokens.md) for CSS or layout work.
4. Read [component-contracts.md](references/component-contracts.md) before creating or changing a shared interaction.
5. Reuse an existing component. Create a new `App*` component only when the pattern already has two uses or a second use is explicitly planned.
6. Take an audit baseline before editing touched UI files:

   ```bash
   node .agents/skills/fate-design-system/scripts/audit-ui.mjs snapshot --output /tmp/fate-design-system-baseline.json --files <files...>
   ```

7. Implement with semantic tokens. Do not introduce a near-duplicate color, shadow, radius, layer, motion duration, loader, snackbar, button, dialog, or state component.
8. Check only the current task's changes against the baseline:

   ```bash
   node .agents/skills/fate-design-system/scripts/audit-ui.mjs check --baseline /tmp/fate-design-system-baseline.json --files <files...>
   npm run typecheck
   ```

9. Also run `NUXT_DISABLE_PWA=1 npm run build` after changing tokens, shared components, layouts, or Nuxt configuration.
10. Report which existing components were reused, which public component contracts changed, and which checks passed.

## Hard rules

- Keep the current light theme. Do not add dark-mode values.
- Use Lucide for new icons. Leave legacy Material Icons alone unless the touched UI is being migrated.
- Meet WCAG 2.2 AA: keyboard access, visible focus, programmatic labels, associated errors, sufficient contrast, reduced motion, and at least 44px touch targets.
- Keep body and interactive text at least 14px. Use 12px only for nonessential captions or timestamps.
- Design mobile-first and preserve safe-area insets. Adapt to desktop without creating a second visual language.
- Use functional, restrained motion. Disable nonessential movement and looping decoration under `prefers-reduced-motion`.
- Do not claim visual correctness from static checks alone. This skill requires programmatic QA, not screenshot QA.

## Scope boundaries

- Include: tokens, Loading, Snackbar, Button, Field/Input/Textarea/Select, Bottom Sheet/Dialog, Surface, and Empty/Error/Offline State.
- Exclude in v1: CMS, Tabs, Navbar, Breadcrumb, Badge, Pagination, and broad page migrations.
- Preserve unrelated dirty-worktree changes. Baseline files before editing and audit only lines introduced by the current task.
