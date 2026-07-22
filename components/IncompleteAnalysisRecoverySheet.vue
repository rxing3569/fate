<script setup lang="ts">
import { ChevronLeft, RefreshCw, Trash2 } from "@lucide/vue";

interface RecoveryDetail {
  label: string;
  value: string;
}

const props = defineProps<{
  open: boolean;
  title: string;
  summary: string;
  details: RecoveryDetail[];
  loading?: boolean;
}>();
const emit = defineEmits<{ retry: []; abandon: [] }>();
const confirmingAbandon = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) confirmingAbandon.value = false;
  },
);
</script>

<template>
  <AppBottomSheet
    :open="open && !confirmingAbandon"
    :locked="loading"
    sheet-class="analysis-recovery-sheet"
    content-class="analysis-recovery-content"
    @close="void 0"
  >
    <template #header><h2>{{ title }}</h2></template>
    <div class="recovery-summary">
      <strong v-if="summary">{{ summary }}</strong>
      <dl>
        <div v-for="detail in details" :key="detail.label">
          <dt>{{ detail.label }}</dt>
          <dd>{{ detail.value }}</dd>
        </div>
      </dl>
    </div>
    <p class="recovery-notice">
      重新開始不會再次扣除額度或點數；也可以永久放棄這筆任務。
    </p>
    <div class="recovery-actions">
      <button
        class="app-button recovery-danger"
        type="button"
        :disabled="loading"
        @click="confirmingAbandon = true"
      >
        <Trash2 :size="17" />
        放棄任務
      </button>
      <button
        class="app-button"
        type="button"
        :disabled="loading"
        @click="emit('retry')"
      >
        <RefreshCw :size="17" />
        {{ loading ? "處理中..." : "免費重新開始" }}
      </button>
    </div>
  </AppBottomSheet>

  <AppBottomSheet
    :open="open && confirmingAbandon"
    role="alertdialog"
    :locked="loading"
    sheet-class="analysis-recovery-sheet"
    content-class="analysis-recovery-content"
    @close="confirmingAbandon = false"
  >
    <template #header><h2>確定放棄這筆任務？</h2></template>
    <p class="recovery-warning">
      放棄後會永久刪除未完成紀錄，已使用的會員額度或點數不會退回，且無法復原。
    </p>
    <div class="recovery-actions">
      <button
        class="app-button outline"
        type="button"
        :disabled="loading"
        @click="confirmingAbandon = false"
      >
        <ChevronLeft :size="17" />
        返回
      </button>
      <button
        class="app-button recovery-danger"
        type="button"
        :disabled="loading"
        @click="emit('abandon')"
      >
        <Trash2 :size="17" />
        {{ loading ? "處理中..." : "確認放棄且不退款" }}
      </button>
    </div>
  </AppBottomSheet>
</template>

<style scoped>
:deep(.analysis-recovery-content) {
  text-align: left;
}
:deep(.analysis-recovery-sheet) {
  padding-top: 10px;
  padding-bottom: max(20px, env(safe-area-inset-bottom));
}
.recovery-summary {
  display: grid;
  gap: 10px;
  padding: 12px 15px;
  border: 1px solid rgba(36, 87, 90, 0.1);
  border-radius: 16px;
  background: rgba(36, 87, 90, 0.055);
  text-align: left;
}
.recovery-summary > strong {
  color: var(--mountain);
  font-size: 16px;
}
.recovery-summary dl {
  display: grid;
  gap: 7px;
  margin: 0;
}
.recovery-summary dl > div {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}
.recovery-summary dt,
.recovery-summary dd {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}
.recovery-summary dt {
  color: var(--text-soft);
}
.recovery-summary dd {
  color: var(--mountain);
  overflow-wrap: anywhere;
}
.recovery-notice,
.recovery-warning {
  max-width: none;
  margin: 12px 2px 16px;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.6;
  text-align: left;
}
.recovery-warning {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(184, 91, 75, 0.08);
  color: var(--cinnabar);
}
.recovery-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.recovery-actions .app-button {
  gap: 8px;
}
.app-button.recovery-danger {
  border-color: rgba(184, 91, 75, 0.72);
  background: linear-gradient(
    145deg,
    rgba(184, 91, 75, 0.98),
    rgba(166, 70, 58, 0.92)
  );
  color: #fff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    0 9px 22px rgba(184, 91, 75, 0.2);
}
@media (max-width: 420px) {
  .recovery-actions {
    grid-template-columns: 1fr;
  }
}
</style>
