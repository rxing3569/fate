<script setup lang="ts">
import {
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  X,
} from "@lucide/vue";
import {
  scenarioGroups,
  targetLabels,
} from "./analysis-fixtures";
import { useDevAnalysisSimulator } from "./useDevAnalysisSimulator";

const open = ref(false);
const panel = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const simulator = useDevAnalysisSimulator();

const selectedScenarioLabel = computed(
  () =>
    scenarioGroups
      .flatMap((group) => group.options)
      .find((option) => option.value === simulator.scenario.value)?.label || "",
);

function togglePanel() {
  open.value = !open.value;
  if (open.value) nextTick(() => panel.value?.focus());
}

function closePanel() {
  open.value = false;
  nextTick(() => trigger.value?.focus());
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && open.value) closePanel();
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", handleKeydown));
</script>

<template>
  <Transition name="dev-panel">
    <aside
      v-if="open"
      ref="panel"
      class="dev-control-panel"
      tabindex="-1"
      role="dialog"
      aria-label="開發環境分析狀態控制"
    >
      <header class="dev-panel-header">
        <div>
          <span>DEV MODE</span>
          <strong>AI 狀態模擬器</strong>
        </div>
        <button type="button" aria-label="關閉開發工具" @click="closePanel">
          <X :size="18" />
        </button>
      </header>

      <div class="dev-panel-body">
        <fieldset>
          <legend>功能</legend>
          <div class="dev-target-grid">
            <button
              v-for="(label, value) in targetLabels"
              :key="value"
              type="button"
              :class="{ active: simulator.target.value === value }"
              @click="simulator.target.value = value"
            >
              {{ label }}
            </button>
          </div>
        </fieldset>

        <label class="dev-field">
          <span>情境</span>
          <select v-model="simulator.scenario.value">
            <optgroup
              v-for="group in scenarioGroups"
              :key="group.label"
              :label="group.label"
            >
              <option
                v-for="option in group.options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </optgroup>
          </select>
        </label>

        <button class="dev-apply" type="button" @click="simulator.apply">
          套用「{{ selectedScenarioLabel }}」
        </button>

        <p v-if="simulator.panelError.value" class="dev-panel-error" role="alert">
          {{ simulator.panelError.value }}
        </p>

        <section class="dev-playback" aria-label="串流播放控制">
          <div class="dev-playback-title">
            <span>串流控制</span>
            <strong>{{ simulator.progress.value }}%</strong>
          </div>
          <div class="dev-progress" aria-hidden="true">
            <span :style="{ width: `${simulator.progress.value}%` }" />
          </div>
          <small>
            {{ simulator.frameIndex.value }} / {{ simulator.frames.value.length }}
            chunks
          </small>

          <div class="dev-player-actions">
            <button
              v-if="!simulator.playing.value"
              type="button"
              :disabled="!simulator.frames.value.length"
              aria-label="播放串流"
              @click="simulator.play"
            >
              <Play :size="17" />播放
            </button>
            <button
              v-else-if="!simulator.paused.value"
              type="button"
              aria-label="暫停串流"
              @click="simulator.pause"
            >
              <Pause :size="17" />暫停
            </button>
            <button
              v-else
              type="button"
              aria-label="繼續串流"
              @click="simulator.resume"
            >
              <Play :size="17" />繼續
            </button>
            <button
              type="button"
              :disabled="
                !simulator.frames.value.length ||
                simulator.frameIndex.value >= simulator.frames.value.length
              "
              aria-label="送出下一個串流片段"
              @click="simulator.step"
            >
              <SkipForward :size="17" />單步
            </button>
          </div>

          <div class="dev-speeds" aria-label="串流速度">
            <button
              v-for="value in ([0.5, 1, 2] as const)"
              :key="value"
              type="button"
              :class="{ active: simulator.speed.value === value }"
              @click="simulator.speed.value = value"
            >
              {{ value }}×
            </button>
          </div>
        </section>

        <button
          class="dev-restore"
          type="button"
          :disabled="!simulator.hasSnapshot.value"
          @click="simulator.restore"
        >
          <RotateCcw :size="16" />還原進入模擬前的狀態
        </button>
      </div>
    </aside>
  </Transition>

  <button
    ref="trigger"
    class="dev-floating-button"
    type="button"
    :aria-expanded="open"
    aria-haspopup="dialog"
    aria-label="開啟開發工具"
    title="開發工具"
    @click="togglePanel"
  >
    <span aria-hidden="true">&lt;/&gt;</span>
    <span>DEV</span>
    <ChevronDown v-if="!open" :size="14" aria-hidden="true" />
    <ChevronUp v-else :size="14" aria-hidden="true" />
  </button>
</template>

<style scoped>
.dev-floating-button {
  position: fixed;
  right: max(16px, env(safe-area-inset-right));
  bottom: calc(88px + env(safe-area-inset-bottom));
  z-index: 1301;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 0 13px;
  border: 1px solid rgb(255 255 255 / 28%);
  border-radius: 999px;
  color: #fff;
  background: #20252b;
  box-shadow: 0 8px 24px rgb(0 0 0 / 24%);
  font: 700 12px/1 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    monospace;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.dev-control-panel {
  position: fixed;
  right: max(16px, env(safe-area-inset-right));
  bottom: calc(142px + env(safe-area-inset-bottom));
  z-index: 1300;
  width: min(390px, calc(100vw - 32px));
  max-height: min(720px, calc(100dvh - 180px));
  overflow: auto;
  border: 1px solid #3e4853;
  border-radius: 18px;
  color: #edf2f6;
  background: #20252b;
  box-shadow: 0 20px 60px rgb(0 0 0 / 35%);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}

.dev-panel-header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 16px;
  border-bottom: 1px solid #3a424c;
  background: #20252b;
}

.dev-panel-header div {
  display: grid;
  gap: 3px;
}

.dev-panel-header span {
  color: #7dd3fc;
  font: 800 10px/1 ui-monospace, monospace;
  letter-spacing: 0.14em;
}

.dev-panel-header strong {
  font-size: 16px;
}

.dev-panel-header button,
.dev-player-actions button,
.dev-speeds button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid #4a5562;
  border-radius: 9px;
  color: inherit;
  background: #2b323a;
  cursor: pointer;
}

.dev-panel-header button {
  width: 34px;
  height: 34px;
}

.dev-panel-body {
  display: grid;
  gap: 16px;
  padding: 16px;
}

.dev-panel-body fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.dev-panel-body legend,
.dev-field > span,
.dev-playback-title {
  margin-bottom: 8px;
  color: #aeb8c3;
  font-size: 12px;
  font-weight: 700;
}

.dev-target-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 7px;
}

.dev-target-grid button,
.dev-apply,
.dev-restore {
  min-height: 39px;
  border: 1px solid #4a5562;
  border-radius: 10px;
  color: inherit;
  background: #2b323a;
  font-weight: 700;
  cursor: pointer;
}

.dev-target-grid button.active,
.dev-speeds button.active {
  border-color: #7dd3fc;
  color: #07141c;
  background: #7dd3fc;
}

.dev-field {
  display: grid;
}

.dev-field select {
  width: 100%;
  height: 42px;
  padding: 0 10px;
  border: 1px solid #4a5562;
  border-radius: 10px;
  color: inherit;
  background: #2b323a;
  font: inherit;
}

.dev-apply {
  border-color: #38bdf8;
  color: #06202c;
  background: #38bdf8;
}

.dev-panel-error {
  margin: -5px 0 0;
  padding: 10px 12px;
  border: 1px solid #f87171;
  border-radius: 10px;
  color: #fecaca;
  background: rgb(127 29 29 / 35%);
  font-size: 12px;
  line-height: 1.55;
}

.dev-playback {
  padding: 13px;
  border: 1px solid #3e4853;
  border-radius: 12px;
  background: #181c21;
}

.dev-playback-title {
  display: flex;
  justify-content: space-between;
}

.dev-playback-title strong {
  color: #7dd3fc;
}

.dev-progress {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: #3b444e;
}

.dev-progress span {
  display: block;
  height: 100%;
  background: #38bdf8;
  transition: width 160ms ease;
}

.dev-playback small {
  display: block;
  margin: 7px 0 11px;
  color: #8995a2;
  font: 11px/1 ui-monospace, monospace;
}

.dev-player-actions,
.dev-speeds {
  display: flex;
  gap: 7px;
}

.dev-player-actions button {
  flex: 1;
  min-height: 36px;
}

.dev-speeds {
  justify-content: flex-end;
  margin-top: 9px;
}

.dev-speeds button {
  min-width: 48px;
  min-height: 30px;
  font-size: 12px;
}

.dev-restore {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: transparent;
}

.dev-control-panel button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.dev-control-panel button:focus-visible,
.dev-control-panel select:focus-visible,
.dev-floating-button:focus-visible {
  outline: 3px solid rgb(125 211 252 / 45%);
  outline-offset: 2px;
}

.dev-panel-enter-active,
.dev-panel-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.dev-panel-enter-from,
.dev-panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

@media (min-width: 768px) {
  .dev-floating-button {
    bottom: max(24px, env(safe-area-inset-bottom));
  }

  .dev-control-panel {
    bottom: calc(78px + env(safe-area-inset-bottom));
  }
}

@media (max-width: 520px) {
  .dev-control-panel {
    right: 8px;
    bottom: calc(140px + env(safe-area-inset-bottom));
    left: 8px;
    width: auto;
    max-height: calc(100dvh - 164px);
  }
}
</style>
