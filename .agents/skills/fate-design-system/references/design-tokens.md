# Fate design tokens

Treat `assets/css/main.css` as the runtime source of truth. Preserve legacy aliases while migrating touched code to semantic names.

## Color

- Canvas and surfaces: `--color-bg-canvas`, `--color-bg-subtle`, `--color-surface`, `--color-surface-strong`.
- Brand and text: `--color-brand-primary`, `--color-brand-secondary`, `--color-text-primary`, `--color-text-secondary`.
- Accents and feedback: `--color-accent-tea`, `--color-accent-gold`, `--color-danger`, `--color-success`, `--color-warning`, `--color-info`.
- Structure: `--color-border`, `--color-border-strong`, `--color-focus`.
- Never add a raw hex, rgb, hsl, or named color outside the token declaration block. Alpha variants must use an existing token or a declared semantic token.

## Typography

- `--font-size-caption`: 12px; nonessential metadata only.
- `--font-size-body-sm`: 14px; minimum body and control copy.
- `--font-size-body`: 16px; default reading size.
- `--font-size-heading`: 20px; section headings.
- `--font-size-title`: 28px; page titles.
- `--font-size-display`: 40px; rare hero text.
- Use the existing system/Noto Sans TC stack. Use weight tokens instead of arbitrary numeric weights.

## Geometry and elevation

- Spacing scale: 4, 8, 12, 16, 24, 32, 48px through `--space-*` tokens.
- Radius scale: 10, 14, 18, 24px and pill through `--radius-*` tokens.
- Elevation: `--shadow-raised`, `--shadow-floating`, and `--shadow-focus`.
- Layers: content, sticky header, navigation, overlay, snackbar. Never add a numeric z-index outside the root token block.

## Motion and responsive layout

- Durations: `--motion-fast` 120ms, `--motion-base` 220ms, `--motion-slow` 320ms.
- Use `--ease-standard` for ordinary state changes and `--ease-emphasized` for overlay entry/exit.
- Approved breakpoints are 430px, 760px, and 1024px. CSS variables cannot drive media queries, so the audit allowlist enforces these literal values.
- Default to content width and safe-area behavior already provided by `AppPageLayout` and the default layout.

## Allowed literals

Use `0`, `1px` borders, percentages, viewport units, `auto`, and calculation results where they express structure rather than a design choice. Use tokens for colors, spacing, radii, shadows, layer values, typography, and motion.
