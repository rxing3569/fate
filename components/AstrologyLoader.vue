<script setup lang="ts">
import { Sparkles } from "@lucide/vue";
withDefaults(
  defineProps<{
    message?: string;
    /**
     * `fill` centres inside a flex/grid parent. `viewport` also supplies a
     * stable content-area height for pages whose parent becomes block layout
     * on iOS. Pages can set --astrology-loader-viewport-offset locally.
     */
    layout?: "fill" | "viewport";
  }>(),
  {
    message: "正在排定乾坤、推演星曜，請稍候…",
    layout: "fill",
  },
);
</script>

<template>
  <div
    class="astrology-loader"
    :class="`astrology-loader--${layout}`"
    role="status"
    aria-live="polite"
  >
    <div class="astrology-orbit">
      <i v-for="index in 4" :key="index" :class="`dot-${index}`" /><span
        ><Sparkles :size="32"
      /></span>
    </div>
    <p>{{ message }}</p>
  </div>
</template>

<style scoped>
.astrology-loader {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 24px;
  box-sizing: border-box;
  text-align: center;
}
.astrology-loader--viewport {
  min-height: max(
    320px,
    calc(100dvh - var(--astrology-loader-viewport-offset, 58px))
  );
}
.astrology-orbit {
  position: relative;
  flex: 0 0 auto;
  width: 100px;
  height: 100px;
  box-sizing: border-box;
  border: 2px solid rgba(36, 87, 90, 0.15);
  border-radius: 50%;
  transform-origin: center;
  animation: orbit 10s linear infinite;
}
.astrology-orbit > i {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--mountain);
}
.dot-1 {
  left: 44px;
  top: -5px;
}
.dot-2 {
  right: -5px;
  top: 44px;
}
.dot-3 {
  left: 44px;
  bottom: -5px;
}
.dot-4 {
  left: -5px;
  top: 44px;
}
.astrology-orbit > span {
  position: absolute;
  inset: 15px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(107, 166, 160, 0.12);
  box-shadow: 0 0 18px rgba(36, 87, 90, 0.08);
  animation:
    counter-orbit 10s linear infinite,
    pulse-core 1.5s ease-in-out infinite alternate;
  color: var(--mountain);
}
.astrology-loader p {
  max-width: 320px;
  margin: 27px 0 0;
  color: var(--mountain);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.6;
}
@keyframes orbit {
  to {
    transform: rotate(360deg);
  }
}
@keyframes counter-orbit {
  to {
    transform: rotate(-360deg);
  }
}
@keyframes pulse-core {
  to {
    scale: 1.12;
  }
}
@media (prefers-reduced-motion: reduce) {
  .astrology-orbit,
  .astrology-orbit > span {
    animation-duration: 3s;
  }
}
</style>
