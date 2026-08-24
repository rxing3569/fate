<script setup lang="ts">
import {
  ChevronDown,
  ChevronLeft,
  ChevronsUpDown,
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
  annualCareerOptions,
  annualDecisionOptions,
  annualRelationshipOptions,
  annualWealthOptions,
  emptyAnnualFlowFocus,
  normalizeAnnualFlowFocus,
  type AnnualFlowFocus,
} from "~/utils/annual-flow-focus";

definePageMeta({ middleware: "auth" });
useHead({ title: "流年運勢｜江映澄紫微" });

interface AnnualRecord {
  uuid?: string;
  analysis_year?: number;
  content?: string;
  is_complete?: boolean;
  created_at?: string;
  updated_at?: string;
  focus?: AnnualFlowFocus;
}
interface Section {
  title: string;
  content: string;
}
interface FlowScore {
  title: string;
  score: number;
}
interface AnnualScore extends FlowScore {
  description?: string;
  visualIndex: number;
}

const annualScoreTitles = [
  "心境穩定",
  "發展動能",
  "機會資源",
  "掌控能力",
  "成長強度",
] as const;
const annualScorePattern = (title: string) =>
  new RegExp(`${title}[\\s*_]*(?:[（(:：]\\s*)?(\\d{1,3})\\s*[／/]\\s*100`, "u");

const auth = useAuthStore();
const chartStore = useChartStore();
const activeAnalysis = useActiveAnalysisStore();
const annualFlowUiStateKey = "ziwei:annual-flow-ui-state";
const now = new Date();
const today = taipeiToday();
const year = ref(today.year);
const focus = reactive<AnnualFlowFocus>(emptyAnnualFlowFocus());
const content = ref("");
const createdAt = ref("");
const analyzing = ref(false);
const preparing = ref(false);
const refreshingJob = ref(false);
const error = ref("");
const showConfirm = ref(false);
const showFallback = ref(false);
const showCacheChoice = ref(false);
const cachedRecord = ref<AnnualRecord | null>(null);
const usePointsFallback = ref(false);
const recalculate = ref(false);
const resultVisible = ref(false);
const collapsedSections = ref<Set<string>>(new Set());
const incompleteTasks = ref<AnnualRecord[]>([]);
const recoveryLoading = ref(false);
const pdfSource = ref<HTMLElement | null>(null);
const pdfSnapshot = ref<{
  title: string;
  createdAt: string;
  sections: Section[];
} | null>(null);
const { downloading, download } = useAnalysisPdfDownload();
const premiumGate = usePremiumFeatureGate();
const { showPremiumCheckout, premiumCheckoutDraft, resumeFeature } =
  premiumGate;
const minYear = computed(() =>
  Number(
    chartStore.birthInfo?.year ||
      chartStore.chart?.solarYear ||
      now.getFullYear() - 80,
  ),
);
const formattedCreatedAt = computed(() =>
  createdAt.value
    ? new Date(createdAt.value).toLocaleString("zh-TW", { hour12: false })
    : "",
);
const sections = computed(() => parseSections(content.value));
const majorDecisionModel = computed({
  get: () => focus.major_decision,
  set: (value: string) => {
    focus.major_decision = Array.from(value).slice(0, 100).join("");
  },
});
const majorDecisionCount = computed(
  () => Array.from(focus.major_decision).length,
);
const disconnected = computed(
  () =>
    activeAnalysis.active?.kind === "annual_flow" &&
    activeAnalysis.active.status === "running" &&
    !activeAnalysis.active.connected,
);
const { currentTask, canRecover, isBackgroundProcessing } =
  useIncompleteAnalysisRecovery(incompleteTasks);
const backgroundProcessing = computed(
  () =>
    !canRecover.value && (disconnected.value || isBackgroundProcessing.value),
);
const allSectionsExpanded = computed(
  () =>
    sections.value.length > 0 &&
    sections.value.every(
      (section, index) =>
        !collapsedSections.value.has(sectionKey(section, index)),
    ),
);
const bulkToggleDisabled = computed(
  () =>
    analyzing.value ||
    backgroundProcessing.value ||
    Boolean(error.value) ||
    sections.value.length === 0,
);

onMounted(async () => {
  chartStore.hydrate(auth.profile);
  trackNextStepArrival("annual_flow");
  const restored = restoreAnnualFlowUiState();
  await activeAnalysis.hydrate();
  const active = activeAnalysis.active;
  if (
    active?.kind === "annual_flow" &&
    (active.status === "running" || active.contents.main?.trim())
  ) {
    resultVisible.value = true;
  }
  if (resultVisible.value) {
    syncActive();
    if (active?.kind === "annual_flow") await recoverResult();
  } else if (restored === false) {
    clearAnnualFlowUiState();
  }
  await loadIncomplete();
  const resumed = premiumGate.restoreFeature([
    "annual_flow",
    "annual_flow_pdf",
  ]);
  if (resumed === "annual_flow_pdf" && content.value.trim()) {
    premiumGate.closeResume();
    await nextTick(downloadPDF);
  } else if (resumed === "annual_flow") {
    premiumGate.closeResume();
    await nextTick(() => requestAnalysis(false));
  }
});
watch(() => activeAnalysis.active, syncActive, { deep: true });
watch(
  [resultVisible, content, createdAt, year, focus, collapsedSections],
  persistAnnualFlowUiState,
  { deep: true },
);
onBeforeRouteLeave(() => {
  if (analyzing.value) {
    showAppInfo("為避免中斷流年運勢解析，完成前請留在此頁。");
    return false;
  }
  clearAnnualFlowUiState();
  return true;
});

function normalizeRecord(value: unknown): AnnualRecord | null {
  if (!value || typeof value !== "object") return null;
  const wrapped = value as { data?: AnnualRecord };
  return wrapped.data || (value as AnnualRecord);
}
function normalizeRecords(value: unknown) {
  const wrapped = value as { data?: unknown };
  return Array.isArray(wrapped?.data) ? (wrapped.data as AnnualRecord[]) : [];
}
function persistAnnualFlowUiState() {
  if (!import.meta.client) return;
  if (!resultVisible.value) {
    clearAnnualFlowUiState();
    return;
  }
  sessionStorage.setItem(
    annualFlowUiStateKey,
    JSON.stringify({
      resultVisible: true,
      year: year.value,
      content: content.value,
      createdAt: createdAt.value,
      focus: normalizeAnnualFlowFocus(focus),
      collapsedSections: [...collapsedSections.value],
    }),
  );
}
function restoreAnnualFlowUiState(): boolean | null {
  if (!import.meta.client) return null;
  try {
    const value = JSON.parse(
      sessionStorage.getItem(annualFlowUiStateKey) || "null",
    ) as {
      resultVisible?: boolean;
      year?: number;
      content?: string;
      createdAt?: string;
      focus?: Partial<AnnualFlowFocus>;
      collapsedSections?: string[];
    } | null;
    if (!value) return null;
    resultVisible.value = value.resultVisible === true;
    if (!resultVisible.value) return false;
    if (Number.isInteger(value.year)) year.value = Number(value.year);
    content.value = typeof value.content === "string" ? value.content : "";
    createdAt.value =
      typeof value.createdAt === "string" ? value.createdAt : "";
    Object.assign(focus, normalizeAnnualFlowFocus(value.focus));
    collapsedSections.value = new Set(
      Array.isArray(value.collapsedSections)
        ? value.collapsedSections.filter(
            (item): item is string => typeof item === "string",
          )
        : [],
    );
    return true;
  } catch {
    clearAnnualFlowUiState();
    return null;
  }
}
function clearAnnualFlowUiState() {
  if (import.meta.client) sessionStorage.removeItem(annualFlowUiStateKey);
}
function syncActive() {
  const job = activeAnalysis.active;
  if (!job || job.kind !== "annual_flow" || !resultVisible.value) return;
  const selectedYear = Number(job.metadata.year);
  if (Number.isInteger(selectedYear)) year.value = selectedYear;
  const activeFocus = job.metadata.focus as
    | Partial<AnnualFlowFocus>
    | undefined;
  if (activeFocus) Object.assign(focus, normalizeAnnualFlowFocus(activeFocus));
  content.value = job.contents.main || content.value;
  analyzing.value = job.status === "running";
  error.value = job.error || "";
}
async function recoverResult() {
  const job = activeAnalysis.active;
  if (!job || job.kind !== "annual_flow") return;
  await activeAnalysis.refreshStatus();
  const record = normalizeRecord(
    await ziweiApi
      .getAnnualFlowRecord(year.value, { notifyError: false })
      .catch(() => null),
  );
  if (record?.content?.trim()) {
    content.value = record.content;
    createdAt.value = record.created_at || record.updated_at || "";
    analyzing.value = !record.is_complete;
  }
}
async function loadIncomplete() {
  try {
    incompleteTasks.value = normalizeRecords(
      await ziweiApi.getIncompleteAnalyses("annual_flow", {
        notifyError: false,
      }),
    );
    const record = currentTask.value;
    if (record?.analysis_year) {
      year.value = record.analysis_year;
      Object.assign(focus, normalizeAnnualFlowFocus(record.focus));
      resultVisible.value = true;
      content.value ||= record.content || "";
      createdAt.value ||= record.created_at || "";
    }
  } catch {
    incompleteTasks.value = [];
  }
}
async function retryIncomplete() {
  const record = currentTask.value;
  if (!record?.uuid || !record.analysis_year) return;
  recoveryLoading.value = true;
  try {
    await ziweiApi.prepareIncompleteRetry("annual_flow", record.uuid);
    activeAnalysis.dismiss("annual_flow");
    year.value = record.analysis_year;
    Object.assign(focus, normalizeAnnualFlowFocus(record.focus));
    incompleteTasks.value = [];
    recalculate.value = true;
    await startAnalysis();
  } finally {
    recoveryLoading.value = false;
  }
}
async function abandonIncomplete() {
  const record = currentTask.value;
  if (!record?.uuid) return;
  recoveryLoading.value = true;
  try {
    await ziweiApi.abandonIncompleteAnalysis("annual_flow", record.uuid);
    activeAnalysis.dismiss("annual_flow");
    incompleteTasks.value = [];
    resultVisible.value = false;
    content.value = "";
    error.value = "";
  } finally {
    recoveryLoading.value = false;
  }
}

async function requestAnalysis(force = false) {
  if (!chartStore.chart || preparing.value || analyzing.value) return;
  if (!(await auth.verifyOnlineAccess())) return;
  if (!(await auth.refreshMembership())) {
    error.value = "目前無法確認會員狀態，請檢查網路後再試。";
    return;
  }
  if (!auth.premium) {
    premiumGate.requestFeature("annual_flow", "/annual-flow");
    return;
  }
  if (!(await activeAnalysis.ensureAvailable("annual_flow"))) return;
  trackNextStepSubmitted("annual_flow");
  preparing.value = true;
  error.value = "";
  recalculate.value = force;
  usePointsFallback.value = false;
  if (!force) {
    let record: AnnualRecord | null = null;
    try {
      record = normalizeRecord(
        await ziweiApi.getAnnualFlowRecord(year.value, {
          notifyError: false,
        }),
      );
    } catch (reason) {
      if (!(reason instanceof ApiError && reason.status === 404)) {
        preparing.value = false;
        error.value = "目前無法確認是否已有流年報告，請稍後再試。";
        showAppError(error.value);
        return;
      }
    }
    if (record?.is_complete && record.content?.trim()) {
      cachedRecord.value = record;
      showCacheChoice.value = true;
      preparing.value = false;
      return;
    }
  }
  preparing.value = false;
  showConfirm.value = true;
}
function loadCachedRecord(record: AnnualRecord, restoreFocus = true) {
  if (restoreFocus)
    Object.assign(focus, normalizeAnnualFlowFocus(record.focus));
  content.value = record.content || "";
  createdAt.value = record.created_at || record.updated_at || "";
  error.value = "";
  resetSectionExpansion();
  resultVisible.value = true;
  showCacheChoice.value = false;
  cachedRecord.value = null;
  showAppInfo("已載入歷史流年運勢，不消耗額度或點數。");
}
function loadPreviousFocus() {
  if (cachedRecord.value) loadCachedRecord(cachedRecord.value);
}
async function recalculateWithCurrentFocus() {
  showCacheChoice.value = false;
  cachedRecord.value = null;
  recalculate.value = true;
  await startAnalysis();
}
function buildPalaces() {
  const chart = chartStore.chart!;
  return earthlyBranches.map((branch) => {
    let name = palaceNameForBranch(chart, branch);
    if (branch === chart.bodyPalaceBranch) name += "(身宮)";
    const daXian = chart.palaceDaXian[branch];
    return {
      name,
      position: branch,
      stars: chart.palaceStars[branch] || [],
      daxian_ages: daXian ? `${daXian[0]}-${daXian[1]}` : "",
      xiaoxian_ages: getXiaoXianAges(chart, branch).join(", "),
    };
  });
}
function buildPayload() {
  const chart = chartStore.chart!;
  const flow = calculateFlowData({
    chart,
    flowType: "流年",
    year: year.value,
    month: 1,
    day: 1,
  });
  const destinyIndex = earthlyBranches.indexOf(flow.destinyBranch as never);
  const annualPalaces = ziweiPalaces.map((name, index) => {
    const branch = earthlyBranches[(destinyIndex - index + 12) % 12]!;
    const transformations = (chart.palaceStars[branch] || []).flatMap(
      (star) => {
        const clean = star.replace(/[廟旺得利平陷不]$/, "");
        return flow.siHua[clean] ? [`${clean}${flow.siHua[clean]}`] : [];
      },
    );
    const daXian = chart.palaceDaXian[branch];
    return {
      name,
      position: branch,
      stars: [...(flow.stars[branch] || []), ...transformations],
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
    palaces: buildPalaces(),
    language: "zh-Hant",
    analysis_type: "annual_flow",
    recalculate: recalculate.value,
    use_points_fallback: usePointsFallback.value,
    annual_flow: {
      palaces: annualPalaces,
      analysis_year: year.value,
      focus: normalizeAnnualFlowFocus(focus),
    },
  };
}
async function startAnalysis() {
  showConfirm.value = false;
  const started = await activeAnalysis.begin(
    "annual_flow",
    `annual_flow:${year.value}`,
    { year: year.value, focus: normalizeAnnualFlowFocus(focus) },
  );
  if (!started) return;
  resetSectionExpansion();
  resultVisible.value = true;
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
      reason instanceof Error ? reason.message : "流年運勢解析失敗";
    analyzing.value = false;
    if (message.includes("membership_limit_exceeded"))
      showFallback.value = true;
    else if (message.includes("requires_membership"))
      premiumGate.requestFeature("annual_flow", "/annual-flow");
    else if (message.includes("insufficient_points"))
      error.value = "點數餘額不足，請先購買點數後再繼續。";
    else if (message === "invalid_analysis_payload") {
      activeAnalysis.dismiss("annual_flow");
      resultVisible.value = false;
      content.value = "";
      error.value = "關注選項已更新，請重新確認選擇後再試。";
      showAppWarning(error.value);
    }
    else if (message === "analysis_connection_lost") analyzing.value = true;
    else error.value = message;
  }
}
async function usePoints() {
  showFallback.value = false;
  usePointsFallback.value = true;
  await startAnalysis();
}
function parseSections(text: string): Section[] {
  const result: Section[] = [];
  let title = "";
  let lines: string[] = [];
  const commit = () => {
    const body = lines.join("\n").trim();
    if (title || body)
      result.push({ title: title || "年度分析", content: body });
    lines = [];
  };
  for (const line of text.split("\n")) {
    const match = line.trim().match(/^###\s+(.+)$/);
    if (match) {
      commit();
      title = match[1]!.trim();
    } else if (title || line.trim()) lines.push(line);
  }
  commit();
  return result;
}
function sectionKey(section: Section, index: number) {
  return `${section.title}-${index}`;
}
function resetSectionExpansion() {
  collapsedSections.value = new Set();
}
function isSectionExpanded(section: Section, index: number) {
  return !collapsedSections.value.has(sectionKey(section, index));
}
function handleSectionToggle(
  event: Event,
  section: Section,
  index: number,
) {
  const details = event.currentTarget as HTMLDetailsElement;
  const key = sectionKey(section, index);
  const next = new Set(collapsedSections.value);
  if (details.open) next.delete(key);
  else next.add(key);
  collapsedSections.value = next;
}
function toggleAllSections() {
  if (bulkToggleDisabled.value) return;
  collapsedSections.value = allSectionsExpanded.value
    ? new Set(sections.value.map(sectionKey))
    : new Set();
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
function parseAnnualScores(source: string): AnnualScore[] {
  const detected = annualScoreTitles
    .flatMap((title, visualIndex) => {
      const match = annualScorePattern(title).exec(source);
      if (!match || match.index === undefined) return [];
      return [{ title, visualIndex, match, index: match.index }];
    })
    .sort((left, right) => left.index - right.index);

  return detected
    .map((item, index) => {
      const lineEnd = source.indexOf("\n", item.index);
      const resolvedLineEnd = lineEnd === -1 ? source.length : lineEnd;
      const inlineDescription = source
        .slice(item.index + item.match[0].length, resolvedLineEnd)
        .replace(/^[\s）)*_：:]+/u, "")
        .trim();
      const descriptionStart = lineEnd === -1 ? source.length : lineEnd + 1;
      const next = detected[index + 1];
      const descriptionEnd = next
        ? source.lastIndexOf("\n", next.index) + 1
        : source.length;
      const followingDescription = source
        .slice(descriptionStart, descriptionEnd)
        .replace(/^ {1,3}/gm, "")
        .trim();
      const description = [inlineDescription, followingDescription]
        .filter(Boolean)
        .join("\n\n");
      return {
        title: item.title,
        score: Math.max(40, Math.min(100, Number(item.match[1]))),
        visualIndex: item.visualIndex,
        description,
      };
    })
    .sort((left, right) => left.visualIndex - right.visualIndex);
}
function isAnnualScoreSection(section: Section) {
  return section.title.replace(/\s/g, "").includes("年度核心小結");
}
function boldAnnualBulletLabels(source: string) {
  return source.replace(
    /^(\s*[-*+]\s+)(?!\*\*)([^：:\n]+?)([：:])(\s*)(.+)$/gm,
    "$1**$2**$3$4$5",
  );
}
function annualSectionCopy(section: Section) {
  const withoutAnnual = isAnnualScoreSection(section) &&
    parseAnnualScores(section.content).length
    ? ""
    : section.content;
  return boldAnnualBulletLabels(withoutFlowScores(withoutAnnual));
}
async function downloadPDF() {
  if (downloading.value || analyzing.value || !content.value.trim()) return;
  await download({
    source: pdfSource,
    filename: () => `江映澄紫微-${year.value}-流年運勢.pdf`,
    prepare: () => {
      pdfSnapshot.value = {
        title: `${year.value} 流年運勢`,
        createdAt: formattedCreatedAt.value,
        sections: parseSections(content.value),
      };
    },
    cleanup: () => {
      pdfSnapshot.value = null;
    },
    onPremiumRequired: () =>
      premiumGate.requestFeature("annual_flow_pdf", "/annual-flow"),
  });
}
async function resumePDF() {
  premiumGate.closeResume();
  await downloadPDF();
}
const actionItems = computed(() => [
  {
    id: "download",
    label: "下載 PDF",
    loadingLabel: "PDF 產生中",
    icon: Download,
    loading: downloading.value,
    disabled: analyzing.value,
    premium: true,
  },
  {
    id: "recalculate",
    label: "重新排算",
    icon: RefreshCw,
    disabled: analyzing.value || downloading.value,
  },
]);
function handleAction(id: string) {
  if (id === "download") void downloadPDF();
  else void requestAnalysis(true);
}
async function goBack() {
  if (analyzing.value) return showAppInfo("解析完成前請留在此頁。");
  if (resultVisible.value) {
    activeAnalysis.dismiss("annual_flow");
    resultVisible.value = false;
    content.value = "";
    resetSectionExpansion();
    clearAnnualFlowUiState();
    return;
  }
  await navigateTo("/ai-analysis");
}
</script>

<template>
  <AppPageLayout
    screen-class="annual-flow-screen"
    content-mode="flush"
    header-layout="wide"
  >
    <template #leading
      ><button
        class="icon-button"
        type="button"
        aria-label="返回"
        @click="goBack"
      >
        <ChevronLeft :size="23" /></button
    ></template>
    <template #title
      ><div class="bar-title"><h1>流年運勢</h1></div></template
    >
    <template #actions
      ><AppActionMenu
        v-if="resultVisible && content"
        label="流年運勢操作"
        :items="actionItems"
        @select="handleAction" /><span v-else
    /></template>
    <Teleport to="body"
      ><template v-if="downloading"
        ><div
          v-if="pdfSnapshot"
          ref="pdfSource"
          class="analysis-pdf-source"
          aria-hidden="true"
        >
          <main data-pdf-page>
            <header
              class="analysis-pdf-heading analysis-pdf-cover glass"
              data-pdf-block
            >
              <img src="/remove-background-logo.png" alt="" />
              <p>江映澄紫微·流年運勢</p>
              <h2>{{ pdfSnapshot.title }}</h2>
              <small>分析生成時間：{{ pdfSnapshot.createdAt }}</small>
              <p class="analysis-pdf-disclaimer">
                本報告內容供自我探索與參考，不應取代醫療、法律或財務專業意見。
              </p>
            </header>
          </main>
          <main
            v-for="(section, index) in pdfSnapshot.sections"
            :key="index"
            data-pdf-page
          >
            <section class="annual-card glass" data-pdf-block>
              <h2>{{ section.title }}</h2>
              <div class="annual-card-content">
                <MatchScoreOverview
                  v-if="
                    isAnnualScoreSection(section) &&
                    parseAnnualScores(section.content).length
                  "
                  :dimensions="parseAnnualScores(section.content)"
                />
                <MarkdownContent
                  v-if="annualSectionCopy(section)"
                  :source="annualSectionCopy(section)"
                  :report-formatting="false"
                  bracketed-titles
                />
                <FlowScoreScale
                  v-if="parseFlowScores(section.content).length"
                  :scores="parseFlowScores(section.content)"
                />
              </div>
            </section>
          </main>
        </div>
        <div class="analysis-pdf-overlay">
          <AppLoading
            scope="page"
            layout="fill"
            :delay="0"
            message="正在整理流年運勢 PDF，請稍候…"
          /></div></template
    ></Teleport>
    <AnalysisProgressBar v-if="analyzing && content && !disconnected" />
    <main v-if="!resultVisible" class="annual-body setup-stage">
      <FlowDatePicker
        v-model:year="year"
        :month="1"
        :day="1"
        flow-type="流年"
        :birth-year="minYear"
        compact
        hide-label
      />
      <section class="annual-focus-fields">
        <header>
          <h2>今年最想關注什麼？<small>選填</small></h2>
        </header>
        <AnnualFocusSelect
          v-model="focus.relationship"
          label="感情"
          :options="annualRelationshipOptions"
        />
        <AnnualFocusSelect
          v-model="focus.career"
          label="事業"
          :options="annualCareerOptions"
        />
        <AnnualFocusSelect
          v-model="focus.wealth"
          label="財運"
          :options="annualWealthOptions"
        />
        <div class="major-decision-field">
          <label for="annual-major-decision"
            ><span>重大決策</span
            ><small>{{ majorDecisionCount }}／100</small></label
          >
          <AppTextarea
            id="annual-major-decision"
            v-model="majorDecisionModel"
            rows="4"
            maxlength="100"
            placeholder="輸入這年正在考慮的重要決定"
          />
          <AnnualFocusSelect
            v-model="majorDecisionModel"
            label="常見重大決策"
            trigger-label="選擇常見決策（參考快選）"
            :options="annualDecisionOptions"
          />
        </div>
      </section>
      <p v-if="!chartStore.chart" class="error-copy">
        請先完成出生資料與命盤設定
      </p>
      <button
        class="app-button start-button"
        :disabled="preparing || !chartStore.chart"
        @click="requestAnalysis(false)"
      >
        <Sparkles :size="18" />{{
          preparing ? "正在確認…" : "開始流年運勢解析"
        }}
      </button>
    </main>
    <main
      v-else
      class="annual-body result-stage"
      :class="{ background: backgroundProcessing }"
    >
      <div class="annual-result-heading">
        <h2>{{ year }} 流年運勢</h2>
        <button
          class="expand-all-button"
          type="button"
          :disabled="bulkToggleDisabled"
          :aria-expanded="allSectionsExpanded"
          @click="toggleAllSections"
        >
          <ChevronsUpDown :size="17" />{{
            allSectionsExpanded ? "全部收合" : "全部展開"
          }}
        </button>
      </div>
      <small v-if="formattedCreatedAt"
        >分析時間：{{ formattedCreatedAt }}</small
      >
      <AnalysisDisconnectedState
        v-if="backgroundProcessing && !content"
        :loading="refreshingJob"
        @refresh="recoverResult"
      />
      <AstrologyLoader v-else-if="analyzing && !content" layout="viewport" />
      <section v-else class="annual-result">
        <details
          v-for="(section, index) in sections"
          :key="sectionKey(section, index)"
          class="annual-card glass"
          :open="isSectionExpanded(section, index)"
          @toggle="handleSectionToggle($event, section, index)"
        >
          <summary>
            <strong>{{ section.title }}</strong
            ><ChevronDown :size="19" />
          </summary>
          <div class="annual-card-content">
            <MatchScoreOverview
              v-if="
                isAnnualScoreSection(section) &&
                parseAnnualScores(section.content).length
              "
              :dimensions="parseAnnualScores(section.content)"
            />
            <MarkdownContent
              v-if="annualSectionCopy(section)"
              :source="annualSectionCopy(section)"
              :report-formatting="false"
              bracketed-titles
            /><FlowScoreScale
              v-if="parseFlowScores(section.content).length"
              :scores="parseFlowScores(section.content)"
            />
          </div>
        </details>
        <div v-if="analyzing && content" class="streaming">
          <Sparkles :size="16" />正在整理下一段年度內容…
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
      @close="premiumGate.closeCheckout"
    />
    <PremiumFeatureResumeSheet
      :feature="resumeFeature"
      :loading="downloading"
      @close="premiumGate.closeResume"
      @confirm="resumePDF"
    />
    <AppBottomSheet :open="showConfirm" @close="showConfirm = false"
      ><template #header><h2>確認執行流年運勢</h2></template>
      <p>
        {{
          recalculate
            ? `此次會消耗會員額度 1 次，並覆蓋 ${year} 年的歷史紀錄。`
            : "此次會消耗會員額度 1 次；如有歷史快取則不消耗。"
        }}
      </p>
      <div class="points-row">
        <Coins :size="18" /><span>本月會員額度剩餘</span
        ><b>{{ auth.membershipQuotaRemaining }} 次</b>
      </div>
      <div class="sheet-actions">
        <button class="app-button outline" @click="showConfirm = false">
          取消</button
        ><button class="app-button" @click="startAnalysis">確認使用</button>
      </div></AppBottomSheet
    >
    <AppBottomSheet :open="showFallback" @close="showFallback = false"
      ><template #header><h2>會員月度額度已滿</h2></template>
      <p>是否改為扣除 100 點繼續流年運勢？目前點數：{{ auth.points }}</p>
      <div class="sheet-actions">
        <button class="app-button outline" @click="showFallback = false">
          取消</button
        ><button
          class="app-button"
          :disabled="auth.points < 100"
          @click="usePoints"
        >
          使用 100 點
        </button>
      </div></AppBottomSheet
    >
    <AppBottomSheet :open="showCacheChoice" @close="showCacheChoice = false">
      <template #header
        ><h2>{{ year }} 年已有流年報告</h2></template
      >
      <p>
        此年度已有流年報告。你可以讀取舊有資料，或消耗會員額度重新排算並覆蓋。
      </p>
      <div class="points-row">
        <Coins :size="18" /><span>重新排算將使用 1 次額度，本月剩餘</span
        ><b>{{ auth.membershipQuotaRemaining }} 次</b>
      </div>
      <div class="sheet-actions cache-actions">
        <button class="app-button outline" @click="loadPreviousFocus">
          讀取舊有資料</button
        ><button class="app-button" @click="recalculateWithCurrentFocus">
          重新排算覆蓋
        </button>
      </div>
    </AppBottomSheet>
    <IncompleteAnalysisRecoverySheet
      :open="resultVisible && canRecover"
      title="發現未完成的流年運勢"
      :summary="currentTask ? `${currentTask.analysis_year} 年` : ''"
      :details="[]"
      :loading="recoveryLoading"
      @retry="retryIncomplete"
      @abandon="abandonIncomplete"
    />
  </AppPageLayout>
</template>

<style scoped>
.annual-body {
  width: min(100%, 780px);
  margin: 0 auto;
  padding: 8px 20px 82px;
}
.setup-stage {
  display: grid;
  gap: 13px;
}
.setup-stage > :first-child {
  margin-bottom: 4px;
}
.annual-focus-fields {
  display: grid;
  gap: 11px;
}
.annual-focus-fields > header {
  padding: 2px;
}
.annual-focus-fields > header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 0;
  color: var(--mountain);
  font-family: "Noto Serif TC", serif;
  font-size: 18px;
}
.annual-focus-fields > header small {
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(184, 146, 82, 0.13);
  color: var(--gold);
  font-family: inherit;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
}
.major-decision-field {
  display: grid;
  gap: 8px;
  padding: 12px 13px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.54);
}
.major-decision-field > label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--mountain);
  font-size: 12px;
  font-weight: 800;
}
.major-decision-field > label small {
  color: var(--text-soft);
  font-weight: 700;
}
.major-decision-field :deep(textarea) {
  min-height: 58px;
  padding-block: 9px;
}
.cache-actions .app-button {
  flex: 1;
}
.points-row + .sheet-actions {
  margin-top: 16px;
}
.start-button {
  width: 100%;
}
.annual-result-heading {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
}
.annual-result-heading h2 {
  grid-column: 2;
  margin: 0;
  color: var(--mountain);
  text-align: center;
}
.expand-all-button {
  display: inline-flex;
  grid-column: 3;
  align-items: center;
  justify-self: end;
  gap: 5px;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: var(--mountain);
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  white-space: nowrap;
  cursor: pointer;
}
.expand-all-button:disabled {
  cursor: not-allowed;
  opacity: 0.38;
}
.result-stage > small {
  display: block;
  text-align: center;
  color: var(--text-soft);
}
.annual-result {
  display: grid;
  gap: 14px;
  margin-top: 20px;
}
.annual-card {
  overflow: hidden;
  border-radius: 22px;
}
.annual-card summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  cursor: pointer;
}
.annual-card summary + *,
.annual-card > .annual-card-content {
  padding: 0 20px 20px;
}
.annual-card h2 {
  padding: 20px;
}
.streaming,
.result-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(107, 166, 160, 0.12);
  color: var(--mountain);
}
.result-error {
  flex-direction: column;
  color: var(--cinnabar);
}
.error-copy {
  color: var(--cinnabar);
  text-align: center;
}
.sheet-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.points-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(107, 166, 160, 0.12);
}
.points-row b {
  margin-left: auto;
}
@media (max-width: 560px) {
  .annual-body {
    padding: 6px 16px 76px;
  }
  .sheet-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
.annual-card-content {
  display: grid;
  gap: 18px;
}
.annual-card-content :deep(hr) {
  display: none;
}
@media (max-width: 420px) {
  .annual-result-heading {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .annual-result-heading h2 {
    grid-column: 1;
    text-align: left;
  }
  .expand-all-button {
    grid-column: 2;
  }
}
</style>
