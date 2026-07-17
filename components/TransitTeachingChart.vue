<script setup lang="ts">
import { Minus, Plus } from "@lucide/vue";
import {
  calculateChartFromSolar,
  calculateFlowData,
} from "~/utils/ziwei/calculator";
import {
  earthlyBranches,
  getXiaoXianAges,
  palaceNameForBranch,
} from "~/utils/ziwei/core";

const chart = calculateChartFromSolar({
  gender: "男",
  year: 2026,
  month: 7,
  day: 1,
  hour: 18,
  minute: 0,
});
const selectedYear = ref(2026);

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
const zodiac: Record<string, string> = {
  子: "鼠",
  丑: "牛",
  寅: "虎",
  卯: "兔",
  辰: "龍",
  巳: "蛇",
  午: "馬",
  未: "羊",
  申: "猴",
  酉: "雞",
  戌: "狗",
  亥: "豬",
};

const age = computed(() => selectedYear.value - chart.solarYear + 1);

const daXianBranch = computed(() => {
  let fallbackBranch = "";
  let minimumStartAge = Number.POSITIVE_INFINITY;
  for (const [branch, range] of Object.entries(chart.palaceDaXian)) {
    if (age.value >= range[0] && age.value <= range[1]) return branch;
    if (range[0] < minimumStartAge) {
      minimumStartAge = range[0];
      fallbackBranch = branch;
    }
  }
  return age.value < minimumStartAge ? fallbackBranch : "";
});

const xiaoXianBranch = computed(() => {
  if (!chart.yearBranch) return "";
  const yearBranchIndex = earthlyBranches.indexOf(chart.yearBranch as never);
  const start = [2, 6, 10].includes(yearBranchIndex)
    ? 4
    : [8, 0, 4].includes(yearBranchIndex)
      ? 10
      : [5, 9, 1].includes(yearBranchIndex)
        ? 7
        : 1;
  const offset = age.value - 1;
  const index = chart.gender === "男"
    ? (start + offset) % 12
    : (start - offset + 120) % 12;
  return earthlyBranches[index] || "";
});

const flowData = computed(() =>
  calculateFlowData({
    chart,
    flowType: "流年",
    year: selectedYear.value,
    month: 7,
    day: 1,
  }),
);
const liuNianBranch = computed(() => flowData.value.destinyBranch || "");
const ganzhi = computed(() => {
  const { stem, branch } = flowData.value;
  return `${stem}${branch}(${zodiac[branch] || ""})年`;
});

function changeYear(delta: number) {
  const next = selectedYear.value + delta;
  if (next >= chart.solarYear) selectedYear.value = next;
}

function isActive(branch: string) {
  return [daXianBranch.value, xiaoXianBranch.value, liuNianBranch.value].includes(branch);
}

function palaceLabel(branch: string) {
  return `${palaceNameForBranch(chart, branch)} ${branch}`;
}

function locationLabel(branch: string) {
  if (!branch) return "無";
  const palace = palaceNameForBranch(chart, branch);
  return `${palace.endsWith("宮") ? palace : `${palace}宮`}（${branch}宮）`;
}
</script>

<template>
  <section class="transit-teaching-chart glass">
    <h2>時間疊宮示意盤</h2>
    <p class="chart-intro">
      以 2026/07/01 18:00 的示例命盤為底圖，觀察年份改變時，大限、小限、流年命宮如何落到不同宮位。
    </p>

    <div class="transit-grid" aria-label="時間疊宮示意命盤">
      <article
        v-for="branch in earthlyBranches"
        :key="branch"
        class="transit-palace"
        :class="[positions[branch], { active: isActive(branch) }]"
      >
        <strong>{{ palaceLabel(branch) }}</strong>
        <small>{{ chart.palaceDaXian[branch]?.join('-') }}歲</small>
        <small class="xiao-ages">{{ getXiaoXianAges(chart, branch).slice(0, 5).join(' ') }}</small>
        <span class="mini-badges">
          <b v-if="branch === daXianBranch" class="daxian" title="大限命宮">大</b>
          <b v-if="branch === liuNianBranch" class="liunian" title="流年命宮">流</b>
          <b v-if="branch === xiaoXianBranch" class="xiaoxian" title="小限命宮">小</b>
        </span>
      </article>

      <section class="transit-center" aria-live="polite">
        <strong>{{ selectedYear }} 年<br />{{ ganzhi }}</strong>
        <span>虛歲 {{ age }} 歲</span>
        <div>
          <button
            type="button"
            aria-label="上一年"
            :disabled="selectedYear <= chart.solarYear"
            @click="changeYear(-1)"
          >
            <Minus :size="16" />
          </button>
          <button type="button" aria-label="下一年" @click="changeYear(1)">
            <Plus :size="16" />
          </button>
        </div>
      </section>
    </div>

    <div class="transit-locations">
      <p><i class="daxian" /><strong>大限命宮：</strong><b class="daxian">{{ locationLabel(daXianBranch) }}</b></p>
      <p><i class="liunian" /><strong>流年命宮：</strong><b class="liunian">{{ locationLabel(liuNianBranch) }}</b></p>
      <p><i class="xiaoxian" /><strong>小限命宮：</strong><b class="xiaoxian">{{ locationLabel(xiaoXianBranch) }}</b></p>
    </div>
  </section>
</template>

<style scoped>
.transit-teaching-chart {
  margin-bottom: 16px;
  padding: 14px;
  border-radius: 24px;
}
.transit-teaching-chart h2 {
  margin: 0;
  color: var(--mountain);
  font-size: 18px;
  font-weight: 900;
}
.chart-intro {
  margin: 8px 0 14px;
  color: rgba(36, 87, 90, 0.7);
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1.5;
}
.transit-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  aspect-ratio: 1;
  gap: 8px;
  width: 100%;
}
.transit-palace {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 4px 3px;
  border: 1px solid rgba(200, 174, 120, 0.3);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--mountain);
  text-align: center;
}
.transit-palace.active {
  border-width: 1.5px;
  border-color: rgba(200, 174, 120, 0.78);
  background: rgba(107, 166, 160, 0.15);
}
.transit-palace > strong,
.transit-palace > small {
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.transit-palace > strong {
  font-size: clamp(9.5px, 3.1vw, 12.5px);
  font-weight: 900;
}
.transit-palace > small {
  margin-top: 2px;
  font-size: 9px;
  font-weight: 800;
}
.transit-palace > .xiao-ages {
  font-size: 8px;
  font-weight: 700;
}
.mini-badges {
  display: flex;
  justify-content: center;
  min-height: 18px;
  margin-top: 2px;
}
.mini-badges b {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-inline: 1px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 900;
}
.daxian { color: var(--jade); }
.liunian { color: var(--cinnabar); }
.xiaoxian { color: var(--mountain); }
.mini-badges .daxian { background: rgba(107, 166, 160, 0.16); }
.mini-badges .liunian { background: rgba(184, 91, 75, 0.16); }
.mini-badges .xiaoxian { background: rgba(36, 87, 90, 0.12); }
.transit-center {
  grid-area: 2 / 2 / 4 / 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 8px;
  border: 1.2px solid rgba(200, 174, 120, 0.45);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 8px rgba(36, 87, 90, 0.05);
  color: var(--mountain);
  text-align: center;
}
.transit-center > strong {
  font-size: 16px;
  font-weight: 800;
  line-height: 1.25;
}
.transit-center > span {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
}
.transit-center > div {
  display: flex;
  gap: 14px;
  margin-top: 8px;
}
.transit-center button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid rgba(36, 87, 90, 0.16);
  border-radius: 50%;
  background: rgba(36, 87, 90, 0.08);
  color: var(--mountain);
}
.transit-center button:disabled {
  opacity: 0.35;
}
.transit-locations {
  display: grid;
  gap: 6px;
  margin-top: 16px;
  padding: 12px;
  border: 1px solid rgba(36, 87, 90, 0.08);
  border-radius: 16px;
  background: rgba(237, 230, 216, 0.45);
}
.transit-locations p {
  display: flex;
  align-items: center;
  min-width: 0;
  margin: 0;
  font-size: 13px;
}
.transit-locations i {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 50%;
  background: currentColor;
}
.transit-locations strong {
  flex: 0 0 auto;
}
.transit-locations b {
  overflow: hidden;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  .transit-teaching-chart {
    padding: 12px 9px;
  }
  .transit-grid {
    gap: 5px;
  }
  .transit-palace {
    border-radius: 12px;
  }
  .transit-palace > strong {
    font-size: 9.5px;
  }
  .transit-palace > small {
    font-size: 7.5px;
  }
  .transit-palace > .xiao-ages {
    font-size: 6.8px;
  }
  .mini-badges b {
    width: 15px;
    height: 15px;
    font-size: 8px;
  }
  .transit-center > strong {
    font-size: 13px;
  }
  .transit-center > span {
    font-size: 11px;
  }
}
</style>
