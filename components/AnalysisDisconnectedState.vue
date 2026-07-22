<script setup lang="ts">
import { LoaderCircle, RefreshCw } from "@lucide/vue";

defineProps<{ loading?: boolean }>();
defineEmits<{ refresh: [] }>();
</script>

<template>
  <section class="analysis-disconnected" role="status">
    <span><LoaderCircle :size="34" class="background-spin" /></span>
    <h2>正在背景作業</h2>
    <p>系統仍在背景處理中，請稍後手動重新讀取結果。</p>
    <button
      class="app-button"
      type="button"
      :disabled="loading"
      @click="$emit('refresh')"
    >
      <RefreshCw :size="17" :class="{ spinning: loading }" />
      {{ loading ? "正在讀取..." : "重新讀取結果" }}
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
  gap: 8px;
  width: min(100%, 280px);
  margin-top: 8px;
}
.spinning {
  animation: spin 0.8s linear infinite;
}
.background-spin {
  animation: spin 1.4s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
