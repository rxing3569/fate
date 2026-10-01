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
    <main v-else class="consult-page">
      <ConsultNebula />
    </main>
  </AppPageLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });
useHead({ title: "紫微問事｜江映澄紫微" });
const activeAnalysis = useActiveAnalysisStore();
const checkingRecord = ref(true);

onMounted(async () => {
  await activeAnalysis.hydrate();
  if (
    activeAnalysis.active?.kind === "consult" &&
    activeAnalysis.active.status === "running"
  ) {
    await navigateTo("/consult/result", { replace: true });
    return;
  }
  try {
    const response = (await ziweiApi.getConsultRecord({
      notifyError: false,
    })) as { data?: unknown };
    if (response.data) {
      await navigateTo("/consult/result", { replace: true });
      return;
    }
  } catch {
    // 404 means there is no previous consult and the new-question UI should open.
  }
  checkingRecord.value = false;
});
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
