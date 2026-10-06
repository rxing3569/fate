<template>
  <AppPageLayout
    title="占卜問事"
    content-mode="flush"
    screen-class="consult-index-page"
  >
    <main v-if="checkingRecord" class="consult-loading">
      <span class="loading-ring" />
      正在讀取上次問事紀錄…
    </main>
    <main v-else-if="recordError" class="consult-loading" role="alert">
      <p>{{ recordError }}</p>
      <button type="button" :disabled="checkingRecord" @click="checkRecord">
        重新讀取
      </button>
    </main>
    <main v-else class="consult-page">
      <ConsultNebula />
    </main>
  </AppPageLayout>
</template>

<script setup lang="ts">
import { ApiError } from "~/utils/api";
definePageMeta({ middleware: "auth" });
useHead({ title: "紫微問事｜江映澄紫微" });
const activeAnalysis = useActiveAnalysisStore();
const checkingRecord = ref(true);
const recordError = ref("");

async function checkRecord() {
  checkingRecord.value = true;
  recordError.value = "";
  try {
    await activeAnalysis.hydrate();
    if (
      activeAnalysis.active?.kind === "consult" &&
      activeAnalysis.active.status === "running"
    ) {
      await navigateTo("/consult/result", { replace: true });
      return;
    }
    const response = (await ziweiApi.getConsultRecord({
      notifyError: false,
    })) as { data?: unknown };
    if (response.data) {
      await navigateTo("/consult/result", { replace: true });
      return;
    }
  } catch (reason) {
    const payload = reason instanceof ApiError ? reason.payload : null;
    const missingRecord =
      reason instanceof ApiError &&
      reason.status === 404 &&
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error === "consult_record_not_found";
    if (!missingRecord)
      recordError.value =
        "無法確認上次問事紀錄，請檢查網路後重新讀取。";
  } finally {
    checkingRecord.value = false;
  }
}

onMounted(() => {
  window.addEventListener("online", checkRecord);
  void checkRecord();
});
onBeforeUnmount(() => window.removeEventListener("online", checkRecord));
</script>

<style scoped>
.consult-page {
  flex: 1;
  height: auto;
  min-height: 0;
}

.consult-loading {
  display: grid;
  flex: 1;
  place-items: center;
  align-content: center;
  gap: 12px;
  min-height: 60dvh;
  color: var(--text-soft);
}
.consult-loading p {
  margin: 0;
}
.consult-loading button {
  padding: 10px 20px;
  border: 0;
  border-radius: 12px;
  background: var(--mountain);
  color: white;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

:global(.consult-index-page) {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 0;
}

@media (max-width: 759px) {
  :global(.consult-index-page) {
    height: calc(100dvh - 80px - env(safe-area-inset-bottom));
  }
}
</style>
