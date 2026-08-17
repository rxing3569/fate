<script setup lang="ts">
import { LoaderCircle } from "@lucide/vue";

const button = ref<HTMLButtonElement | null>(null);

defineExpose({ focus: () => button.value?.focus() });

withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "small" | "medium" | "large";
    type?: "button" | "submit" | "reset";
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    iconOnly?: boolean;
    ariaLabel?: string;
  }>(),
  {
    variant: "primary",
    size: "medium",
    type: "button",
    loading: false,
    disabled: false,
    block: false,
    iconOnly: false,
    ariaLabel: undefined,
  },
);
</script>

<template>
  <button
    ref="button"
    class="app-design-button"
    :class="[
      `app-design-button--${variant}`,
      `app-design-button--${size}`,
      { 'app-design-button--block': block, 'app-design-button--icon': iconOnly },
    ]"
    :type="type"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
    :aria-label="ariaLabel"
  >
    <LoaderCircle v-if="loading" class="app-design-button__spinner" :size="18" aria-hidden="true" />
    <slot v-else name="leading" />
    <span v-if="!iconOnly" class="app-design-button__label"><slot /></span>
    <slot v-if="!loading" name="trailing" />
    <slot v-if="iconOnly && !loading" />
  </button>
</template>

<style scoped>
.app-design-button { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-width: 0; padding-inline: var(--space-4); border: 1px solid var(--color-brand-primary); border-radius: var(--radius-lg); background: var(--color-brand-primary); color: var(--white); font-size: var(--font-size-body-sm); font-weight: var(--font-weight-bold); transition: background var(--motion-fast) var(--ease-standard), border-color var(--motion-fast) var(--ease-standard), opacity var(--motion-fast) var(--ease-standard); }
.app-design-button--small { min-height: 40px; padding-inline: var(--space-3); }
.app-design-button--small::before { content: ""; position: absolute; inset: -2px 0; }
.app-design-button--medium { min-height: 48px; }
.app-design-button--large { min-height: 56px; padding-inline: var(--space-6); font-size: var(--font-size-body); }
.app-design-button--secondary { background: var(--color-surface-strong); color: var(--color-brand-primary); }
.app-design-button--ghost { border-color: transparent; background: transparent; color: var(--color-brand-primary); }
.app-design-button--danger { border-color: var(--color-danger); background: var(--color-danger); }
.app-design-button--block { width: 100%; }
.app-design-button--icon { width: 44px; min-height: 44px; padding: 0; border-radius: var(--radius-pill); }
.app-design-button:disabled { opacity: .45; cursor: default; }
.app-design-button__label { min-width: 0; }
.app-design-button__spinner { animation: app-design-spin 800ms linear infinite; }
@keyframes app-design-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .app-design-button { transition: none; }.app-design-button__spinner { animation-duration: 1600ms; } }
</style>
