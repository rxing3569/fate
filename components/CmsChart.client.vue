<script setup lang="ts">
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

const props = defineProps<{
  config: ChartConfiguration;
  label: string;
  empty?: boolean;
}>();
const canvas = ref<HTMLCanvasElement | null>(null);
let instance: Chart | null = null;

async function draw() {
  instance?.destroy();
  instance = null;
  if (props.empty) return;
  await nextTick();
  if (!canvas.value) return;
  instance = new Chart(canvas.value, props.config);
}

onMounted(draw);
watch(() => props.config, draw, { flush: "post" });
watch(() => props.empty, draw, { flush: "post" });
onBeforeUnmount(() => instance?.destroy());
</script>

<template>
  <div class="chart-scroll">
    <div class="chart">
      <p v-if="empty" class="empty">此期間尚無資料</p>
      <canvas v-else ref="canvas" role="img" :aria-label="label" />
    </div>
  </div>
</template>

<style scoped>
.chart-scroll {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-inline: contain;
  -webkit-overflow-scrolling: touch;
}
.chart {
  position: relative;
  width: 100%;
  height: 300px;
}
.empty {
  height: 100%;
  display: grid;
  place-items: center;
  margin: 0;
  color: #71827f;
}
@media (max-width: 640px) {
  .chart-scroll {
    padding-bottom: 8px;
    scrollbar-gutter: stable;
    touch-action: pan-x;
  }
  .chart-scroll::-webkit-scrollbar {
    height: 6px;
  }
  .chart-scroll::-webkit-scrollbar-thumb {
    background: #b9c9c5;
    border-radius: 99px;
  }
  .chart {
    width: 640px;
    min-width: 640px;
    height: 260px;
  }
}
</style>
