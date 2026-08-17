<script setup lang="ts">
import { Ellipsis } from "@lucide/vue";
import type { Component } from "vue";

interface AppActionMenuItem {
  id: string;
  label: string;
  loadingLabel?: string;
  icon: Component;
  disabled?: boolean;
  loading?: boolean;
  premium?: boolean;
}

const props = withDefaults(
  defineProps<{
    items: AppActionMenuItem[];
    label?: string;
  }>(),
  { label: "更多操作" },
);
const emit = defineEmits<{ select: [id: string] }>();

const root = ref<HTMLElement | null>(null);
const trigger = ref<{ focus: () => void } | null>(null);
const open = ref(false);

function close(restoreFocus = false) {
  if (!open.value) return;
  open.value = false;
  if (restoreFocus) nextTick(() => trigger.value?.focus());
}

function toggle() {
  open.value = !open.value;
}

function select(item: AppActionMenuItem) {
  if (item.disabled || item.loading) return;
  close();
  emit("select", item.id);
}

function menuButtons() {
  return Array.from(
    root.value?.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)',
    ) || [],
  );
}

function handleKeydown(event: KeyboardEvent) {
  if (!open.value) return;
  if (event.key === "Escape") {
    event.preventDefault();
    close(true);
    return;
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const buttons = menuButtons();
  if (!buttons.length) return;
  event.preventDefault();
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === "Home"
    ? 0
    : event.key === "End"
      ? buttons.length - 1
      : event.key === "ArrowDown"
        ? (current + 1 + buttons.length) % buttons.length
        : (current - 1 + buttons.length) % buttons.length;
  buttons[next]?.focus();
}

function handlePointerDown(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) close();
}

watch(open, (value) => {
  if (value) nextTick(() => menuButtons()[0]?.focus());
});

onMounted(() => {
  document.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("keydown", handleKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handlePointerDown);
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div ref="root" class="app-action-menu">
    <AppButton
      ref="trigger"
      class="app-action-menu-trigger"
      variant="ghost"
      size="small"
      icon-only
      :aria-label="label"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >
      <Ellipsis :size="24" aria-hidden="true" />
    </AppButton>
    <Transition name="app-action-menu">
      <AppSurface
        v-if="open"
        as="div"
        variant="raised"
        class="app-action-menu-panel"
        role="menu"
        :aria-label="label"
      >
        <AppButton
          v-for="item in props.items"
          :key="item.id"
          variant="ghost"
          size="medium"
          block
          role="menuitem"
          :loading="item.loading"
          :disabled="item.disabled"
          :aria-label="item.loading ? item.loadingLabel || item.label : item.label"
          @click="select(item)"
        >
          <template #leading>
            <component :is="item.icon" :size="18" aria-hidden="true" />
          </template>
          <span>{{ item.loading ? item.loadingLabel || item.label : item.label }}</span>
          <template v-if="item.premium" #trailing>
            <small>Premium</small>
          </template>
        </AppButton>
      </AppSurface>
    </Transition>
  </div>
</template>

<style scoped>
.app-action-menu {
  position: relative;
  display: grid;
  place-items: center;
}
.app-action-menu-trigger[aria-expanded="true"] {
  background: var(--color-bg-subtle);
}
.app-action-menu-panel {
  position: absolute;
  z-index: var(--layer-overlay);
  top: calc(100% + var(--space-2));
  right: 0;
  display: grid;
  gap: var(--space-1);
  width: max-content;
  min-width: 190px;
  padding: var(--space-2);
  border-radius: var(--radius-lg);
  background: var(--color-bg-canvas) !important;
  box-shadow: var(--shadow-floating);
}
.app-action-menu-panel :deep(.app-design-button) {
  justify-content: flex-start;
  white-space: nowrap;
}
.app-action-menu-panel :deep(.app-design-button__label) {
  flex: 1;
  text-align: left;
}
.app-action-menu-panel small {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-bg-subtle);
  color: var(--color-accent-tea);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-bold);
}
.app-action-menu-enter-active,
.app-action-menu-leave-active {
  transition:
    opacity var(--motion-fast) var(--ease-standard),
    transform var(--motion-fast) var(--ease-standard);
  transform-origin: top right;
}
.app-action-menu-enter-from,
.app-action-menu-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--space-1) * -1));
}
@media (prefers-reduced-motion: reduce) {
  .app-action-menu-enter-active,
  .app-action-menu-leave-active {
    transition: none;
  }
}
</style>
