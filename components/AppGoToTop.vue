<script setup lang="ts">
import { ArrowUp } from "@lucide/vue";

const props = withDefaults(defineProps<{
  scrollTarget?: HTMLElement | null;
  threshold?: number;
  label?: string;
}>(), {
  scrollTarget: null,
  threshold: 120,
  label: "回到頁面頂端",
});

const visible = ref(false);
let animationFrame = 0;

function currentTarget() {
  return props.scrollTarget || window;
}

function currentTop() {
  return props.scrollTarget?.scrollTop ?? window.scrollY;
}

function updateVisibility() {
  visible.value = currentTop() >= props.threshold;
}

function stopAnimation() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
}

function goToTop() {
  stopAnimation();
  const start = currentTop();
  if (start <= 0) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    currentTarget().scrollTo({ top: 0 });
    return;
  }

  const duration = Math.min(700, Math.max(320, 280 + start * .12));
  const startedAt = performance.now();
  const target = currentTarget();
  const animate = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    target.scrollTo({ top: Math.round(start * (1 - eased)) });
    if (progress < 1) animationFrame = requestAnimationFrame(animate);
    else animationFrame = 0;
  };
  animationFrame = requestAnimationFrame(animate);
}

function bind(target: HTMLElement | Window | null, action: "add" | "remove") {
  target?.[`${action}EventListener`]("scroll", updateVisibility, { passive: true });
}

onMounted(() => {
  bind(currentTarget(), "add");
  updateVisibility();
});

watch(() => props.scrollTarget, (next, previous) => {
  bind(previous || window, "remove");
  nextTick(() => {
    bind(next || window, "add");
    updateVisibility();
  });
});

onBeforeUnmount(() => {
  bind(currentTarget(), "remove");
  stopAnimation();
});
</script>

<template>
  <Transition name="go-to-top">
    <button
      v-if="visible"
      class="go-to-top"
      type="button"
      :aria-label="label"
      @click="goToTop"
    >
      <ArrowUp :size="21" aria-hidden="true" />
    </button>
  </Transition>
</template>

<style>
.go-to-top {
  position: fixed;
  z-index: calc(var(--layer-navigation) + 1);
  right: max(16px, calc((100vw - 330px) / 2));
  bottom: calc(84px + env(safe-area-inset-bottom));
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  background: rgba(247, 243, 234, 0.86);
  box-shadow: 0 10px 24px rgba(36, 87, 90, 0.2);
  color: var(--mountain);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  backdrop-filter: blur(18px) saturate(150%);
}
.go-to-top-enter-active,
.go-to-top-leave-active {
  transition: opacity .2s ease, transform .2s ease;
}
.go-to-top-enter-from,
.go-to-top-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(.9);
}
@media (min-width: 760px) {
  .go-to-top { right: 24px; bottom: 24px; }
}
</style>
