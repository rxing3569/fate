<script setup lang="ts">
import {
  BookOpen,
  ArrowUp,
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
const pageUnmounted = ref(false);
const reportCacheSavedAt = ref(0);
const reportContent = ref<HTMLElement | null>(null);
const detailContent = ref<HTMLElement | null>(null);
const showDetailGoToTop = ref(false);
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
    label: "本命",
    title: "尚未生成本命解析",
    description:
      "排定十二宮星曜，深度解析您的本命格局、個性特質、先天運勢與人生藍圖。",
    button: "開始本命解析",
  },
  {
    id: "palace_detail",
    label: "宮位",
    title: "尚未生成宮位解析",
    description:
      "逐宮推演父母、兄弟、夫妻、子女、財帛、交友、官祿、田宅與福德等宮位詳解。",
    button: "開始宮位解析",
  },
  {
    id: "ten_year",
    label: "大運",
    title: "尚未生成大運解析",
    description:
      "結合本命與大運星曜交會，細推每十年大限的事業、感情、財運起伏與關鍵機遇。",
    button: "開始大運解析",
  },
];
const currentMeta = computed(
  () => categories.find((item) => item.id === activeCategory.value)!,
);
const currentRecord = computed(() =>
  records.value.find((item) => item.category === activeCategory.value),
);
const currentIncompleteRecord = computed(() => {
  const record = currentRecord.value;
  return record &&
    (record.is_complete === false ||
      record.is_compelte === false ||
      record.isComplete === false ||
      record.isCompelte === false) &&
    !record.content?.trim()
    ? record
    : null;
});
const incompleteIsRecent = computed(() => {
  const raw =
    currentIncompleteRecord.value?.created_at ||
    currentIncompleteRecord.value?.createdAt;
  if (!raw) return false;
  const created = new Date(raw).getTime();
  return (
    Number.isFinite(created) && Math.abs(Date.now() - created) < 10 * 60 * 1000
  );
});
const incompleteTime = computed(() => {
  const raw =
    currentIncompleteRecord.value?.created_at ||
    currentIncompleteRecord.value?.createdAt;
  if (!raw) return "未知時間";
  const value = new Date(raw);
  return Number.isNaN(value.getTime())
    ? "未知時間"
    : value.toLocaleString("zh-TW", { hour12: false });
});
const currentCategoryIsAnalyzing = computed(
  () => analyzing.value && analyzingCategory.value === activeCategory.value,
);
const currentContent = computed(() =>
  currentCategoryIsAnalyzing.value
    ? outputs[activeCategory.value]
    : outputs[activeCategory.value] || currentRecord.value?.content || "",
);
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
  window.addEventListener("popstate", handleDetailHistory);
  if (auth.isAuthenticated) await auth.refreshMembership();
  chartStore.hydrate(auth.profile);
  await activeAnalysis.hydrate();
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
  void resumeDisconnectedReport();
});
watch(() => activeAnalysis.active, syncActiveReport, { deep: true });

function syncActiveReport() {
  const job = activeAnalysis.active;
  if (!job || job.kind !== "report") return;
  for (const category of categories) {
    const value = job.contents[category.id];
    if (value) outputs[category.id] = value;
  }
  analyzing.value = job.status === "running";
  fullRunning.value =
    job.status === "running" && job.metadata.fullRunning === true;
  analyzingCategory.value =
    (job.metadata.currentCategory as CategoryId | undefined) ?? null;
  receivedStreamData.value = Object.values(job.contents).some((value) =>
    value.trim(),
  );
  if (job.error) error.value = job.error;
}

async function resumeDisconnectedReport() {
  const job = activeAnalysis.active;
  if (
    !job ||
    job.kind !== "report" ||
    job.status !== "running" ||
    job.connected
  )
    return;
  const queue =
    (job.metadata.queue as CategoryId[] | undefined)?.filter((item) =>
      categories.some((category) => category.id === item),
    ) || [];
  if (!queue.length) return;
  let index = Math.max(
    0,
    queue.indexOf(
      (job.metadata.currentCategory as CategoryId | undefined) || queue[0]!,
    ),
  );
  for (
    let attempt = 0;
    attempt < 120 && activeAnalysis.active?.status === "running";
    attempt++
  ) {
    const category = queue[index]!;
    await loadRecords(true);
    const record = records.value.find((item) => item.category === category);
    if (
      !record?.content?.trim() ||
      record.is_complete === false ||
      record.isComplete === false
    ) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      continue;
    }
    outputs[category] = record.content;
    if (index >= queue.length - 1) {
      await activeAnalysis.refreshStatus();
      if (activeAnalysis.active?.status === "running")
        await new Promise((resolve) => setTimeout(resolve, 3000));
      continue;
    }
    index++;
    const nextCategory = queue[index]!;
    activeAnalysis.updateMetadata({ currentCategory: nextCategory });
    const usePointsFallback =
      !auth.premium || auth.membershipQuotaRemaining < 1;
    const completed = await start(
      usePointsFallback,
      false,
      nextCategory,
      true,
      index === queue.length - 1,
    );
    if (!completed) break;
  }
  fullRunning.value = false;
  await loadRecords(true);
}
onBeforeUnmount(() => {
  window.removeEventListener("popstate", handleDetailHistory);
  pageUnmounted.value = true;
  persistReportCache();
});

const completedCategories = computed(
  () =>
    new Set(
      records.value
        .filter((record) => record.content?.trim())
        .map((record) => record.category),
    ),
);
const isFirstFullAnalysis = computed(
  () => !loadingRecords.value && completedCategories.value.size === 0,
);
const quotaCoveredCount = computed(() =>
  auth.premium
    ? Math.min(auth.membershipQuotaRemaining, fullSelected.value.length)
    : 0,
);
const pointsRequiredCount = computed(
  () => fullSelected.value.length - quotaCoveredCount.value,
);
const fullCost = computed(() => pointsRequiredCount.value * 100);
const canStartFull = computed(
  () => fullSelected.value.length > 0 && auth.points >= fullCost.value,
);
const fullCostLabel = computed(() => {
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
  const current = job.metadata.currentCategory as CategoryId | undefined;
  const currentIndex = current ? queue.indexOf(current) : -1;
  return new Set(queue.slice(currentIndex + 1));
});
function toggleFullCategory(category: CategoryId, selected: boolean) {
  fullSelected.value = selected
    ? [...new Set([...fullSelected.value, category])]
    : fullSelected.value.filter((item) => item !== category);
}
function categoryCostLabel(category: CategoryId) {
  const selected = categories
    .map((item) => item.id)
    .filter((item) => fullSelected.value.includes(item));
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
  await loadRecords(true, true);
}

function restoreReportCache() {
  const cached = sessionCache.get<{
    records?: ReportRecord[];
    outputs?: Partial<Record<CategoryId, string>>;
    activeCategory?: CategoryId;
    savedAt?: number;
  }>(reportCacheKey.value);
  if (!cached) return;
  if (Array.isArray(cached.records)) records.value = cached.records;
  for (const category of categories)
    if (cached.outputs?.[category.id])
      outputs[category.id] = cached.outputs[category.id]!;
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
  const cacheableOutputs = { ...outputs };
  if (analyzing.value && analyzingCategory.value)
    cacheableOutputs[analyzingCategory.value] = "";
  sessionCache.set(reportCacheKey.value, {
    records: records.value,
    outputs: cacheableOutputs,
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
  categoryScrollPositions[activeCategory.value] =
    reportContent.value?.scrollTop || 0;
  activeCategory.value = category;
  if (newCategories.value.has(category)) {
    const next = new Set(newCategories.value);
    next.delete(category);
    newCategories.value = next;
  }
  await nextTick();
  if (reportContent.value)
    reportContent.value.scrollTop = categoryScrollPositions[category];
}

function rememberScroll() {
  categoryScrollPositions[activeCategory.value] =
    reportContent.value?.scrollTop || 0;
}

async function start(
  usePointsOverride?: boolean,
  retryIncomplete = false,
  targetCategory: CategoryId = activeCategory.value,
  reuseJob = false,
  finalStep = true,
) {
  const chart = chartStore.chart;
  if (!chart || (analyzing.value && !reuseJob)) return false;
  if (!reuseJob) {
    if (!await auth.verifyOnlineAccess()) return false;
    const started = await activeAnalysis.begin("report", reportCacheKey.value, {
      currentCategory: targetCategory,
      queue: [targetCategory],
      fullRunning: false,
    });
    if (!started) return false;
  }
  showConfirm.value = false;
  outputs[targetCategory] = "";
  error.value = "";
  analyzing.value = true;
  analyzingCategory.value = targetCategory;
  streamReceivedAt[targetCategory] = null;
  sessionCache.set(analysisMarkerKey.value, {
    category: targetCategory,
    startedAt: Date.now(),
  });
  persistReportCache();
  receivedStreamData.value = false;
  const category = targetCategory;
  activeAnalysis.updateMetadata({ currentCategory: category });
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
      analyzing.value = false;
      analyzingCategory.value = null;
      error.value = `本命盤宮位 [${expectedName}] 缺少位置資訊`;
      return false;
    }
  }
  try {
    outputs[category] = await activeAnalysis.runStep(
      {
        analysis_type: category,
        recalculate: true,
        retry_incomplete: retryIncomplete,
        use_points_fallback:
          typeof usePointsOverride === "boolean"
            ? usePointsOverride
            : !auth.premium || auth.membershipQuotaRemaining < 1,
        ...natalChart,
        chart,
        natal_chart: natalChart,
      },
      category,
      finalStep,
    );
    streamReceivedAt[category] = Date.now();
    receivedStreamData.value = true;
    analyzing.value = false;
    analyzingCategory.value = null;
    if (activeCategory.value !== category)
      newCategories.value = new Set([...newCategories.value, category]);
    if (finalStep) sessionCache.remove(analysisMarkerKey.value);
    await auth.loadBilling();
    await loadRecords(true);
    persistReportCache();
    return true;
  } catch (reason) {
    analyzing.value = false;
    analyzingCategory.value = null;
    outputs[category] = "";
    error.value = reason instanceof Error ? reason.message : "分析連線失敗";
    await loadRecords(true);
    sessionCache.remove(analysisMarkerKey.value);
    persistReportCache();
    return false;
  }
}

async function startFullAnalysis() {
  if (!canStartFull.value || fullRunning.value || hasActiveRunLock()) return;
  if (!await auth.verifyOnlineAccess()) return;
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
  fullRunning.value = true;
  receivedStreamData.value = false;
  error.value = "";
  for (const [index, category] of queue.entries()) {
    const usePointsFallback =
      !auth.premium || auth.membershipQuotaRemaining < 1;
    const completed = await start(
      usePointsFallback,
      false,
      category,
      true,
      index === queue.length - 1,
    );
    if (!completed || error.value) break;
  }
  fullRunning.value = false;
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

function openDetail(section: { title: string; content: string }) {
  const detail = {
    title: section.title || `${currentMeta.value.label}解析`,
    content: section.content,
  };
  showDetailGoToTop.value = false;
  selectedDetail.value = detail;
  sessionStorage.setItem("ziwei_report_detail", JSON.stringify(detail));
  history.pushState(
    { ...history.state, ziweiReportDetail: true },
    "",
    `${location.pathname}${location.search}#detail`,
  );
}

function handleDetailHistory() {
  if (!location.hash.includes("detail")) selectedDetail.value = null;
}

function closeDetail() {
  showDetailGoToTop.value = false;
  if (location.hash.includes("detail")) history.back();
  else selectedDetail.value = null;
}

function rememberDetailScroll() {
  showDetailGoToTop.value = (detailContent.value?.scrollTop || 0) >= 120;
}

function goToDetailTop() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  detailContent.value?.scrollTo({
    top: 0,
    behavior: reduceMotion ? "auto" : "smooth",
  });
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
        ><em v-else-if="newCategories.has(category.id)">new</em>
      </button>
    </div>
    <div
      v-if="!selectedDetail && (analyzing || fullRunning) && receivedStreamData"
      class="analysis-progress"
    >
      <span />
    </div>
    <div v-if="!selectedDetail && fullRunning" class="full-running">
      <Sparkles
        :size="15"
      />正在依序生成本命、宮位與大運解析；輪到該項開始時才會扣除額度或點數
    </div>

    <main v-if="!selectedDetail" class="report-body">
      <div v-if="loadingRecords" class="report-loader">
        <Sparkles :size="34" /><strong>正在整理命盤資料…</strong>
      </div>

      <AstrologyLoader
        v-else-if="currentCategoryIsAnalyzing && !receivedStreamData"
      />

      <section
        v-else-if="currentIncompleteRecord && !analyzing"
        class="incomplete-state"
        :class="{ recent: incompleteIsRecent }"
      >
        <span class="incomplete-icon"
          ><RefreshCw v-if="incompleteIsRecent" :size="42" /><span v-else
            >!</span
          ></span
        >
        <h2>
          {{
            incompleteIsRecent
              ? `${currentMeta.label}解析中`
              : `${currentMeta.label}解盤發生錯誤`
          }}
        </h2>
        <div class="incomplete-info">
          <p>
            {{ incompleteIsRecent ? "請求發起時間" : "上次執行解盤時間" }}：{{
              incompleteTime
            }}
          </p>
          <strong>{{
            incompleteIsRecent ? "系統仍在處理這份報告" : "請重新解盤"
          }}</strong
          ><small>{{
            incompleteIsRecent
              ? "完成後會自動保存；您也可以重新讀取最新狀態。"
              : "重新解盤將不會扣除點數或額度"
          }}</small>
        </div>
        <button
          v-if="incompleteIsRecent"
          class="app-button"
          type="button"
          :disabled="refreshingRecords"
          @click="refreshRecords"
        >
          <RefreshCw :size="17" />重新讀取資料
        </button>
        <button
          v-else
          class="app-button"
          type="button"
          :disabled="analyzing"
          @click="start(false, true)"
        >
          <RefreshCw :size="17" />重新解盤
        </button>
      </section>

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
      <main
        ref="detailContent"
        class="inline-detail-body"
        @scroll.passive="rememberDetailScroll"
      >
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
      <Transition name="go-to-top">
        <button
          v-if="showDetailGoToTop"
          class="detail-go-to-top"
          type="button"
          aria-label="回到詳細內容頂端"
          @click="goToDetailTop"
        >
          <ArrowUp :size="21" />
        </button>
      </Transition>
    </section>

    <AppBottomSheet :open="showConfirm" @close="showConfirm = false">
      <h2>
        {{ isRecalculate ? "確認重新解盤" : `開始${currentMeta.label}解析` }}
      </h2>
      <template v-if="isRecalculate"
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
        v-if="auth.premium && auth.membershipQuotaRemaining < 1"
        class="balance-warning"
      >
        本月會員額度不足，您可以稍後再使用，或改用點數繼續本次解析。
      </p>
      <p v-else-if="!auth.premium && auth.points < 100" class="balance-warning">
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
            auth.premium
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
      <h2>會員月度額度已滿</h2>
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
      <h2 id="full-analysis-title">
        {{ isFirstFullAnalysis ? "一次完成三種命盤解析" : "AI 全盤解析" }}
      </h2>
      <p v-if="isFirstFullAnalysis">
        建議首次一次完成本命、宮位與大運解析，能更完整地認識命盤。
      </p>
      <p v-else>選擇要生成或重新解盤的解析項目，每個項目會建立一份獨立報告。</p>
      <p class="sequential-note">
        系統會依照本命、宮位、大運依序執行；執行到該項時才扣除該項額度或 100
        P，仍在等待的項目不會預先扣除。
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
.analysis-progress {
  width: min(calc(100% - 48px), 620px);
  height: 2px;
  margin: 0 auto;
  overflow: hidden;
  background: rgba(36, 87, 90, 0.08);
}
.analysis-progress span {
  display: block;
  width: 35%;
  height: 100%;
  background: var(--mountain);
  transform: translateX(-100%);
  animation: progress 1.15s linear infinite;
}
@keyframes progress {
  to {
    transform: translateX(286%);
  }
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
  border: 0;
  border-radius: 12px;
  background: rgba(36, 87, 90, 0.04);
  color: inherit;
  font-weight: 700;
}
.generated-row button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
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
.analysis-progress,
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
.detail-go-to-top {
  position: fixed;
  z-index: 35;
  right: 20px;
  bottom: calc(88px + env(safe-area-inset-bottom));
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  background: rgba(247, 243, 234, 0.94);
  box-shadow: 0 10px 28px rgba(36, 87, 90, 0.2);
  color: var(--mountain);
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
@media (max-width: 759px) {
  .report-content {
    padding-bottom: calc(112px + env(safe-area-inset-bottom));
  }
  .inline-detail-body {
    padding-bottom: calc(112px + env(safe-area-inset-bottom));
  }
}
</style>
