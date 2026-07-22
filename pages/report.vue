<script setup lang="ts">
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Coins,
  RefreshCw,
  Sparkles,
  WifiOff,
} from "@lucide/vue";
import {
  earthlyBranches,
  getXiaoXianAges,
  palaceNameForBranch,
} from "~/utils/ziwei/core";
import { majorStars } from "~/utils/ziwei/stars";
import { sessionCache } from "~/utils/storage";

definePageMeta({ middleware: "auth" });
type CategoryId = "general" | "palace_detail" | "ten_year";
interface ReportRecord {
  category: CategoryId;
  title?: string;
  content: string;
  is_complete?: boolean;
  is_compelte?: boolean;
  isComplete?: boolean;
  isCompelte?: boolean;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
}

const chartStore = useChartStore();
const auth = useAuthStore();
const activeAnalysis = useActiveAnalysisStore();
const activeCategory = ref<CategoryId>("general");
const outputs = reactive<Record<CategoryId, string>>({
  general: "",
  palace_detail: "",
  ten_year: "",
});
const records = ref<ReportRecord[]>([]);
const loadingRecords = ref(true);
const refreshingRecords = ref(false);
const refreshingJob = ref(false);
const analyzing = ref(false);
const error = ref("");
const showConfirm = ref(false);
const showQuotaFallback = ref(false);
const isRecalculate = ref(false);
const showFullConfirm = ref(false);
const fullRunning = ref(false);
const fullSelected = ref<CategoryId[]>([
  "general",
  "palace_detail",
  "ten_year",
]);
const reportCacheKey = computed(
  () =>
    `ziwei:report:${auth.profile?.uuid || tokenStorage.getUserUuid() || "current"}`,
);
const runLockKey = computed(() => `${reportCacheKey.value}:running`);
const analysisMarkerKey = computed(() => `${reportCacheKey.value}:streaming`);
const doneReadKey = computed(() => `${reportCacheKey.value}:done-read`);
const pageUnmounted = ref(false);
const reportCacheSavedAt = ref(0);
const reportContent = ref<HTMLElement | null>(null);
const detailContent = ref<HTMLElement | null>(null);
const usesDocumentScroll = ref(false);
const suppressScrollTracking = ref(false);
const categoryScrollPositions = reactive<Record<CategoryId, number>>({
  general: 0,
  palace_detail: 0,
  ten_year: 0,
});
const receivedStreamData = ref(false);
const analyzingCategory = ref<CategoryId | null>(null);
const streamReceivedAt = reactive<Record<CategoryId, number | null>>({
  general: null,
  palace_detail: null,
  ten_year: null,
});
const newCategories = ref(new Set<CategoryId>());
const dismissedDoneCategories = ref(new Set<string>());
function restoreDoneNotices() {
  if (!import.meta.client) return;
  try {
    const saved = JSON.parse(localStorage.getItem(doneReadKey.value) || "[]");
    dismissedDoneCategories.value = new Set(
      Array.isArray(saved)
        ? saved.filter((item) => typeof item === "string")
        : [],
    );
  } catch {
    localStorage.removeItem(doneReadKey.value);
  }
}
function persistDoneNotices() {
  if (!import.meta.client) return;
  const recent = [...dismissedDoneCategories.value].slice(-100);
  localStorage.setItem(doneReadKey.value, JSON.stringify(recent));
}
const selectedDetail = ref<{ title: string; content: string } | null>(null);
const detailSummary = computed(
  () =>
    selectedDetail.value?.content
      .match(/\/summary\s*([\s\S]*?)\s*\/summary_end/i)?.[1]
      ?.trim() || "",
);
const detailBefore = computed(() => {
  const content = selectedDetail.value?.content || "";
  const match = content.match(/\/summary\s*([\s\S]*?)\s*\/summary_end/i);
  return match?.index == null ? content : content.slice(0, match.index).trim();
});
const detailAfter = computed(() => {
  const content = selectedDetail.value?.content || "";
  const regex = /\/summary\s*([\s\S]*?)\s*\/summary_end/i;
  const match = regex.exec(content);
  return match
    ? content.slice((match.index || 0) + match[0].length).trim()
    : "";
});
function hasActiveRunLock() {
  const lock = sessionCache.get<{ startedAt?: number }>(runLockKey.value);
  if (!lock) return false;
  if (!lock.startedAt || Date.now() - lock.startedAt > 10 * 60 * 1000) {
    sessionCache.remove(runLockKey.value);
    return false;
  }
  return true;
}

const categories: {
  id: CategoryId;
  label: string;
  title: string;
  description: string;
  button: string;
}[] = [
  {
    id: "general",
    label: "先天命格",
    title: "尚未生成「先天命格」解析",
    description:
      "深度解析您的「先天命格」，人格特質、天賦才華、適合從業，探索自己人生藍圖。",
    button: "開始解析",
  },
  {
    id: "palace_detail",
    label: "宮位詳解",
    title: "尚未生成「宮位詳解」解析",
    description:
      "逐宮推演父母、兄弟、夫妻、子女、財帛、交友、官祿、田宅與福德等宮位詳解。",
    button: "開始解析",
  },
  {
    id: "ten_year",
    label: "十年大運",
    title: "尚未生成「十年大運」解析",
    description:
      "細推您每十年的人生大運走勢，學業、事業、感情、財運運勢起伏與關鍵機遇。",
    button: "開始解析",
  },
];
const currentMeta = computed(
  () => categories.find((item) => item.id === activeCategory.value)!,
);
function recordTimestamp(record: ReportRecord) {
  const value = Date.parse(
    record.updated_at || record.created_at || record.createdAt || "",
  );
  return Number.isFinite(value) ? value : 0;
}
function latestRecordForCategory(category: CategoryId) {
  return records.value
    .filter((item) => item.category === category)
    .sort((left, right) => recordTimestamp(right) - recordTimestamp(left))[0];
}
const currentRecord = computed(() =>
  latestRecordForCategory(activeCategory.value),
);
function recordIsIncomplete(record?: ReportRecord) {
  return Boolean(
    record &&
    (record.is_complete === false ||
      record.is_compelte === false ||
      record.isComplete === false ||
      record.isCompelte === false),
  );
}
const currentIncompleteRecord = computed(() => {
  const record = currentRecord.value;
  return recordIsIncomplete(record) ? record! : null;
});
const currentRetryIsFree = computed(() =>
  Boolean(currentIncompleteRecord.value),
);
const reportJobCategories = computed(() => {
  const job = activeAnalysis.active;
  if (job?.kind !== "report") return new Set<CategoryId>();
  const queue =
    (job.metadata.queue as CategoryId[] | undefined) ||
    (job.metadata.categories as CategoryId[] | undefined) ||
    ((job.metadata.items as Array<{ key?: CategoryId }> | undefined) || [])
      .map((item) => item.key)
      .filter((key): key is CategoryId => Boolean(key));
  return new Set(queue);
});
const activeReportCategories = computed(() =>
  activeAnalysis.active?.status === "running"
    ? reportJobCategories.value
    : new Set<CategoryId>(),
);
const currentCategoryBelongsToActiveJob = computed(() =>
  activeReportCategories.value.has(activeCategory.value),
);
const activeCompletedCategories = computed(
  () =>
    new Set(
      (activeAnalysis.active?.kind === "report"
        ? (activeAnalysis.active.metadata.completedCategories as
            | CategoryId[]
            | undefined)
        : undefined) || [],
    ),
);
const activeFailedCategories = computed(
  () =>
    new Set(
      (activeAnalysis.active?.kind === "report"
        ? (activeAnalysis.active.metadata.failedCategories as
            | CategoryId[]
            | undefined)
        : undefined) || [],
    ),
);
function doneNoticeKey(category: CategoryId) {
  return `${activeAnalysis.active?.jobId || ""}:${category}`;
}
function showDoneNotice(category: CategoryId) {
  return (
    activeCompletedCategories.value.has(category) &&
    !dismissedDoneCategories.value.has(doneNoticeKey(category))
  );
}
const incompleteTime = computed(() => {
  const job = activeAnalysis.active;
  const raw =
    job?.kind === "report" &&
    job.status === "running" &&
    currentCategoryBelongsToActiveJob.value
      ? job.startedAt
      : currentIncompleteRecord.value?.updated_at ||
        currentIncompleteRecord.value?.created_at ||
        currentIncompleteRecord.value?.createdAt;
  if (!raw) return "未知時間";
  const value = new Date(raw);
  return Number.isNaN(value.getTime())
    ? "未知時間"
    : value.toLocaleString("zh-TW", { hour12: false });
});
const currentCategoryIsAnalyzing = computed(
  () =>
    analyzing.value &&
    currentCategoryBelongsToActiveJob.value &&
    !activeCompletedCategories.value.has(activeCategory.value) &&
    !activeFailedCategories.value.has(activeCategory.value),
);
const reportBackgroundProcessing = computed(() => {
  const job = activeAnalysis.active;
  return Boolean(
    currentCategoryIsAnalyzing.value &&
    job?.kind === "report" &&
    job.status === "running" &&
    !job.connected,
  );
});
const currentOutputIsTrusted = computed(() => {
  const job = activeAnalysis.active;
  const category = activeCategory.value;
  if (
    job?.kind !== "report" ||
    !reportJobCategories.value.has(category) ||
    activeFailedCategories.value.has(category) ||
    !outputs[category]?.trim()
  )
    return false;
  return (
    job.status === "running" || activeCompletedCategories.value.has(category)
  );
});
const currentContent = computed(() => {
  if (currentOutputIsTrusted.value) return outputs[activeCategory.value];
  if (recordIsIncomplete(currentRecord.value)) return "";
  return currentRecord.value?.content || "";
});
const generatedAt = computed(() => {
  const receivedAt = streamReceivedAt[activeCategory.value];
  const raw =
    receivedAt ??
    currentRecord.value?.created_at ??
    currentRecord.value?.createdAt;
  if (!raw) return "";
  const value = new Date(raw);
  return Number.isNaN(value.getTime())
    ? ""
    : `分析生成時間：${value.toLocaleString("zh-TW", { hour12: false })}`;
});
const sections = computed(() => parseSections(currentContent.value));
const cardSections = computed(() =>
  currentCategoryIsAnalyzing.value
    ? sections.value.slice(0, -1)
    : sections.value,
);

onMounted(async () => {
  usesDocumentScroll.value = CSS.supports("-webkit-touch-callout", "none");
  window.addEventListener("popstate", handleDetailHistory);
  if (usesDocumentScroll.value)
    window.addEventListener("scroll", rememberScroll, { passive: true });
  chartStore.hydrate(auth.profile);
  restoreDoneNotices();
  syncActiveReport();
  restoreReportCache();
  const query = useRoute().query;
  const shouldRun = query.run === "1";
  const requested = String(query.categories || "")
    .split(",")
    .filter((item): item is CategoryId =>
      categories.some((category) => category.id === item),
    );
  if (shouldRun)
    window.history.replaceState(window.history.state, "", "/report");
  const interruptedStream = Boolean(sessionCache.get(analysisMarkerKey.value));
  await loadRecords(
    Boolean(currentIncompleteRecord.value) || interruptedStream,
  );
  if (interruptedStream) sessionCache.remove(analysisMarkerKey.value);
  if (query.full === "1" && (await activeAnalysis.ensureAvailable("report")))
    showFullConfirm.value = true;
  if (shouldRun && !hasActiveRunLock()) {
    if (requested.length) fullSelected.value = requested;
    await startFullAnalysis();
  }
});
watch(() => activeAnalysis.active, syncActiveReport, { deep: true });

function syncActiveReport() {
  const job = activeAnalysis.active;
  if (!job || job.kind !== "report") return;
  for (const category of categories) {
    const value = job.contents[category.id];
    if (value) outputs[category.id] = value;
  }
  const completed = new Set(
    (job.metadata.completedCategories as CategoryId[] | undefined) || [],
  );
  for (const category of completed) {
    if (!streamReceivedAt[category]) streamReceivedAt[category] = Date.now();
  }
  analyzing.value = job.status === "running";
  fullRunning.value =
    job.status === "running" && job.metadata.fullRunning === true;
  const restoredCategory = job.metadata.currentCategory as
    | CategoryId
    | undefined;
  analyzingCategory.value = categories.some(
    (category) => category.id === restoredCategory,
  )
    ? restoredCategory!
    : job.status === "running"
      ? activeCategory.value
      : null;
  receivedStreamData.value = Object.values(job.contents).some((value) =>
    value.trim(),
  );
  error.value = job.error || "";
}

onBeforeUnmount(() => {
  window.removeEventListener("popstate", handleDetailHistory);
  if (usesDocumentScroll.value)
    window.removeEventListener("scroll", rememberScroll);
  pageUnmounted.value = true;
  persistReportCache();
});

const completedCategories = computed(
  () =>
    new Set(
      records.value
        .filter(
          (record) => !recordIsIncomplete(record) && record.content?.trim(),
        )
        .map((record) => record.category),
    ),
);
const incompleteCategories = computed(
  () =>
    new Set(
      categories
        .map((category) => category.id)
        .filter((category) =>
          recordIsIncomplete(latestRecordForCategory(category)),
        ),
    ),
);
const isFirstFullAnalysis = computed(
  () => !loadingRecords.value && completedCategories.value.size === 0,
);
const billableSelectedCount = computed(
  () =>
    fullSelected.value.filter(
      (category) => !incompleteCategories.value.has(category),
    ).length,
);
const quotaCoveredCount = computed(() =>
  auth.premium
    ? Math.min(auth.membershipQuotaRemaining, billableSelectedCount.value)
    : 0,
);
const pointsRequiredCount = computed(
  () => billableSelectedCount.value - quotaCoveredCount.value,
);
const fullCost = computed(() => pointsRequiredCount.value * 100);
const canStartFull = computed(
  () => fullSelected.value.length > 0 && auth.points >= fullCost.value,
);
const fullCostLabel = computed(() => {
  if (billableSelectedCount.value === 0) return "免費重試";
  const quota = quotaCoveredCount.value;
  const points = fullCost.value;
  if (quota && points) return `${quota} 次額度＋${points} P`;
  if (quota) return `${quota} 次額度`;
  return `${points} P`;
});
const waitingCategories = computed(() => {
  const job = activeAnalysis.active;
  if (!job || job.kind !== "report" || job.status !== "running")
    return new Set<CategoryId>();
  const queue = (job.metadata.queue as CategoryId[] | undefined) || [];
  const completed = new Set(
    (job.metadata.completedCategories as CategoryId[] | undefined) || [],
  );
  const failed = new Set(
    (job.metadata.failedCategories as CategoryId[] | undefined) || [],
  );
  return new Set(
    queue.filter(
      (category) => !completed.has(category) && !failed.has(category),
    ),
  );
});
function toggleFullCategory(category: CategoryId, selected: boolean) {
  fullSelected.value = selected
    ? [...new Set([...fullSelected.value, category])]
    : fullSelected.value.filter((item) => item !== category);
}
function categoryCostLabel(category: CategoryId) {
  if (incompleteCategories.value.has(category)) return "免費重試";
  const selected = categories
    .map((item) => item.id)
    .filter(
      (item) =>
        fullSelected.value.includes(item) &&
        !incompleteCategories.value.has(item),
    );
  const index = selected.indexOf(category);
  return auth.premium && index >= 0 && index < auth.membershipQuotaRemaining
    ? "1 次"
    : "100 P";
}

function showReloadSnackbar(message: string, type: "info" | "error") {
  window.dispatchEvent(
    new CustomEvent("api-error-snackbar", {
      detail: { message, type },
    }),
  );
}

async function loadRecords(force = false, notifyResult = false) {
  if (force && refreshingRecords.value) return;
  if (
    !force &&
    records.value.length &&
    Date.now() - reportCacheSavedAt.value < 5 * 60 * 1000
  ) {
    loadingRecords.value = false;
    return;
  }
  refreshingRecords.value = force;
  loadingRecords.value = records.value.length === 0;
  error.value = "";
  try {
    const data = (await ziweiApi.getRecordDetail({
      notifyError: !notifyResult,
    })) as unknown;
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
    records.value = (list as ReportRecord[]).filter((item) =>
      categories.some((category) => category.id === item.category),
    );
    const activeJob = activeAnalysis.active;
    if (activeJob?.kind === "report" && activeJob.status === "running") {
      const queue =
        (activeJob.metadata.queue as CategoryId[] | undefined) || [];
      const completed = records.value
        .filter((record) => {
          const timestamp = Date.parse(
            record.updated_at || record.created_at || "",
          );
          return (
            record.is_complete !== false &&
            record.content?.trim() &&
            timestamp >= activeJob.startedAt - 1000
          );
        })
        .map((record) => record.category);
      activeJob.metadata.completedCategories = completed;
      if (
        queue.length &&
        queue.every((category) => completed.includes(category))
      ) {
        activeJob.status = "completed";
        activeJob.connected = false;
      }
      activeAnalysis.persist();
    }
    persistReportCache();
    if (notifyResult) showReloadSnackbar("命盤解析已重新讀取最新資料", "info");
  } catch (reason) {
    error.value =
      reason instanceof Error ? reason.message : "目前無法讀取 AI 解盤紀錄";
    if (notifyResult)
      showReloadSnackbar(`命盤解析重新讀取失敗：${error.value}`, "error");
  } finally {
    loadingRecords.value = false;
    refreshingRecords.value = false;
  }
}

async function refreshRecords() {
  if (
    activeAnalysis.active?.kind === "report" &&
    activeAnalysis.active.status === "running"
  ) {
    refreshingJob.value = true;
    try {
      const status = await activeAnalysis.refreshStatus();
      if (status === "running") {
        showReloadSnackbar("任務仍在背景處理，請稍後再重新讀取。", "info");
      }
    } catch (reason) {
      showReloadSnackbar(
        reason instanceof Error ? reason.message : "目前無法確認任務狀態",
        "error",
      );
    } finally {
      refreshingJob.value = false;
    }
  }
  await loadRecords(true, true);
}

function restoreReportCache() {
  const cached = sessionCache.get<{
    records?: ReportRecord[];
    activeCategory?: CategoryId;
    savedAt?: number;
  }>(reportCacheKey.value);
  if (!cached) return;
  if (Array.isArray(cached.records)) records.value = cached.records;
  if (
    cached.activeCategory &&
    categories.some((category) => category.id === cached.activeCategory)
  )
    activeCategory.value = cached.activeCategory;
  reportCacheSavedAt.value = Number(cached.savedAt || 0);
  loadingRecords.value = records.value.length === 0;
}

function persistReportCache() {
  reportCacheSavedAt.value = Date.now();
  sessionCache.set(reportCacheKey.value, {
    records: records.value,
    activeCategory: activeCategory.value,
    savedAt: reportCacheSavedAt.value,
  });
}

watch(activeCategory, persistReportCache);

async function requestStart() {
  if (!chartStore.chart || analyzing.value) return;
  if (!(await activeAnalysis.ensureAvailable("report"))) return;
  if (isFirstFullAnalysis.value) {
    fullSelected.value = categories.map((category) => category.id);
    showFullConfirm.value = true;
    return;
  }
  isRecalculate.value = Boolean(currentContent.value || currentRecord.value);
  showConfirm.value = true;
}

async function confirmSingleAnalysis() {
  if (currentRetryIsFree.value) {
    showConfirm.value = false;
    await start(false, true);
    return;
  }
  if (auth.premium) {
    showConfirm.value = false;
    if (auth.membershipQuotaRemaining > 0) {
      await start(false);
    } else {
      showQuotaFallback.value = true;
    }
    return;
  }
  if (auth.points < 100) {
    showConfirm.value = false;
    await navigateTo("/store");
    return;
  }
  await start(true);
}

async function confirmPointsFallback() {
  showQuotaFallback.value = false;
  if (auth.points < 100) {
    await navigateTo("/store");
    return;
  }
  await start(true);
}

async function selectCategory(category: CategoryId) {
  categoryScrollPositions[activeCategory.value] = currentReportScrollTop();
  activeCategory.value = category;
  if (activeCompletedCategories.value.has(category)) {
    dismissedDoneCategories.value = new Set([
      ...dismissedDoneCategories.value,
      doneNoticeKey(category),
    ]);
    persistDoneNotices();
  }
  if (newCategories.value.has(category)) {
    const next = new Set(newCategories.value);
    next.delete(category);
    newCategories.value = next;
  }
  await restoreReportScroll(category);
}

function currentReportScrollTop() {
  return usesDocumentScroll.value
    ? window.scrollY
    : reportContent.value?.scrollTop || 0;
}

function rememberScroll() {
  if (selectedDetail.value || suppressScrollTracking.value) return;
  categoryScrollPositions[activeCategory.value] = currentReportScrollTop();
}

function setReportScrollTop(top: number) {
  if (usesDocumentScroll.value) window.scrollTo({ top, behavior: "auto" });
  else if (reportContent.value) reportContent.value.scrollTop = top;
}

async function waitForReportLayout() {
  await nextTick();
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

async function restoreReportScroll(category = activeCategory.value) {
  suppressScrollTracking.value = true;
  try {
    await waitForReportLayout();
    setReportScrollTop(categoryScrollPositions[category] || 0);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  } finally {
    suppressScrollTracking.value = false;
  }
}

function buildNatalAnalysisPayload() {
  const chart = chartStore.chart;
  if (!chart) return null;
  const palaces = earthlyBranches.map((branch) => {
    let name = palaceNameForBranch(chart, branch);
    if (branch === chart.bodyPalaceBranch) name = `${name}(身宮)`;
    const stars = chart.palaceStars[branch] || [];
    const daXian = chart.palaceDaXian[branch] || null;
    const xiaoXian = getXiaoXianAges(chart, branch);
    return {
      name,
      position: branch,
      major_stars: stars.filter((star) => majorStars.includes(star)),
      minor_stars: stars.filter((star) => !majorStars.includes(star)),
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
      da_xian: daXian,
      age_range: daXian ? `${daXian[0]}-${daXian[1]}` : "",
      daxian_ages: daXian ? `${daXian[0]}-${daXian[1]}` : "",
      da_xian_age_range: daXian ? `${daXian[0]}-${daXian[1]}` : "",
      xiao_xian: xiaoXian,
      xiaoxian_ages: xiaoXian.join(", "),
      xiao_xian_ages: xiaoXian.join(", "),
    };
  });
  const natalChart = {
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
  };
  const expectedPalaces = [
    "命宮",
    "兄弟",
    "夫妻",
    "子女",
    "財帛",
    "疾厄",
    "遷移",
    "交友",
    "官祿",
    "田宅",
    "福德",
    "父母",
  ];
  for (const expectedName of expectedPalaces) {
    const palace = palaces.find(
      (item) => item.name.replace("(身宮)", "") === expectedName,
    );
    if (!palace?.position) {
      error.value = `本命盤宮位 [${expectedName}] 缺少位置資訊`;
      return null;
    }
  }
  return {
    recalculate: true,
    ...natalChart,
    chart,
    natal_chart: natalChart,
  };
}

async function runReportBatch(
  queue: CategoryId[],
  usePointsOverride?: boolean,
) {
  const payload = buildNatalAnalysisPayload();
  if (!payload || !queue.length) return false;
  for (const category of queue) {
    outputs[category] = "";
    streamReceivedAt[category] = null;
  }
  analyzing.value = true;
  fullRunning.value = queue.length > 1;
  analyzingCategory.value = queue[0] || null;
  error.value = "";
  receivedStreamData.value = false;
  persistReportCache();
  try {
    await activeAnalysis.runBatch(
      {
        ...payload,
        use_points_fallback:
          typeof usePointsOverride === "boolean"
            ? usePointsOverride
            : !auth.premium || auth.membershipQuotaRemaining < queue.length,
      },
      queue,
    );
    for (const category of queue) streamReceivedAt[category] = Date.now();
    receivedStreamData.value = true;
    analyzing.value = false;
    fullRunning.value = false;
    analyzingCategory.value = null;
    const failed =
      (activeAnalysis.active?.metadata.failedCategories as
        | CategoryId[]
        | undefined) || [];
    if (failed.length)
      error.value = `部分解析未完成：${failed.map((id) => categories.find((item) => item.id === id)?.label || id).join("、")}`;
    await auth.loadBilling();
    await loadRecords(true);
    persistReportCache();
    return failed.length === 0;
  } catch (reason) {
    if (
      reason instanceof Error &&
      reason.message === "analysis_connection_lost"
    ) {
      analyzing.value = true;
      fullRunning.value = queue.length > 1;
      error.value = "";
      persistReportCache();
      return false;
    }
    analyzing.value = false;
    fullRunning.value = false;
    analyzingCategory.value = null;
    error.value = reason instanceof Error ? reason.message : "分析連線失敗";
    await loadRecords(true);
    sessionCache.remove(analysisMarkerKey.value);
    persistReportCache();
    return false;
  }
}

async function start(
  usePointsOverride?: boolean,
  _retryIncomplete = false,
  targetCategory: CategoryId = activeCategory.value,
) {
  if (analyzing.value || !(await auth.verifyOnlineAccess())) return false;
  const started = await activeAnalysis.begin("report", reportCacheKey.value, {
    currentCategory: targetCategory,
    queue: [targetCategory],
    fullRunning: false,
  });
  if (!started) return false;
  showConfirm.value = false;
  return runReportBatch([targetCategory], usePointsOverride);
}

async function startFullAnalysis() {
  if (!canStartFull.value || fullRunning.value || hasActiveRunLock()) return;
  if (!(await auth.verifyOnlineAccess())) return;
  const queue = categories
    .map((category) => category.id)
    .filter((category) => fullSelected.value.includes(category));
  const started = await activeAnalysis.begin("report", reportCacheKey.value, {
    currentCategory: queue[0],
    queue,
    fullRunning: true,
  });
  if (!started) return;
  sessionCache.set(runLockKey.value, {
    categories: fullSelected.value,
    startedAt: Date.now(),
  });
  showFullConfirm.value = false;
  await runReportBatch(
    queue,
    !auth.premium || auth.membershipQuotaRemaining < queue.length,
  );
  sessionCache.remove(runLockKey.value);
  await loadRecords(true);
  persistReportCache();
  if (!pageUnmounted.value) await navigateTo("/report", { replace: true });
}

async function handleFullAction() {
  if (!fullSelected.value.length || fullRunning.value) return;
  if (!canStartFull.value) {
    showFullConfirm.value = false;
    await navigateTo("/store");
    return;
  }
  await startFullAnalysis();
}

function parseSections(content: string) {
  if (!content.trim()) return [];
  const result: { title: string; content: string }[] = [];
  let title = "";
  let lines: string[] = [];
  const commit = () => {
    const body = lines.join("\n").trim();
    if (title || body)
      result.push({
        title: decorateDaXianTitle(
          title,
          result.filter((item) => item.title.includes("大限")).length,
        ),
        content: body,
      });
    lines = [];
  };
  for (const line of content.split("\n")) {
    const heading = line.trim().match(/^#{3,4}\s*(.+)$/);
    if (heading) {
      commit();
      title = heading[1]?.trim() || "";
    } else lines.push(line);
  }
  commit();
  return result;
}

function decorateDaXianTitle(title: string, sectionIndex: number) {
  if (activeCategory.value !== "ten_year" || !title.includes("大限"))
    return title;
  const existingRange = title.match(
    /(\d+)\s*[-–—~至]\s*(\d+)\s*歲(?:\s*[（(]虛歲[）)])?/,
  );
  if (existingRange) {
    const normalizedRange = `${existingRange[1]}-${existingRange[2]} 歲（虛歲）`;
    return title
      .replace(existingRange[0], normalizedRange)
      .replace(/(第[^\s]*大限)\s*/, "$1 ")
      .trim();
  }
  const ranges = Object.values(chartStore.chart?.palaceDaXian || {})
    .filter(
      (range): range is [number, number] =>
        Array.isArray(range) && range.length === 2,
    )
    .sort((a, b) => a[0] - b[0]);
  const range = ranges[sectionIndex];
  if (!range) return title;
  const cleanTitle = title
    .replace(/\s*[-–—~至]?\s*歲\s*(?:[（(]虛歲[）)])?\s*$/, "")
    .replace(/\s*[（(]虛歲[）)]\s*$/, "")
    .trim();
  return `${cleanTitle} ${range[0]}-${range[1]} 歲（虛歲）`;
}

function extractSummary(content: string) {
  return (
    content.match(/\/summary\s*([\s\S]*?)\s*\/summary_end/i)?.[1]?.trim() || ""
  );
}

async function openDetail(section: { title: string; content: string }) {
  rememberScroll();
  const detail = {
    title: section.title || `${currentMeta.value.label}解析`,
    content: section.content,
  };
  selectedDetail.value = detail;
  sessionStorage.setItem("ziwei_report_detail", JSON.stringify(detail));
  history.pushState(
    { ...history.state, ziweiReportDetail: true },
    "",
    `${location.pathname}${location.search}#detail`,
  );
  if (usesDocumentScroll.value) {
    await waitForReportLayout();
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

async function handleDetailHistory() {
  if (location.hash.includes("detail")) return;
  selectedDetail.value = null;
  await restoreReportScroll();
}

async function closeDetail() {
  if (location.hash.includes("detail")) history.back();
  else {
    selectedDetail.value = null;
    await restoreReportScroll();
  }
}
</script>

<template>
  <AppPageLayout
    :title="selectedDetail?.title || '命盤解析'"
    screen-class="report-screen"
    content-mode="flush"
    header-layout="wide"
  >
    <template #leading>
      <button
        class="icon-button"
        type="button"
        :aria-label="selectedDetail ? '返回命盤解析' : '返回'"
        @click="selectedDetail ? closeDetail() : $router.back()"
      >
        <ChevronLeft :size="23" />
      </button>
    </template>

    <template #actions>
      <button
        v-if="!selectedDetail && currentContent"
        class="refresh-button"
        type="button"
        :disabled="analyzing || fullRunning"
        @click="requestStart"
      >
        重新解盤
        <RefreshCw :size="16" />
      </button>
      <span v-else />
    </template>

    <div
      v-if="!selectedDetail"
      class="report-tabs glass"
      role="tablist"
      aria-label="解析分類"
    >
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        role="tab"
        :aria-selected="activeCategory === category.id"
        :class="{ active: activeCategory === category.id }"
        @click="selectCategory(category.id)"
      >
        <span>{{ category.label }}</span
        ><em v-if="waitingCategories.has(category.id)" class="wait">wait</em
        ><em v-else-if="showDoneNotice(category.id)">done</em
        ><em v-else-if="newCategories.has(category.id)">new</em>
      </button>
    </div>
    <AnalysisProgressBar
      v-if="
        !selectedDetail &&
        currentCategoryIsAnalyzing &&
        (receivedStreamData || reportBackgroundProcessing)
      "
    />
    <div
      v-if="!selectedDetail && fullRunning && !reportBackgroundProcessing"
      class="full-running"
    >
      <Sparkles :size="15" />正在同時生成所選的命盤解析；完成的項目會立即顯示
    </div>

    <main v-if="!selectedDetail" class="report-body">
      <div v-if="loadingRecords" class="report-loader">
        <Sparkles :size="34" /><strong>正在整理命盤資料…</strong>
      </div>

      <AnalysisDisconnectedState
        v-else-if="reportBackgroundProcessing"
        :loading="refreshingRecords || refreshingJob"
        @refresh="refreshRecords"
      />

      <section
        v-else-if="
          currentIncompleteRecord &&
          !currentCategoryBelongsToActiveJob &&
          !currentOutputIsTrusted
        "
        class="incomplete-state"
      >
        <span class="incomplete-icon"><span>!</span></span>
        <h2>{{ currentMeta.label }}解盤發生錯誤</h2>
        <div class="incomplete-info">
          <p>上次執行解盤時間：{{ incompleteTime }}</p>
          <strong>請重新解盤</strong>
          <small>重新解盤將不會扣除點數或額度</small>
        </div>
        <button
          class="app-button"
          type="button"
          :disabled="analyzing"
          @click="start(false, true)"
        >
          <RefreshCw :size="17" />重新解盤
        </button>
      </section>

      <AstrologyLoader
        v-else-if="currentCategoryIsAnalyzing && !receivedStreamData"
      />

      <section v-else-if="error && !currentContent" class="report-empty">
        <WifiOff :size="52" />
        <h2>資料讀取失敗</h2>
        <p>{{ error }}</p>
        <button
          class="app-button"
          type="button"
          :disabled="refreshingRecords"
          @click="refreshRecords"
        >
          <RefreshCw :size="17" />重新整理
        </button>
      </section>

      <section v-else-if="!currentContent" class="report-empty">
        <span class="empty-icon"><BookOpen :size="29" /></span>
        <h2>{{ currentMeta.title }}</h2>
        <p>{{ currentMeta.description }}</p>
        <button
          class="app-button"
          type="button"
          :disabled="!chartStore.chart"
          @click="requestStart"
        >
          <Sparkles :size="18" />{{ currentMeta.button }}</button
        ><small v-if="!chartStore.chart">請先完成出生資料與命盤設定</small>
      </section>

      <section
        v-else
        ref="reportContent"
        class="report-content"
        @scroll.passive="rememberScroll"
      >
        <div v-if="generatedAt" class="generated-row">
          <span>{{ generatedAt }}</span
          ><button
            type="button"
            :disabled="
              analyzing || fullRunning || loadingRecords || refreshingRecords
            "
            @click="refreshRecords"
          >
            <RefreshCw
              :class="{ spinning: refreshingRecords }"
              :size="13"
            />重新讀取
          </button>
        </div>
        <button
          v-for="(section, index) in cardSections"
          :key="`${section.title}-${index}`"
          class="report-card glass"
          type="button"
          @click="openDetail(section)"
        >
          <strong>{{ section.title || currentMeta.label + "解析" }}</strong>
          <MarkdownContent
            v-if="extractSummary(section.content)"
            class="card-summary"
            :source="extractSummary(section.content)"
          />
          <p v-else class="card-placeholder">摘要整理中…</p>
          <span class="card-more"
            >點擊觀看詳細 <ChevronRight :size="14"
          /></span>
        </button>
        <div
          v-if="currentCategoryIsAnalyzing && receivedStreamData"
          class="streaming-note"
        >
          {{
            cardSections.length ? "正在整理下一段內容…" : "正在整理第一段內容…"
          }}
        </div>
        <p v-if="error" class="report-error">{{ error }}</p>
      </section>
    </main>

    <section v-else class="detail-page" aria-label="命盤解析詳細內容">
      <main ref="detailContent" class="inline-detail-body">
        <section class="inline-detail-surface glass">
          <MarkdownContent v-if="detailBefore" :source="detailBefore" />
          <aside v-if="detailSummary" class="inline-summary-box">
            <div><Sparkles :size="18" /><strong>核心小結</strong></div>
            <MarkdownContent
              class="inline-summary-markdown"
              :source="detailSummary"
            />
          </aside>
          <MarkdownContent v-if="detailAfter" :source="detailAfter" />
        </section>
      </main>
    </section>

    <AppGoToTop
      :scroll-target="
        usesDocumentScroll
          ? null
          : selectedDetail
            ? detailContent
            : reportContent
      "
      :label="selectedDetail ? '回到詳細內容頂端' : '回到命盤解析頂端'"
    />

    <AppBottomSheet :open="showConfirm" @close="showConfirm = false">
      <template #header
        ><h2>
          {{ isRecalculate ? "確認重新解盤" : `開始${currentMeta.label}解析` }}
        </h2></template
      >
      <template v-if="currentRetryIsFree"
        ><strong class="confirm-summary"
          >這是未完成任務，本次重新執行不會扣除額度或點數。</strong
        >
        <p>
          系統會重新執行「{{ currentMeta.label }}解析」，完成後覆寫未完成紀錄。
        </p></template
      ><template v-else-if="isRecalculate"
        ><strong class="confirm-summary">{{
          auth.premium
            ? "重新解盤將消耗會員額度 1 次。"
            : "重新解盤將消耗 100 點數進行分析。"
        }}</strong>
        <p>
          當您點擊「確認重新解盤」後，系統將清除您當前「{{
            currentMeta.label
          }}解析」的歷史解析紀錄，{{
            auth.premium ? "並使用會員免費額度" : "消耗 100 點數，並"
          }}重新生成最新的 AI 詳解。
        </p></template
      >
      <template v-else
        ><strong class="confirm-summary">{{
          auth.premium
            ? "本次解析將消耗會員額度 1 次。"
            : "本次解析將消耗 100 點數。"
        }}</strong>
        <p>確認後將為您生成最新的「{{ currentMeta.label }}解析」。</p></template
      >
      <div class="points-row">
        <Coins :size="18" /><span>{{
          auth.premium ? "本月會員額度剩餘：" : "您當前的點數："
        }}</span
        ><b>{{
          auth.premium
            ? `${auth.membershipQuotaRemaining} 次`
            : `${auth.points} P`
        }}</b>
      </div>
      <p
        v-if="
          !currentRetryIsFree &&
          auth.premium &&
          auth.membershipQuotaRemaining < 1
        "
        class="balance-warning"
      >
        本月會員額度不足，您可以稍後再使用，或改用點數繼續本次解析。
      </p>
      <p
        v-else-if="!currentRetryIsFree && !auth.premium && auth.points < 100"
        class="balance-warning"
      >
        您的點數餘額不足，請購買點數或升級 Premium。
      </p>
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
          @click="confirmSingleAnalysis"
        >
          {{
            currentRetryIsFree
              ? "免費重新執行"
              : auth.premium
                ? auth.membershipQuotaRemaining > 0
                  ? isRecalculate
                    ? "確認重新解盤"
                    : "確認使用"
                  : "改用點數"
                : auth.points >= 100
                  ? isRecalculate
                    ? "確認重新解盤"
                    : "確認"
                  : "前往購買"
          }}
        </button>
      </div>
    </AppBottomSheet>

    <AppBottomSheet
      :open="showQuotaFallback"
      @close="showQuotaFallback = false"
    >
      <template #header><h2>會員月度額度已滿</h2></template>
      <p class="fallback-copy">
        您本月的會員免費額度已消耗完畢。<br /><br />是否改為扣除 100
        點數繼續本次解析？
      </p>
      <div class="points-row">
        <Coins :size="18" /><span>您當前的點數：</span
        ><b>{{ auth.points }} P</b>
      </div>
      <p v-if="auth.points < 100" class="balance-warning">
        您的點數餘額不足，請先購買點數。
      </p>
      <div class="sheet-actions">
        <button
          class="app-button outline"
          type="button"
          @click="showQuotaFallback = false"
        >
          取消</button
        ><button
          class="app-button"
          type="button"
          @click="confirmPointsFallback"
        >
          {{ auth.points >= 100 ? "使用點數繼續" : "前往購買" }}
        </button>
      </div>
    </AppBottomSheet>

    <AppBottomSheet
      :open="showFullConfirm"
      labelledby="full-analysis-title"
      @close="showFullConfirm = false"
    >
      <template #header
        ><h2 id="full-analysis-title">
          {{ isFirstFullAnalysis ? "一次完成三種命盤解析" : "AI 全盤解析" }}
        </h2></template
      >
      <p v-if="isFirstFullAnalysis">
        建議首次一次完成本命、宮位與大運解析，能更完整地認識命盤。
      </p>
      <p v-else>選擇要生成或重新解盤的解析項目，每個項目會建立一份獨立報告。</p>
      <p class="sequential-note">
        系統會同時執行所選項目並扣除相對應額度或點數；未完成項目可免費重新執行，不會再次扣除。
      </p>
      <div class="billing-summary">
        <span>{{ auth.premium ? "會員剩餘額度" : "目前點數" }}</span
        ><b>{{
          auth.premium
            ? `${auth.membershipQuotaRemaining} 次`
            : `${auth.points} P`
        }}</b>
      </div>
      <AppAnalysisOption
        v-for="category in categories"
        :key="category.id"
        :model-value="fullSelected.includes(category.id)"
        :label="category.label"
        :description="category.description"
        :badge="completedCategories.has(category.id) ? '已有報告' : ''"
        :cost="categoryCostLabel(category.id)"
        @update:model-value="toggleFullCategory(category.id, $event)"
      />
      <div class="cost-row">
        <span>本次需要</span><b>{{ fullCostLabel }}</b>
      </div>
      <NuxtLink
        v-if="completedCategories.size"
        class="existing-report"
        to="/report"
        @click="showFullConfirm = false"
        >直接查看已生成報告</NuxtLink
      >
      <button
        class="app-button full-start"
        type="button"
        :disabled="!fullSelected.length"
        @click="handleFullAction"
      >
        {{
          !fullSelected.length
            ? "請選擇解盤項目"
            : canStartFull
              ? "開始全盤解析"
              : "點數不足，前往點數商店"
        }}
      </button>
    </AppBottomSheet>
  </AppPageLayout>
</template>

<style scoped>
.refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  justify-self: end;
  gap: 5px;
  width: 88px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: var(--mountain);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}
.refresh-button:disabled {
  cursor: wait;
  opacity: 0.48;
}
.refresh-button .spinning {
  animation: spin 0.9s linear infinite;
}
.report-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  width: min(calc(100% - 36px), 644px);
  height: 50px;
  margin: 8px auto 12px;
  padding: 5px;
  border-radius: 28px;
}
.report-tabs button {
  position: relative;
  border: 1px solid transparent;
  border-radius: 23px;
  background: transparent;
  color: rgba(36, 87, 90, 0.42);
  font-weight: 700;
}
.report-tabs button.active {
  border-color: rgba(255, 255, 255, 0.65);
  background: rgba(107, 166, 160, 0.2);
  color: var(--mountain);
  font-weight: 800;
}
.report-tabs button em {
  position: absolute;
  top: -3px;
  left: calc(50% + 12px);
  padding: 1px 5px;
  border-radius: 8px;
  background: var(--cinnabar);
  color: #fff;
  font-size: 9px;
  font-style: normal;
  font-weight: 900;
  line-height: 14px;
}
.report-tabs button em.wait {
  background: var(--tea);
  text-transform: uppercase;
}
.report-body {
  min-height: calc(100dvh - 130px);
  padding: 8px 18px 48px;
}
.report-loader,
.report-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 55dvh;
  text-align: center;
}
.report-loader {
  gap: 15px;
  color: var(--text-soft);
}
.report-loader svg {
  animation: pulse 1.2s ease-in-out infinite alternate;
}
@keyframes pulse {
  to {
    opacity: 0.35;
    transform: scale(0.92);
  }
}
.report-empty > svg {
  color: var(--mountain);
}
.empty-icon,
.confirm-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(107, 166, 160, 0.14);
}
.report-empty h2 {
  margin: 18px 0 9px;
  font-size: 19px;
}
.report-empty p {
  max-width: 390px;
  margin: 0 0 26px;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.65;
}
.report-empty .app-button {
  gap: 8px;
}
.report-empty small {
  margin-top: 12px;
  color: var(--cinnabar);
}
.generated-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 4px 0 13px;
  color: rgba(36, 87, 90, 0.42);
  font-size: 11px;
}
.generated-row button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border: 1px solid rgba(36, 87, 90, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--mountain);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 3px 9px rgba(36, 87, 90, 0.08);
  transition:
    color 0.16s ease,
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}
.generated-row button:not(:disabled):hover {
  border-color: rgba(36, 87, 90, 0.34);
  background: rgba(107, 166, 160, 0.14);
  box-shadow: 0 5px 12px rgba(36, 87, 90, 0.13);
  transform: translateY(-1px);
}
.generated-row button:not(:disabled):active {
  box-shadow: none;
  transform: translateY(1px);
}
.generated-row button:focus-visible {
  outline: 2px solid rgba(107, 166, 160, 0.38);
  outline-offset: 2px;
}
.generated-row button:disabled {
  border-color: rgba(36, 87, 90, 0.06);
  background: rgba(36, 87, 90, 0.035);
  color: rgba(36, 87, 90, 0.28);
  box-shadow: none;
  cursor: not-allowed;
  opacity: 1;
}
.report-card {
  display: block;
  width: 100%;
  margin-bottom: 18px;
  padding: 24px;
  border-radius: 30px;
  color: var(--mountain);
  text-align: left;
}
.report-card > strong {
  display: block;
  font-size: 20px;
  line-height: 1.35;
}
.card-summary {
  margin-top: 12px;
}
.card-summary:deep(.markdown-content) {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
}
.card-summary:deep(p) {
  margin-bottom: 5px;
}
.card-summary:deep(p:nth-of-type(n + 4)),
.card-summary:deep(li:nth-child(n + 4)) {
  display: none;
}
.card-placeholder {
  margin: 12px 0 0;
  color: var(--text-soft);
  font-size: 14px;
}
.card-more {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 16px;
  font-size: 13.5px;
  font-weight: 800;
}
.card-more svg {
  color: var(--tea);
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
.report-error {
  color: var(--cinnabar);
  text-align: center;
}
.analysis-sheet {
  width: min(100%, 680px);
  padding: 12px 24px calc(28px + env(safe-area-inset-bottom));
  border-radius: 32px 32px 0 0;
  background: var(--paper);
  text-align: center;
}
.analysis-sheet .confirm-icon {
  margin: 0 auto;
}
.analysis-sheet h2 {
  margin: 15px 0 8px;
}
.analysis-sheet p {
  margin: 0 0 18px;
  color: var(--text-soft);
  line-height: 1.6;
}
.points-row {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  align-items: center;
  padding: 13px 16px;
  margin-bottom: 20px;
  border-radius: 16px;
  background: rgba(107, 166, 160, 0.1);
  text-align: left;
}
.sheet-actions .app-button {
  gap: 7px;
}
.confirm-summary {
  display: block;
  margin: 14px 0 10px;
  color: var(--mountain);
  font-size: 15px;
  line-height: 1.45;
}
.confirm-summary + p {
  color: rgba(36, 87, 90, 0.8);
  font-size: 13px;
  text-align: left;
}
.points-row {
  border: 1px solid rgba(107, 166, 160, 0.3);
}
.balance-warning {
  margin: -8px 0 18px;
  color: var(--cinnabar);
  font-size: 13px;
  font-weight: 800;
  text-align: center;
}
.warning-icon {
  color: var(--cinnabar);
  background: rgba(179, 62, 50, 0.1);
}
.fallback-copy {
  text-align: left;
}
.full-running {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 14px;
  background: rgba(107, 166, 160, 0.1);
  color: var(--mountain);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}
.full-analysis-sheet {
  box-sizing: border-box;
  width: min(100%, 680px);
  max-height: 88dvh;
  overflow-y: auto;
  padding: 12px 22px calc(26px + env(safe-area-inset-bottom));
  border-radius: 30px 30px 0 0;
  background: var(--paper);
}
.full-analysis-sheet .confirm-icon {
  margin: 0 auto;
}
.full-analysis-sheet h2 {
  margin: 13px 0 6px;
  text-align: center;
}
.full-analysis-sheet > p {
  margin: 0 auto 15px;
  max-width: 430px;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.55;
  text-align: center;
}
.sequential-note {
  padding: 10px 12px;
  border-radius: 13px;
  background: rgba(107, 166, 160, 0.1);
  color: var(--mountain);
  font-weight: 750;
}
.billing-summary,
.cost-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(107, 166, 160, 0.1);
  font-size: 13px;
}
.billing-summary b,
.cost-row b {
  font-size: 16px;
}
.analysis-option {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  margin-top: 9px;
  padding: 12px;
  border: 1px solid rgba(36, 87, 90, 0.1);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.58);
}
.analysis-option input {
  width: 18px;
  height: 18px;
  accent-color: var(--mountain);
}
.analysis-option strong,
.analysis-option small {
  display: block;
}
.analysis-option small {
  margin-top: 3px;
  color: var(--text-soft);
  font-size: 11px;
  line-height: 1.4;
}
.analysis-option em {
  color: var(--jade);
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
}
.cost-row {
  margin-top: 12px;
  background: transparent;
  border-top: 1px solid var(--line);
  border-radius: 0;
}
.cost-row b {
  color: var(--cinnabar);
}
.existing-report {
  display: block;
  margin: 5px 0 11px;
  color: var(--mountain);
  font-size: 13px;
  font-weight: 800;
  text-align: center;
  text-decoration: underline;
}
.full-start {
  width: 100%;
}
.report-screen {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
}
.report-tabs,
.full-running {
  flex: 0 0 auto;
}
.report-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  padding: 8px 18px 0;
  overflow: hidden;
}
.report-content {
  width: 100%;
  height: 100%;
  padding-bottom: 48px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(36, 87, 90, 0.28) transparent;
}
.report-content::-webkit-scrollbar {
  width: 5px;
}
.report-content::-webkit-scrollbar-track {
  background: transparent;
}
.report-content::-webkit-scrollbar-thumb {
  border-radius: 5px;
  background: rgba(36, 87, 90, 0.28);
}
.report-loader,
.report-empty,
.incomplete-state {
  flex: 1;
  min-height: 0;
}
.incomplete-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 24px 14px 42px;
  text-align: center;
}
.incomplete-icon {
  display: grid;
  place-items: center;
  width: 108px;
  height: 108px;
  border: 2px solid rgba(179, 62, 50, 0.3);
  border-radius: 50%;
  background: rgba(179, 62, 50, 0.12);
  color: var(--cinnabar);
  font-size: 58px;
  font-weight: 500;
}
.incomplete-state.recent .incomplete-icon {
  border-color: rgba(107, 166, 160, 0.3);
  background: rgba(107, 166, 160, 0.12);
  color: var(--mountain);
}
.incomplete-state.recent .incomplete-icon svg {
  animation: spin 1.3s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.incomplete-state h2 {
  margin: 24px 0 16px;
  color: var(--cinnabar);
  font-size: 22px;
}
.incomplete-state.recent h2 {
  color: var(--mountain);
}
.incomplete-info {
  width: min(100%, 430px);
  padding: 18px 20px;
  border: 1px solid rgba(36, 87, 90, 0.12);
  border-radius: 16px;
  background: rgba(36, 87, 90, 0.08);
}
.incomplete-info p {
  margin: 0 0 12px;
  color: var(--mountain);
  font-size: 14px;
}
.incomplete-info strong,
.incomplete-info small {
  display: block;
}
.incomplete-info strong {
  font-size: 16px;
}
.incomplete-info small {
  margin-top: 6px;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.4;
}
.incomplete-state > .app-button {
  gap: 8px;
  width: min(100%, 430px);
  margin-top: 28px;
}
.detail-page {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}
.inline-detail-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 8px 16px 28px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(36, 87, 90, 0.28) transparent;
}
.inline-detail-body::-webkit-scrollbar {
  width: 5px;
}
.inline-detail-body::-webkit-scrollbar-thumb {
  border-radius: 5px;
  background: rgba(36, 87, 90, 0.28);
}
.inline-detail-surface {
  min-height: 100%;
  padding: 22px 18px;
  border-radius: 30px;
}
.inline-summary-box {
  margin: 18px 0 22px;
  padding: 16px 18px;
  border: 1.5px solid rgba(107, 166, 160, 0.28);
  border-radius: 18px;
  background: rgba(107, 166, 160, 0.12);
}
.inline-summary-box > div {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
  font-size: 14px;
}
.inline-summary-markdown:deep(.markdown-content) {
  color: rgba(36, 87, 90, 0.9);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.6;
}

@supports (-webkit-touch-callout: none) {
  .report-screen {
    display: block;
    height: auto;
    min-height: min(100dvh, 960px);
    overflow: visible;
  }
  .report-body,
  .report-content,
  .detail-page,
  .inline-detail-body {
    display: block;
    height: auto;
    min-height: 0;
    overflow: visible;
  }
  .report-body {
    padding-bottom: 48px;
  }
  .inline-detail-surface {
    min-height: 0;
  }
}
@media (max-width: 759px) {
  .report-content {
    padding-bottom: calc(112px + env(safe-area-inset-bottom));
  }
  .inline-detail-body {
    padding-bottom: calc(112px + env(safe-area-inset-bottom));
  }
}
</style>
