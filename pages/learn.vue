<script setup lang="ts">
import { Route } from "@lucide/vue";
import {
  learningStages as stages,
  loadCompletedStages,
  stageLabel,
} from "~/utils/learning";
const completed = ref<string[]>([]);
useSeoMeta({
  title: "紫微斗數學習地圖｜江映澄紫微",
  description: "從命盤基礎、十二宮、十四主星到四化與大限，依學習地圖循序掌握紫微斗數，並透過測驗複習重點。",
  ogTitle: "紫微斗數學習地圖｜江映澄紫微",
  ogDescription: "依學習地圖循序掌握命盤、十二宮、十四主星、四化與大限。",
});
const mapScroll = ref<HTMLElement | null>(null);
const mapReady = ref(false);
const mapScrollStorageKey = "ziwei:learning-map-scroll-top";
let revealFrame = 0;
let saveFrame = 0;
const xPositions = [18, 79, 25, 72, 38, 66, 17, 82, 31, 70, 20, 78, 36, 64, 24];
const pathPoints = stages.map((_, index) => ({
  x: xPositions[index]! * 10,
  y: 1468 - index * 98,
}));
const mapPath = pathPoints.reduce((path, point, index, points) => {
  if (!index) return `M ${point.x} ${point.y}`;
  const previous = points[index - 1]!;
  const middleY = (previous.y + point.y) / 2;
  return `${path} C ${previous.x} ${middleY}, ${point.x} ${middleY}, ${point.x} ${point.y}`;
}, "");
onMounted(async () => {
  completed.value = loadCompletedStages();
  window.addEventListener("learning-progress-updated", refreshProgress);
  await nextTick();
  const scrollElement = mapScroll.value;
  if (scrollElement) {
    const storedPosition = sessionStorage.getItem(mapScrollStorageKey);
    const savedPosition = storedPosition === null
      ? Number.NaN
      : Number(storedPosition);
    const defaultPosition = Math.max(
      0,
      scrollElement.scrollHeight - scrollElement.clientHeight,
    );
    scrollElement.scrollTop = Number.isFinite(savedPosition)
      ? Math.min(Math.max(savedPosition, 0), defaultPosition)
      : defaultPosition;
  }
  window.addEventListener("pagehide", saveMapPosition);
  revealFrame = requestAnimationFrame(() => {
    mapReady.value = true;
  });
});
onBeforeUnmount(() => {
  saveMapPosition();
  window.removeEventListener("pagehide", saveMapPosition);
  window.removeEventListener("learning-progress-updated", refreshProgress);
  cancelAnimationFrame(revealFrame);
  cancelAnimationFrame(saveFrame);
});

function refreshProgress() {
  completed.value = loadCompletedStages();
}

function saveMapPosition() {
  const scrollElement = mapScroll.value;
  if (!scrollElement) return;
  sessionStorage.setItem(
    mapScrollStorageKey,
    String(scrollElement.scrollTop),
  );
}

function rememberMapPosition() {
  cancelAnimationFrame(saveFrame);
  saveFrame = requestAnimationFrame(saveMapPosition);
}

function openStage(stage: (typeof stages)[number]) {
  saveMapPosition();
  if (stage.kind === "action")
    return navigateTo("/ai-analysis/");
  navigateTo(`/learning/${stage.id}/`);
}
</script>

<template>
  <LearningHubLayout screen-class="learn-screen">
    <div
      class="learn-top learning-hub-content learn-hydrated-content"
      :class="{ ready: mapReady }"
    >
      <section class="progress-block">
        <div class="progress-heading">
          <Route :size="22" /><strong>學習進度</strong
          ><b>{{ completed.length }} / {{ stages.length }}</b>
        </div>
        <div class="progress-track">
          <span
            :style="{ width: `${(completed.length / stages.length) * 100}%` }"
          />
        </div>
      </section>
    </div>
    <section
      ref="mapScroll"
      class="map-scroll learn-hydrated-content"
      :class="{ ready: mapReady }"
      :aria-busy="!mapReady"
      aria-label="紫微學習地圖"
      @scroll.passive="rememberMapPosition"
    >
      <div class="learning-map">
        <svg
          class="map-path"
          viewBox="0 0 1000 1650"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path :d="mapPath" /></svg
        ><button
          v-for="(stage, index) in stages"
          :key="stage.id"
          class="stage-row"
          :class="{ complete: completed.includes(stage.id) }"
          :style="{
            left: `${xPositions[index]}%`,
            bottom: `${120 + index * 98}px`,
          }"
          type="button"
          @click="openStage(stage)"
        >
          <span class="stage-node">{{ stage.id.replace("_", ".") }}</span
          ><span class="stage-label">{{ stageLabel(stage) }}</span>
        </button>
      </div>
    </section>
  </LearningHubLayout>
</template>

<style scoped>
.learn-screen {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}
.learn-top {
  position: relative;
  z-index: 8;
  flex: none;
  padding-bottom: 12px;
}
.learn-hydrated-content {
  visibility: hidden;
}
.learn-hydrated-content.ready {
  visibility: visible;
}
.progress-block {
  padding: 4px 1px 10px;
}
.progress-heading {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}
.progress-heading b {
  font-size: 13px;
}
.progress-track {
  height: 10px;
  margin-top: 13px;
  overflow: hidden;
  border-radius: 99px;
  background: rgba(36, 87, 90, 0.1);
}
.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--jade);
}
.map-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.map-scroll::-webkit-scrollbar {
  display: none;
}
.learning-map {
  position: relative;
  width: min(100%, 600px);
  height: 1650px;
  margin: 0 auto;
}
.map-path {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.map-path path {
  fill: none;
  stroke: rgba(36, 87, 90, 0.32);
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 15 14;
  vector-effect: non-scaling-stroke;
}
.stage-row {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
  max-width: 58%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--mountain);
  transform: translateX(-50%);
}
.stage-node {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border: 3px solid rgba(36, 87, 90, 0.38);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 8px 13px rgba(36, 87, 90, 0.2);
  color: rgba(36, 87, 90, 0.52);
  font-size: 19px;
  font-weight: 900;
}
.stage-label {
  max-width: 100%;
  margin-top: 6px;
  padding: 6px 10px;
  border: 1.5px solid rgba(107, 166, 160, 0.38);
  border-radius: 12px;
  background: #fff;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}
.stage-row.complete .stage-node,
.stage-row.complete .stage-label {
  border-color: var(--mountain);
  background: var(--mountain);
  color: #fff;
}
@media (min-width: 560px) {
  .stage-row {
    max-width: 48%;
  }
  .stage-label {
    font-size: 14px;
  }
}
</style>
