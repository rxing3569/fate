# Fate component contracts

## Selection order

Use the smallest existing component that owns the interaction. Keep business composition in the page. Extract an `App*` component only after two uses or an explicit second planned use.

## Loading

- Use `AppLoading` with `scope="page"` for a blocked page and `scope="section"` for a local refresh.
- Pass `active`; page and section indicators appear after 300ms and change to the long-wait message after 8 seconds.
- Use `AppButton loading` for actions. Do not place a second spinner beside a loading button.
- Keep `AstrologyLoader` and `AnalysisProgressBar` only as compatibility wrappers.

## Snackbar

- Mount one `AppSnackbarHost` in the consumer layout.
- Call `showAppSuccess`, `showAppInfo`, `showAppWarning`, or `showAppError`.
- Defaults: success/info 3 seconds; warning/error 5 seconds. Pause while hovered, focused, or actively touched.
- Allow one optional action: either route navigation or a callback. Keep a close control. Deduplicate adjacent equal messages.
- Position above mobile bottom navigation and at the consumer content center on desktop.

## Button

- Use `AppButton` variants `primary`, `secondary`, `ghost`, or `danger` and sizes `small`, `medium`, or `large` (40/48/56px).
- Use `icon-only` only with an accessible label and at least a 44px hit area.
- Let the component own loading, disabled, focus, and icon spacing.

## Form controls

- Use `AppField` as the label/help/error owner. Use `AppInput`, `AppTextarea`, or `AppSelect` as its control.
- Show validation after first blur or submit, then update while editing.
- Associate help and error copy with `aria-describedby`; set `aria-invalid` only for a visible error.
- Continue using specialized date, time, and city pickers, but place them under the same field semantics.

## Overlay

- Use `AppBottomSheet`; it renders as a bottom sheet below 760px and a centered dialog at wider viewports.
- Default dismissal: close control, Escape, backdrop, and mobile swipe. Use `locked` only while interruption is unsafe.
- Trap focus while open, focus the dialog or first interactive element, and restore the opener on close.

## Surface and state

- Use `AppSurface` variants `base`, `raised`, or `interactive`; do not recreate glass backgrounds or shadows locally.
- Use `AppState` variants `empty`, `error`, or `offline`, with at most one primary and one secondary action.
- Prefer semantic slots and props over styling through deep selectors.
