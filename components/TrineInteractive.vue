<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";
import { calculateChartFromSolar } from "~/utils/ziwei/calculator";
import {
  earthlyBranches,
  palaceNameForBranch,
} from "~/utils/ziwei/core";

defineProps<{ expanded: boolean }>();
const emit = defineEmits<{ toggle: [] }>();

const chart = calculateChartFromSolar({
  gender: "男",
  year: 2026,
  month: 7,
  day: 1,
  hour: 18,
  minute: 0,
});
const selectedBranch = ref(chart.destinyPalaceBranch || earthlyBranches[0]);

const positions: Record<string, string> = {
  巳: "p-si",
  午: "p-wu",
  未: "p-wei",
  申: "p-shen",
  辰: "p-chen",
  酉: "p-you",
  卯: "p-mao",
  戌: "p-xu",
  寅: "p-yin",
  丑: "p-chou",
  子: "p-zi",
  亥: "p-hai",
};

const relatedBranches = computed(() => {
  const index = earthlyBranches.indexOf(selectedBranch.value as never);
  return {
    opposite: earthlyBranches[(index + 6) % 12],
    trines: new Set([
      earthlyBranches[(index + 4) % 12],
      earthlyBranches[(index + 8) % 12],
    ]),
  };
});

function relation(branch: string) {
  if (branch === selectedBranch.value) return "本宮";
  if (branch === relatedBranches.value.opposite) return "對宮";
  if (relatedBranches.value.trines.has(branch as never)) return "三合";
  return "";
}

function palaceLabel(branch: string) {
  return `${palaceNameForBranch(chart, branch)} ${branch}`;
}
</script>

<template>
  <section class="trine-interactive">
    <button
      class="trine-toggle"
      type="button"
      :aria-expanded="expanded"
      @click="emit('toggle')"
    >
      <span>三方四正互動</span>
      <ChevronDown :size="20" :class="{ rotated: expanded }" />
    </button>

    <div v-if="expanded" class="trine-body">
      <p class="trine-hint">點選任一宮位，查看它的本宮、對宮與兩個三合宮。</p>
      <div class="trine-grid" aria-label="三方四正互動示意命盤">
        <button
          v-for="branch in earthlyBranches"
          :key="branch"
          class="trine-palace"
          :class="[
            positions[branch],
            {
              selected: relation(branch) === '本宮',
              opposite: relation(branch) === '對宮',
              related: relation(branch) === '三合',
            },
          ]"
          type="button"
          :aria-pressed="selectedBranch === branch"
          :aria-label="`${palaceLabel(branch)}${relation(branch) ? `，${relation(branch)}` : ''}`"
          @click="selectedBranch = branch"
        >
          <strong>{{ palaceLabel(branch) }}</strong>
          <small>{{ relation(branch) }}</small>
        </button>

        <div class="trine-center" aria-hidden="true">
          <strong>三方四正</strong>
          <small>{{ palaceNameForBranch(chart, selectedBranch) }}為本宮</small>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.trine-interactive {
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid rgba(36, 87, 90, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.64);
}
.trine-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 50px;
  padding: 13px 16px;
  border: 0;
  background: transparent;
  color: var(--mountain);
  font-size: 16px;
  font-weight: 800;
  text-align: left;
}
.trine-toggle svg {
  color: rgba(36, 87, 90, 0.64);
  transition: transform 0.2s ease;
}
.trine-toggle svg.rotated {
  transform: rotate(180deg);
}
.trine-body {
  padding: 0 12px 12px;
}
.trine-hint {
  margin: 0 4px 10px;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.5;
}
.trine-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  aspect-ratio: 1;
  gap: 8px;
  width: 100%;
  padding: 2px;
}
.trine-palace {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 6px 3px;
  border: 1px solid rgba(200, 174, 120, 0.3);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--mountain);
  box-shadow: 0 4px 10px rgba(36, 87, 90, 0.04);
}
.trine-palace.selected,
.trine-palace.opposite,
.trine-palace.related {
  border-width: 1.5px;
  border-color: rgba(200, 174, 120, 0.72);
  background: rgba(107, 166, 160, 0.17);
}
.trine-palace strong {
  overflow: hidden;
  max-width: 100%;
  font-size: clamp(10px, 3.5vw, 14px);
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trine-palace small {
  min-height: 16px;
  margin-top: 4px;
  color: rgba(36, 87, 90, 0.62);
  font-size: 11px;
  font-weight: 700;
}
.trine-center {
  grid-area: 2 / 2 / 4 / 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.48);
  color: var(--mountain);
  text-align: center;
}
.trine-center strong {
  font-size: 16px;
  font-weight: 900;
}
.trine-center small {
  color: var(--text-soft);
  font-size: 11px;
  font-weight: 700;
}
.p-si { grid-area: 1 / 1; }
.p-wu { grid-area: 1 / 2; }
.p-wei { grid-area: 1 / 3; }
.p-shen { grid-area: 1 / 4; }
.p-chen { grid-area: 2 / 1; }
.p-you { grid-area: 2 / 4; }
.p-mao { grid-area: 3 / 1; }
.p-xu { grid-area: 3 / 4; }
.p-yin { grid-area: 4 / 1; }
.p-chou { grid-area: 4 / 2; }
.p-zi { grid-area: 4 / 3; }
.p-hai { grid-area: 4 / 4; }

@media (max-width: 390px) {
  .trine-body {
    padding-inline: 8px;
  }
  .trine-grid {
    gap: 5px;
  }
  .trine-palace {
    border-radius: 12px;
  }
  .trine-palace strong {
    font-size: 10px;
  }
  .trine-palace small {
    font-size: 9.5px;
  }
}
</style>
