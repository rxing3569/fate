<script setup lang="ts">
import {
  Briefcase,
  Check,
  ChevronDown,
  ChevronLeft,
  Heart,
  Handshake,
  History,
  HouseHeart,
  Info,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  WifiOff,
  X,
} from "@lucide/vue";
import cityData from "~/data/cities.json";
import type { BirthInfo, ZiweiChartData } from "~/types/ziwei";
import { calculateChartFromSolar } from "~/utils/ziwei/calculator";
import {
  earthlyBranches,
  getXiaoXianAges,
  palaceNameForBranch,
} from "~/utils/ziwei/core";

definePageMeta({ middleware: "auth" });

interface MatchRecord {
  uuid?: string;
  target_city?: string;
  target_gender?: string;
  target_longitude?: number;
  target_birth_time?: string;
  created_at?: string;
  is_complete?: boolean;
  content?: string;
  match_type?: MatchType;
}

type MatchType =
  | "romance"
  | "coworker"
  | "business_partner"
  | "family"
  | "friendship";

const matchTypes: Array<{
  value: MatchType;
  label: string;
  description: string;
}> = [
  { value: "romance", label: "正緣姻緣", description: "感情互動與長期伴侶關係" },
  { value: "coworker", label: "職場同事", description: "工作協作、溝通與分工" },
  { value: "business_partner", label: "事業合夥", description: "共同決策、資源與經營風險" },
  { value: "family", label: "親屬家人", description: "家庭角色、支持與相處界線" },
  { value: "friendship", label: "朋友人際", description: "信任、友誼與社交互動" },
];

function normalizeMatchType(value?: string): MatchType {
  return matchTypes.some((item) => item.value === value)
    ? (value as MatchType)
    : "romance";
}

function matchTypeLabel(value?: string) {
  const normalized = normalizeMatchType(value);
  return matchTypes.find((item) => item.value === normalized)?.label || "正緣姻緣";
}

function matchTypeIcon(value?: string) {
  switch (normalizeMatchType(value)) {
    case "coworker":
      return Briefcase;
    case "business_partner":
      return Handshake;
    case "family":
      return HouseHeart;
    case "friendship":
      return Users;
    default:
      return Heart;
  }
}

interface MatchSection {
  title: string;
  content: string;
}
interface MatchDimension {
  title: string;
  score: number;
  description: string;
}

const auth = useAuthStore();
const chartStore = useChartStore();
const activeAnalysis = useActiveAnalysisStore();
const membershipReady = ref(false);
const analyzing = ref(false);
const analysisText = ref("");
const error = ref("");
const showConfirm = ref(false);
const showHistory = ref(false);
const historyLoading = ref(false);
const historyError = ref("");
const refreshingJob = ref(false);
const records = ref<MatchRecord[]>([]);
const deletingRecord = ref<MatchRecord | null>(null);
const deleting = ref(false);
const notice = ref("");
const selectedMatchType = ref<MatchType>("romance");
const pendingMatchType = ref<MatchType>("romance");
const matchTypeOpen = ref(false);
const matchTypePicker = ref<HTMLElement | null>(null);
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

const selectedMatchTypeOption = computed(
  () => matchTypes.find((item) => item.value === selectedMatchType.value)!,
);
const matchDisconnected = computed(
  () =>
    activeAnalysis.active?.kind === "match" &&
    activeAnalysis.active.status === "running" &&
    !activeAnalysis.active.connected,
);

function selectMatchType(value: MatchType) {
  selectedMatchType.value = value;
  matchTypeOpen.value = false;
}

function closeMatchTypePicker(event: MouseEvent) {
  if (!matchTypePicker.value?.contains(event.target as Node)) {
    matchTypeOpen.value = false;
  }
}

const sections = computed(() => parseSections(analysisText.value));
// Match reports are streamed section-by-section. Keep the active section
// mounted so score cards and the radar can update as each score arrives.
const visibleSections = computed(() => sections.value);

onMounted(async () => {
  document.addEventListener("click", closeMatchTypePicker);
  try {
    chartStore.hydrate(auth.profile);
    syncActiveMatch();
    await recoverMatchResult();
    await nextTick();
  } finally {
    membershipReady.value = true;
  }
});
onBeforeUnmount(() => {
  document.removeEventListener("click", closeMatchTypePicker);
  clearTimeout(noticeTimer);
});
watch(() => activeAnalysis.active, syncActiveMatch, { deep: true });
watch(
  () => activeAnalysis.active?.contents.main,
  (streamedContent) => {
    if (
      activeAnalysis.active?.kind === "match" &&
      typeof streamedContent === "string"
    ) {
      analysisText.value = streamedContent;
    }
  },
  { immediate: true },
);
watch(
  () => activeAnalysis.active?.status,
  () => {
    void recoverMatchResult();
  },
);

function syncActiveMatch() {
  const job = activeAnalysis.active;
  if (!job || job.kind !== "match") return;
  const info = job.metadata.birthInfo as BirthInfo | undefined;
  if (info) pendingBirthInfo.value = info;
  const matchType = normalizeMatchType(job.metadata.matchType as string | undefined);
  pendingMatchType.value = matchType;
  selectedMatchType.value = matchType;
  analysisText.value = job.contents.main || analysisText.value;
  analyzing.value = job.status === "running";
  if (job.error) error.value = job.error;
}

async function recoverMatchResult() {
  const job = activeAnalysis.active;
  if (!job || job.kind !== "match" || job.status !== "completed") return;
  const info = job.metadata.birthInfo as BirthInfo | undefined;
  if (!info) return;
  const matchType = normalizeMatchType(job.metadata.matchType as string | undefined);
  try {
    const list = normalizeRecords(await ziweiApi.getMatchRecords());
    const targetTime = `${info.year}-${String(info.month).padStart(2, "0")}-${String(info.day).padStart(2, "0")} ${String(info.hour).padStart(2, "0")}:${String(info.minute).padStart(2, "0")}`;
    const target = list.find(
      (record) =>
        record.is_complete &&
        normalizeMatchType(record.match_type) === matchType &&
        record.target_gender === info.gender &&
        (record.target_birth_time || "")
          .replace("T", " ")
          .startsWith(targetTime),
    );
    if (target?.content?.trim()) {
      analysisText.value = target.content;
      analyzing.value = false;
    }
  } catch {
    /* Keep the streamed snapshot when history is temporarily unavailable. */
  }
}

async function refreshMatchJob() {
  refreshingJob.value = true;
  try {
    const status = await activeAnalysis.refreshStatus();
    if (status === "running") {
      notify("任務仍在背景處理，請稍後再重新讀取");
      return;
    }
  } catch (reason) {
    error.value =
      reason instanceof Error ? reason.message : "目前無法確認任務狀態";
  } finally {
    refreshingJob.value = false;
  }
}

function notify(message: string) {
  notice.value = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice.value = "";
  }, 3000);
}

function cityName(info: BirthInfo) {
  if (info.cityId === "OTHER") return "自訂經度";
  return cityData.find((city) => city.id === info.cityId)?.name || info.cityId;
}

function prepareChartPayload(chart: ZiweiChartData, role: "self" | "partner") {
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
  return {
    user_id: role === "self" ? "user" : "partner",
    owner: role === "self" ? "我" : "合盤對象",
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
}

async function requestStart(info: BirthInfo) {
  if (analyzing.value) return;
  if (!chartStore.chart) {
    error.value = "請先完成本人的出生資料與命盤設定";
    return;
  }
  if (!(await activeAnalysis.ensureAvailable("match"))) return;
  pendingBirthInfo.value = info;
  pendingMatchType.value = selectedMatchType.value;
  try {
    const list = normalizeRecords(await ziweiApi.getMatchRecords());
    const targetTime = `${info.year}-${String(info.month).padStart(2, "0")}-${String(info.day).padStart(2, "0")} ${String(info.hour).padStart(2, "0")}:${String(info.minute).padStart(2, "0")}`;
    const targetLongitude = Number((info.longitude ?? 120).toFixed(2));
    const cached = list.find((record) => {
      const rawTime = record.target_birth_time?.replace("T", " ") || "";
      return (
        record.is_complete &&
        Boolean(record.content?.trim()) &&
        normalizeMatchType(record.match_type) === selectedMatchType.value &&
        record.target_gender === info.gender &&
        record.target_city === cityName(info) &&
        Math.abs(Number(record.target_longitude) - targetLongitude) < 0.001 &&
        rawTime.startsWith(targetTime)
      );
    });
    if (cached?.content) {
      analysisText.value = cached.content;
      error.value = "";
      notify("已載入歷史合盤紀錄，此操作不花費點數。");
      return;
    }
  } catch {
    // History lookup must not prevent a fresh analysis.
  }
  showConfirm.value = true;
}

const pendingBirthInfo = ref<BirthInfo | null>(null);

async function startAnalysis() {
  if (!(await auth.verifyOnlineAccess(true))) return;
  const info = pendingBirthInfo.value;
  const selfChart = chartStore.chart;
  if (!info || !selfChart) return;
  showConfirm.value = false;
  const longitude = Number((info.longitude ?? 120).toFixed(2));
  const partnerChart = calculateChartFromSolar({ ...info, longitude });
  const clockTime = `${info.year}-${String(info.month).padStart(2, "0")}-${String(info.day).padStart(2, "0")} ${String(info.hour).padStart(2, "0")}:${String(info.minute).padStart(2, "0")}`;
  const matchType = pendingMatchType.value;

  const started = await activeAnalysis.begin(
    "match",
    `match:${matchType}:${clockTime}:${info.gender}:${longitude}`,
    {
      birthInfo: info,
      matchType,
    },
  );
  if (!started) return;

  analysisText.value = "";
  error.value = "";
  analyzing.value = true;
  try {
    analysisText.value = await activeAnalysis.runStep({
      ...prepareChartPayload(selfChart, "self"),
      analysis_type: "match",
      match_type: matchType,
      recalculate: false,
      use_points_fallback: false,
      match_chart: prepareChartPayload(partnerChart, "partner"),
      target_city: cityName(info),
      target_gender: info.gender,
      target_longitude: longitude,
      target_birth_time: clockTime,
    });
    analyzing.value = false;
    await auth.loadBilling();
  } catch (reason) {
    if (reason instanceof Error && reason.message === "analysis_connection_lost") {
      analyzing.value = true;
      error.value = "";
      return;
    }
    analyzing.value = false;
    error.value = reason instanceof Error ? reason.message : "分析連線失敗";
  }
}

function parseSections(content: string): MatchSection[] {
  if (!content.trim()) return [];
  const result: MatchSection[] = [];
  let title = "";
  let lines: string[] = [];
  const commit = () => {
    const body = lines.join("\n").trim();
    if (title || body) result.push({ title, content: body });
    lines = [];
  };
  for (const line of content.split("\n")) {
    const match = line.trim().match(/^##\s+(.+)/);
    if (match) {
      commit();
      title = match[1]!.trim();
    } else lines.push(line);
  }
  commit();
  return result;
}

function parseDimensions(content: string): MatchDimension[] {
  const result: MatchDimension[] = [];
  let current: MatchDimension | null = null;
  const commit = () => {
    if (current) {
      result.push({ ...current, description: current.description.trim() });
    }
    current = null;
  };

  for (const line of content.split("\n")) {
    const scoreHeading = line
      .trim()
      .match(/^#{3,6}\s+(.+?)\s*[（(]\s*(\d{1,3})\s*[\/／]\s*100\s*[）)]\s*$/);
    if (scoreHeading) {
      commit();
      current = {
        title: scoreHeading[1]!.trim(),
        score: Math.min(100, Number(scoreHeading[2])),
        description: "",
      };
    } else if (current) {
      current.description += `${current.description ? "\n" : ""}${line}`;
    }
  }
  commit();
  return result;
}

function isScoreSection(section: MatchSection) {
  return parseDimensions(section.content).length > 0;
}

function normalizeRecords(data: unknown): MatchRecord[] {
  if (Array.isArray(data)) return data as MatchRecord[];
  const body = data as { data?: unknown; records?: unknown } | null;
  const raw = body?.data ?? body?.records ?? [];
  if (Array.isArray(raw)) return raw as MatchRecord[];
  if (raw && typeof raw === "object") return [raw as MatchRecord];
  return [];
}

async function openHistoryDrawer() {
  showHistory.value = true;
  await loadHistory();
}

async function loadHistory() {
  historyLoading.value = true;
  historyError.value = "";
  try {
    records.value = normalizeRecords(await ziweiApi.getMatchRecords());
  } catch (reason) {
    historyError.value =
      reason instanceof Error
        ? reason.message
        : "目前無法讀取合盤歷史紀錄，請稍後再試。";
  } finally {
    historyLoading.value = false;
  }
}

async function openRecord(record: MatchRecord) {
  if (analyzing.value) {
    notify("合盤解析中，無法載入歷史紀錄");
    return;
  }
  if (!record.is_complete) return;
  let content = record.content?.trim() || "";
  try {
    if (!content && record.uuid) {
      const detail = (await ziweiApi.getMatchRecord(record.uuid)) as
        | MatchRecord
        | { data?: MatchRecord };
      const normalized =
        (detail as { data?: MatchRecord }).data ?? (detail as MatchRecord);
      content = normalized?.content?.trim() || "";
    }
    if (!content) throw new Error("此紀錄尚無可顯示的內容");
    analysisText.value = content;
    selectedMatchType.value = normalizeMatchType(record.match_type);
    pendingMatchType.value = selectedMatchType.value;
    error.value = "";
    showHistory.value = false;
  } catch (reason) {
    historyError.value =
      reason instanceof Error ? reason.message : "讀取紀錄失敗";
  }
}

async function deleteRecord() {
  const record = deletingRecord.value;
  if (!record?.uuid) return;
  deleting.value = true;
  try {
    await ziweiApi.deleteMatchRecord(record.uuid);
    records.value = records.value.filter((item) => item.uuid !== record.uuid);
    deletingRecord.value = null;
    notify("已成功刪除該筆合盤紀錄");
  } catch (reason) {
    historyError.value =
      reason instanceof Error ? reason.message : "刪除紀錄失敗，請稍後再試。";
  } finally {
    deleting.value = false;
  }
}

function formatDate(raw?: string, utc = false) {
  if (!raw) return "未知";
  const date = new Date(raw.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return raw;
  const value = utc
    ? new Date(date.getTime() + date.getTimezoneOffset() * 60_000)
    : date;
  return value.toLocaleString("zh-TW", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function goBack() {
  if (analyzing.value) {
    useRouter().back();
    return;
  }
  if (analysisText.value) {
    analysisText.value = "";
    error.value = "";
    return;
  }
  useRouter().back();
}
</script>

<template>
  <AppPageLayout
    title="合盤解析"
    screen-class="match-screen"
    content-mode="flush"
  >
    <template #leading>
      <button
        class="icon-button"
        type="button"
        aria-label="返回"
        @click="goBack"
      >
        <ChevronLeft :size="23" />
      </button>
    </template>
    <template #actions>
      <button
        class="icon-button match-history-button"
        type="button"
        aria-label="合盤歷史紀錄"
        :disabled="!auth.premium"
        @click="openHistoryDrawer"
      >
        <History :size="21" />
      </button>
    </template>
    <AnalysisProgressBar v-if="analyzing && !matchDisconnected" />

    <main v-if="!analysisText" class="match-body">
      <section
        v-if="!membershipReady"
        class="membership-loading"
        role="status"
        aria-label="正在確認會員狀態"
      >
        <div class="loading-dots" aria-hidden="true">
          <span /><span /><span />
        </div>
      </section>

      <section v-else-if="!auth.premium" class="premium-lock glass">
        <span><AppMaterialIcon name="diversity_1_rounded" :size="31" /></span>
        <h2>Premium 專屬 - 合盤解析</h2>
        <p>
          成為 Premium
          後，即可使用合盤解析查看姻緣、友情或事業關係中的互動重點。
        </p>
        <NuxtLink class="app-button" to="/store">成為 Premium 解鎖</NuxtLink>
      </section>

      <AnalysisDisconnectedState
        v-else-if="matchDisconnected"
        :loading="refreshingJob"
        @refresh="refreshMatchJob"
      />

      <div v-else-if="analyzing" class="match-loading">
        <AstrologyLoader message="正在為您與對象排定合相星曜，請稍候..." />
      </div>

      <section v-else class="partner-form">
        <div ref="matchTypePicker" class="match-type-field">
          <label id="match-type-label">合盤類型</label>
          <button
            class="match-type-trigger"
            type="button"
            aria-labelledby="match-type-label"
            aria-haspopup="listbox"
            :aria-expanded="matchTypeOpen"
            @click.stop="matchTypeOpen = !matchTypeOpen"
          >
            <span>{{ selectedMatchTypeOption.label }}</span>
            <ChevronDown :size="18" :class="{ rotated: matchTypeOpen }" />
          </button>
          <Transition name="match-type-menu">
            <div
              v-if="matchTypeOpen"
              class="match-type-menu glass"
              role="listbox"
              aria-labelledby="match-type-label"
            >
              <button
                v-for="item in matchTypes"
                :key="item.value"
                type="button"
                role="option"
                :aria-selected="selectedMatchType === item.value"
                :class="{ active: selectedMatchType === item.value }"
                @click="selectMatchType(item.value)"
              >
                <span>{{ item.label }}</span>
                <Check v-if="selectedMatchType === item.value" :size="17" />
              </button>
            </div>
          </Transition>
          <small>{{ selectedMatchTypeOption.description }}</small>
        </div>
        <p v-if="error" class="error-note"><WifiOff :size="17" />{{ error }}</p>
        <BirthInfoForm
          default-gender="女"
          gender-label="對象生理性別"
          date-label="對象國歷生日"
          time-label="對象出生時間"
          city-label="對象出生城市"
          longitude-label="手動經度"
          preview-title="對象真太陽時校正預覽"
          preview-time-label="對象真太陽時"
          submit-label="開始合盤解析"
          :disabled="analyzing || !chartStore.chart"
          @submit="requestStart"
        />
        <p v-if="!chartStore.chart" class="self-chart-note">
          <Info :size="15" />請先完成本人的出生資料與命盤設定
        </p>
      </section>
    </main>

    <main v-else class="result-body">
      <AnalysisDisconnectedState
        v-if="matchDisconnected"
        :loading="refreshingJob"
        @refresh="refreshMatchJob"
      />
      <details
        v-for="(section, index) in visibleSections"
        :key="`${section.title}-${index}`"
        class="match-card glass"
        :open="isScoreSection(section) || index === 1"
      >
        <summary>
          <strong>{{ section.title || "合盤解析" }}</strong
          ><ChevronDown :size="19" />
        </summary>
        <div v-if="isScoreSection(section)" class="quick-match">
          <MatchScoreOverview
            :dimensions="parseDimensions(section.content)"
          />
        </div>
        <MarkdownContent
          v-else
          :source="section.content"
          :report-formatting="false"
        />
      </details>
      <div v-if="analyzing && !matchDisconnected" class="streaming-note">
        <Sparkles :size="16" />正在整理下一段內容...
      </div>
      <p v-if="error" class="error-note"><WifiOff :size="17" />{{ error }}</p>
    </main>

    <Transition name="sheet">
      <div
        v-if="showConfirm"
        class="sheet-backdrop"
        @click.self="showConfirm = false"
      >
        <section class="analysis-sheet" role="dialog" aria-modal="true">
          <div class="sheet-handle" />
          <h2>確認執行合盤解析</h2>
          <p>將執行「{{ matchTypeLabel(pendingMatchType) }}」解析，並消耗會員額度 1 次，是否確認使用？</p>
          <div class="quota-row">
            <span>本月會員額度剩餘</span>
            <b>{{ auth.membershipQuotaRemaining }} 次</b>
          </div>
          <div class="sheet-actions">
            <button
              class="app-button outline"
              type="button"
              @click="showConfirm = false"
            >
              取消</button
            ><button class="app-button" type="button" @click="startAnalysis">
              確認使用
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="drawer">
      <div
        v-if="showHistory"
        class="drawer-backdrop"
        @click.self="showHistory = false"
      >
        <aside class="history-drawer" aria-label="合盤歷史紀錄">
          <header>
            <History :size="22" />
            <h2>合盤歷史紀錄</h2>
            <button
              class="icon-button"
              type="button"
              aria-label="重新讀取"
              :disabled="historyLoading"
              @click="loadHistory"
            >
              <RefreshCw
                :size="20"
                :class="{ spinning: historyLoading }"
              /></button
            ><button
              class="icon-button"
              type="button"
              aria-label="關閉"
              @click="showHistory = false"
            >
              <X :size="21" />
            </button>
          </header>
          <div v-if="historyLoading" class="history-state">
            <RefreshCw class="spinning" :size="28" /><span
              >正在讀取紀錄...</span
            >
          </div>
          <div v-else-if="historyError" class="history-state error">
            <WifiOff :size="38" /><strong>讀取紀錄失敗</strong>
            <p>{{ historyError }}</p>
            <button class="app-button" type="button" @click="loadHistory">
              重試
            </button>
          </div>
          <div v-else-if="!records.length" class="history-state">
            <History :size="48" /><span>尚無合盤歷史紀錄</span>
          </div>
          <div v-else class="history-list">
            <article
              v-for="record in records"
              :key="record.uuid"
              class="history-card"
              :class="{ incomplete: !record.is_complete }"
              @click="openRecord(record)"
            >
              <span class="record-icon"
                ><component
                  v-if="record.is_complete"
                  :is="matchTypeIcon(record.match_type)"
                  :size="17"
                /><WifiOff v-else :size="17"
              /></span>
              <div>
                <strong
                  >{{ matchTypeLabel(record.match_type) }} · 對象 ({{ record.target_gender || "女" }}) ·
                  {{ record.target_city || "未知" }}</strong
                ><small
                  >生日：{{ formatDate(record.target_birth_time, true)
                  }}<br />分析：{{ formatDate(record.created_at) }}</small
                >
                <p v-if="!record.is_complete">
                  <Info
                    :size="14"
                  />即時回應已斷線，但仍於背景執行，請於幾分鐘後重新讀取資料
                </p>
              </div>
              <button
                type="button"
                aria-label="刪除紀錄"
                @click.stop="deletingRecord = record"
              >
                <Trash2 :size="18" />
              </button>
            </article>
          </div>
        </aside>
      </div>
    </Transition>

    <Transition name="sheet">
      <div
        v-if="deletingRecord"
        class="sheet-backdrop"
        @click.self="deletingRecord = null"
      >
        <section
          class="analysis-sheet delete-sheet"
          role="alertdialog"
          aria-modal="true"
        >
          <div class="sheet-handle" />
          <Trash2 :size="24" />
          <h2>確認刪除</h2>
          <p>您確定要刪除這筆合盤紀錄嗎？<br />刪除後將無法恢復。</p>
          <div class="sheet-actions">
            <button
              class="app-button outline"
              type="button"
              :disabled="deleting"
              @click="deletingRecord = null"
            >
              取消</button
            ><button
              class="app-button danger"
              type="button"
              :disabled="deleting"
              @click="deleteRecord"
            >
              {{ deleting ? "刪除中..." : "刪除" }}
            </button>
          </div>
        </section>
      </div>
    </Transition>

    <Transition name="toast"
      ><div v-if="notice" class="toast">{{ notice }}</div></Transition
    >
  </AppPageLayout>
</template>

<style scoped>
.match-screen {
  position: relative;
}
.match-history-button {
  justify-self: end;
}
.match-history-button:disabled {
  opacity: 0.28;
  cursor: default;
}
.match-body,
.result-body {
  padding: 14px 18px 72px;
}
.match-body:has(> .premium-lock) {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-height: calc(100dvh - 58px);
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
}
.membership-loading {
  display: grid;
  place-items: center;
  min-height: calc(100dvh - 160px);
}
.loading-dots {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 14px 18px;
  border: 1px solid rgba(36, 87, 90, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
  box-shadow: 0 8px 24px rgba(36, 87, 90, 0.06);
}
.loading-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--mountain);
  animation: membership-dot 0.9s ease-in-out infinite;
}
.loading-dots span:nth-child(2) {
  animation-delay: 0.14s;
}
.loading-dots span:nth-child(3) {
  animation-delay: 0.28s;
}
@keyframes membership-dot {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  30% {
    transform: translateY(-5px);
    opacity: 1;
  }
}
.premium-lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 30px 24px;
  border-radius: 28px;
  text-align: center;
}
.premium-lock > span {
  display: grid;
  place-items: center;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: rgba(184, 91, 75, 0.11);
  color: var(--cinnabar);
}
.premium-lock h2 {
  margin: 20px 0 10px;
  font-size: 20px;
}
.premium-lock p {
  max-width: 390px;
  margin: 0 0 26px;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.65;
}
.premium-lock .app-button {
  gap: 8px;
}
.partner-form {
  width: 100%;
  max-width: none;
  margin: 0;
  text-align: left;
}
.match-loading {
  display: grid;
  place-items: center;
  min-height: calc(100dvh - 150px);
}
.match-loading :deep(> *) {
  width: 100%;
}
.match-type-field {
  position: relative;
  z-index: 5;
  display: grid;
  align-items: stretch;
  width: 100%;
  gap: 8px;
  margin-bottom: 28px;
}
.match-type-field > label {
  padding-left: 4px;
  color: var(--text-soft);
  font-size: 14px;
  font-weight: 600;
}
.match-type-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid rgba(36, 87, 90, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--mountain);
  text-align: left;
  outline: none;
}
.match-type-trigger:focus-visible {
  border-color: rgba(107, 166, 160, 0.72);
  box-shadow: 0 0 0 3px rgba(107, 166, 160, 0.12);
}
.match-type-trigger svg {
  transition: transform 0.18s ease;
}
.match-type-trigger svg.rotated {
  transform: rotate(180deg);
}
.match-type-menu {
  position: absolute;
  z-index: 20;
  top: 78px;
  left: 0;
  display: grid;
  gap: 6px;
  width: 100%;
  padding: 7px;
  border-radius: 18px;
  overflow: hidden;
}
.match-type-menu button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 44px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.18);
  color: var(--mountain);
  font-size: 14px;
  font-weight: 750;
  text-align: left;
}
.match-type-menu button:hover {
  border-color: rgba(107, 166, 160, 0.16);
  background: rgba(107, 166, 160, 0.1);
}
.match-type-menu button.active {
  border-color: rgba(107, 166, 160, 0.25);
  background: rgba(107, 166, 160, 0.18);
}
.match-type-menu-enter-active,
.match-type-menu-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}
.match-type-menu-enter-from,
.match-type-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
.match-type-field > small {
  min-height: 17px;
  padding-left: 4px;
  color: var(--text-soft);
  font-size: 12px;
}
.self-chart-note,
.error-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--cinnabar);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}
.result-body {
  display: grid;
  gap: 14px;
}
.match-card {
  overflow: hidden;
  border-radius: 22px;
}
.match-card summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 17px 20px;
  cursor: pointer;
  list-style: none;
}
.match-card summary::-webkit-details-marker {
  display: none;
}
.match-card summary strong {
  font-size: 17px;
}
.match-card summary svg {
  transition: transform 0.2s;
}
.match-card[open] summary svg {
  transform: rotate(180deg);
}
.match-card[open] summary {
  border-bottom: 1px solid rgba(36, 87, 90, 0.08);
}
.match-card > :not(summary) {
  padding: 10px 16px 22px;
}
.streaming-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 20px;
  color: var(--text-soft);
  font-size: 13px;
  font-weight: 700;
}
.analysis-sheet {
  box-sizing: border-box;
  width: min(100%, 680px);
  padding: 12px 24px calc(28px + env(safe-area-inset-bottom));
  border-radius: 28px 28px 0 0;
  background: var(--paper);
  text-align: center;
}
.analysis-sheet h2 {
  margin: 15px 0 8px;
  font-size: 20px;
}
.analysis-sheet p {
  margin: 0 0 22px;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.6;
}
.quota-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 13px 16px;
  border-radius: 15px;
  background: rgba(107, 166, 160, 0.1);
  text-align: left;
}
.delete-sheet > svg {
  margin-top: 4px;
  color: var(--cinnabar);
}
.danger {
  border-color: var(--cinnabar);
  background: var(--cinnabar);
}
.drawer-backdrop {
  position: fixed;
  z-index: 70;
  inset: 0;
  background: rgba(21, 43, 43, 0.3);
}
.history-drawer {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  width: min(85%, 530px);
  height: 100%;
  border-radius: 28px 0 0 28px;
  background: var(--paper);
  box-shadow: -12px 0 30px rgba(0, 0, 0, 0.11);
  overflow: hidden;
}
.history-drawer > header {
  display: grid;
  grid-template-columns: 28px 1fr 42px 42px;
  align-items: center;
  min-height: 70px;
  padding: env(safe-area-inset-top) 12px 0 20px;
  border-bottom: 1px solid rgba(36, 87, 90, 0.1);
}
.history-drawer h2 {
  margin: 0;
  font-size: 18px;
}
.history-state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 30px;
  color: rgba(36, 87, 90, 0.48);
  text-align: center;
}
.history-state.error strong {
  color: var(--mountain);
  font-size: 18px;
}
.history-state.error p {
  margin: 0;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.55;
}
.history-list {
  overflow: auto;
  padding: 12px 16px 28px;
}
.history-card {
  display: grid;
  grid-template-columns: 38px 1fr 38px;
  gap: 10px;
  align-items: start;
  margin-bottom: 12px;
  padding: 13px 8px 13px 12px;
  border: 1.4px solid rgba(36, 87, 90, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 9px 18px rgba(184, 91, 75, 0.06);
  cursor: pointer;
}
.history-card.incomplete {
  border-color: rgba(184, 91, 75, 0.3);
  cursor: default;
}
.record-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(184, 91, 75, 0.1);
  color: var(--cinnabar);
}
.history-card > div {
  min-width: 0;
}
.history-card strong,
.history-card small {
  display: block;
}
.history-card strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13.5px;
  white-space: nowrap;
}
.history-card small {
  margin-top: 5px;
  color: var(--text-soft);
  font-size: 10.5px;
  line-height: 1.45;
}
.history-card p {
  display: flex;
  gap: 5px;
  margin: 9px 0 0;
  padding: 8px;
  border-radius: 10px;
  background: rgba(184, 91, 75, 0.08);
  color: var(--text-soft);
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1.4;
}
.history-card > button {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 0;
  background: transparent;
  color: var(--cinnabar);
}
.spinning {
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.toast {
  position: fixed;
  z-index: 100;
  left: 50%;
  bottom: calc(28px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100% - 40px);
  padding: 11px 16px;
  border-radius: 16px;
  background: rgba(36, 87, 90, 0.94);
  box-shadow: 0 8px 20px rgba(36, 87, 90, 0.2);
  color: white;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.24s;
}
.drawer-enter-active .history-drawer,
.drawer-leave-active .history-drawer {
  transition: transform 0.28s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .history-drawer,
.drawer-leave-to .history-drawer {
  transform: translateX(100%);
}
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
@media (max-width: 420px) {
  .history-drawer {
    width: 92%;
  }
  .result-body {
    padding-inline: 12px;
  }
  .match-card summary {
    padding-inline: 16px;
  }
  .match-card > :not(summary) {
    padding-inline: 16px;
  }
}
</style>
