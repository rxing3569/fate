<script setup lang="ts">
import { ChevronLeft, Coins, Download, RefreshCw } from "@lucide/vue";
import {
  parseConsultSegments,
  type ConsultSegment,
} from "~/utils/consult-segments";
import {
  parseConsultQuestions,
  type ConsultFollowupQuestion,
} from "~/utils/consult-questions";
import { ApiError } from "~/utils/api";
import { drawConsultExtraCard } from "~/utils/consult-extra-pool";
import { ANALYSIS_TIMEOUT_MS } from "~/composables/useIncompleteAnalysisRecovery";
import type { PremiumCheckoutDraft } from "~/types/billing";
import {
  clearPremiumCheckoutIntent,
  readPremiumCheckoutIntent,
} from "~/utils/premium-checkout";
definePageMeta({ middleware: "auth" });
useHead({ title: "占卜問事｜江映澄紫微" });
const initialConsultTitle = "事情的核心";
const consultSegmentTitles: Record<ConsultSegment["key"], string> = {
  main: initialConsultTitle,
  auxiliary: "如何行動",
  misc: "細節線索",
  cycle: "目前處於階段",
  summary: "核心小結",
};
type ConsultCard = {
  group: string;
  name: string;
  polarity?: "陽" | "陰";
  transformation?: string;
};
type ConsultCards = Record<string, ConsultCard>;
type ConsultMessage = {
  role: "user" | "assistant";
  type: "text" | "card_draw";
  content?: string;
  card?: ConsultCard;
  draw_group?: string;
  prompt_id?: string;
  client_job_id?: string;
};
type ConsultChat = {
  chat_id: string;
  initial_question: string;
  initial_cards: ConsultCards;
  messages: ConsultMessage[];
  extra_turns: number;
  status: string;
  current_action?: "initial" | "follow_up" | "extra_draw";
  is_complete?: boolean;
  retryable?: boolean;
  error?: string;
  updated_at?: string;
};
type PendingAction =
  | { type: "follow_up"; question: string }
  | {
      type: "extra_draw";
      prompt: ConsultFollowupQuestion;
    };
type ConsultPdfTurn = {
  question: string;
  card?: ConsultCard;
  sections: Array<{ title: string; content: string }>;
};
type ConsultPdfSnapshot = {
  generatedAt: string;
  initialQuestion: string;
  cards: ConsultCard[];
  turns: ConsultPdfTurn[];
};
const auth = useAuthStore(),
  activeAnalysis = useActiveAnalysisStore();
const chat = ref<ConsultChat | null>(null),
  messages = ref<ConsultMessage[]>([]),
  input = ref(""),
  loading = ref(true),
  recordLoaded = ref(false),
  initializingRecord = ref(true),
  localActionInFlight = ref(false),
  sending = ref(false),
  error = ref("");
let chatLoadInFlight: Promise<void> | null = null;
const showPointsConfirm = ref(false),
  showQuotaConfirm = ref(false),
  showPremiumCheckout = ref(false),
  showResumeConfirm = ref(false),
  premiumCheckoutDraft = ref<PremiumCheckoutDraft | null>(null),
  showResetConfirm = ref(false),
  resetting = ref(false);
const retrying = ref(false);
const refreshingResult = ref(false);
let disconnectedRefreshTimer: number | undefined;
const {
  locked: consultNavigationLocked,
  notifyLocked: notifyConsultNavigationLocked,
} = useAnalysisNavigationLock();
const pendingAction = ref<PendingAction | null>(null),
  followupQuestions = ref<ConsultFollowupQuestion[]>([]),
  hasUsedFollowup = ref(false),
  chatArea = ref<HTMLElement | null>(null);
const consultPdfSource = ref<HTMLElement | null>(null);
const consultPdfSnapshot = ref<ConsultPdfSnapshot | null>(null);
const { downloading: downloadingConsultPdf, download: downloadAnalysisPdf } =
  useAnalysisPdfDownload();
const pdfPremiumGate = usePremiumFeatureGate();
const {
  showPremiumCheckout: showPdfPremiumCheckout,
  premiumCheckoutDraft: pdfPremiumCheckoutDraft,
  resumeFeature: pdfResumeFeature,
} = pdfPremiumGate;
const activeConsult = computed(() =>
  activeAnalysis.active?.kind === "consult" ? activeAnalysis.active : null,
);
const initialInfo = computed(
  () =>
    activeConsult.value?.metadata.consult as
      | { question?: string; cards?: ConsultCards }
      | undefined,
);
const activeChatId = computed(() =>
  String(
    activeConsult.value?.metadata.chatId ||
      activeConsult.value?.metadata.chat_id ||
      "",
  ),
);
const chatId = computed(
  () =>
    chat.value?.chat_id ||
    String(
      activeConsult.value?.metadata.chatId ||
        activeConsult.value?.metadata.chat_id ||
        "",
    ),
);
const initialCards = computed(
  () => chat.value?.initial_cards || initialInfo.value?.cards || {},
);
const orderedCards = computed(
  () =>
    [
      "main_star",
      "assistant_star",
      "minor_star_1",
      "minor_star_2",
      "life_stage",
    ]
      .map((key) => initialCards.value[key])
      .filter(Boolean) as ConsultCard[],
);
const extraTurns = computed(() => {
  const recordedTurns = Number(chat.value?.extra_turns || 0);
  const activeTurns = Number(activeConsult.value?.metadata.extraTurns || 0);
  const userMessages = messages.value.filter(
    (message) => message.role === "user",
  );
  const includesInitialQuestion = Boolean(
    userMessages[0]?.content &&
    userMessages[0].content.trim() === chat.value?.initial_question?.trim(),
  );
  const messageTurns = Math.max(
    0,
    userMessages.length - (includesInitialQuestion ? 1 : 0),
  );
  return Math.max(recordedTurns, activeTurns, messageTurns);
});
const canContinue = computed(
  () =>
    extraTurns.value < 10 &&
    !sending.value &&
    !localActionInFlight.value &&
    activeConsult.value?.status !== "running" &&
    chat.value?.status === "completed" &&
    chat.value?.is_complete !== false,
);
const canDownloadConsultPdf = computed(
  () =>
    !sending.value &&
    messages.value.some(
      (message) => message.role === "assistant" && message.content?.trim(),
    ),
);
const initialRetryAvailable = computed(() => {
  if (!recordLoaded.value || chat.value || !chatId.value) return false;
  if (activeConsult.value?.metadata.action !== "initial") return false;
  if (
    activeConsult.value.status !== "failed" &&
    activeConsult.value.status !== "timed_out"
  )
    return false;
  const info = initialInfo.value;
  if (
    !info?.question?.trim() ||
    !info.cards ||
    Array.from(info.question.trim()).length > 500
  )
    return false;
  const expectedGroups = {
    main_star: "主星",
    assistant_star: "輔星",
    minor_star_1: "雜曜",
    minor_star_2: "雜曜",
    life_stage: "長生十二神",
  } as const;
  return (
    Object.entries(expectedGroups).every(([key, group]) => {
      const card = info.cards?.[key];
      if (!card?.name || card.group !== group) return false;
      return key === "life_stage"
        ? !card.polarity
        : card.polarity === "陽" || card.polarity === "陰";
    }) && info.cards.minor_star_1?.name !== info.cards.minor_star_2?.name
  );
});
const failedConsult = computed(
  () =>
    recordLoaded.value &&
    (((chat.value?.status === "failed" || chat.value?.status === "running") &&
      chat.value.is_complete === false &&
      (chat.value.retryable === true ||
        (chat.value.status === "running" &&
          activeConsult.value?.status !== "running" &&
          Boolean(chat.value.updated_at) &&
          Date.now() - Date.parse(chat.value.updated_at || "") >=
            ANALYSIS_TIMEOUT_MS))) ||
      initialRetryAvailable.value),
);
const nextAdditionalTurnIsFree = computed(() => extraTurns.value === 0);
const additionalCostText = computed(() =>
  auth.premium
    ? `目前剩餘會員額度：${auth.membershipQuotaRemaining}`
    : "Premium 會員可使用追問額度",
);
const composerPlaceholder = computed(() => {
  if (extraTurns.value >= 10) return "本次問事已達追加上限";
  if (failedConsult.value) return "請先完成上次未完成的回答";
  if (activeConsult.value?.status === "running") return "回答產生中…";
  if (chat.value?.is_complete === false) return "正在恢復問事狀態…";
  return "輸入追問…";
});
const consultActionItems = computed(() => [
  {
    id: "download-pdf",
    label: "下載 PDF",
    loadingLabel: "PDF 產生中",
    icon: Download,
    loading: downloadingConsultPdf.value,
    disabled: !canDownloadConsultPdf.value,
    premium: true,
  },
]);
const recoveryActionLabel = computed(() => {
  const labels = {
    initial: "首次解惑",
    follow_up: "文字追問",
    extra_draw: "補抽星曜",
  } as const;
  const activeAction = activeConsult.value?.metadata.action;
  const action =
    chat.value?.current_action ||
    (activeAction === "initial" ||
    activeAction === "follow_up" ||
    activeAction === "extra_draw"
      ? activeAction
      : "initial");
  return labels[action];
});
const recoveryDetails = computed(() => [
  { label: "失敗階段", value: recoveryActionLabel.value },
  {
    label: "追加進度",
    value: `${extraTurns.value} / 10 次已完成`,
  },
]);
function consultErrorText(value: unknown) {
  const message = value instanceof Error ? value.message : String(value || "");
  if (
    message === "consult_empty_response" ||
    message === "consult_analysis_failed" ||
    message === "analysis_connection_lost"
  )
    return "本次回覆未完成，可免費重新計算。";
  if (
    message === "consult_retry_not_available" ||
    message === "consult retry not available"
  )
    return "";
  return message || "解牌未完成，請稍後再試。";
}
function isConsultRetryUnavailable(value: unknown) {
  const message = value instanceof Error ? value.message : String(value || "");
  return (
    message === "consult_retry_not_available" ||
    message === "consult retry not available"
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
function assistantSegments(content: string, index: number) {
  const answer = parseConsultQuestions(content);
  return parseConsultSegments(
    answer.content,
    sending.value && index === messages.value.length - 1,
  );
}
function isInitialAssistant(index: number) {
  return (
    messages.value.findIndex((message) => message.role === "assistant") ===
    index
  );
}
function assistantTitle(index: number, key: string) {
  return isInitialAssistant(index)
    ? consultSegmentTitles[key as ConsultSegment["key"]] || ""
    : "";
}
function assistantSegmentSource(content: string, index: number, key: string) {
  if (!assistantTitle(index, key)) return content;
  // Section titles are rendered consistently by the chat UI. Remove the
  // model's leading Markdown heading so it does not appear twice while streaming.
  return content.replace(/^\s*#{1,6}\s*[^\n]*(?:\n|$)/i, "").trim();
}
function syncFollowupQuestions(source: string) {
  const parsed = parseConsultQuestions(source);
  if (parsed.found) followupQuestions.value = parsed.questions;
}
function syncFollowupQuestionsFromMessages() {
  const assistant = [...messages.value]
    .reverse()
    .find((message) => message.role === "assistant" && message.content);
  if (assistant?.content) syncFollowupQuestions(assistant.content);
}
function buildConsultPdfTurns() {
  const turns: ConsultPdfTurn[] = [];
  let pendingQuestion = "";
  let pendingCard: ConsultCard | undefined;
  for (const message of messages.value) {
    const content = message.content?.trim() || "";
    if (message.role === "user") {
      pendingQuestion = content;
      pendingCard = message.card;
      continue;
    }
    if (!content) continue;
    const answer = parseConsultQuestions(content).content;
    const sections = parseConsultSegments(answer).map((segment) => ({
      title: consultSegmentTitles[segment.key],
      content: segment.content,
    }));
    if (!sections.length) continue;
    turns.push({
      question:
        pendingQuestion ||
        (turns.length === 0
          ? chat.value?.initial_question || "原始提問"
          : "追加追問"),
      ...(pendingCard ? { card: pendingCard } : {}),
      sections,
    });
    pendingQuestion = "";
    pendingCard = undefined;
  }
  return turns;
}
async function downloadConsultPdf() {
  if (downloadingConsultPdf.value || !canDownloadConsultPdf.value) return;
  await downloadAnalysisPdf({
    source: consultPdfSource,
    filename: () =>
      `江映澄紫微-占卜問事-${new Date().toISOString().slice(0, 10)}.pdf`,
    prepare: () => {
      consultPdfSnapshot.value = {
        generatedAt: new Date().toLocaleString("zh-TW"),
        initialQuestion: chat.value?.initial_question || "占卜問事",
        cards: [...orderedCards.value],
        turns: buildConsultPdfTurns(),
      };
    },
    cleanup: () => {
      consultPdfSnapshot.value = null;
    },
    onPremiumRequired: () =>
      pdfPremiumGate.requestFeature("consult_pdf", "/consult/result"),
  });
}
async function resumeConsultPdf() {
  pdfPremiumGate.closeResume();
  if (!canDownloadConsultPdf.value) {
    showAppWarning("原問事內容已不存在，請完成問事後再下載 PDF");
    return;
  }
  await downloadConsultPdf();
}
function handleConsultAction(id: string) {
  if (id === "download-pdf") void downloadConsultPdf();
}
function requestResetConsult() {
  if (consultNavigationLocked.value) {
    notifyConsultNavigationLocked();
    return;
  }
  if (resetting.value) return;
  showResetConfirm.value = true;
}
function handleConsultBeforeUnload(event: BeforeUnloadEvent) {
  if (!consultNavigationLocked.value) return;
  event.preventDefault();
  event.returnValue = "";
}
function syncActiveStream() {
  const job = activeConsult.value;
  if (!job) return;
  if (
    chat.value &&
    activeChatId.value &&
    chat.value.chat_id !== activeChatId.value
  )
    return;
  const expectedTurns = Number(job.metadata.extraTurns || 0);
  const recordedTurns = Number(chat.value?.extra_turns || 0);
  const pendingMessage = job.metadata.pendingMessage as
    | ConsultMessage
    | undefined;
  if (
    pendingMessage?.role === "user" &&
    expectedTurns > recordedTurns &&
    !messages.value.some((message) => message.client_job_id === job.jobId)
  ) {
    const optimisticMessage = messages.value.at(-2);
    const pendingAlreadyVisible =
      messages.value.at(-1)?.role === "assistant" &&
      !messages.value.at(-1)?.content &&
      optimisticMessage?.role === "user" &&
      optimisticMessage.content === pendingMessage.content &&
      optimisticMessage.prompt_id === pendingMessage.prompt_id;
    if (pendingAlreadyVisible && optimisticMessage)
      optimisticMessage.client_job_id = job.jobId;
    else messages.value.push({ ...pendingMessage, client_job_id: job.jobId });
  }
  const content = job.contents.main || "";
  syncFollowupQuestions(content);
  if (job.status === "failed" || job.status === "timed_out") {
    sending.value = false;
    error.value = consultErrorText(job.error);
  }
  if (job.status !== "running" && !content) return;
  let last = messages.value.at(-1);
  if (!last || last.role !== "assistant") {
    messages.value.push({ role: "assistant", type: "text", content: "" });
    last = messages.value.at(-1);
  }
  if (last && content) last.content = content;
  sending.value = job.status === "running";
  if (job.status === "failed") error.value = consultErrorText(job.error);
  scrollBottom();
}
async function fetchChat() {
  try {
    const response = (await ziweiApi.getConsultRecord({
      notifyError: false,
    })) as { data?: ConsultChat };
    if (response.data) {
      chat.value = response.data;
      recordLoaded.value = true;
      const hasLiveStream =
        activeConsult.value?.status === "running" &&
        messages.value.some((message) => message.role === "assistant");
      if (!hasLiveStream) messages.value = [...(response.data.messages || [])];
      syncFollowupQuestionsFromMessages();
    }
  } catch (reason) {
    const payload =
      reason instanceof ApiError &&
      reason.payload &&
      typeof reason.payload === "object"
        ? (reason.payload as { error?: unknown })
        : null;
    if (
      reason instanceof ApiError &&
      reason.status === 404 &&
      payload?.error === "consult_record_not_found"
    ) {
      chat.value = null;
      recordLoaded.value = true;
    } else {
      error.value = consultErrorText(reason);
    }
  }
  syncActiveStream();
}
function loadChat() {
  if (chatLoadInFlight) return chatLoadInFlight;
  const request = fetchChat();
  chatLoadInFlight = request;
  void request.then(
    () => {
      if (chatLoadInFlight === request) chatLoadInFlight = null;
    },
    () => {
      if (chatLoadInFlight === request) chatLoadInFlight = null;
    },
  );
  return request;
}
function activeConsultRecordIsCurrent() {
  const job = activeConsult.value;
  if (!job || job.status !== "completed" || chat.value?.status !== "completed")
    return false;
  const expectedTurns = Number(job.metadata.extraTurns || 0);
  return Number(chat.value.extra_turns || 0) >= expectedTurns;
}
async function requestPaidAction(action: PendingAction) {
  if (!canContinue.value || !chatId.value) return;
  error.value = "";
  if (!(await auth.verifyOnlineAccess())) return;
  pendingAction.value = action;
  if (!(await auth.loadBilling({ fallbackToCache: false }))) {
    error.value = "無法確認會員身分，請稍後再試。";
    return;
  }
  if (!auth.premium) {
    premiumCheckoutDraft.value = {
      source: "consult",
      chatId: chatId.value,
      action:
        action.type === "follow_up"
          ? { type: "follow_up", question: action.question }
          : {
              type: "extra_draw",
              prompt: {
                id: action.prompt.id,
                text: action.prompt.text,
                drawGroup: action.prompt.drawGroup || "",
                promptId: action.prompt.promptId || "",
              },
            },
    };
    showPremiumCheckout.value = true;
    return;
  }
  if (nextAdditionalTurnIsFree.value) return launchAction(false);
  if (auth.membershipQuotaRemaining > 0) {
    showQuotaConfirm.value = true;
    return;
  }
  showPointsConfirm.value = true;
}
function requestFollowup() {
  const question = input.value.trim();
  if (question) void requestPaidAction({ type: "follow_up", question });
}
function chooseFollowupQuestion(prompt: ConsultFollowupQuestion) {
  if (!prompt.text.trim()) return;
  if (!prompt.drawGroup || !prompt.promptId) {
    error.value = "延伸追問題目缺少抽卡資訊，請重新讀取結果。";
    return;
  }
  void requestPaidAction({
    type: "extra_draw",
    prompt,
  });
}
function restoreConsultCheckout() {
  const intent = readPremiumCheckoutIntent({
    userUuid: String(auth.profile?.uuid || ""),
    source: "consult",
  });
  if (!intent || intent.source !== "consult" || !auth.premium) return;
  clearPremiumCheckoutIntent();
  if (!canContinue.value || intent.chatId !== chatId.value) return;
  const action = intent.action;
  if (action.type === "extra_draw") {
    if (
      extraTurns.value !== 0 ||
      !followupQuestions.value.some(
        (prompt) =>
          prompt.id === action.prompt.id &&
          prompt.text === action.prompt.text &&
          prompt.drawGroup === action.prompt.drawGroup &&
          prompt.promptId === action.prompt.promptId,
      )
    )
      return;
    pendingAction.value = { type: "extra_draw", prompt: action.prompt };
  } else {
    pendingAction.value = action;
    input.value = action.question;
  }
  showResumeConfirm.value = true;
}
function confirmResumedAction() {
  const action = pendingAction.value;
  showResumeConfirm.value = false;
  if (action) void requestPaidAction(action);
}
function confirmQuotaAction() {
  showQuotaConfirm.value = false;
  void launchAction(false);
}
async function launchAction(usePointsFallback: boolean) {
  const action = pendingAction.value;
  if (!action || sending.value) return;
  const completedExtraTurns = extraTurns.value;
  if (usePointsFallback && auth.points < 100) return navigateTo("/store");
  let drawnCard: ConsultCard | undefined;
  if (action.type === "extra_draw") {
    try {
      drawnCard = drawConsultExtraCard(action.prompt.drawGroup || "");
    } catch (reason) {
      error.value = consultErrorText(reason);
      return;
    }
  }
  showQuotaConfirm.value = false;
  showPointsConfirm.value = false;
  localActionInFlight.value = true;
  sending.value = true;
  hasUsedFollowup.value = true;
  error.value = "";
  const optimistic: ConsultMessage =
    action.type === "follow_up"
      ? { role: "user", type: "text", content: action.question }
      : {
          role: "user",
          type: "card_draw",
          content: action.prompt.text,
          card: drawnCard,
          draw_group: action.prompt.drawGroup,
          prompt_id: action.prompt.promptId,
        };
  messages.value.push(optimistic, {
    role: "assistant",
    type: "text",
    content: "",
  });
  input.value = "";
  scrollBottom();
  try {
    const started = await activeAnalysis.begin(
      "consult",
      `consult:${chatId.value}:${Date.now()}`,
      {
        chatId: chatId.value,
        action: action.type,
        extraTurns: completedExtraTurns + 1,
        pendingMessage: optimistic,
        navigationLocked: true,
      },
    );
    if (!started) return;
    optimistic.client_job_id = activeConsult.value?.jobId;
    activeAnalysis.updateMetadata({ pendingMessage: optimistic });
    const payload: Record<string, unknown> = {
      analysis_type: "consult",
      analysisType: "consult",
      consult_action: action.type,
      chat_id: chatId.value,
      use_points_fallback: usePointsFallback,
      language: "zh-Hant",
    };
    if (action.type === "follow_up") payload.question = action.question;
    else {
      payload.consult_draw_group = action.prompt.drawGroup;
      payload.consult_prompt_id = action.prompt.promptId;
      payload.consult_drawn_card = drawnCard;
    }
    await activeAnalysis.runStep(payload);
  } catch (reason) {
    if (isConsultRetryUnavailable(reason)) {
      // The consult record is authoritative. A stale failed analysis job must
      // not keep reopening a recovery sheet for a completed/non-retryable chat.
      activeAnalysis.dismiss("consult");
      error.value = "";
      await loadChat();
    } else {
      error.value = consultErrorText(reason);
    }
  } finally {
    sending.value = false;
    pendingAction.value = null;
    try {
      await Promise.all([loadChat(), auth.loadBilling()]);
      if (chat.value?.status === "completed" && extraTurns.value === 0)
        hasUsedFollowup.value = false;
    } finally {
      localActionInFlight.value = false;
    }
  }
}
async function retryConsult() {
  if (!failedConsult.value || !chatId.value || retrying.value) return;
  retrying.value = true;
  localActionInFlight.value = true;
  sending.value = true;
  error.value = "";
  try {
    if (!(await auth.verifyOnlineAccess())) return;
    await loadChat();
    restoreConsultCheckout();
    if (!failedConsult.value) return;
    const retryInitial = initialRetryAvailable.value;
    const retryUsesPoints = Boolean(
      activeConsult.value?.metadata.usePointsFallback,
    );
    const started = await activeAnalysis.begin(
      "consult",
      `consult:${chatId.value}:retry:${Date.now()}`,
      {
        chatId: chatId.value,
        action: retryInitial ? "initial" : "retry",
        extraTurns: extraTurns.value,
        navigationLocked: true,
        ...(retryInitial ? { consult: initialInfo.value } : {}),
        ...(retryInitial ? { usePointsFallback: retryUsesPoints } : {}),
      },
    );
    if (!started) return;
    await activeAnalysis.runStep({
      analysis_type: "consult",
      analysisType: "consult",
      consult_action: retryInitial ? "initial" : "retry",
      chat_id: chatId.value,
      ...(retryInitial ? { consult: initialInfo.value } : {}),
      ...(retryInitial ? { use_points_fallback: retryUsesPoints } : {}),
      language: "zh-Hant",
    });
  } catch (reason) {
    if (isConsultRetryUnavailable(reason)) {
      // The server record may have completed between opening the recovery
      // sheet and confirming the retry. Discard the stale failed job so the
      // sheet cannot immediately open again.
      activeAnalysis.dismiss("consult");
      error.value = "";
      await loadChat();
    } else {
      error.value = consultErrorText(reason);
    }
  } finally {
    retrying.value = false;
    sending.value = false;
    try {
      await Promise.all([loadChat(), auth.loadBilling()]);
    } finally {
      localActionInFlight.value = false;
    }
  }
}
async function abandonFailedConsult() {
  await resetConsult();
}
function handleConsultEvent(event: Event) {
  const detail = (event as CustomEvent).detail as {
    type?: string;
    card?: ConsultCard;
  };
  if (detail?.type !== "consult_card" || !detail.card) return;
  for (let index = messages.value.length - 1; index >= 0; index--) {
    const message = messages.value[index];
    if (message?.type === "card_draw" && !message.card) {
      message.card = detail.card;
      break;
    }
  }
  scrollBottom();
}
async function refreshResult(silent = false) {
  if (refreshingResult.value) return;
  refreshingResult.value = true;
  try {
    await activeAnalysis.reconcileActive();
    await activeAnalysis.refreshStatus();
    await loadChat();
    syncActiveStream();
    const job = activeConsult.value;
    if (job?.status === "completed") {
      // Job completion and consult-record visibility may be separated by a
      // short transaction/cache delay. Give the record two bounded retries.
      for (const delay of [400, 800]) {
        if (activeConsultRecordIsCurrent()) break;
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        await loadChat();
      }
      if (!silent && activeConsultRecordIsCurrent())
        showAppSuccess("解析結果已更新");
    } else if (!silent && job?.status === "running") {
      showAppInfo(
        job.contents.main?.trim()
          ? "已保留目前內容，系統仍在背景完成解析。"
          : "系統仍在背景處理，完成後會自動更新。",
      );
    } else if (
      !silent &&
      (job?.status === "failed" || job?.status === "timed_out")
    ) {
      showAppWarning("本次回覆未完成，可使用免費重新計算。");
    }
  } catch (reason) {
    if (!silent) showAppError(consultErrorText(reason));
  } finally {
    refreshingResult.value = false;
  }
}
async function resetConsult() {
  if (sending.value || resetting.value) return;
  resetting.value = true;
  error.value = "";
  try {
    await ziweiApi.deleteConsultRecord({ notifyError: false });
    if (activeAnalysis.active?.kind === "consult") activeAnalysis.reset();
    showResetConfirm.value = false;
    await navigateTo("/consult");
  } catch (reason) {
    error.value =
      reason instanceof Error
        ? reason.message
        : "無法刪除問事紀錄，請稍後再試。";
  } finally {
    resetting.value = false;
  }
}
onMounted(async () => {
  window.addEventListener("consult-analysis-event", handleConsultEvent);
  window.addEventListener("beforeunload", handleConsultBeforeUnload);
  try {
    await activeAnalysis.hydrate();
    if (initialInfo.value && !messages.value.length)
      messages.value = [
        {
          role: "user",
          type: "text",
          content: initialInfo.value.question || "",
        },
      ];
    // Show the active job immediately while the server-side record loads.
    syncActiveStream();
    if (chatId.value || initialInfo.value) loading.value = false;
    await loadChat();
    if (recordLoaded.value && !chatId.value && !initialInfo.value) {
      await navigateTo("/consult", { replace: true });
      return;
    }
    loading.value = false;
    pdfPremiumGate.restoreFeature(["consult_pdf"]);
    disconnectedRefreshTimer = window.setInterval(() => {
      if (
        (activeConsult.value?.status === "running" &&
          !activeConsult.value.connected) ||
        (activeConsult.value?.status === "completed" &&
          !activeConsultRecordIsCurrent())
      )
        void refreshResult(true);
    }, 5000);
  } finally {
    initializingRecord.value = false;
  }
});
onBeforeUnmount(() => {
  window.removeEventListener("consult-analysis-event", handleConsultEvent);
  window.removeEventListener("beforeunload", handleConsultBeforeUnload);
  if (disconnectedRefreshTimer) window.clearInterval(disconnectedRefreshTimer);
});
watch(
  [
    () => activeAnalysis.active?.contents.main,
    () => activeAnalysis.active?.status,
  ],
  async ([, status], [, previousStatus]) => {
    syncActiveStream();
    if (
      !initializingRecord.value &&
      !localActionInFlight.value &&
      status !== previousStatus &&
      (status === "completed" || status === "failed" || status === "timed_out")
    )
      await Promise.all([loadChat(), auth.loadBilling()]);
  },
);
</script>

<template>
  <AppPageLayout
    title="占卜問事"
    content-mode="flush"
    screen-class="consult-chat-page"
  >
    <template #leading>
      <button
        class="icon-button"
        type="button"
        aria-label="重新提問"
        :disabled="resetting"
        @click="requestResetConsult"
      >
        <ChevronLeft :size="23" />
      </button>
    </template>
    <template #actions>
      <AppActionMenu
        v-if="canDownloadConsultPdf"
        label="占卜問事操作"
        :items="consultActionItems"
        @select="handleConsultAction"
      />
      <span v-else />
    </template>

    <Teleport to="body">
      <template v-if="downloadingConsultPdf">
        <div
          v-if="consultPdfSnapshot"
          ref="consultPdfSource"
          class="analysis-pdf-source consult-pdf-source"
          aria-hidden="true"
        >
          <main data-pdf-page>
            <header
              class="analysis-pdf-heading analysis-pdf-cover glass"
              data-pdf-block
            >
              <img src="/remove-background-logo.png" alt="" />
              <p>江映澄紫微</p>
              <h1>占卜問事紀錄</h1>
              <span>下載日期：{{ consultPdfSnapshot.generatedAt }}</span>
              <p class="analysis-pdf-disclaimer">
                本內容供自我探索與參考，不應取代醫療、法律或財務專業意見。
              </p>
            </header>
          </main>
          <main data-pdf-page>
            <article class="consult-pdf-overview" data-pdf-block>
              <h2>原始提問</h2>
              <p>{{ consultPdfSnapshot.initialQuestion }}</p>
              <h2>本次抽取星曜</h2>
              <div class="consult-pdf-cards">
                <div
                  v-for="(card, index) in consultPdfSnapshot.cards"
                  :key="`${card.name}-${index}`"
                >
                  <small>{{ card.group }}</small>
                  <strong>{{ card.name }}</strong>
                  <span v-if="card.polarity || card.transformation">
                    {{
                      [card.polarity, card.transformation]
                        .filter(Boolean)
                        .join("・")
                    }}
                  </span>
                </div>
              </div>
            </article>
          </main>
          <main
            v-for="(turn, turnIndex) in consultPdfSnapshot.turns"
            :key="turnIndex"
            data-pdf-page
          >
            <article class="consult-pdf-question" data-pdf-block>
              <small>{{
                turnIndex === 0 ? "原始提問" : `第 ${turnIndex} 次追加`
              }}</small>
              <p>{{ turn.question }}</p>
              <span v-if="turn.card">補抽星曜：{{ turn.card.name }}</span>
            </article>
            <article
              v-for="section in turn.sections"
              :key="section.title"
              class="consult-pdf-section"
              data-pdf-block
            >
              <h2>{{ section.title }}</h2>
              <MarkdownContent :source="section.content" insight-cards />
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
            message="正在整理占卜問事 PDF，請稍候…"
          />
        </div>
      </template>
    </Teleport>
    <main class="consult-chat">
      <section ref="chatArea" class="chat-history">
        <div v-if="loading" class="empty-state">
          <span class="loading-ring" />正在讀取問事紀錄…
        </div>
        <template v-else-if="chatId || initialInfo"
          ><div class="initial-cards">
            <article
              v-for="(card, index) in orderedCards"
              :key="`${card.name}-${index}`"
            >
              <small>{{ card.group }}</small
              ><strong>{{ card.name }}</strong>
              <div>
                <span v-if="card.polarity">{{ card.polarity }}</span
                ><span v-if="card.transformation">{{
                  card.transformation
                }}</span>
              </div>
            </article>
          </div>
          <template v-for="(message, index) in messages" :key="index"
            ><div v-if="message.role === 'user'" class="message-row user">
              <div class="user-bubble">
                <small v-if="message.type === 'card_draw'">補抽一張</small>
                <p>{{ message.content }}</p>
                <article
                  v-if="message.type === 'card_draw'"
                  class="drawn-card"
                  :class="{ pending: !message.card }"
                >
                  <template v-if="message.card"
                    ><strong>{{ message.card.name }}</strong></template
                  ><span v-else>正在抽取星曜…</span>
                </article>
              </div>
            </div>
            <div v-else class="assistant-message">
              <template
                v-if="assistantSegments(message.content || '', index).length"
                ><div
                  v-for="segment in assistantSegments(
                    message.content || '',
                    index,
                  )"
                  :key="segment.key"
                  class="message-row assistant"
                >
                  <div class="assistant-bubble">
                    <strong
                      v-if="assistantTitle(index, segment.key)"
                      class="assistant-dialog-title"
                    >
                      {{ assistantTitle(index, segment.key) }}
                    </strong>
                    <MarkdownContent
                      v-if="
                        assistantSegmentSource(
                          segment.content,
                          index,
                          segment.key,
                        )
                      "
                      heading-class="assistant-dialog-title"
                      insight-cards
                      :source="
                        assistantSegmentSource(
                          segment.content,
                          index,
                          segment.key,
                        )
                      "
                    />
                    <div
                      v-else-if="sending && index === messages.length - 1"
                      class="typing"
                      aria-label="正在產生回答"
                    >
                      <i /><i /><i />
                    </div>
                  </div></div
              ></template>
              <div
                v-else-if="sending && index === messages.length - 1"
                class="message-row assistant"
              >
                <div class="assistant-bubble">
                  <strong
                    v-if="isInitialAssistant(index)"
                    class="assistant-dialog-title"
                  >
                    {{ initialConsultTitle }}
                  </strong>
                  <div class="typing" aria-label="正在產生回答">
                    <i /><i /><i />
                  </div>
                </div>
              </div></div
          ></template>
          <div
            v-if="
              canContinue &&
              !hasUsedFollowup &&
              extraTurns === 0 &&
              followupQuestions.length
            "
            class="message-row assistant followup-row"
          >
            <div class="followup-bubble">
              <strong>延伸追問</strong>
              <div class="question-options">
                <button
                  v-for="prompt in followupQuestions"
                  :key="prompt.id"
                  type="button"
                  @click="chooseFollowupQuestion(prompt)"
                >
                  <span>{{ prompt.text }}</span>
                </button>
              </div>
            </div>
          </div>
          <AppButton
            v-if="
              activeConsult?.status === 'running' && !activeConsult.connected
            "
            class="reload"
            variant="secondary"
            size="small"
            :loading="refreshingResult"
            @click="refreshResult()"
          >
            <template #leading><RefreshCw :size="16" /></template>
            重新讀取結果
          </AppButton></template
        >
        <div v-else class="empty-state">
          <span class="loading-ring" />
        </div>
      </section>
      <footer v-if="chatId" class="consult-composer">
        <div class="composer-meta">
          <div>
            <span>可追加 {{ Math.max(0, 10 - extraTurns) }} 次</span>
            <p class="additional-cost-copy">
              {{ additionalCostText }}
            </p>
          </div>
          <button
            type="button"
            :disabled="sending || resetting"
            @click="requestResetConsult"
          >
            <RefreshCw :size="16" />重新提問
          </button>
        </div>
        <AppQuestionComposer
          v-model="input"
          :disabled="!canContinue"
          :submit-disabled="!input.trim() || !canContinue"
          :placeholder="composerPlaceholder"
          aria-label="輸入問事追問"
          @submit="requestFollowup"
        />
        <p v-if="error" class="chat-error">{{ error }}</p>
      </footer>
    </main>
    <PremiumCheckoutSheet
      :open="showPremiumCheckout"
      :draft="premiumCheckoutDraft"
      @close="showPremiumCheckout = false"
    />
    <AppBottomSheet
      :open="showResumeConfirm"
      labelledby="consult-resume-title"
      @close="showResumeConfirm = false"
    >
      <template #header
        ><h2 id="consult-resume-title">確認剛才的追問</h2></template
      >
      <p>
        {{
          pendingAction?.type === "follow_up"
            ? pendingAction.question
            : pendingAction?.prompt.text
        }}
      </p>
      <p>
        會員已開通，確認後才會送出追問。第一次追加免費，之後每次依會員額度計費。
      </p>
      <div class="sheet-actions">
        <button
          class="app-button outline"
          type="button"
          @click="showResumeConfirm = false"
        >
          稍後再問
        </button>
        <button class="app-button" type="button" @click="confirmResumedAction">
          確認追問
        </button>
      </div>
    </AppBottomSheet>
    <AppBottomSheet
      :open="showQuotaConfirm"
      labelledby="consult-quota-title"
      :locked="sending"
      @close="showQuotaConfirm = false"
    >
      <template #header
        ><h2 id="consult-quota-title">確認使用會員額度</h2></template
      >
      <p>
        本次追問將消耗 1 次會員額度，送出後剩餘
        {{ Math.max(0, auth.membershipQuotaRemaining - 1) }} 次。
      </p>
      <div class="charge-row"><span>本次操作</span><b>1 次會員額度</b></div>
      <div class="sheet-actions">
        <AppButton variant="secondary" block @click="showQuotaConfirm = false">
          取消
        </AppButton>
        <AppButton block :loading="sending" @click="confirmQuotaAction">
          確認追問
        </AppButton>
      </div>
    </AppBottomSheet>
    <AppBottomSheet
      :open="showPointsConfirm"
      :locked="sending"
      @close="showPointsConfirm = false"
      ><template #header><h2>確認繼續問事</h2></template>
      <p>
        第一次追加免費；之後每次消耗 1 次會員額度。你目前沒有可用額度， 是否改扣
        100 點繼續追問？目前點數：{{ auth.points }}
      </p>
      <div class="charge-row">
        <Coins :size="18" /><span>本次操作</span><b>100 點</b>
      </div>
      <div class="sheet-actions">
        <button
          class="app-button outline"
          type="button"
          @click="showPointsConfirm = false"
        >
          取消</button
        ><button
          v-if="auth.points >= 100"
          class="app-button"
          type="button"
          @click="launchAction(true)"
        >
          確認使用</button
        ><NuxtLink v-else class="app-button" to="/store">購買點數</NuxtLink>
      </div></AppBottomSheet
    >
    <IncompleteAnalysisRecoverySheet
      :open="failedConsult"
      title="這次問事回覆未完成"
      :summary="chat?.initial_question || '原問題與抽牌內容已保留'"
      :details="recoveryDetails"
      :loading="retrying || resetting"
      @retry="retryConsult"
      @abandon="abandonFailedConsult"
    />
    <AppBottomSheet
      :open="showResetConfirm"
      role="alertdialog"
      labelledby="consult-reset-title"
      :locked="resetting"
      @close="showResetConfirm = false"
      ><template #header
        ><h2 id="consult-reset-title">確定要重新提問？</h2></template
      >
      <p>目前問事的抽牌與所有對話紀錄將永久刪除。</p>
      <div class="sheet-actions">
        <button
          class="app-button outline"
          type="button"
          :disabled="resetting"
          @click="showResetConfirm = false"
        >
          取消</button
        ><button
          class="app-button"
          type="button"
          :disabled="sending || resetting"
          @click="resetConsult"
        >
          {{
            sending ? "回覆產生中…" : resetting ? "正在清除…" : "清除並重新提問"
          }}
        </button>
      </div></AppBottomSheet
    >
    <PremiumCheckoutSheet
      :open="showPdfPremiumCheckout"
      :draft="pdfPremiumCheckoutDraft"
      @close="pdfPremiumGate.closeCheckout"
    />
    <PremiumFeatureResumeSheet
      :feature="pdfResumeFeature"
      :loading="downloadingConsultPdf"
      @close="pdfPremiumGate.closeResume"
      @confirm="resumeConsultPdf"
    />
  </AppPageLayout>
</template>

<style scoped>
.consult-pdf-overview,
.consult-pdf-question,
.consult-pdf-section {
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-strong);
  overflow-wrap: anywhere;
}
.consult-pdf-overview h2,
.consult-pdf-section h2 {
  margin: 0 0 var(--space-3);
  color: var(--color-brand-primary);
  font-size: var(--font-size-heading);
}
.consult-pdf-overview > p {
  margin: 0 0 var(--space-6);
  color: var(--color-text-primary);
  font-size: var(--font-size-body);
  line-height: 1.8;
}
.consult-pdf-cards {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-2);
}
.consult-pdf-cards > div {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-canvas);
  text-align: center;
}
.consult-pdf-cards small,
.consult-pdf-cards span,
.consult-pdf-question small,
.consult-pdf-question span {
  color: var(--color-text-secondary);
  font-size: var(--font-size-caption);
}
.consult-pdf-cards strong {
  color: var(--color-danger);
  font-size: var(--font-size-body);
}
.consult-pdf-question {
  margin-bottom: var(--space-4);
  background: var(--color-brand-primary);
  color: var(--white);
}
.consult-pdf-question small,
.consult-pdf-question span {
  color: var(--white);
}
.consult-pdf-question p {
  margin: var(--space-2) 0;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-bold);
  line-height: 1.7;
  white-space: pre-wrap;
}
.consult-pdf-section {
  margin-bottom: var(--space-4);
}
.consult-pdf-section :deep(.markdown-content) {
  font-size: var(--font-size-body-sm);
  line-height: 1.7;
}
.consult-chat-page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
}
.consult-chat {
  display: grid;
  flex: 1;
  grid-template-rows: minmax(0, 1fr) auto;
  width: 100%;
  min-height: 0;
  margin: 0;
  overflow: hidden;
}
.chat-history {
  min-height: 0;
  padding: 18px 20px 30px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.initial-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 7px;
  margin-bottom: 26px;
}
.initial-cards article {
  min-width: 0;
  padding: 11px 9px;
  border: 1px solid rgba(107, 166, 160, 0.2);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.68);
}
.initial-cards small {
  display: block;
  overflow: hidden;
  color: var(--text-soft);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.initial-cards strong {
  display: block;
  margin-top: 4px;
  color: var(--mountain);
}
.initial-cards span {
  display: inline-block;
  margin: 7px 3px 0 0;
  padding: 2px 5px;
  border-radius: 9px;
  background: rgba(107, 166, 160, 0.13);
  font-size: 9px;
}
.message-row {
  display: flex;
  margin: 14px 0;
}
.message-row.user {
  justify-content: flex-end;
}
.user-bubble {
  max-width: 84%;
  padding: 13px 16px;
  border-radius: 19px 19px 5px;
  background: var(--mountain);
  color: white;
}
.user-bubble > small {
  opacity: 0.65;
  font-size: 9px;
}
.user-bubble p {
  margin: 3px 0;
  line-height: 1.65;
  white-space: pre-wrap;
}
.message-row.assistant {
  align-items: flex-start;
}
.assistant-message .message-row {
  margin: 9px 0;
}
.assistant-bubble {
  width: calc(100% - 12px);
  padding: 15px 18px;
  border: 1px solid rgba(36, 87, 90, 0.08);
  border-radius: 5px 20px 20px;
  background: rgba(255, 255, 255, 0.75);
  line-height: 1.8;
}
.assistant-bubble :deep(:first-child) {
  margin-top: 0;
}
.assistant-bubble :deep(:last-child) {
  margin-bottom: 0;
}
.assistant-dialog-title,
.assistant-bubble :deep(.assistant-dialog-title),
.followup-bubble > strong {
  color: var(--mountain);
  font-family: var(--font-family-base);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.45;
}
.assistant-dialog-title {
  display: block;
  margin: 0 0 14px;
}
.assistant-bubble :deep(.assistant-dialog-title) {
  display: block;
  margin: 0 0 14px;
}
.followup-row {
  margin-top: 22px;
}
.followup-bubble {
  width: calc(100% - 12px);
  padding: 17px;
  border: 1px solid rgba(107, 166, 160, 0.22);
  border-radius: 5px 20px 20px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 28px rgba(36, 87, 90, 0.07);
}
.followup-bubble > strong {
  display: block;
}
.followup-bubble > small {
  display: block;
  margin-top: 11px;
  color: var(--text-soft);
  font-size: 10px;
}
.drawn-card {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 11px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.12);
}
.drawn-card strong {
  font-family: var(--font-family-base);
  font-size: 18px;
}
.drawn-card.pending {
  font-size: 12px;
  opacity: 0.7;
}
.typing {
  display: flex;
  width: auto;
  gap: 5px;
}
.typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--jade);
  animation: pulse 1s infinite;
}
.typing i:nth-child(2) {
  animation-delay: 0.15s;
}
.typing i:nth-child(3) {
  animation-delay: 0.3s;
}
.consult-composer {
  position: relative;
  z-index: 2;
  flex: none;
  min-width: 0;
  padding: 4px 16px calc(14px + env(safe-area-inset-bottom));
}
.composer-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
  color: var(--text-soft);
  font-size: 10px;
}
.composer-meta > div {
  display: grid;
  gap: var(--space-1);
}
.additional-cost-copy {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-body-sm);
  font-weight: var(--font-weight-medium);
  line-height: 1.45;
}
.composer-meta button {
  display: flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: var(--jade);
  font-size: 12px;
  font-weight: 800;
}
.composer-meta button:disabled {
  opacity: 0.35;
}
.chat-error {
  margin: 6px 4px 0;
  color: #a44;
  font-size: 11px;
}
.empty-state {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 55dvh;
  color: var(--text-soft);
  text-align: center;
}
.reload {
  margin: 18px auto;
}
.question-options {
  display: grid;
  gap: 9px;
  margin-top: 8px;
}
.question-options {
  max-height: 55dvh;
  overflow-y: auto;
}
.question-options button {
  display: grid;
  gap: 4px;
  padding: 13px 14px;
  border: 1px solid rgba(36, 87, 90, 0.12);
  border-radius: 14px;
  background: white;
  color: var(--mountain);
  text-align: left;
  transition: border-color 0.2s ease;
}
.question-options button:hover {
  border-color: var(--mountain);
  background: rgba(107, 166, 160, 0.14);
}
.question-options span {
  display: block;
}
.question-options small {
  color: var(--text-soft);
  font-size: 10px;
  line-height: 1.5;
}
.charge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 15px;
  padding: 12px;
  border-radius: 13px;
  background: rgba(107, 166, 160, 0.1);
}
.charge-row b {
  margin-left: auto;
}
.sheet-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  margin-top: 18px;
}
.sheet-actions .app-button {
  text-align: center;
  text-decoration: none;
}
@keyframes pulse {
  50% {
    opacity: 0.25;
    transform: translateY(-2px);
  }
}
@media (max-width: 759px) {
  .chat-history {
    padding: 12px 13px 24px;
  }
  .initial-cards {
    grid-template-columns: repeat(5, 108px);
    margin-inline: -13px;
    padding-inline: 13px;
    overflow-x: auto;
  }
  .consult-composer {
    padding-inline: 13px;
  }
  .assistant-bubble {
    padding: 13px 15px;
  }
  .user-bubble {
    max-width: 90%;
  }
}
</style>
