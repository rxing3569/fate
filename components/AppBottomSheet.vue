<script setup lang="ts">
import type { ComputedRef } from "vue";

const emit = defineEmits<{ close: [] }>();
const primaryNavigationVisible = inject<ComputedRef<boolean>>(
  "primary-navigation-visible",
  computed(() => false),
);
const sheet = ref<HTMLElement | null>(null);
const dragging = ref(false);
const dragOffset = ref(0);
const viewportHeight = ref(0);
const viewportOffsetTop = ref(0);
let pointerId: number | null = null;
let dragStartY = 0;
let dragStartedAt = 0;
let suppressClick = false;
let dragTarget: HTMLElement | null = null;

function closeFromBackdrop() {
  if (!props.closeOnBackdrop || props.locked) return;
  emit("close");
}

const props = withDefaults(
  defineProps<{
    open: boolean;
    role?: "dialog" | "alertdialog";
    labelledby?: string;
    closeOnBackdrop?: boolean;
    locked?: boolean;
    sheetClass?: string;
    contentClass?: string;
    heightMode?: "content" | "viewport";
  }>(),
  {
    role: "dialog",
    labelledby: undefined,
    closeOnBackdrop: true,
    locked: false,
    sheetClass: "",
    contentClass: "",
    heightMode: "content",
  },
);

useBodyScrollLock(toRef(props, "open"));

function startDrag(event: PointerEvent) {
  if (
    props.locked ||
    !event.isPrimary ||
    event.pointerType !== "touch" ||
    !window.matchMedia("(hover: none) and (pointer: coarse)").matches
  )
    return;
  pointerId = event.pointerId;
  dragStartY = event.clientY;
  dragStartedAt = performance.now();
  dragOffset.value = 0;
  dragging.value = true;
  dragTarget = event.currentTarget as HTMLElement;
  dragTarget.setPointerCapture(event.pointerId);
}

function moveDrag(event: PointerEvent) {
  if (!dragging.value || event.pointerId !== pointerId) return;
  const distance = event.clientY - dragStartY;
  if (distance <= 0) {
    dragOffset.value = 0;
    return;
  }
  event.preventDefault();
  dragOffset.value = distance;
  if (distance > 8) suppressClick = true;
}

function finishDrag(event: PointerEvent) {
  if (!dragging.value || event.pointerId !== pointerId) return;
  const elapsed = Math.max(performance.now() - dragStartedAt, 1);
  const velocity = dragOffset.value / elapsed;
  const threshold = Math.min(100, (sheet.value?.offsetHeight || 400) * 0.25);
  const shouldClose =
    dragOffset.value >= threshold ||
    (dragOffset.value >= 36 && velocity >= 0.65);
  resetDrag();
  if (shouldClose && !props.locked) emit("close");
}

function cancelDrag(event?: PointerEvent) {
  if (event && event.pointerId !== pointerId) return;
  resetDrag();
}

function handleLostPointerCapture(event: PointerEvent) {
  if (dragging.value && event.pointerId === pointerId) resetDrag(false);
}

function resetDrag(releaseCapture = true) {
  const activePointerId = pointerId;
  const activeTarget = dragTarget;
  pointerId = null;
  dragTarget = null;
  dragging.value = false;
  dragOffset.value = 0;
  if (
    releaseCapture &&
    activePointerId !== null &&
    activeTarget?.hasPointerCapture(activePointerId)
  )
    activeTarget.releasePointerCapture(activePointerId);
  if (suppressClick)
    window.setTimeout(() => {
      suppressClick = false;
    }, 0);
}

function handleClick(event: MouseEvent) {
  if (!suppressClick) return;
  event.preventDefault();
  event.stopPropagation();
  suppressClick = false;
}

function updateViewportMetrics() {
  const viewport = window.visualViewport;
  viewportHeight.value = Math.round(viewport?.height || window.innerHeight);
  viewportOffsetTop.value = Math.round(viewport?.offsetTop || 0);
}

function addViewportListeners() {
  updateViewportMetrics();
  window.visualViewport?.addEventListener("resize", updateViewportMetrics);
  window.visualViewport?.addEventListener("scroll", updateViewportMetrics);
  window.addEventListener("orientationchange", updateViewportMetrics);
}

function removeViewportListeners() {
  window.visualViewport?.removeEventListener("resize", updateViewportMetrics);
  window.visualViewport?.removeEventListener("scroll", updateViewportMetrics);
  window.removeEventListener("orientationchange", updateViewportMetrics);
}

watch(
  () => props.open,
  (value) => {
    if (value) addViewportListeners();
    else {
      resetDrag();
      removeViewportListeners();
    }
  },
);

onMounted(() => {
  if (props.open) addViewportListeners();
});
onBeforeUnmount(() => {
  resetDrag();
  removeViewportListeners();
});
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="open"
        class="sheet-backdrop app-bottom-sheet-backdrop"
        :class="{ 'has-primary-navigation': primaryNavigationVisible }"
        :style="{
          '--sheet-viewport-height': viewportHeight
            ? `${viewportHeight}px`
            : '100dvh',
          '--sheet-content-max-height': viewportHeight
            ? `${Math.round(viewportHeight * 0.65)}px`
            : '65dvh',
          '--sheet-viewport-offset-top': `${viewportOffsetTop}px`,
        }"
        @click.self="closeFromBackdrop"
      >
        <section
          ref="sheet"
          class="app-bottom-sheet"
          :class="[
            sheetClass,
            {
              'is-dragging': dragging,
              'is-viewport-height': heightMode === 'viewport',
            },
          ]"
          :style="{ '--sheet-drag-y': `${dragOffset}px` }"
          :role="role"
          aria-modal="true"
          :aria-labelledby="labelledby"
        >
          <div
            class="app-bottom-sheet-drag-region"
            @pointerdown="startDrag"
            @pointermove="moveDrag"
            @pointerup="finishDrag"
            @pointercancel="cancelDrag"
            @lostpointercapture="handleLostPointerCapture"
            @click.capture="handleClick"
          >
            <div class="sheet-handle" aria-hidden="true" />
            <slot name="header" />
          </div>
          <div
            class="app-bottom-sheet-content"
            :class="contentClass"
            data-sheet-scroll
          >
            <slot />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.app-bottom-sheet-backdrop {
  inset: auto 0 auto;
  top: var(--sheet-viewport-offset-top, 0);
  height: var(--sheet-viewport-height, 100dvh);
  min-height: 0;
}
.app-bottom-sheet {
  box-sizing: border-box;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  height: auto;
  width: min(100%, 680px);
  max-height: var(--sheet-content-max-height, 65dvh);
  overflow: hidden;
  padding: 12px 22px max(26px, env(safe-area-inset-bottom));
  border-radius: 30px 30px 0 0;
  background: var(--paper);
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.08);
  color: var(--mountain);
  transform: translate3d(0, var(--sheet-drag-y, 0), 0);
  overscroll-behavior-y: contain;
  transition: transform 0.28s cubic-bezier(0.22, 0.8, 0.25, 1);
  will-change: transform;
}
.app-bottom-sheet.is-viewport-height {
  flex: 0 1 auto;
  height: min(75%, 720px);
  max-height: calc(100% - max(16px, env(safe-area-inset-top)));
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}
.app-bottom-sheet-drag-region {
  flex: 0 0 auto;
  touch-action: auto;
}
.app-bottom-sheet-drag-region:has(> :not(.sheet-handle)) .sheet-handle {
  margin-bottom: 10px;
}
.app-bottom-sheet-drag-region :deep(h2) {
  margin: 0 0 14px;
  font-size: 19px;
  text-align: center;
}
@media (hover: none) and (pointer: coarse) {
  .app-bottom-sheet-drag-region {
    touch-action: none;
  }
}
.app-bottom-sheet.is-dragging {
  transition: none;
  user-select: none;
}
.sheet-enter-from .app-bottom-sheet,
.sheet-leave-to .app-bottom-sheet {
  transform: translate3d(0, 100%, 0) !important;
}
.app-bottom-sheet-content {
  /* Keep short sheets content-sized. Sheets that need a fixed scroll viewport
     (for example CityPicker) opt back into flex-grow via contentClass. */
  flex: 0 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-color: rgba(36, 87, 90, 0.28) transparent;
  text-align: center;
}
.app-bottom-sheet-content::-webkit-scrollbar {
  width: 5px;
}
.app-bottom-sheet-content::-webkit-scrollbar-track {
  background: transparent;
}
.app-bottom-sheet-content::-webkit-scrollbar-thumb {
  border-radius: 99px;
  background: rgba(36, 87, 90, 0.28);
}
.app-bottom-sheet-content :deep(h2) {
  margin: 13px 0 8px;
  font-size: 19px;
  text-align: center;
}
.app-bottom-sheet-content :deep(p) {
  max-width: 430px;
  margin: 0 auto 15px;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.6;
}
@media (min-width: 760px) {
  .app-bottom-sheet-backdrop.has-primary-navigation {
    padding-left: 88px;
  }
  .app-bottom-sheet {
    width: min(644px, calc(100vw - 124px));
  }
}
@media (min-width: 1180px) {
  .app-bottom-sheet-backdrop.has-primary-navigation {
    justify-content: flex-start;
    padding-left: 0;
  }
  .app-bottom-sheet {
    width: 644px;
  }
  .app-bottom-sheet-backdrop.has-primary-navigation .app-bottom-sheet {
    margin-left: calc(260px + max(24px, (100vw - 940px) / 2 - 80px) + 18px);
  }
}
</style>
