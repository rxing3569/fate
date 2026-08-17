<script setup lang="ts">
import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  RefreshCw,
  Sparkles,
  WifiOff,
} from "@lucide/vue";
import {
  earthlyBranches,
  getXiaoXianAges,
  palaceNameForBranch,
  ziweiPalaces,
} from "~/utils/ziwei/core";
import { calculateFlowData } from "~/utils/ziwei/calculator";
import {
  extractPdfSummary,
  withoutPdfSummary,
} from "~/utils/report-pdf.client";

definePageMeta({ middleware: "auth" });

type FlowType = "流年" | "流月" | "流日";
type FlowStage = "type" | "date" | "result";
interface FlowSection {
  title: string;
  content: string;
}
interface FlowRecord {
  uuid?: string;
  client_job_id?: string;
  analysis_date_key?: number;
  content?: string;
  is_complete?: boolean;
  created_at?: string;
  updated_at?: string;
}
interface FlowScore {
  title: string;
  score: number;
}

const auth = useAuthStore();
const chartStore = useChartStore();
const activeAnalysis = useActiveAnalysisStore();
const now = new Date();
const stage = ref<FlowStage>("type");
const flowType = ref<FlowType>("流年");
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
const day = ref(now.getDate());
const content = ref("");
const flowPdfSource = ref<HTMLElement | null>(null);
const flowPdfSnapshot = ref<{
  title: string;
  createdAt: string;
  sections: FlowSection[];
} | null>(null);
const { downloading: downloadingFlowPDF, download: downloadAnalysisPdf } =
  useAnalysisPdfDownload();
const premiumFeatureGate = usePremiumFeatureGate();
const {
  showPremiumCheckout,
  premiumCheckoutDraft,
  resumeFeature,
} = premiumFeatureGate;
const createdAt = ref("");
const analyzing = ref(false);
const preparing = ref(false);
const refreshingJob = ref(false);
const error = ref("");
const showConfirm = ref(false);
const showFallback = ref(false);
const recalculate = ref(false);
const usePointsFallback = ref(false);
const incompleteTasks = ref<FlowRecord[]>([]);
const recoveryLoading = ref(false);
const allowActiveFlowResult = ref(false);
const flowUiStateKey = "ziwei:flow-ui-state";

function isDevMockAnalysis() {
  return (
    import.meta.dev &&
    activeAnalysis.active?.metadata.__devMock === "FATE_DEV_ANALYSIS_PANEL"
  );
}

const days = computed(() =>
  Array.from(
    { length: new Date(year.value, month.value, 0).getDate() },
    (_, index) => index + 1,
  ),
);
const birthYear = computed(() =>
  Number(
    chartStore.birthInfo?.year ||
      chartStore.chart?.solarYear ||
      now.getFullYear() - 80,
  ),
);
const dateKey = computed(() =>
  flowType.value === "流年"
    ? year.value * 10000
    : flowType.value === "流月"
      ? year.value * 10000 + month.value * 100
      : year.value * 10000 + month.value * 100 + day.value,
);
const displayDate = computed(() =>
  flowType.value === "流年"
    ? `${year.value}`
    : flowType.value === "流月"
      ? `${year.value}/${String(month.value).padStart(2, "0")}`
      : `${year.value}/${String(month.value).padStart(2, "0")}/${String(day.value).padStart(2, "0")}`,
);
const sections = computed(() => parseSections(content.value));
const visibleSections = computed(() => sections.value);
const formattedCreatedAt = computed(() => {
  if (!createdAt.value) return "";
  const value = new Date(createdAt.value);
  return Number.isNaN(value.getTime())
    ? ""
    : value.toLocaleString("zh-TW", { hour12: false });
});
const flowDisconnected = computed(
  () =>
    activeAnalysis.active?.kind === "flow" &&
    activeAnalysis.active.status === "running" &&
    !activeAnalysis.active.connected,
);
const {
  currentTask: currentIncompleteTask,
  isBackgroundProcessing: incompleteFlowIsBackgroundProcessing,
  canRecover: canRecoverIncompleteFlow,
} = useIncompleteAnalysisRecovery(incompleteTasks);
const flowBackgroundProcessing = computed(
  () =>
    !canRecoverIncompleteFlow.value &&
    (flowDisconnected.value || incompleteFlowIsBackgroundProcessing.value),
);

watch([year, month], () => {
  if (day.value > days.value.length) day.value = days.value.length;
});
watch(
  [stage, flowType, year, month, day, content, createdAt],
  persistFlowUiState,
);
onMounted(async () => {
  if (import.meta.dev)
    window.addEventListener(
      "fate-dev-analysis-applied",
      handleDevAnalysisApplied,
    );
  chartStore.hydrate(auth.profile);
  trackNextStepArrival("flow");
  const restoredStage = restoreFlowUiState();
  await activeAnalysis.hydrate();
  const activeFlow =
    activeAnalysis.active?.kind === "flow" ? activeAnalysis.active : null;
  allowActiveFlowResult.value =
    restoredStage === "result" ||
    (restoredStage === null &&
      (activeFlow?.status === "running" ||
        Boolean(activeFlow?.contents.main?.trim())));
  if (allowActiveFlowResult.value) {
    syncActiveFlow();
    if (!isDevMockAnalysis()) await recoverFlowResult();
  }
  if (!isDevMockAnalysis())
    await loadIncompleteFlowTasks(true, allowActiveFlowResult.value);
  const resumedFeature = premiumFeatureGate.restoreFeature(["flow_pdf"]);
  if (resumedFeature && !content.value.trim()) {
    premiumFeatureGate.closeResume();
    showAppWarning("原解析結果已不存在，請重新產生後再下載 PDF");
  }
});
onBeforeRouteLeave(() => {
  if (analyzing.value && !isDevMockAnalysis()) {
    showAnalysisRunningSnackbar();
    return false;
  }
  if (import.meta.client) sessionStorage.removeItem(flowUiStateKey);
  return true;
});
onBeforeUnmount(() => {
  if (import.meta.dev)
    window.removeEventListener(
      "fate-dev-analysis-applied",
      handleDevAnalysisApplied,
    );
});
watch(() => activeAnalysis.active, syncActiveFlow, { deep: true });

function syncActiveFlow() {
  const job = activeAnalysis.active;
  if (!job || job.kind !== "flow") return;
  if (!allowActiveFlowResult.value) return;
  const meta = job.metadata as {
    flowType?: FlowType;
    year?: number;
    month?: number;
    day?: number;
  };
  if (meta.flowType) flowType.value = meta.flowType;
  if (meta.year) year.value = meta.year;
  if (meta.month) month.value = meta.month;
  if (meta.day) day.value = meta.day;
  content.value = job.contents.main || content.value;
  analyzing.value = job.status === "running";
  error.value = job.error || "";
  stage.value = "result";
}

function handleDevAnalysisApplied() {
  if (!import.meta.dev) return;
  const job = activeAnalysis.active;
  if (!job) {
    analyzing.value = false;
    content.value = "";
    error.value = "";
    return;
  }
  if (job.kind !== "flow" || !isDevMockAnalysis()) return;
  allowActiveFlowResult.value = true;
  content.value = job.contents.main || "";
  stage.value = "result";
  syncActiveFlow();
}

async function recoverFlowResult() {
  const job = activeAnalysis.active;
  if (isDevMockAnalysis()) return;
  if (
    !job ||
    job.kind !== "flow" ||
    !["running", "completed"].includes(job.status)
  )
    return;
  const key = Number(job.metadata.dateKey || 0);
  if (!key) return;
  try {
    const record = normalizeRecord(
      await ziweiApi.getFlowRecord(key, { notifyError: false }),
    );
    const recordTime = Date.parse(
      record?.updated_at || record?.created_at || "",
    );
    const belongsToCurrentJob =
      Boolean(record?.client_job_id) && record?.client_job_id === job.jobId;
    const isFreshSnapshot =
      belongsToCurrentJob ||
      (Number.isFinite(recordTime) && recordTime >= job.startedAt - 1000);
    if (record?.content?.trim() && isFreshSnapshot) {
      content.value = record.content;
      createdAt.value = record.created_at || "";
      stage.value = "result";
      analyzing.value = !record.is_complete;
      if (record.is_complete && activeAnalysis.active?.jobId === job.jobId) {
        activeAnalysis.active.status = "completed";
        activeAnalysis.active.connected = false;
        activeAnalysis.persist();
      }
    }
  } catch {
    /* The streamed snapshot remains available. */
  }
}

async function refreshFlowJob() {
  refreshingJob.value = true;
  try {
    if (
      activeAnalysis.active?.kind === "flow" &&
      activeAnalysis.active.status === "running"
    ) {
      const status = await activeAnalysis.refreshStatus();
      if (status === "running") {
        notify("任務仍在背景處理，請稍後再重新讀取");
      }
    }
    const recoveryRecord = currentIncompleteTask.value;
    if (recoveryRecord?.analysis_date_key) {
      const record = normalizeRecord(
        await ziweiApi.getFlowRecord(recoveryRecord.analysis_date_key, {
          notifyError: false,
        }),
      );
      if (record?.is_complete && record.content?.trim()) {
        allowActiveFlowResult.value = true;
        content.value = record.content;
        createdAt.value = record.created_at || "";
        applyFlowDateKey(
          record.analysis_date_key || recoveryRecord.analysis_date_key,
        );
        stage.value = "result";
        analyzing.value = false;
      }
    }
    await recoverFlowResult();
    await loadIncompleteFlowTasks(true);
  } catch (reason) {
    error.value =
      reason instanceof Error ? reason.message : "目前無法確認任務狀態";
  } finally {
    refreshingJob.value = false;
  }
}

const typeOptions = [
  {
    type: "流年" as const,
    title: "流年（年度）運勢",
    subtitle: "分析整年吉凶起伏、事業財運與流年重點",
    icon: CalendarDays,
  },
  {
    type: "流月" as const,
    title: "流月（月份）運勢",
    subtitle: "細推每月氣場轉變，掌握行事契機與變化",
    icon: CalendarRange,
  },
  {
    type: "流日" as const,
    title: "流日（單日）運勢",
    subtitle: "排算每日吉凶運程，指引生活細節與決策",
    icon: CalendarCheck,
  },
];

function selectType(type: FlowType) {
  flowType.value = type;
  allowActiveFlowResult.value = false;
  stage.value = "date";
  error.value = "";
}
function notify(message: string) {
  showAppInfo(message);
}

function showAnalysisRunningSnackbar() {
  showAppInfo("為避免中斷目前的解析，完成前請留在此頁。", {
    title: "時運解析進行中",
    duration: 4000,
  });
}

function persistFlowUiState() {
  if (!import.meta.client) return;
  if (isDevMockAnalysis()) return;
  sessionStorage.setItem(
    flowUiStateKey,
    JSON.stringify({
      stage: stage.value,
      flowType: flowType.value,
      year: year.value,
      month: month.value,
      day: day.value,
      content: stage.value === "result" ? content.value : "",
      createdAt: stage.value === "result" ? createdAt.value : "",
    }),
  );
}

function restoreFlowUiState(): FlowStage | null {
  if (!import.meta.client) return null;
  try {
    const value = JSON.parse(
      sessionStorage.getItem(flowUiStateKey) || "null",
    ) as {
      stage?: FlowStage;
      flowType?: FlowType;
      year?: number;
      month?: number;
      day?: number;
      content?: string;
      createdAt?: string;
    } | null;
    if (!value) return null;
    if (["流年", "流月", "流日"].includes(value.flowType || "")) {
      flowType.value = value.flowType!;
    }
    if (Number.isInteger(value.year)) year.value = value.year!;
    if (Number.isInteger(value.month)) month.value = value.month!;
    if (Number.isInteger(value.day)) day.value = value.day!;
    if (["type", "date", "result"].includes(value.stage || "")) {
      stage.value = value.stage!;
      if (value.stage === "result") {
        content.value = typeof value.content === "string" ? value.content : "";
        createdAt.value =
          typeof value.createdAt === "string" ? value.createdAt : "";
      }
      return value.stage!;
    }
  } catch {
    sessionStorage.removeItem(flowUiStateKey);
  }
  return null;
}

function normalizeRecord(data: unknown): FlowRecord | null {
  if (!data || typeof data !== "object") return null;
  const wrapped = data as { data?: FlowRecord };
  return wrapped.data ?? (data as FlowRecord);
}

function normalizeFlowRecords(data: unknown): FlowRecord[] {
  const body = data as { data?: unknown } | null;
  return Array.isArray(body?.data) ? (body.data as FlowRecord[]) : [];
}
function applyFlowDateKey(key: number) {
  year.value = Math.floor(key / 10000);
  const rest = key % 10000;
  month.value = Math.floor(rest / 100) || 1;
  day.value = rest % 100 || 1;
  flowType.value = rest === 0 ? "流年" : rest % 100 === 0 ? "流月" : "流日";
}
function incompleteFlowLabel(record: FlowRecord) {
  const key = Number(record.analysis_date_key || 0);
  const rest = key % 10000;
  const type = rest === 0 ? "流年" : rest % 100 === 0 ? "流月" : "流日";
  const y = Math.floor(key / 10000);
  const m = Math.floor(rest / 100);
  const d = rest % 100;
  return `${type}・${y}${m ? `/${String(m).padStart(2, "0")}` : ""}${d ? `/${String(d).padStart(2, "0")}` : ""}`;
}
function recoveryTime(raw?: string) {
  if (!raw) return "未知";
  const value = new Date(raw);
  return Number.isNaN(value.getTime())
    ? raw
    : value.toLocaleString("zh-TW", { hour12: false });
}
async function loadIncompleteFlowTasks(
  preserveContent = false,
  revealResult = true,
) {
  try {
    incompleteTasks.value = normalizeFlowRecords(
      await ziweiApi.getIncompleteAnalyses("flow", { notifyError: false }),
    );
    const record = currentIncompleteTask.value;
    if (record?.analysis_date_key && revealResult) {
      allowActiveFlowResult.value = true;
      applyFlowDateKey(record.analysis_date_key);
      stage.value = "result";
      if (!content.value.trim() && record.content?.trim()) {
        content.value = record.content;
        createdAt.value = record.created_at || "";
      } else if (!preserveContent) {
        content.value = "";
      }
    }
  } catch {
    incompleteTasks.value = [];
  }
}
const incompleteFlowDetails = computed(() => {
  const record = currentIncompleteTask.value;
  if (!record) return [];
  return [
    {
      label: "上次執行",
      value: recoveryTime(record.updated_at || record.created_at),
    },
  ];
});
async function restartIncompleteFlow() {
  const record = currentIncompleteTask.value;
  if (!record?.uuid || !record.analysis_date_key) return;
  recoveryLoading.value = true;
  try {
    await ziweiApi.prepareIncompleteRetry("flow", record.uuid);
    activeAnalysis.dismiss("flow");
    applyFlowDateKey(record.analysis_date_key);
    incompleteTasks.value = [];
    recalculate.value = true;
    await startAnalysis();
  } finally {
    recoveryLoading.value = false;
  }
}
async function abandonIncompleteFlow() {
  const record = currentIncompleteTask.value;
  if (!record?.uuid) return;
  recoveryLoading.value = true;
  try {
    await ziweiApi.abandonIncompleteAnalysis("flow", record.uuid);
    activeAnalysis.dismiss("flow");
    incompleteTasks.value = [];
    content.value = "";
    createdAt.value = "";
    analyzing.value = false;
    recalculate.value = false;
    error.value = "";
    allowActiveFlowResult.value = false;
    stage.value = "type";
  } finally {
    recoveryLoading.value = false;
  }
}

async function requestAnalysis(force = false) {
  if (!chartStore.chart || analyzing.value || preparing.value) return;
  trackNextStepSubmitted("flow");
  if (!(await activeAnalysis.ensureAvailable("flow"))) return;
  preparing.value = true;
  error.value = "";
  recalculate.value = force;
  usePointsFallback.value = false;
  if (!force) {
    try {
      const record = normalizeRecord(
        await ziweiApi.getFlowRecord(dateKey.value, { notifyError: false }),
      );
      if (record?.is_complete && record.content?.trim()) {
        allowActiveFlowResult.value = true;
        content.value = record.content;
        createdAt.value = record.created_at || "";
        stage.value = "result";
        notify("已自動載入歷史排算紀錄，此操作不花費點數。");
        preparing.value = false;
        return;
      }
    } catch {
      /* No completed cache: continue to confirmation. */
    }
  }
  preparing.value = false;
  showConfirm.value = true;
}

function buildPayload() {
  const chart = chartStore.chart!;
  const palaces = earthlyBranches.map((branch) => {
    let name = palaceNameForBranch(chart, branch);
    if (branch === chart.bodyPalaceBranch) name = `${name}(身宮)`;
    const daXian = chart.palaceDaXian[branch];
    return {
      name,
      position: branch,
      stars: chart.palaceStars[branch] || [],
      twelve_gods: {
        ...(chart.palaceChangSheng[branch]
          ? { 長生十二神: chart.palaceChangSheng[branch] }
          : {}),
        ...(chart.palaceBoShi[branch]
          ? { 博士十二神: chart.palaceBoShi[branch] }
          : {}),
        ...(chart.palaceSuiJian[branch]
          ? { 歲建十二神: chart.palaceSuiJian[branch] }
          : {}),
        ...(chart.palaceJiangQian[branch]
          ? { 將前十二神: chart.palaceJiangQian[branch] }
          : {}),
      },
      daxian_ages: daXian ? `${daXian[0]}-${daXian[1]}` : "",
      xiaoxian_ages: getXiaoXianAges(chart, branch).join(", "),
    };
  });
  const flowData = calculateFlowData({
    chart,
    flowType: flowType.value,
    year: year.value,
    month: month.value,
    day: day.value,
  });
  const destinyIndex = earthlyBranches.indexOf(flowData.destinyBranch as never);
  const flowPalaces = ziweiPalaces.map((name, index) => {
    const branch = earthlyBranches[(destinyIndex - index + 12) % 12]!;
    const transformations = (chart.palaceStars[branch] || []).flatMap(
      (star) => {
        const clean = star.replace(/[廟旺得利平陷不]$/, "");
        return flowData.siHua[clean]
          ? [`${clean}${flowData.siHua[clean]}`]
          : [];
      },
    );
    const daXian = chart.palaceDaXian[branch];
    return {
      name,
      position: branch,
      stars: [...(flowData.stars[branch] || []), ...transformations],
      daxian_ages: daXian ? `${daXian[0]}-${daXian[1]}` : "",
      xiaoxian_ages: getXiaoXianAges(chart, branch).join(", "),
    };
  });
  return {
    owner: chart.gender,
    gender: chart.gender,
    birth_date: {
      solar: `${chart.solarYear}年${chart.solarMonth}月${chart.solarDay}日`,
      lunar: `${chart.lunarYear}年${chart.lunarMonth}月${chart.lunarDay}日`,
      ganzhi: `${chart.yearStem || ""}${chart.yearBranch || ""}年 ${chart.timeBranch}時`,
    },
    wuxing_ju: chart.bureau?.name || "未知",
    palaces,
    language: "zh-Hant",
    analysis_type: "flow",
    recalculate: recalculate.value,
    use_points_fallback: usePointsFallback.value,
    flow: { palaces: flowPalaces, analysis_date_key: dateKey.value },
  };
}

async function startAnalysis() {
  if (!(await auth.verifyOnlineAccess())) return;
  showConfirm.value = false;
  const started = await activeAnalysis.begin("flow", `flow:${dateKey.value}`, {
    flowType: flowType.value,
    year: year.value,
    month: month.value,
    day: day.value,
    dateKey: dateKey.value,
  });
  if (!started) return;
  allowActiveFlowResult.value = true;
  stage.value = "result";
  content.value = "";
  createdAt.value = "";
  error.value = "";
  analyzing.value = true;
  try {
    content.value = await activeAnalysis.runStep(buildPayload());
    analyzing.value = false;
    recalculate.value = false;
    await auth.loadBilling();
  } catch (reason) {
    const message =
      reason instanceof Error
        ? reason.message
        : "分析連線發生錯誤，請稍後再試。";
    if (message === "analysis_connection_lost") {
      analyzing.value = true;
      error.value = "";
      return;
    }
    analyzing.value = false;
    if (message.includes("membership_limit_exceeded"))
      showFallback.value = true;
    else if (message.includes("insufficient_points"))
      error.value = "點數餘額不足，請先購買點數後再繼續。";
    else error.value = message;
  }
}

async function usePoints() {
  showFallback.value = false;
  usePointsFallback.value = true;
  await startAnalysis();
}

function parseSections(text: string): FlowSection[] {
  if (!text.trim()) return [];
  const result: FlowSection[] = [];
  let title = "";
  let lines: string[] = [];
  const commit = () => {
    const body = lines.join("\n").trim();
    if (title || body)
      result.push({ title: title || "分析內容", content: body });
    lines = [];
  };
  for (const line of text.split("\n")) {
    const heading = line.trim().match(/^###\s+(.+)$/);
    if (heading) {
      commit();
      title = heading[1]!.trim();
    } else if (title || line.trim()) lines.push(line);
  }
  commit();
  return result;
}

function parseFlowScores(source: string): FlowScore[] {
  return source
    .split("\n")
    .map((line) =>
      line.trim().match(/^[-*+]\s+(.+?)[：:]\s*(\d+)\s*[／/]\s*5\s*$/),
    )
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      title: match[1]!.trim(),
      score: Math.max(0, Math.min(5, Number(match[2]))),
    }));
}

function withoutFlowScores(source: string) {
  return source
    .split("\n")
    .filter(
      (line) =>
        !line.trim().match(/^[-*+]\s+(.+?)[：:]\s*(\d+)\s*[／/]\s*5\s*$/),
    )
    .join("\n")
    .trim();
}

async function downloadFlowPDF() {
  if (downloadingFlowPDF.value || analyzing.value || !content.value.trim()) return;
  const printableContent = content.value.trim();
  await downloadAnalysisPdf({
    source: flowPdfSource,
    filename: () =>
      `江映澄紫微-${flowType.value}-${displayDate.value.replaceAll("/", "-")}.pdf`,
    prepare: () => {
      const parsed = parseSections(printableContent);
      flowPdfSnapshot.value = {
        title: `${displayDate.value} 運勢解析`,
        createdAt: formattedCreatedAt.value,
        sections: parsed.length
          ? parsed
          : [{ title: "時運解析", content: printableContent }],
      };
    },
    cleanup: () => {
      flowPdfSnapshot.value = null;
    },
    onPremiumRequired: () =>
      premiumFeatureGate.requestFeature("flow_pdf", "/flow"),
  });
}

async function resumeFlowPremiumFeature() {
  premiumFeatureGate.closeResume();
  if (!content.value.trim()) {
    showAppWarning("原解析結果已不存在，請重新產生後再下載 PDF");
    return;
  }
  await downloadFlowPDF();
}

const flowActionItems = computed(() => [
  {
    id: "download-pdf",
    label: "下載 PDF",
    loadingLabel: "PDF 產生中",
    icon: Download,
    loading: downloadingFlowPDF.value,
    disabled: analyzing.value,
    premium: true,
  },
  {
    id: "recalculate",
    label: "重新排算",
    icon: RefreshCw,
    disabled: analyzing.value || downloadingFlowPDF.value,
  },
]);

function handleFlowAction(id: string) {
  if (id === "download-pdf") void downloadFlowPDF();
  else if (id === "recalculate") requestAnalysis(true);
}

async function goBack() {
  if (analyzing.value) {
    showAnalysisRunningSnackbar();
    return;
  }
  if (stage.value === "result") {
    allowActiveFlowResult.value = false;
    activeAnalysis.dismiss("flow");
    stage.value = "date";
    content.value = "";
    error.value = "";
    return;
  }
  if (stage.value === "date") {
    allowActiveFlowResult.value = false;
    stage.value = "type";
    return;
  }
  await navigateTo("/ai-analysis");
}
</script>

<template>
  <AppPageLayout
    screen-class="flow-screen"
    content-mode="flush"
    header-layout="wide"
  >
    <template #leading
      ><button
        class="icon-button"
        type="button"
        aria-label="返回排盤解盤"
        @click="goBack"
      >
        <ChevronLeft :size="23" /></button
    ></template>
    <template #title
      ><div class="bar-title"><h1>時運解析</h1></div></template
    >
    <template #actions>
      <AppActionMenu
        v-if="stage === 'result' && content"
        label="時運解析操作"
        :items="flowActionItems"
        @select="handleFlowAction"
      />
      <span v-else />
    </template>
    <Teleport to="body">
      <template v-if="downloadingFlowPDF">
        <div
          v-if="flowPdfSnapshot"
          ref="flowPdfSource"
          class="analysis-pdf-source flow-pdf-source"
          aria-hidden="true"
        >
          <main data-pdf-page>
            <header class="flow-pdf-heading analysis-pdf-cover glass" data-pdf-block>
              <img src="/remove-background-logo.png" alt="" />
              <p>江映澄紫微·時運解析</p>
              <h2>{{ flowPdfSnapshot.title }}</h2>
              <small>分析生成時間：{{ flowPdfSnapshot.createdAt || new Date().toLocaleString("zh-TW", { hour12: false }) }}</small>
              <p class="analysis-pdf-disclaimer">本報告內容供自我探索與參考，不應取代醫療、法律或財務專業意見。</p>
            </header>
            <details
              v-for="(section, index) in flowPdfSnapshot.sections"
              :key="`${section.title}-${index}`"
              class="flow-card glass pdf-flow-card"
              data-pdf-block
              open
            >
              <summary><strong>{{ section.title }}</strong></summary>
              <aside
                v-if="extractPdfSummary(section.content)"
                class="analysis-pdf-summary"
              >
                <header><Sparkles :size="18" /><strong>核心小結</strong></header>
                <MarkdownContent
                  :source="extractPdfSummary(section.content)"
                  :report-formatting="false"
                />
              </aside>
              <MarkdownContent
                v-if="withoutFlowScores(withoutPdfSummary(section.content))"
                :source="withoutFlowScores(withoutPdfSummary(section.content))"
                :report-formatting="false"
              />
              <FlowScoreScale
                v-if="parseFlowScores(section.content).length"
                :scores="parseFlowScores(section.content)"
              />
            </details>
          </main>
        </div>
        <div
          class="analysis-pdf-overlay"
          data-html2canvas-ignore="true"
          role="status"
          aria-live="polite"
        >
          <AppLoading scope="page" layout="fill" :delay="0" message="正在整理時運 PDF，請稍候…" />
        </div>
      </template>
    </Teleport>
    <AnalysisProgressBar v-if="analyzing && content && !flowDisconnected" />

    <main v-if="stage === 'type'" class="flow-body type-stage">
      <p class="stage-copy">
        請選擇您想排算的運勢週期，開始解析運勢<br />（再次輸入已解析過的時間即可調閱歷史資料，且不消耗點數或額度。）
      </p>
      <button
        v-for="option in typeOptions"
        :key="option.type"
        class="type-card glass"
        type="button"
        @click="selectType(option.type)"
      >
        <span class="type-icon"><component :is="option.icon" :size="24" /></span
        ><span
          ><strong>{{ option.title }}</strong
          ><small>{{ option.subtitle }}</small></span
        ><ChevronRight :size="22" />
      </button>
    </main>

    <main v-else-if="stage === 'date'" class="flow-body date-stage">
      <p class="stage-copy">
        選擇分析時間「{{
          flowType
        }}」<br />（再次輸入已解析過的時間即可調閱歷史資料，且不消耗點數或額度。）
      </p>
      <FlowDatePicker
        v-model:year="year"
        v-model:month="month"
        v-model:day="day"
        :flow-type="flowType"
        :birth-year="birthYear"
      />
      <p v-if="!chartStore.chart" class="flow-error">
        請先完成出生資料與命盤設定
      </p>
      <button
        class="app-button start-button"
        type="button"
        :disabled="preparing || !chartStore.chart"
        @click="requestAnalysis(false)"
      >
        <Sparkles :size="18" />{{ preparing ? "正在確認..." : "開始時運解析" }}
      </button>
    </main>

    <main
      v-else
      class="result-stage"
      :class="{ 'background-processing-stage': flowBackgroundProcessing }"
    >
      <h2>{{ displayDate }} 運勢解析</h2>
      <small v-if="formattedCreatedAt" class="analysis-time"
        >分析時間：{{ formattedCreatedAt }}</small
      >
      <AnalysisDisconnectedState
        v-if="flowBackgroundProcessing && !content"
        :loading="refreshingJob"
        @refresh="refreshFlowJob"
      />
      <AstrologyLoader
        v-else-if="analyzing && !content"
        class="flow-loading"
        layout="viewport"
      />
      <section v-else class="flow-result">
        <details
          v-for="(section, index) in visibleSections"
          :key="`${section.title}-${index}`"
          class="flow-card glass"
          :open="index === 0"
        >
          <summary>
            <strong>{{ section.title }}</strong
            ><ChevronDown :size="19" />
          </summary>
          <MarkdownContent
            v-if="withoutFlowScores(section.content)"
            :source="withoutFlowScores(section.content)"
            :report-formatting="false"
          />
          <FlowScoreScale
            v-if="parseFlowScores(section.content).length"
            :scores="parseFlowScores(section.content)"
          />
        </details>
        <MarkdownContent
          v-if="content && !sections.length"
          class="raw-content"
          :source="content"
          :report-formatting="false"
        />
        <div
          v-if="analyzing && content && !flowBackgroundProcessing"
          class="streaming-note"
        >
          <Sparkles :size="16" />正在整理下一段內容...
        </div>
        <div v-if="error" class="result-error">
          <WifiOff :size="22" />
          <p>{{ error }}</p>
          <NuxtLink v-if="error.includes('點數')" class="app-button" to="/store"
            ><Coins :size="17" />前往購買</NuxtLink
          >
        </div>
      </section>
    </main>

    <PremiumCheckoutSheet
      :open="showPremiumCheckout"
      :draft="premiumCheckoutDraft"
      @close="premiumFeatureGate.closeCheckout"
    />
    <PremiumFeatureResumeSheet
      :feature="resumeFeature"
      :loading="downloadingFlowPDF"
      @close="premiumFeatureGate.closeResume"
      @confirm="resumeFlowPremiumFeature"
    />

    <AppBottomSheet :open="showConfirm" @close="showConfirm = false"
      ><template #header><h2>確認執行時運解析</h2></template>
      <p>
        {{
          auth.premium
            ? recalculate
              ? "此次操作將會消耗會員額度 1 次，並覆蓋所選日期的歷史紀錄，是否確認使用？"
              : "此次操作將會消耗會員額度 1 次；如有歷史快取則不消耗，是否確認使用？"
            : recalculate
              ? "此次操作將會消耗 100 點，並覆蓋所選日期的歷史紀錄，是否確認使用？"
              : "此次操作將會消耗 100 點；如有歷史快取則不消耗，是否確認使用？"
        }}
      </p>
      <div class="points-row">
        <Coins :size="18" /><span>{{
          auth.premium ? "本月會員額度剩餘" : "目前點數"
        }}</span
        ><b>{{
          auth.premium
            ? `${auth.membershipQuotaRemaining} 次`
            : `${auth.points} P`
        }}</b>
      </div>
      <div class="sheet-actions">
        <button
          class="app-button outline"
          type="button"
          @click="showConfirm = false"
        >
          取消</button
        ><button
          class="app-button"
          type="button"
          :disabled="!auth.premium && auth.points < 100"
          @click="startAnalysis"
        >
          {{
            recalculate ? "確認重新排算" : auth.premium ? "確認使用" : "確認"
          }}
        </button>
      </div></AppBottomSheet
    >
    <AppBottomSheet :open="showFallback" @close="showFallback = false"
      ><template #header><h2>會員月度額度已滿</h2></template>
      <p>是否改為扣除 100 點數繼續本次時運解析？目前點數：{{ auth.points }}</p>
      <div class="sheet-actions">
        <button
          class="app-button outline"
          type="button"
          @click="showFallback = false"
        >
          取消</button
        ><button
          class="app-button"
          type="button"
          :disabled="auth.points < 100"
          @click="usePoints"
        >
          使用點數
        </button>
      </div></AppBottomSheet
    >
    <IncompleteAnalysisRecoverySheet
      :open="stage === 'result' && canRecoverIncompleteFlow"
      title="發現未完成的時運解析"
      :summary="
        currentIncompleteTask ? incompleteFlowLabel(currentIncompleteTask) : ''
      "
      :details="incompleteFlowDetails"
      :loading="recoveryLoading"
      @retry="restartIncompleteFlow"
      @abandon="abandonIncompleteFlow"
    />
  </AppPageLayout>
</template>

<style scoped>
.flow-pdf-heading {
  margin-bottom: 18px;
  text-align: center;
}
.flow-pdf-heading h2 {
  margin: 8px 0 4px;
  font-size: 18px;
}
.flow-pdf-heading small {
  color: var(--text-soft);
  font-size: 12px;
}
.flow-pdf-source .pdf-flow-card {
  height: auto;
  margin-bottom: 13px;
  overflow: visible;
}
.flow-pdf-source .pdf-flow-card summary {
  cursor: default;
}
.flow-pdf-source .pdf-flow-card summary::marker {
  content: "";
}
.flow-screen {
  position: relative;
}
.flow-screen:has(> .background-processing-stage) {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
}
.danger {
  border-color: var(--cinnabar);
  color: var(--cinnabar);
}
.bar-title {
  min-width: 0;
  text-align: center;
}
.bar-title h1 {
  line-height: 1.15;
}
.bar-title small {
  display: block;
  margin-top: 2px;
  color: rgba(36, 87, 90, 0.38);
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
}
.recalc-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 86px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--mountain);
  font-size: 11px;
  font-weight: 800;
}
.flow-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
  min-height: calc(100dvh - 58px - env(safe-area-inset-top));
  padding: 24px 24px calc(24px + env(safe-area-inset-bottom));
}
.stage-copy {
  margin: 4px 0 28px;
  color: var(--mountain);
  font-size: 16px;
  text-align: center;
}
.type-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 24px;
  gap: 13px;
  align-items: center;
  width: 100%;
  margin-bottom: 16px;
  padding: 20px;
  border: 0;
  border-radius: 26px;
  color: var(--mountain);
  text-align: left;
}
.type-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: rgba(107, 166, 160, 0.13);
}
.type-card strong,
.type-card small {
  display: block;
}
.type-card strong {
  font-size: 17px;
}
.type-card small {
  margin-top: 5px;
  color: var(--text-soft);
  font-size: 12.5px;
  line-height: 1.4;
}
.date-stage {
  max-width: 570px;
  margin: 0 auto;
}
.start-button {
  width: 100%;
  margin-top: 30px;
  gap: 7px;
}
.flow-error {
  color: var(--cinnabar);
  font-size: 13px;
  text-align: center;
}
.result-stage {
  padding: 8px 16px 30px;
}
.result-stage.background-processing-stage {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  padding-bottom: 0;
  overflow: hidden;
}
.background-processing-stage :deep(.analysis-disconnected) {
  flex: 1 1 auto;
  min-height: 0;
}
.result-stage > h2 {
  margin: 8px 0 18px;
  font-size: 20px;
  text-align: center;
}
.flow-result {
  display: grid;
  gap: 13px;
  padding-bottom: 16px;
}
.flow-card {
  overflow: hidden;
  border-radius: 21px;
}
.flow-card summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 60px;
  padding: 16px 18px;
  cursor: pointer;
  list-style: none;
}
.flow-card summary::-webkit-details-marker {
  display: none;
}
.flow-card summary svg {
  transition: transform 0.2s;
}
.flow-card[open] summary svg {
  transform: rotate(180deg);
}
.flow-card[open] summary {
  border-bottom: 1px solid rgba(36, 87, 90, 0.08);
}
.flow-card > :not(summary) {
  padding: 16px 18px 20px;
}
.flow-card :deep(.markdown-content) {
  font-size: 15px;
  line-height: 1.6;
}
.raw-content {
  padding: 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.6);
}
.streaming-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 18px;
  color: var(--text-soft);
  font-size: 13px;
  font-weight: 700;
}
.result-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 22px;
  color: var(--cinnabar);
  text-align: center;
}
.result-error p {
  margin: 8px 0 15px;
}
.result-error .app-button {
  gap: 7px;
}
.choose-again {
  width: 100%;
  gap: 7px;
}
.flow-sheet {
  width: min(100%, 680px);
  padding: 12px 24px calc(28px + env(safe-area-inset-bottom));
  border-radius: 28px 28px 0 0;
  background: var(--paper);
  text-align: center;
}
.sheet-icon {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  margin: 0 auto;
  border-radius: 50%;
  background: rgba(107, 166, 160, 0.13);
}
.sheet-icon.fallback {
  color: var(--cinnabar);
  background: rgba(184, 91, 75, 0.1);
}
.flow-sheet h2 {
  margin: 15px 0 8px;
  font-size: 19px;
}
.flow-sheet p {
  margin: 0 0 20px;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.6;
}
.points-row {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: center;
  margin-bottom: 20px;
  padding: 13px 16px;
  border-radius: 15px;
  background: rgba(107, 166, 160, 0.1);
  text-align: left;
}
.bar-title small {
  display: none;
}
.result-stage > h2 {
  margin-bottom: 3px;
}
.analysis-time {
  display: block;
  margin: 0 0 18px;
  color: rgba(36, 87, 90, 0.42);
  font-size: 11px;
  text-align: center;
}
.flow-loading {
  --astrology-loader-viewport-offset: calc(180px + env(safe-area-inset-bottom));
}
@media (max-width: 420px) {
  .flow-body {
    padding-inline: 18px;
  }
  .result-stage {
    padding-inline: 12px;
  }
  .type-card {
    padding-inline: 16px;
  }
}
</style>
