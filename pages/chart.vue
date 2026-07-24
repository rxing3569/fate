<script setup lang="ts">
import { Pencil } from "@lucide/vue";

const chartStore = useChartStore();
const chartHydrated = ref(false);
const checkingReport = ref(false);
const showAnalysisSelection = ref(false);
const message = ref("");
type CategoryId = "general" | "palace_detail" | "ten_year";
const selectedCategories = ref<CategoryId[]>([
  "general",
  "palace_detail",
  "ten_year",
]);
const completedCategories = ref(new Set<CategoryId>());
const auth = useAuthStore();
const activeAnalysis = useActiveAnalysisStore();
const chartFormTarget = computed(() =>
  auth.isAuthenticated ? "/profile/edit?from=chart" : "/ai-analysis?mode=chart",
);
const analysisOptions: Array<{
  id: CategoryId;
  label: string;
  description: string;
}> = [
  {
    id: "general",
    label: "先天命格",
    description: "解析格局、個性特質、先天運勢",
  },
  {
    id: "palace_detail",
    label: "宮位詳解",
    description: "逐宮細推父母、夫妻、財帛、官祿等",
  },
  {
    id: "ten_year",
    label: "十年大運",
    description: "剖析當前十年大限事業、感情、機遇",
  },
];
const analysisCost = computed(() => selectedCategories.value.length * 100);
const hasEnoughBalance = computed(() =>
  auth.premium
    ? auth.membershipQuotaRemaining >= selectedCategories.value.length ||
      auth.points >= analysisCost.value
    : auth.points >= analysisCost.value,
);
function toggleCategory(category: CategoryId, selected: boolean) {
  selectedCategories.value = selected
    ? [...new Set([...selectedCategories.value, category])]
    : selectedCategories.value.filter((item) => item !== category);
}
onMounted(async () => {
  chartStore.hydrate(auth.profile);
  if (chartStore.chart || auth.sessionReady) chartHydrated.value = true;
});
watch(
  () => auth.sessionReady,
  (ready) => {
    if (!ready) return;
    chartStore.hydrate(auth.profile);
    chartHydrated.value = true;
  },
);

async function requestFullAnalysis() {
  if (checkingReport.value) return;
  if (!auth.isAuthenticated) {
    window.dispatchEvent(new CustomEvent("auth-login-required"));
    return;
  }
  if (!(await activeAnalysis.ensureAvailable("report"))) return;
  checkingReport.value = true;
  message.value = "";
  try {
    const data = (await ziweiApi.getRecordDetail()) as unknown;
    const body = data as {
      reports?: unknown;
      records?: unknown;
      data?: unknown;
    } | null;
    const raw = Array.isArray(data)
      ? data
      : (body?.data ?? body?.records ?? body?.reports ?? []);
    const list = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object"
        ? [raw]
        : [];
    const complete = (
      list as Array<{ category?: string; content?: string; status?: string }>
    ).filter(
      (item) =>
        ["general", "palace_detail", "ten_year"].includes(
          item.category || "",
        ) &&
        Boolean(item.content?.trim()) &&
        (!item.status ||
          item.status === "completed" ||
          item.status === "complete"),
    );
    completedCategories.value = new Set(
      complete.map((item) => item.category as CategoryId),
    );
    showAnalysisSelection.value = true;
  } catch (reason) {
    message.value =
      reason instanceof Error
        ? reason.message
        : "目前無法確認解盤紀錄，請稍後再試。";
  } finally {
    checkingReport.value = false;
  }
}

async function confirmAnalysisSelection() {
  if (!selectedCategories.value.length) return;
  if (!hasEnoughBalance.value) {
    showAnalysisSelection.value = false;
    await navigateTo("/store");
    return;
  }
  showAnalysisSelection.value = false;
  await navigateTo({
    path: "/report",
    query: { run: "1", categories: selectedCategories.value.join(",") },
  });
}

async function editChart() {
  if (activeAnalysis.isRunning) {
    message.value = "AI 解盤正在進行中，暫時無法修改命盤資料。";
    return;
  }
  await navigateTo(chartFormTarget.value);
}
</script>

<template>
  <AppPageLayout
    title="命盤排盤"
    screen-class="chart-screen"
    header-layout="wide"
    show-back
  >
    <template #actions>
      <button class="edit-link" type="button" @click="editChart">
        修改命盤 <Pencil :size="16" aria-hidden="true" />
      </button>
    </template>
    <p v-if="message" class="chart-message" role="alert">{{ message }}</p>
    <main class="chart-content">
      <ChartGrid
        v-if="chartStore.chart"
        :chart="chartStore.chart"
        @full-analysis="requestFullAnalysis"
      />
      <ChartEmptyGrid
        v-else
        :loading="!chartHydrated"
        :action-to="chartFormTarget"
      />
    </main>
    <AppBottomSheet
      :open="showAnalysisSelection"
      @close="showAnalysisSelection = false"
    >
      <template #header
        ><h2>
          {{ completedCategories.size ? "是否重新解盤" : "AI 全盤解析" }}
        </h2></template
      >
      <div v-if="completedCategories.size" class="reanalysis-copy">
        <strong>已存在您的「命盤解析」，是否要重新進行解盤？</strong>
        <p>
          {{
            auth.premium
              ? "重新解盤將會重新進行命盤解析，並根據您的選擇消耗會員額度，如果您只想查看之前的解析，請直接點選「直接查看歷史紀錄」。"
              : "重新解盤將會重新進行命盤解析，並根據您的選擇扣除點數，如果您只想查看之前的解析，請直接點選「直接查看歷史紀錄」。"
          }}
        </p>
      </div>
      <div class="balance-card">
        <span>{{ auth.premium ? "會員剩餘額度：" : "您當前的點數：" }}</span
        ><b>{{
          auth.premium
            ? `${auth.membershipQuotaRemaining} 次`
            : `${auth.points} P`
        }}</b>
      </div>
      <div class="analysis-options">
        <AppAnalysisOption
          v-for="option in analysisOptions"
          :key="option.id"
          :model-value="selectedCategories.includes(option.id)"
          :label="option.label"
          :description="option.description"
          :badge="completedCategories.has(option.id) ? '已生成' : ''"
          :cost="
            auth.premium &&
            auth.membershipQuotaRemaining >= selectedCategories.length
              ? '1 次'
              : '100 P'
          "
          @update:model-value="toggleCategory(option.id, $event)"
        />
      </div>
      <div class="selection-cost">
        <strong>本次預計消耗：</strong
        ><b>{{
          auth.premium &&
          auth.membershipQuotaRemaining >= selectedCategories.length
            ? `${selectedCategories.length} 次`
            : `${analysisCost} P`
        }}</b>
      </div>
      <button
        class="app-button selection-start"
        type="button"
        :disabled="!selectedCategories.length"
        @click="confirmAnalysisSelection"
      >
        {{
          !selectedCategories.length
            ? "請選擇解盤項目"
            : hasEnoughBalance
              ? completedCategories.size
                ? "確認重新解盤"
                : "開始解盤"
              : "點數不足，查看方案"
        }}</button
      ><button
        v-if="completedCategories.size"
        class="view-existing"
        type="button"
        @click="
          showAnalysisSelection = false;
          navigateTo('/report');
        "
      >
        直接查看歷史紀錄
      </button>
    </AppBottomSheet>
  </AppPageLayout>
</template>

<style scoped>
.chart-screen {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100svh;
  min-height: 0;
  overflow: hidden;
}

.edit-link {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  justify-self: end;
  flex: 0 0 88px;
  width: 88px;
  min-width: 88px;
  max-width: 88px;
  height: 42px;
  margin: 0;
  padding: 0 4px 0 0;
  border: 0;
  background: transparent;
  color: var(--mountain);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}
.edit-link svg {
  flex: 0 0 auto;
}
.chart-content {
  display: flex;
  flex: 1 1 auto;
  align-items: flex-start;
  min-height: 0;
  padding-bottom: 0;
  overflow: hidden;
}

.chart-message {
  margin: 0;
  padding: 8px 14px;
  background: rgba(179, 62, 50, 0.1);
  color: var(--cinnabar);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.reanalysis-copy {
  margin: 0 0 16px;
  color: var(--mountain);
  text-align: left;
}
.reanalysis-copy strong {
  display: block;
  font-size: 15px;
  line-height: 1.5;
  text-align: center;
}
.reanalysis-copy p {
  margin: 10px 0 0;
  color: rgba(36, 87, 90, 0.8);
  font-size: 13px;
  line-height: 1.55;
}

.balance-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid rgba(107, 166, 160, 0.3);
  border-radius: 16px;
  background: rgba(107, 166, 160, 0.12);
  color: var(--mountain);
  font-size: 14px;
}
.balance-card b {
  font-size: 16px;
}
.analysis-options {
  margin-top: 16px;
}

.selection-cost {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0px;
  color: var(--mountain);
}
.selection-cost > b {
  color: var(--cinnabar);
  font-size: 18px;
  font-weight: 700;
}

.selection-start {
  width: 100%;
  min-height: 48px;
  border-radius: 16px;
  font-size: 15px;
}

.view-existing {
  width: 100%;
  min-height: 48px;
  margin-top: 8px;
  padding: 13px;
  border: 1.2px solid rgba(36, 87, 90, 0.42);
  border-radius: 16px;
  background: transparent;
  color: var(--mountain);
  font-size: 15px;
  font-weight: 800;
}

</style>
