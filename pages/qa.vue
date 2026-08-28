<script setup lang="ts">
import {
  Coins,
  Download,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  WifiOff,
} from "@lucide/vue";
import {
  earthlyBranches,
  getXiaoXianAges,
  palaceNameForBranch,
} from "~/utils/ziwei/core";
import { majorStars } from "~/utils/ziwei/stars";
import type { PremiumCheckoutDraft } from "~/types/billing";
import {
  clearPremiumCheckoutIntent,
  readPremiumCheckoutIntent,
} from "~/utils/premium-checkout";

definePageMeta({ middleware: "auth" });

interface QaMessage {
  role: "user" | "assistant";
  content: string;
}
interface QaChatRecord {
  messages?: QaMessage[];
  client_job_id?: string;
  status?: "running" | "completed" | "failed";
  is_complete?: boolean;
  error?: string;
  updated_at?: string;
}
interface ReportRecord {
  category?: string;
  title?: string;
  content?: string;
  is_complete?: boolean;
  created_at?: string;
}

const MAX_QUESTIONS = 5;
const auth = useAuthStore();
const chartStore = useChartStore();
const activeAnalysis = useActiveAnalysisStore();
const messages = ref<QaMessage[]>([]);
const reports = ref<ReportRecord[]>([]);
const input = ref("");
const sending = ref(false);
const requestingSend = ref(false);
const startingSend = ref(false);
const error = ref("");
const showQuotaConfirm = ref(false);
const showPointsFallback = ref(false);
const showResetConfirm = ref(false);
const showPremiumCheckout = ref(false);
const premiumCheckoutDraft = ref<PremiumCheckoutDraft | null>(null);
const resettingConversation = ref(false);
const refreshingJob = ref(false);
const pendingQuestion = ref("");
const usePointsFallback = ref(false);
const chatId = ref<string>(createChatId());
const chatArea = ref<HTMLElement | null>(null);
const pageReady = ref(false);
const composingInput = ref(false);
const qaServerStatus = ref<"idle" | "running" | "completed" | "failed">("idle");
const qaFailureCode = ref("");
const retryingAnswer = ref(false);
const qaPdfSource = ref<HTMLElement | null>(null);
const qaPdfSnapshot = ref<{
  generatedAt: string;
  turns: Array<{ question: string; answer: string }>;
} | null>(null);
const { downloading: downloadingQaPDF, download: downloadAnalysisPdf } =
  useAnalysisPdfDownload();
const pdfPremiumGate = usePremiumFeatureGate();
const {
  showPremiumCheckout: showPdfPremiumCheckout,
  premiumCheckoutDraft: pdfPremiumCheckoutDraft,
  resumeFeature: pdfResumeFeature,
} = pdfPremiumGate;

function isDevMockAnalysis() {
  return (
    import.meta.dev &&
    activeAnalysis.active?.metadata.__devMock === "FATE_DEV_ANALYSIS_PANEL"
  );
}

const allSuggestions = [
  "適合自行創業，還是當個穩定的上班族？",
  "近期有轉職、換工作或跳槽的好時機嗎？",
  "我適合從事哪方面的行業更能發揮天賦？",
  "工作上容易遇到貴人相助，還是要防範小人？",
  "如果想進修或考公職，最近的考運如何？",
  "我的正財運比較旺，還是偏財運比較好？",
  "未來幾年內，有沒有重大的破財危機需要留意？",
  "我適合進行股票、房地產等投資理財嗎？",
  "能不能存得住錢？我的命格是否有財庫？",
  "與他人合夥經商創業，勝算高不高？",
  "我的正緣大概什麼時候會出現？",
  "明年有機會脫單，遇到心儀的另一半嗎？",
  "命中容易遇到爛桃花嗎？該如何化解？",
  "我與家人、子女之間的緣分與關係如何？",
  "面臨人生重大抉擇時，我該如何做決定？",
  "命格中是否有需要特別補足的五行或盲點？",
];
const suggestions = ref<string[]>([]);
const askedCount = computed(
  () => messages.value.filter((message) => message.role === "user").length,
);
const remaining = computed(() => Math.max(0, MAX_QUESTIONS - askedCount.value));
const canSend = computed(
  () =>
    Boolean(input.value.trim()) &&
    !sending.value &&
    !requestingSend.value &&
    !startingSend.value &&
    remaining.value > 0 &&
    Boolean(chartStore.chart),
);
const canDownloadQaPDF = computed(
  () =>
    !sending.value &&
    messages.value.some(
      (message) => message.role === "assistant" && message.content.trim(),
    ),
);
const qaActionItems = computed(() => [
  {
    id: "download-pdf",
    label: "下載 PDF",
    loadingLabel: "PDF 產生中",
    icon: Download,
    loading: downloadingQaPDF.value,
    disabled: !canDownloadQaPDF.value,
    premium: true,
  },
]);
const qaDisconnected = computed(
  () =>
    activeAnalysis.active?.kind === "qa" &&
    activeAnalysis.active.status === "running" &&
    !activeAnalysis.active.connected,
);
const qaNeedsReload = computed(
  () =>
    qaDisconnected.value ||
    (qaServerStatus.value === "running" &&
      (activeAnalysis.active?.kind !== "qa" ||
        !activeAnalysis.active.connected)),
);
const cacheKey = computed(() => {
  const chart = chartStore.chart;
  return chart
    ? `ziwei_qa:${chart.gender}:${chart.solarYear}-${chart.solarMonth}-${chart.solarDay}:${chart.lunarYear}-${chart.lunarMonth}-${chart.lunarDay}:${chart.timeBranch}:${chart.trueSolarTime || ""}`
    : "";
});

onMounted(async () => {
  // Keep SSR and the first client render identical. Auth middleware restores
  // membership only on the client, so rendering an auth-dependent <main>
  // during hydration can permanently retain the server branch's classes.
  pageReady.value = true;
  chartStore.hydrate(auth.profile);
  suggestions.value = [...allSuggestions]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  restoreConversation();
  syncActiveQa();
  if (import.meta.dev)
    window.addEventListener(
      "fate-dev-analysis-applied",
      handleDevAnalysisApplied,
    );
  if (isDevMockAnalysis()) {
    handleDevAnalysisApplied();
    return;
  }
  if (messages.value.length) {
    try {
      await recoverQaHistory();
    } catch {
      /* Keep the local conversation; manual reload remains available. */
    }
  }
  try {
    const data = (await ziweiApi.getRecordDetail()) as unknown;
    const body = data as {
      records?: unknown;
      reports?: unknown;
      data?: unknown;
    } | null;
    const raw = Array.isArray(data)
      ? data
      : (body?.data ?? body?.records ?? body?.reports ?? []);
    reports.value = Array.isArray(raw) ? (raw as ReportRecord[]) : [];
  } catch {
    reports.value = [];
  }
  restorePremiumCheckout();
  pdfPremiumGate.restoreFeature(["qa_pdf"]);
  const nextStep = trackNextStepArrival("qa");
  if (nextStep?.question) input.value = nextStep.question;
});
onBeforeUnmount(() => {
  if (import.meta.dev)
    window.removeEventListener(
      "fate-dev-analysis-applied",
      handleDevAnalysisApplied,
    );
});
watch(() => activeAnalysis.active, syncActiveQa, { deep: true });
watch(error, (message) => {
  if (message && messages.value.length) scrollBottom();
});

function syncActiveQa() {
  const job = activeAnalysis.active;
  if (
    !job ||
    job.kind !== "qa" ||
    (cacheKey.value && job.contextKey !== cacheKey.value)
  )
    return;
  const answer = job.contents.main || "";
  const question =
    typeof job.metadata.question === "string" ? job.metadata.question : "";
  const last = messages.value.at(-1);
  const previous = messages.value.at(-2);
  const isCurrentAnswer =
    last?.role === "assistant" &&
    previous?.role === "user" &&
    (!question || previous.content === question);
  const isCurrentQuestion =
    last?.role === "user" && (!question || last.content === question);
  if (isCurrentAnswer && answer) last.content = answer;
  else if (isCurrentQuestion && (answer || job.status === "running"))
    messages.value.push({ role: "assistant", content: answer });
  sending.value = job.status === "running";
  error.value = job.error || "";
  persistConversation();
  scrollBottom();
}

function handleDevAnalysisApplied() {
  if (!import.meta.dev) return;
  const job = activeAnalysis.active;
  if (!job) {
    messages.value = [];
    sending.value = false;
    error.value = "";
    return;
  }
  if (job.kind !== "qa" || !isDevMockAnalysis()) return;
  const question = String(job.metadata.question || "DEV 模擬問題");
  chatId.value = String(job.metadata.chatId || chatId.value);
  messages.value = [
    { role: "user", content: question },
    { role: "assistant", content: job.contents.main || "" },
  ];
  sending.value = job.status === "running";
  error.value = job.error || "";
  pageReady.value = true;
  scrollBottom();
}

async function recoverQaHistory() {
  if (isDevMockAnalysis()) return;
  const savedChatId = String(
    activeAnalysis.active?.kind === "qa"
      ? activeAnalysis.active.metadata.chatId || chatId.value
      : chatId.value,
  );
  const response = (await ziweiApi.getChatHistory(savedChatId, {
    notifyError: false,
  })) as { data?: QaChatRecord };
  const record = response.data;
  if (!record) throw new Error("找不到問答紀錄");
  const restored = record.messages?.filter(
    (item) =>
      (item.role === "user" || item.role === "assistant") &&
      item.content?.trim(),
  );
  qaServerStatus.value = record.is_complete
    ? "completed"
    : record.status || "running";
  syncQaJobStatus(record);
  if (qaServerStatus.value === "completed") {
    if (restored?.length) messages.value = restored;
    sending.value = false;
    qaFailureCode.value = "";
    error.value = "";
  } else if (qaServerStatus.value === "failed") {
    if (!messages.value.length && restored?.length) messages.value = restored;
    sending.value = false;
    qaFailureCode.value = record.error || "";
    error.value = qaFailureCode.value.includes("deepseek_qa_incomplete_finish")
      ? "回答因篇幅限制而中斷，您可以免費重新產生本題回答。"
      : "回答未能完整產生，請重新產生本題回答。";
  } else {
    if (!messages.value.length && restored?.length) messages.value = restored;
    const last = messages.value.at(-1);
    if (last?.role === "user")
      messages.value.push({ role: "assistant", content: "" });
    sending.value = true;
    error.value = "";
  }
  chatId.value = savedChatId;
  persistConversation();
  scrollBottom();
}

function syncQaJobStatus(record: QaChatRecord) {
  const job = activeAnalysis.active;
  if (job?.kind !== "qa") return;
  const jobChatId = String(job.metadata.chatId || "");
  if (jobChatId && jobChatId !== chatId.value) return;
  if (record.client_job_id && job.jobId !== record.client_job_id) return;
  job.status = record.is_complete
    ? "completed"
    : record.status === "failed"
      ? "failed"
      : "running";
  job.connected = false;
  job.error = job.status === "failed" ? "回答未能完整產生，請重新提問。" : "";
  activeAnalysis.persist();
}

async function refreshQaJob() {
  if (refreshingJob.value) return;
  refreshingJob.value = true;
  error.value = "";
  try {
    await recoverQaHistory();
  } catch (reason) {
    error.value = "目前無法確認任務狀態，請稍後再重新讀取。";
  } finally {
    refreshingJob.value = false;
  }
}

function createChatId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function restoreConversation() {
  if (!cacheKey.value) return;
  try {
    const raw = localStorage.getItem(cacheKey.value);
    if (!raw) return;
    const saved = JSON.parse(raw) as {
      chatId?: string;
      usePointsFallback?: boolean;
      messages?: QaMessage[];
    };
    const restored = Array.isArray(saved.messages)
      ? saved.messages.filter(
          (item) =>
            (item.role === "user" || item.role === "assistant") &&
            item.content?.trim(),
        )
      : [];
    messages.value = restored;
    chatId.value = saved.chatId || createChatId();
    usePointsFallback.value = saved.usePointsFallback === true;
    scrollBottom();
  } catch {
    localStorage.removeItem(cacheKey.value);
  }
}

function persistConversation() {
  if (isDevMockAnalysis()) return;
  if (!cacheKey.value) return;
  const persistable = messages.value.filter((item) => item.content.trim());
  if (!persistable.length) {
    localStorage.removeItem(cacheKey.value);
    return;
  }
  localStorage.setItem(
    cacheKey.value,
    JSON.stringify({
      chatId: chatId.value,
      usePointsFallback: usePointsFallback.value,
      messages: persistable,
      savedAt: new Date().toISOString(),
    }),
  );
}

function scrollBottom() {
  nextTick(() =>
    chatArea.value?.scrollTo({
      top: chatArea.value.scrollHeight,
      behavior: "smooth",
    }),
  );
}

function requestResetConversation() {
  if (sending.value || resettingConversation.value) return;
  showResetConfirm.value = true;
}

async function confirmResetConversation() {
  if (sending.value || resettingConversation.value) return;
  resettingConversation.value = true;
  error.value = "";
  try {
    await ziweiApi.deleteChat(chatId.value, { notifyError: false });
    if (activeAnalysis.active?.kind === "qa") activeAnalysis.reset();
    clearConversation();
    showResetConfirm.value = false;
  } catch (reason) {
    error.value =
      reason instanceof Error
        ? reason.message
        : "無法刪除目前問答紀錄，請稍後再試。";
  } finally {
    resettingConversation.value = false;
  }
}

function clearConversation() {
  messages.value = [];
  input.value = "";
  error.value = "";
  qaServerStatus.value = "idle";
  qaFailureCode.value = "";
  usePointsFallback.value = false;
  chatId.value = createChatId();
  suggestions.value = [...allSuggestions]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  if (cacheKey.value) localStorage.removeItem(cacheKey.value);
}

function chooseSuggestion(question: string) {
  input.value = question;
  requestSend();
}

function restorePremiumCheckout() {
  if (!auth.premium) return;
  const intent = readPremiumCheckoutIntent({
    userUuid: String(auth.profile?.uuid || ""),
    source: "qa",
  });
  if (!intent || intent.source !== "qa") return;
  input.value = intent.question;
  pendingQuestion.value = intent.question;
  showQuotaConfirm.value = true;
  clearPremiumCheckoutIntent();
}

async function downloadQaPDF() {
  if (downloadingQaPDF.value || !canDownloadQaPDF.value) return;
  await downloadAnalysisPdf({
    source: qaPdfSource,
    filename: () =>
      `江映澄紫微-線上問答-${new Date().toISOString().slice(0, 10)}.pdf`,
    prepare: () => {
      const turns: Array<{ question: string; answer: string }> = [];
      let pendingQuestion = "";
      for (const message of messages.value) {
        const content = message.content.trim();
        if (!content) continue;
        if (message.role === "user") pendingQuestion = content;
        else if (pendingQuestion) {
          turns.push({
            question: pendingQuestion,
            answer: displayAssistant(content),
          });
          pendingQuestion = "";
        }
      }
      qaPdfSnapshot.value = {
        generatedAt: new Date().toLocaleString("zh-TW"),
        turns,
      };
    },
    cleanup: () => {
      qaPdfSnapshot.value = null;
    },
    onPremiumRequired: () =>
      pdfPremiumGate.requestFeature("qa_pdf", "/qa"),
  });
}

async function resumeQaPDF() {
  pdfPremiumGate.closeResume();
  if (!canDownloadQaPDF.value) {
    showAppWarning("原問答內容已不存在，請完成問答後再下載 PDF");
    return;
  }
  await downloadQaPDF();
}

function handleQaAction(id: string) {
  if (id === "download-pdf") void downloadQaPDF();
}

async function requestSend() {
  if (requestingSend.value || startingSend.value) return;
  const question = input.value.trim();
  if (!question || sending.value || !chartStore.chart) return;
  trackNextStepSubmitted("qa");
  requestingSend.value = true;
  try {
    if (remaining.value <= 0) {
      error.value =
        "線上問答功能每份命盤最多可提問 5 次。請重新提問開啟新的問答。";
      return;
    }
    pendingQuestion.value = question;
    if (!(await auth.verifyOnlineAccess())) return;
    if (!(await auth.refreshMembership())) {
      error.value = "目前無法確認會員狀態，請檢查網路後再試。";
      return;
    }
    if (!auth.premium) {
      premiumCheckoutDraft.value = { source: "qa", question };
      showPremiumCheckout.value = true;
      return;
    }
    if (!(await activeAnalysis.ensureAvailable("qa"))) return;
    if (askedCount.value === 0 && !usePointsFallback.value) {
      showQuotaConfirm.value = true;
    } else await sendQuestion(question);
  } finally {
    requestingSend.value = false;
  }
}

function buildNatalPayload() {
  const chart = chartStore.chart!;
  const palaces = earthlyBranches.map((branch) => {
    let name = palaceNameForBranch(chart, branch);
    if (branch === chart.bodyPalaceBranch) name = `${name}(身宮)`;
    const stars = chart.palaceStars[branch] || [];
    const daXian = chart.palaceDaXian[branch];
    return {
      name,
      position: branch,
      stars,
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
      daxian_ages: daXian ? `${daXian[0]}-${daXian[1]}` : "",
      xiaoxian_ages: getXiaoXianAges(chart, branch).join(", "),
    };
  });
  return {
    owner: "我",
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

async function confirmQuota() {
  showQuotaConfirm.value = false;
  await sendQuestion(pendingQuestion.value);
}

async function confirmPointsFallback() {
  showPointsFallback.value = false;
  usePointsFallback.value = true;
  input.value = pendingQuestion.value;
  await sendQuestion(pendingQuestion.value);
}

async function sendQuestion(question: string) {
  if (!question || sending.value || startingSend.value) return;
  startingSend.value = true;
  try {
    if (!(await auth.verifyOnlineAccess(true))) return;
    const history = [...messages.value];
    const userMessage: QaMessage = { role: "user", content: question };
    const consumesQuota =
      history.filter((item) => item.role === "user").length === 0;
    const started = await activeAnalysis.begin("qa", cacheKey.value, {
      chatId: chatId.value,
      question,
    });
    if (!started) return;
    messages.value.push(userMessage, { role: "assistant", content: "" });
    input.value = "";
    sending.value = true;
    qaServerStatus.value = "running";
    qaFailureCode.value = "";
    error.value = "";
    persistConversation();
    scrollBottom();
    const natal = buildNatalPayload();
    const answer = await activeAnalysis.runStep({
      ...natal,
      analysis_type: "qa",
      analysisType: "qa",
      is_first_question: consumesQuota,
      question,
      messages: [...history, userMessage],
      chat_id: chatId.value,
      use_points_fallback: usePointsFallback.value,
      chart: chartStore.chart,
      natal_chart: natal,
      reports: reports.value
        .filter((item) => item.content?.trim())
        .map((item) => ({
          category: item.category,
          title: item.title,
          content: item.content,
          is_complete: item.is_complete,
          created_at: item.created_at,
        })),
    });
    const last = messages.value.at(-1);
    if (last?.role === "assistant") last.content = answer;
    sending.value = false;
    qaServerStatus.value = "completed";
    persistConversation();
    scrollBottom();
    if (consumesQuota) await auth.loadBilling();
  } catch (reason) {
    const message =
      reason instanceof Error ? reason.message : "網路連線不穩，請稍後再試。";
    if (message === "analysis_connection_lost") {
      sending.value = true;
      qaServerStatus.value = "running";
      error.value = "";
      persistConversation();
      return;
    }
    if (!messages.value.at(-1)?.content) messages.value.pop();
    sending.value = false;
    if (message.includes("membership_limit_exceeded")) {
      if (
        messages.value.at(-1)?.role === "user" &&
        messages.value.at(-1)?.content === question
      )
        messages.value.pop();
      pendingQuestion.value = question;
      showPointsFallback.value = true;
    } else if (message.includes("turn_limit") || message.includes("limit"))
      error.value =
        "線上問答功能每份命盤最多可提問 5 次。請重新提問開啟新的問答。";
    else if (message.includes("requires_membership")) {
      auth.premium = false;
      error.value = "此功能為付費會員專屬，請購買會員後再試。";
    } else if (message.includes("insufficient_points"))
      error.value = "點數餘額不足，請先購買點數後再繼續。";
    else error.value = message;
    persistConversation();
  } finally {
    startingSend.value = false;
  }
}

async function retryFailedAnswer() {
  if (
    retryingAnswer.value ||
    sending.value ||
    qaServerStatus.value !== "failed"
  )
    return;
  const lastQuestion = [...messages.value]
    .reverse()
    .find((message) => message.role === "user")?.content.trim();
  if (!lastQuestion || !chartStore.chart) return;

  retryingAnswer.value = true;
  error.value = "";
  try {
    if (!(await auth.verifyOnlineAccess(true))) return;
    const started = await activeAnalysis.begin("qa", cacheKey.value, {
      chatId: chatId.value,
      question: lastQuestion,
      retry: true,
    });
    if (!started) return;
    const last = messages.value.at(-1);
    if (last?.role === "assistant") last.content = "";
    else messages.value.push({ role: "assistant", content: "" });
    sending.value = true;
    qaServerStatus.value = "running";
    qaFailureCode.value = "";
    persistConversation();
    scrollBottom();

    const natal = buildNatalPayload();
    const answer = await activeAnalysis.runStep({
      ...natal,
      analysis_type: "qa",
      analysisType: "qa",
      question: lastQuestion,
      chat_id: chatId.value,
      retry_qa_answer: true,
      use_points_fallback: usePointsFallback.value,
      chart: chartStore.chart,
      natal_chart: natal,
      reports: reports.value
        .filter((item) => item.content?.trim())
        .map((item) => ({
          category: item.category,
          title: item.title,
          content: item.content,
          is_complete: item.is_complete,
          created_at: item.created_at,
        })),
    });
    const answerMessage = messages.value.at(-1);
    if (answerMessage?.role === "assistant") answerMessage.content = answer;
    sending.value = false;
    qaServerStatus.value = "completed";
    persistConversation();
    scrollBottom();
  } catch (reason) {
    const message =
      reason instanceof Error ? reason.message : "重新產生失敗，請稍後再試。";
    if (message === "analysis_connection_lost") {
      sending.value = true;
      qaServerStatus.value = "running";
      persistConversation();
      return;
    }
    if (!messages.value.at(-1)?.content) messages.value.pop();
    sending.value = false;
    qaServerStatus.value = "failed";
    error.value = message;
    persistConversation();
  } finally {
    retryingAnswer.value = false;
  }
}

function displayAssistant(content: string) {
  if (content.startsWith("/skip_question"))
    return content.replace("/skip_question", "").trim();
  if ("/skip_question".startsWith(content)) return "";
  return content;
}

function handleCompositionStart() {
  composingInput.value = true;
}

function handleCompositionEnd() {
  composingInput.value = false;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    if (composingInput.value || event.isComposing || event.keyCode === 229)
      return;
    event.preventDefault();
    requestSend();
  }
}
</script>

<template>
  <AppPageLayout
    title="線上問答"
    screen-class="qa-screen"
    content-mode="flush"
    show-back
    back-to="/ai-analysis"
    back-label="返回排盤解盤"
  >
    <template #actions>
      <AppActionMenu
        v-if="canDownloadQaPDF"
        label="線上問答操作"
        :items="qaActionItems"
        @select="handleQaAction"
      />
      <span v-else />
    </template>

    <Teleport to="body">
      <template v-if="downloadingQaPDF">
        <div
          v-if="qaPdfSnapshot"
          ref="qaPdfSource"
          class="analysis-pdf-source qa-pdf-source"
          aria-hidden="true"
        >
          <main data-pdf-page>
            <header
              class="analysis-pdf-heading analysis-pdf-cover glass"
              data-pdf-block
            >
              <img src="/remove-background-logo.png" alt="" />
              <p>江映澄紫微</p>
              <h1>線上問答紀錄</h1>
              <span>下載日期：{{ qaPdfSnapshot.generatedAt }}</span>
              <p class="analysis-pdf-disclaimer">
                本內容供自我探索與參考，不應取代醫療、法律或財務專業意見。
              </p>
            </header>
          </main>
          <main
            v-for="(turn, index) in qaPdfSnapshot.turns"
            :key="index"
            data-pdf-page
          >
            <article class="qa-pdf-turn" data-pdf-block>
              <section class="qa-pdf-message user">
                <h2>提問</h2>
                <p class="qa-pdf-question">{{ turn.question }}</p>
              </section>
              <section class="qa-pdf-message assistant">
                <h2>回答</h2>
                <MarkdownContent :source="turn.answer" />
              </section>
            </article>
          </main>
        </div>
        <div
          class="analysis-pdf-overlay"
          data-html2canvas-ignore="true"
          role="status"
          aria-live="polite"
        >
          <AppLoading
            scope="page"
            layout="fill"
            :delay="0"
            message="正在整理問答 PDF，請稍候…"
          />
        </div>
      </template>
    </Teleport>

    <main v-if="!pageReady" key="loading" class="qa-loading" aria-busy="true" />

    <main v-else-if="!chartStore.chart" key="chart-empty" class="qa-empty">
      <WifiOff :size="46" />
      <h2>尚未建立命盤</h2>
      <p>請先完成出生資料，才能依照您的命盤回答問題。</p>
      <NuxtLink class="app-button" to="/ai-analysis">前往建立命盤</NuxtLink>
    </main>

    <main v-else key="chat" class="chat-layout">
      <section ref="chatArea" class="chat-area" aria-live="polite">
        <div v-if="!messages.length" class="qa-welcome">
          <span class="welcome-icon"><MessageCircle :size="28" /></span>
          <p>
            可透過問答更加理解命盤<br /><small
              >(同一次對話裡面有五次追問的機會喔～)</small
            >
          </p>
          <div class="welcome-composer composer-field">
            <textarea
              v-model="input"
              rows="1"
              placeholder="輸入問題..."
              maxlength="500"
              @compositionstart="handleCompositionStart"
              @compositionend="handleCompositionEnd"
              @keydown="handleKeydown"
            /><button
              type="button"
              aria-label="送出問題"
              :disabled="!canSend"
              @click="requestSend"
            >
              <Send :size="20" />
            </button>
          </div>
          <p v-if="error" class="qa-error welcome-error">{{ error }}</p>
          <div class="suggestions">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              type="button"
              @click="chooseSuggestion(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>
        <template v-for="(message, index) in messages" :key="index">
          <div v-if="message.role === 'user'" class="bubble-row user">
            <div class="chat-bubble user-bubble">{{ message.content }}</div>
          </div>
          <div v-else class="bubble-row assistant">
            <div
              v-if="
                !message.content && sending && index === messages.length - 1
              "
              class="chat-bubble assistant-bubble typing"
            >
              <i /><i /><i />
            </div>
            <div
              v-else-if="displayAssistant(message.content)"
              class="chat-bubble assistant-bubble"
            >
              <MarkdownContent :source="displayAssistant(message.content)" />
            </div>
          </div>
        </template>
        <aside v-if="sending" class="qa-reload-notice" role="status">
          <p v-if="qaNeedsReload">
            連線已中斷，系統於背景繼續處理。請留在此畫面，稍後手動重新讀取。
          </p>
          <p v-else>
            正在產生回答，請勿離開此畫面；若連線中斷，系統仍會在背景繼續處理。
          </p>
          <button
            v-if="qaNeedsReload"
            class="app-button outline"
            type="button"
            :disabled="refreshingJob"
            @click="refreshQaJob"
          >
            <RefreshCw
              :size="17"
              :class="{ spinning: refreshingJob }"
              aria-hidden="true"
            />
            {{ refreshingJob ? "正在讀取…" : "重新讀取" }}
          </button>
        </aside>
        <aside
          v-if="error && messages.length"
          class="qa-error-recovery"
          role="alert"
        >
          <p class="qa-error">{{ error }}</p>
          <button
            v-if="qaServerStatus === 'failed'"
            class="app-button outline qa-retry-answer"
            type="button"
            :disabled="retryingAnswer || sending"
            @click="retryFailedAnswer"
          >
            <RefreshCw
              :size="17"
              :class="{ spinning: retryingAnswer }"
              aria-hidden="true"
            />
            {{ retryingAnswer ? "正在重新產生…" : "重新產生回答" }}
          </button>
        </aside>
      </section>

      <footer v-if="messages.length" class="qa-composer">
        <div class="composer-actions">
          <button
            type="button"
            :disabled="sending || resettingConversation"
            @click="requestResetConversation"
          >
            <RefreshCw :size="18" />重新提問
          </button>
        </div>
        <div
          class="composer-field"
          :class="{ disabled: sending || remaining <= 0 }"
        >
          <textarea
            v-model="input"
            rows="1"
            :disabled="sending || remaining <= 0"
            :placeholder="
              remaining <= 0 ? '已達提問上限，請重新提問' : '輸入問題...'
            "
            maxlength="500"
            @compositionstart="handleCompositionStart"
            @compositionend="handleCompositionEnd"
            @keydown="handleKeydown"
          /><button
            type="button"
            aria-label="送出問題"
            :disabled="!canSend"
            @click="requestSend"
          >
            <Send :size="20" />
          </button>
        </div>
      </footer>
    </main>

    <AppBottomSheet
      :open="showResetConfirm"
      role="alertdialog"
      labelledby="qa-reset-title"
      :locked="resettingConversation"
      @close="showResetConfirm = false"
    >
      <template #header><h2 id="qa-reset-title">確定要重新提問？</h2></template>
      <p>
        目前問題的所有對話紀錄將被放棄並刪除，系統不會繼續保存。開啟新對話後，首次提問將重新消耗會員額度
        1 次。
      </p>
      <div class="sheet-actions">
        <button
          class="app-button outline"
          type="button"
          :disabled="resettingConversation"
          @click="showResetConfirm = false"
        >
          取消
        </button>
        <button
          class="app-button"
          type="button"
          :disabled="resettingConversation"
          @click="confirmResetConversation"
        >
          {{ resettingConversation ? "正在刪除…" : "開啟新對話" }}
        </button>
      </div>
    </AppBottomSheet>

    <AppBottomSheet :open="showQuotaConfirm" @close="showQuotaConfirm = false">
      <template #header><h2>確認使用線上問答</h2></template>
      <p>本次操作將消耗會員額度 1 次，且後續最多可追問五次，不重複扣除額度。</p>
      <div class="quota-row">
        <Coins :size="18" />
        <span>本月會員額度剩餘</span>
        <b>{{ auth.membershipQuotaRemaining }} 次</b>
      </div>
      <div class="sheet-actions">
        <button
          class="app-button outline"
          type="button"
          @click="showQuotaConfirm = false"
        >
          取消</button
        ><button
          class="app-button"
          type="button"
          :disabled="startingSend"
          @click="confirmQuota"
        >
          {{ startingSend ? "正在送出…" : "確認使用" }}
        </button>
      </div>
    </AppBottomSheet>
    <AppBottomSheet
      :open="showPointsFallback"
      @close="showPointsFallback = false"
    >
      <template #header><h2>會員月度額度已滿</h2></template>
      <p>是否改為扣除 100 點數繼續本次線上問答？目前點數：{{ auth.points }}</p>
      <div class="sheet-actions">
        <button
          class="app-button outline"
          type="button"
          @click="showPointsFallback = false"
        >
          取消</button
        ><button
          class="app-button"
          type="button"
          :disabled="auth.points < 100 || startingSend"
          @click="confirmPointsFallback"
        >
          使用點數
        </button>
      </div>
    </AppBottomSheet>
    <PremiumCheckoutSheet
      :open="showPremiumCheckout"
      :draft="premiumCheckoutDraft"
      @close="showPremiumCheckout = false"
    />
    <PremiumCheckoutSheet
      :open="showPdfPremiumCheckout"
      :draft="pdfPremiumCheckoutDraft"
      @close="pdfPremiumGate.closeCheckout"
    />
    <PremiumFeatureResumeSheet
      :feature="pdfResumeFeature"
      :loading="downloadingQaPDF"
      @close="pdfPremiumGate.closeResume"
      @confirm="resumeQaPDF"
    />
  </AppPageLayout>
</template>

<style scoped>
.qa-pdf-turn {
  display: grid;
  gap: 18px;
  padding: 20px 12px;
  background: transparent;
}
.qa-pdf-message {
  padding: 22px 24px;
  overflow-wrap: anywhere;
}
.qa-pdf-message h2 {
  margin: 0 0 10px;
  font-size: 15px;
}
.qa-pdf-message.user {
  justify-self: end;
  width: min(78%, 610px);
  border-radius: 22px 22px 6px 22px;
  background: var(--mountain);
  color: var(--paper);
}
.qa-pdf-message.assistant {
  justify-self: start;
  width: min(92%, 700px);
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 22px 22px 22px 6px;
  background: rgba(255, 255, 255, 0.78);
}
.qa-pdf-message.user h2,
.qa-pdf-message.user .qa-pdf-question {
  color: var(--paper);
}
.qa-pdf-message.assistant h2 {
  color: var(--mountain);
}
.qa-pdf-question {
  margin: 0;
  color: var(--ink);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.7;
  white-space: pre-wrap;
}
.qa-pdf-message :deep(.markdown-content) {
  color: var(--ink);
  font-size: 14px;
  line-height: 1.7;
}
.qa-screen {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}
.premium-lock {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: calc(100% - 36px);
  margin: auto;
  padding: 30px 24px;
  border-radius: 28px;
  text-align: center;
}
.premium-lock > span,
.welcome-icon,
.sheet-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(107, 166, 160, 0.13);
}
.premium-lock > .feature-icon {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(36, 87, 90, 0.14);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow:
    inset 0 1px 0 #fff,
    0 5px 12px rgba(36, 87, 90, 0.09);
}
.feature-icon img,
.cta-feature-icon {
  width: 20px;
  height: 20px;
  filter: invert(28%) sepia(15%) saturate(1350%) hue-rotate(134deg)
    brightness(91%) contrast(91%);
}
.cta-feature-icon {
  width: 18px;
  height: 18px;
}
.premium-lock h2 {
  margin: 18px 0 9px;
  font-size: 20px;
}
.premium-lock p,
.qa-empty p {
  max-width: 390px;
  margin: 0 0 24px;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.6;
}
.premium-lock .app-button {
  gap: 7px;
}
.qa-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70dvh;
  padding: 24px;
  text-align: center;
}
.qa-empty h2 {
  margin: 17px 0 8px;
}
.chat-layout {
  display: grid;
  flex: 1;
  grid-template-rows: minmax(0, 1fr) auto;
  width: 100% !important;
  min-height: 0;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  overflow: hidden;
}
.qa-loading {
  flex: 1;
  min-height: 0;
}
.chat-area {
  min-height: 0;
  overflow-y: auto;
  padding: 18px 18px 30px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(36, 87, 90, 0.28) transparent;
}
.chat-area::-webkit-scrollbar {
  width: 6px;
  background: transparent;
}
.chat-area::-webkit-scrollbar-track {
  background: transparent;
}
.chat-area::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(36, 87, 90, 0.28);
}
.chat-area::-webkit-scrollbar-corner {
  background: transparent;
}
.qa-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  text-align: center;
}
.qa-welcome > p {
  margin: 16px 0 20px;
  color: rgba(36, 87, 90, 0.72);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.5;
}
.qa-welcome small {
  font-size: 13px;
  font-weight: 600;
}
.welcome-composer {
  width: min(100%, 520px);
  margin-bottom: 18px;
  text-align: left;
}
.welcome-error {
  width: min(100%, 520px);
  margin: -9px 0 13px;
}
.suggestions {
  display: grid;
  width: min(100%, 520px);
  gap: 10px;
}
.suggestions button {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(36, 87, 90, 0.34);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.48);
  color: var(--mountain);
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.45;
  text-align: left;
}
.bubble-row {
  display: flex;
  margin-bottom: 10px;
}
.bubble-row.user {
  justify-content: flex-end;
}
.chat-bubble {
  max-width: min(82%, 440px);
  padding: 11px 14px;
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.user-bubble {
  border-radius: 22px 22px 6px 22px;
  background: var(--mountain);
  color: var(--paper);
}
.assistant-bubble {
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 22px 22px 22px 6px;
  background: rgba(255, 255, 255, 0.78);
}
.assistant-bubble :deep(.markdown-content) {
  font-size: 14px;
  line-height: 1.55;
}
.assistant-bubble :deep(p:last-child) {
  margin-bottom: 0;
}
.qa-reload-notice {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(100%, 440px);
  margin: 18px auto 0;
  padding: 14px 12px 4px;
  text-align: center;
}
.qa-reload-notice p {
  margin: 0;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.55;
}
.qa-reload-notice .app-button {
  min-height: 42px;
  padding: 8px 18px;
  gap: 7px;
  border-radius: 15px;
  font-size: 13px;
}
.qa-reload-notice .spinning {
  animation: qa-refresh-spin 0.8s linear infinite;
}
.qa-error-recovery {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(100%, 440px);
  margin: 18px auto 0;
  padding: 14px 12px 4px;
  text-align: center;
}
.qa-error-recovery .qa-error {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
}
.qa-error-recovery .app-button {
  min-height: 42px;
  padding: 8px 18px;
  gap: 7px;
  border-radius: 15px;
  font-size: 13px;
}
.qa-error-recovery .spinning {
  animation: qa-refresh-spin 0.8s linear infinite;
}
@keyframes qa-refresh-spin {
  to {
    transform: rotate(360deg);
  }
}
.typing {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 60px;
  min-height: 42px;
}
.typing i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--mountain);
  animation: typing 1s ease-in-out infinite;
}
.typing i:nth-child(2) {
  animation-delay: 0.15s;
}
.typing i:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes typing {
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
.qa-composer {
  position: relative;
  z-index: 2;
  flex: none;
  padding: 4px 16px calc(14px + env(safe-area-inset-bottom));
}
.composer-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 5px;
}
.composer-actions button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 3px;
  border: 0;
  background: transparent;
  color: var(--mountain);
  font-size: 15px;
  font-weight: 800;
}
.composer-actions button:disabled {
  opacity: 0.35;
}
.composer-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  align-items: center;
  min-height: 52px;
  border: 1.4px solid rgba(36, 87, 90, 0.42);
  border-radius: 18px;
  background: white;
  box-shadow: 0 8px 18px rgba(36, 87, 90, 0.07);
}
.composer-field.disabled {
  opacity: 0.55;
  box-shadow: none;
}
.composer-field textarea {
  max-height: 104px;
  padding: 15px 8px 13px 17px;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  color: var(--mountain);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
@supports (-webkit-touch-callout: none) {
  @media (hover: none) and (pointer: coarse) {
    .composer-field textarea {
      font-size: 16px;
    }
  }
}
.composer-field > button {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--mountain);
}
.composer-field > button:disabled {
  opacity: 0.25;
}
.qa-error {
  margin: 7px 0 0;
  color: var(--cinnabar);
  font-size: 11.5px;
  font-weight: 700;
  text-align: center;
}
.quota-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  margin-bottom: 20px;
  padding: 13px 16px;
  border-radius: 15px;
  background: rgba(107, 166, 160, 0.1);
  text-align: left;
}
.qa-sheet {
  width: min(100%, 680px);
  padding: 12px 24px calc(28px + env(safe-area-inset-bottom));
  border-radius: 28px 28px 0 0;
  background: var(--paper);
  text-align: center;
}
.qa-sheet .sheet-icon {
  margin: 0 auto;
}
.sheet-icon.warning {
  color: var(--cinnabar);
  background: rgba(184, 91, 75, 0.1);
}
.qa-sheet h2 {
  margin: 15px 0 8px;
  font-size: 19px;
}
.qa-sheet p {
  margin: 0 0 22px;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.6;
}
</style>
