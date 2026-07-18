<script setup lang="ts">
import { RefreshCw, WifiOff } from "@lucide/vue";

defineProps<{ loading?: boolean }>();
defineEmits<{ refresh: [] }>();
</script>

<template>
  <section class="analysis-disconnected" role="status">
    <span><WifiOff :size="34" /></span>
    <h2>即時連線已中斷</h2>
    <p>任務可能仍在背景處理，請過約五分鐘後再重新讀取任務。</p>
    <button
      class="app-button"
      type="button"
      :disabled="loading"
      @click="$emit('refresh')"
    >
      <RefreshCw :size="17" :class="{ spinning: loading }" />
      {{ loading ? "正在確認..." : "重新讀取任務狀態" }}
    </button>
  </section>
</template>

<style scoped>
.analysis-disconnected {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 10px;
  width: 100%;
  min-height: 280px;
  padding: 32px 20px;
  color: var(--mountain);
  text-align: center;
}
.analysis-disconnected > span {
  display: grid;
  place-items: center;
  width: 66px;
  height: 66px;
  border: 1px solid rgba(36, 87, 90, 0.12);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.52);
}
.analysis-disconnected h2,
.analysis-disconnected p {
  margin: 0;
}
.analysis-disconnected h2 {
  font-size: 20px;
}
.analysis-disconnected p {
  color: var(--text-soft);
  font-size: 14px;
}
.analysis-disconnected .app-button {
  width: min(100%, 280px);
  margin-top: 8px;
}
.spinning {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
