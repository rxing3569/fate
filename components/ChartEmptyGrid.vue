<script setup lang="ts">
import { earthlyBranches } from "~/utils/ziwei/core";

defineProps<{
  loading: boolean;
  actionTo: string;
}>();

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
</script>

<template>
  <div class="empty-chart-wrap" :aria-busy="loading">
    <div class="empty-palace-grid" aria-label="紫微命盤十二宮空白框架">
      <div
        v-for="branch in earthlyBranches"
        :key="branch"
        class="empty-palace"
        :class="positions[branch]"
        aria-hidden="true"
      >
        <div class="empty-star-lines"><i /><i /><i /></div>
        <footer><small>{{ branch }}</small><i /></footer>
      </div>

      <section class="empty-chart-center" aria-live="polite">
        <template v-if="loading">
          <span class="empty-loading-ring" />
          <strong>正在載入命盤</strong>
          <small>準備十二宮位資料</small>
        </template>
        <template v-else>
          <strong>尚未建立命盤</strong>
          <p>請先填寫出生日期、時間及城市，系統才能完成排盤。</p>
          <NuxtLink class="app-button" :to="actionTo">建立我的命盤</NuxtLink>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.empty-chart-wrap {
  width: 100%;
  height: 100%;
  min-height: 0;
}
.empty-palace-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  width: 100%;
  height: 100%;
  gap: 2px;
  padding: 2px;
  border-radius: 5px;
  background: rgba(36, 87, 90, 0.12);
  box-shadow: 0 14px 28px rgba(36, 87, 90, 0.08);
}
.empty-palace {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.84);
}
.empty-star-lines {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}
.empty-star-lines i {
  display: block;
  width: 5px;
  height: 34px;
  border-radius: 3px;
  background: rgba(36, 87, 90, 0.08);
}
.empty-palace footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 4px;
}
.empty-palace footer small {
  color: rgba(36, 87, 90, 0.38);
  font-size: 10px;
  font-weight: 800;
}
.empty-palace footer i {
  width: 34px;
  height: 8px;
  border-radius: 4px;
  background: rgba(179, 62, 50, 0.08);
}
.empty-chart-center {
  grid-area: 2/2/4/4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
  padding: 14px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--mountain);
  text-align: center;
}
.empty-chart-center > strong {
  font-size: 18px;
  font-weight: 900;
}
.empty-chart-center > small {
  color: var(--text-soft);
  font-size: 11px;
  font-weight: 700;
}
.empty-chart-center > p {
  max-width: 270px;
  margin: 0;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.5;
}
.empty-chart-center .app-button {
  min-height: 38px;
  margin-top: 3px;
  padding: 8px 14px;
  border-radius: 13px;
  font-size: 12px;
}
.empty-loading-ring {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(36, 87, 90, 0.12);
  border-top-color: var(--mountain);
  border-radius: 50%;
  animation: empty-chart-spin 0.8s linear infinite;
}
.p-si { grid-area: 1/1; }
.p-wu { grid-area: 1/2; }
.p-wei { grid-area: 1/3; }
.p-shen { grid-area: 1/4; }
.p-chen { grid-area: 2/1; }
.p-you { grid-area: 2/4; }
.p-mao { grid-area: 3/1; }
.p-xu { grid-area: 3/4; }
.p-yin { grid-area: 4/1; }
.p-chou { grid-area: 4/2; }
.p-zi { grid-area: 4/3; }
.p-hai { grid-area: 4/4; }
@keyframes empty-chart-spin {
  to { transform: rotate(360deg); }
}
@media (max-width: 430px) {
  .empty-chart-center {
    gap: 5px;
    padding: 8px;
  }
  .empty-chart-center > strong {
    font-size: 15px;
  }
  .empty-chart-center > p {
    display: -webkit-box;
    overflow: hidden;
    font-size: 10.5px;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  .empty-chart-center .app-button {
    min-height: 34px;
    padding: 6px 11px;
    font-size: 11px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .empty-loading-ring { animation: none; }
}
</style>
