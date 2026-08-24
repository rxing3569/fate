<script setup lang="ts">
import { ChevronLeft, Coins } from "@lucide/vue";
import { signupRewardPoints } from "~/utils/signup-reward";
const auth = useAuthStore();
const chartStore = useChartStore();
const route = useRoute();
usePageSeo({
  title: "免費紫微斗數排盤｜AI命盤解析、流年時運、感情合盤與線上解盤",
  description:
    "江映澄紫微的 AI紫微、紫微教學平台，輸入出生日期、時間與城市即可免費算命、免費排盤，查看命宮、身宮、十二宮與星曜配置；再透過線上解盤理解先天命格、流年時運，以及雙人感情與事業合盤，從性格、關係到工作方向獲得具體參考，讓複雜的紫微命盤變得清楚、容易運用。",
  keywords: ["免費算命", "免費紫微", "紫微排盤", "免費排盤", "AI排盤"],
  canonicalPath: "/ai-analysis/",
});
const featureModes = new Set(["chart", "report", "flow_today", "flow_month", "annual_flow", "match", "qa"]);
const routeMode = computed(() => {
  const value = Array.isArray(route.query.mode)
    ? route.query.mode[0]
    : route.query.mode;
  return typeof value === "string" && featureModes.has(value) ? value : null;
});
const active = ref<string | null>(routeMode.value);
const savingBirth = ref(false);
const birthError = ref("");
const checkingTodayFlow = ref(false);
const showTodayFlowConfirm = ref(false);
const flowLaunchIntentKey = "ziwei:flow-launch-intent";
const pendingBirthInfo = ref<
  Parameters<typeof chartStore.saveBirthInfo>[0] | null
>(null);
const allowedBirthRedirects = new Set(["/chart", "/report"]);
const redirectAfterBirth = computed(() => {
  const value = Array.isArray(route.query.redirect)
    ? route.query.redirect[0]
    : route.query.redirect;
  return typeof value === "string" && allowedBirthRedirects.has(value)
    ? value
    : "";
});

onMounted(() => {
  chartStore.hydrate(auth.profile);
});
watch(routeMode, (value) => {
  active.value = value;
});

async function enterMode(mode: string) {
  active.value = mode;
  await navigateTo({
    path: "/ai-analysis",
    query: { ...route.query, mode },
  });
}

async function leaveMode() {
  active.value = null;
  await navigateTo("/ai-analysis", { replace: true });
}

const birthDate = computed(() => {
  const info = chartStore.birthInfo;
  if (!info) return "--";
  return `${info.year}/${String(info.month).padStart(2, "0")}/${String(info.day).padStart(2, "0")}`;
});

const birthGender = computed(() => chartStore.birthInfo?.gender || "--");
const pointsLabel = computed(() => {
  if (!auth.sessionReady) return "- P";
  return auth.isAuthenticated
    ? `${auth.points} P`
    : `初次註冊領取 ${signupRewardPoints()}P`;
});

const features = [
  {
    id: "flow_today",
    title: "今日運勢",
    icon: "insights_rounded" as const,
    to: "/flow?period=today",
    primary: true,
  },
  {
    id: "flow_month",
    title: "本月運勢",
    icon: "calendar_month" as const,
    to: "/flow?period=month",
    primary: true,
  },
  {
    id: "report",
    title: "命盤解析",
    subtitle: "深入瞭解「先天命格」、「宮位詳解」、「十年大運」",
    icon: "auto_stories_rounded" as const,
    to: "/report",
  },
  {
    id: "annual_flow",
    title: "流年運勢",
    subtitle: "會員專屬年度解析，掌握四季節奏與方向。",
    icon: "auto_awesome_rounded" as const,
    to: "/annual-flow",
    primary: true,
    badge: "NEW",
  },
  {
    id: "match",
    title: "合盤解析",
    subtitle: "深度分析兩人關係互動。",
    icon: "diversity_1_rounded" as const,
    to: "/match",
    primary: true,
  },
  {
    id: "qa",
    title: "線上問答",
    subtitle: "AI 命理師來解惑所有問題。",
    icon: "chat" as const,
    to: "/qa",
  },
];

function normalizeFlowRecord(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const wrapped = value as {
    data?: { content?: string; is_complete?: boolean };
  };
  return wrapped.data || (value as { content?: string; is_complete?: boolean });
}

async function launchTodayFlow(intent: "load" | "start") {
  showTodayFlowConfirm.value = false;
  sessionStorage.setItem(flowLaunchIntentKey, intent);
  await navigateTo("/flow?period=today");
}

async function checkTodayFlow() {
  if (checkingTodayFlow.value) return;
  if (!(await auth.verifyOnlineAccess())) return;
  checkingTodayFlow.value = true;
  try {
    const current = taipeiToday();
    const dateKey = current.year * 10000 + current.month * 100 + current.day;
    const record = normalizeFlowRecord(
      await ziweiApi
        .getFlowRecord(dateKey, { notifyError: false })
        .catch(() => null),
    );
    if (record?.is_complete && record.content?.trim()) {
      await launchTodayFlow("load");
      return;
    }
    showTodayFlowConfirm.value = true;
  } finally {
    checkingTodayFlow.value = false;
  }
}

async function openFeature(feature: (typeof features)[number]) {
  if (!auth.isAuthenticated) {
    window.dispatchEvent(new CustomEvent("auth-login-required"));
    return;
  }
  if (!chartStore.chart) {
    enterMode(feature.id);
    return;
  }
  if (feature.id === "flow_today") {
    await checkTodayFlow();
    return;
  }
  await navigateTo(feature.to);
}

function openChart() {
  if (!chartStore.chart) {
    enterMode("chart");
    return;
  }
  navigateTo("/chart");
}

function isSameBirthInfo(next: Parameters<typeof chartStore.saveBirthInfo>[0]) {
  const current = chartStore.birthInfo;
  if (!current) return false;
  return (
    current.gender === next.gender &&
    current.year === next.year &&
    current.month === next.month &&
    current.day === next.day &&
    current.hour === next.hour &&
    current.minute === next.minute &&
    current.cityId === next.cityId &&
    Number(current.longitude ?? 120).toFixed(2) ===
      Number(next.longitude ?? 120).toFixed(2)
  );
}

function birthDestination() {
  if (redirectAfterBirth.value) return redirectAfterBirth.value;
  if (active.value === "chart") return "/chart";
  return features.find((item) => item.id === active.value)?.to || "";
}

async function finishBirthFlow() {
  const completedMode = active.value;
  const destination = birthDestination();
  active.value = null;
  if (!destination) return;
  await navigateTo("/ai-analysis", { replace: true });
  if (completedMode === "flow_today") {
    await checkTodayFlow();
    return;
  }
  await navigateTo(destination);
}

async function persistBirth(
  info: Parameters<typeof chartStore.saveBirthInfo>[0],
  isModification = false,
) {
  savingBirth.value = true;
  birthError.value = "";
  try {
    await chartStore.saveBirthInfoAndSync(info, isModification);
    await finishBirthFlow();
  } catch (error) {
    birthError.value =
      error instanceof Error ? error.message : "出生資料儲存失敗，請稍後再試";
  } finally {
    savingBirth.value = false;
  }
}

async function saveBirth(info: Parameters<typeof chartStore.saveBirthInfo>[0]) {
  if (readNextStepIntent("chart")) trackNextStepSubmitted("chart");
  if (auth.isAuthenticated && chartStore.birthInfo && !isSameBirthInfo(info)) {
    pendingBirthInfo.value = info;
    return;
  }
  if (isSameBirthInfo(info)) {
    await finishBirthFlow();
    return;
  }
  await persistBirth(info);
}

async function confirmBirthChange() {
  if (!pendingBirthInfo.value) return;
  const info = pendingBirthInfo.value;
  await persistBirth(info, true);
  if (!birthError.value) pendingBirthInfo.value = null;
}
</script>

<template>
  <AppPageLayout
    :title="active ? '命盤排盤' : '排盤解盤'"
    screen-class="ai-screen"
    header-layout="wide"
    content-mode="flush"
  >
    <template #leading>
      <button
        v-if="active"
        class="icon-button"
        type="button"
        aria-label="返回"
        @click="leaveMode"
      >
        <ChevronLeft :size="23" /></button
      ><span v-else />
    </template>
    <template #actions>
      <button
        v-if="!active"
        class="edit-chart"
        type="button"
        @click="enterMode('chart')"
      >
        修改命盤 <AppMaterialIcon name="edit_rounded" :size="16" /></button
      ><span v-else />
    </template>

    <div
      v-if="(active && !chartStore.chart) || active === 'chart'"
      class="screen-content birth-required"
    >
      <BirthInfoForm
        :initial="chartStore.birthInfo"
        :disabled="savingBirth"
        :submit-label="savingBirth ? '儲存中…' : '開始排盤'"
        @submit="saveBirth"
      />
      <p v-if="birthError" class="form-error" role="alert">{{ birthError }}</p>
    </div>

    <div v-else class="screen-content hub-content">
      <button
        class="points-card glass"
        type="button"
        @click="navigateTo('/point-history')"
      >
        <Coins :size="22" aria-hidden="true" />
        <strong>{{ pointsLabel }}</strong>
      </button>

      <button class="chart-entry" type="button" @click="openChart">
        <span class="chart-heading">
          <span class="chart-emblem"
            ><AppMaterialIcon name="grid_view_rounded" :size="24"
          /></span>
          <strong>命盤排盤</strong>
        </span>
        <span class="chart-arrow"
          ><AppMaterialIcon name="arrow_outward_rounded" :size="18"
        /></span>
        <span class="birth-strip">
          <span
            ><small>出生</small><b>{{ birthDate }}</b></span
          >
          <span
            ><small>性別</small><b>{{ birthGender }}</b></span
          >
        </span>
      </button>

      <div class="feature-grid">
        <button
          v-for="feature in features"
          :key="feature.id"
          class="feature-card glass"
          :class="{ primary: feature.primary, compact: !feature.subtitle }"
          type="button"
          :disabled="checkingTodayFlow && feature.id === 'flow_today'"
          @click="openFeature(feature)"
        >
          <span class="feature-heading">
            <span class="feature-icon">
              <img
                v-if="feature.icon === 'chat'"
                src="/chat.svg"
                alt=""
                width="20"
                height="20"
              />
              <AppMaterialIcon v-else :name="feature.icon" :size="22" />
            </span>
            <strong>{{ feature.title }}<em v-if="feature.badge" class="feature-badge">{{ feature.badge }}</em></strong>
          </span>
          <span class="feature-arrow"
            ><AppMaterialIcon name="arrow_outward_rounded" :size="14"
          /></span>
          <small v-if="feature.subtitle">{{ feature.subtitle }}</small>
        </button>
      </div>
    </div>
    <BirthInfoChangeConfirm
      :open="Boolean(pendingBirthInfo)"
      :loading="savingBirth"
      @cancel="pendingBirthInfo = null"
      @confirm="confirmBirthChange"
    />
    <AppBottomSheet
      :open="showTodayFlowConfirm"
      @close="showTodayFlowConfirm = false"
    >
      <template #header><h2>確認執行今日運勢</h2></template>
      <p>今天尚無運勢紀錄，是否開始排算？</p>
      <div class="today-flow-cost">
        <Coins :size="18" />
        <span>{{ auth.premium ? "本月會員額度剩餘" : "目前點數" }}</span>
        <b>{{
          auth.premium ? `${auth.membershipQuotaRemaining} 次` : `${auth.points} P`
        }}</b>
      </div>
      <div class="today-flow-actions">
        <button
          class="app-button outline"
          type="button"
          @click="showTodayFlowConfirm = false"
        >
          取消
        </button>
        <button
          class="app-button"
          type="button"
          :disabled="!auth.premium && auth.points < 100"
          @click="launchTodayFlow('start')"
        >
          確認排算
        </button>
      </div>
    </AppBottomSheet>
  </AppPageLayout>
</template>

<style scoped>
.edit-chart {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  align-self: center;
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
  font-weight: 700;
  white-space: nowrap;
}
.ai-screen > .screen-content.hub-content {
  box-sizing: border-box;
  width: 100%;
  margin-inline: auto;
  padding: 6px 20px 20px;
}
.points-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 56px;
  padding: 15px 20px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 24px;
  color: var(--mountain);
  text-align: left;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.78),
    rgba(237, 230, 216, 0.62) 52%,
    rgba(107, 166, 160, 0.24)
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.98),
    0 10px 24px rgba(36, 87, 90, 0.12);
  -webkit-backdrop-filter: blur(22px) saturate(145%);
  backdrop-filter: blur(22px) saturate(145%);
}
.points-card strong {
  font-size: 17px;
  font-weight: 900;
}
.chart-entry {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  margin: 14px 0 18px;
  padding: 18px;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.86);
  border-radius: 28px;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.8),
    rgba(237, 230, 216, 0.62) 46%,
    rgba(107, 166, 160, 0.32)
  );
  box-shadow:
    inset 0 1px 0 #fff,
    inset 0 -1px 0 rgba(36, 87, 90, 0.09),
    0 16px 34px rgba(36, 87, 90, 0.17);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
  backdrop-filter: blur(26px) saturate(150%);
  color: var(--mountain);
  text-align: left;
}
.chart-entry::before,
.points-card::before,
.feature-card::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(
      circle at 13% 4%,
      rgba(255, 255, 255, 0.9),
      transparent 36%
    ),
    linear-gradient(
      115deg,
      transparent 50%,
      rgba(255, 255, 255, 0.28) 66%,
      transparent 82%
    );
  pointer-events: none;
}
.chart-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}
.chart-heading > strong {
  font-size: 21px;
  font-weight: 900;
}
.chart-emblem {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(36, 87, 90, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.68);
  box-shadow:
    inset 0 1px 0 #fff,
    0 6px 14px rgba(36, 87, 90, 0.1);
}
.chart-arrow {
  position: absolute;
  top: 18px;
  right: 18px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(36, 87, 90, 0.14);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: inset 0 1px 0 #fff;
}
.birth-strip {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.birth-strip > span {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  height: 52px;
  padding: 8px 11px;
  border: 1px solid rgba(36, 87, 90, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.95);
}
.birth-strip small,
.birth-strip b {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.birth-strip small {
  color: var(--mountain);
  font-size: 11px;
  font-weight: 800;
  line-height: 14px;
}
.birth-strip b {
  margin-top: 4px;
  color: var(--mountain);
  font-size: 13.5px;
  font-weight: 900;
  line-height: 17px;
}
.feature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.feature-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 116px;
  padding: 13px;
  isolation: isolate;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 24px;
  color: var(--mountain);
  text-align: left;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.76),
    rgba(237, 230, 216, 0.58) 55%,
    rgba(107, 166, 160, 0.2)
  );
  box-shadow:
    inset 0 1px 0 #fff,
    0 12px 27px rgba(36, 87, 90, 0.12);
  -webkit-backdrop-filter: blur(22px) saturate(145%);
  backdrop-filter: blur(22px) saturate(145%);
}
.feature-card.compact {
  min-height: 72px;
  justify-content: center;
  padding-block: 12px;
}
.feature-card.primary {
  border-color: rgba(107, 166, 160, 0.4);
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.8),
    rgba(107, 166, 160, 0.27) 58%,
    rgba(36, 87, 90, 0.13)
  );
  box-shadow:
    inset 0 1px 0 #fff,
    0 14px 30px rgba(36, 87, 90, 0.16);
}
.feature-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding-right: 24px;
}
.feature-icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  margin-bottom: 0;
  border: 1px solid rgba(36, 87, 90, 0.14);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow:
    inset 0 1px 0 #fff,
    0 5px 12px rgba(36, 87, 90, 0.09);
}
.feature-icon img {
  filter: invert(28%) sepia(15%) saturate(1350%) hue-rotate(134deg)
    brightness(91%) contrast(91%);
}
.feature-card strong {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  margin: 0;
  padding: 0;
  font-size: 17px;
  font-weight: 900;
}
.feature-badge {
  padding: 3px 6px;
  border-radius: 999px;
  background: var(--cinnabar);
  color: #fff;
  font-size: 9px;
  font-style: normal;
  font-weight: 900;
  letter-spacing: .08em;
  line-height: 1;
}
.feature-card small {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 10px;
  color: rgba(36, 87, 90, 0.76);
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.32;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.feature-card.primary small {
  color: rgba(36, 87, 90, 0.82);
}
.feature-arrow {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(36, 87, 90, 0.12);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: inset 0 1px 0 #fff;
}
.chart-entry,
.feature-card,
.points-card {
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    filter 0.18s ease;
}
.chart-entry:hover,
.feature-card:hover,
.points-card:hover {
  filter: brightness(1.025);
  box-shadow:
    inset 0 1px 0 #fff,
    0 17px 36px rgba(36, 87, 90, 0.17);
}
.chart-entry:active,
.feature-card:active,
.points-card:active {
  transform: scale(0.985);
}
.ai-screen > .screen-content.birth-required {
  box-sizing: border-box;
  width: 100%;
  margin-inline: auto;
  padding: 8px 24px 120px;
}
.form-error {
  margin: 12px 0 0;
  color: var(--cinnabar);
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
.today-flow-cost {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border-radius: 14px;
  background: rgba(107, 166, 160, 0.12);
}
.today-flow-cost b {
  margin-left: auto;
}
.today-flow-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}
@media (max-width: 759px) {
  .ai-screen {
    min-height: calc(100dvh - 80px - env(safe-area-inset-bottom));
  }
}
</style>
