import type { Ref } from "vue";

export const ANALYSIS_TIMEOUT_MS = 9 * 60 * 1000;

export interface RecoverableAnalysisRecord {
  created_at?: string;
  updated_at?: string;
}

function recoveryStartedAt(record?: RecoverableAnalysisRecord | null) {
  if (!record) return 0;
  const value = Date.parse(record.updated_at || record.created_at || "");
  return Number.isFinite(value) ? value : 0;
}

export function useIncompleteAnalysisRecovery<
  T extends RecoverableAnalysisRecord,
>(tasks: Ref<T[]>) {
  const clock = ref(Date.now());
  const currentTask = computed(() => tasks.value[0] || null);
  const deadline = computed(() => {
    const startedAt = recoveryStartedAt(currentTask.value);
    return startedAt ? startedAt + ANALYSIS_TIMEOUT_MS : 0;
  });
  const isBackgroundProcessing = computed(
    () => Boolean(currentTask.value && deadline.value > clock.value),
  );
  const canRecover = computed(
    () => Boolean(currentTask.value && !isBackgroundProcessing.value),
  );

  function refreshRecoveryState() {
    clock.value = Date.now();
  }

  watch(
    currentTask,
    refreshRecoveryState,
    { immediate: true },
  );

  return {
    currentTask,
    isBackgroundProcessing,
    canRecover,
    refreshRecoveryState,
  };
}
