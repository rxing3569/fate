<script setup lang="ts">
import { ChevronLeft } from "@lucide/vue";
const auth = useAuthStore();
const chartStore = useChartStore();
const route = useRoute();
const active = ref<string | null>(
  route.query.mode === "chart" ? "chart" : null,
);
const savingBirth = ref(false);
const birthError = ref("");
const pendingBirthInfo = ref<
  Parameters<typeof chartStore.saveBirthInfo>[0] | null
>(null);

onMounted(async () => {
  chartStore.hydrate();
  await auth.loadProfile();
});

const birthDate = computed(() => {
  const info = chartStore.birthInfo;
  if (!info) return "--";
  return `${info.year}/${String(info.month).padStart(2, "0")}/${String(info.day).padStart(2, "0")}`;
});

const birthGender = computed(() => chartStore.birthInfo?.gender || "--");
const pointsLabel = computed(() => {
  if (!auth.sessionReady) return "- P";
  return auth.isAuthenticated ? `${auth.points} P` : "初次註冊領取 300P";
});

const features = [
  {
    id: "report",
    title: "命盤解析",
    subtitle: "透過 AI 學會本命、宮位與大運如何解析",
    icon: "auto_stories_rounded" as const,
    to: "/report",
  },
  {
    id: "flow",
    title: "時運解析",
    subtitle: "透過 AI 學會流年、流月、流日如何解析",
    icon: "insights_rounded" as const,
    to: "/flow",
    primary: true,
  },
  {
    id: "match",
    title: "合盤解析",
    subtitle: "透過 AI 學會關係互動如何解析",
    icon: "diversity_1_rounded" as const,
    to: "/match",
    primary: true,
  },
  {
    id: "qa",
    title: "AI 問答",
    subtitle: "透過 AI 解惑所有命盤問題",
    icon: "chat" as const,
    to: "/qa",
  },
];

function openFeature(feature: (typeof features)[number]) {
  if (!auth.isAuthenticated) {
    window.dispatchEvent(new CustomEvent("auth-login-required"));
    return;
  }
  if (!chartStore.chart) {
    active.value = feature.id;
    return;
  }
  navigateTo(feature.to);
}

function openChart() {
  if (!chartStore.chart) {
    active.value = "chart";
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

async function persistBirth(
  info: Parameters<typeof chartStore.saveBirthInfo>[0],
  isModification = false,
) {
  savingBirth.value = true;
  birthError.value = "";
  try {
    await chartStore.saveBirthInfoAndSync(info, isModification);
    const shouldOpenChart = active.value === "chart";
    const feature = features.find((item) => item.id === active.value);
    active.value = null;
    if (shouldOpenChart) await navigateTo("/chart");
    else if (feature) await navigateTo(feature.to);
  } catch (error) {
    birthError.value =
      error instanceof Error ? error.message : "出生資料儲存失敗，請稍後再試";
  } finally {
    savingBirth.value = false;
  }
}

async function saveBirth(info: Parameters<typeof chartStore.saveBirthInfo>[0]) {
  if (
    auth.isAuthenticated &&
    chartStore.birthInfo &&
    !isSameBirthInfo(info)
  ) {
    pendingBirthInfo.value = info;
    return;
  }
  if (isSameBirthInfo(info)) {
    const shouldOpenChart = active.value === "chart";
    active.value = null;
    if (shouldOpenChart) await navigateTo("/chart");
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
        @click="active = null"
      >
        <ChevronLeft :size="23" /></button
      ><span v-else />
    </template>
    <template #actions>
      <button
        v-if="!active"
        class="edit-chart"
        type="button"
        @click="active = 'chart'"
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
        <img src="/gg-circle.svg" alt="" width="22" height="22" />
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
        <small class="chart-description"
          >先查看完整命盤，再進入各項 AI 解析。</small
        >
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
          :class="{ primary: feature.primary }"
          type="button"
          @click="openFeature(feature)"
        >
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
          <span class="feature-arrow"
            ><AppMaterialIcon name="arrow_outward_rounded" :size="14"
          /></span>
          <strong>{{ feature.title }}</strong
          ><small>{{ feature.subtitle }}</small>
        </button>
      </div>
    </div>
    <BirthInfoChangeConfirm
      :open="Boolean(pendingBirthInfo)"
      :loading="savingBirth"
      @cancel="pendingBirthInfo = null"
      @confirm="confirmBirthChange"
    />
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
  padding: 6px 20px 100px;
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
  margin: 16px 0 20px;
  padding: 22px;
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
  font-size: 24px;
  font-weight: 900;
}
.chart-emblem {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border: 1px solid rgba(36, 87, 90, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.68);
  box-shadow:
    inset 0 1px 0 #fff,
    0 6px 14px rgba(36, 87, 90, 0.1);
}
.chart-arrow {
  position: absolute;
  top: 22px;
  right: 22px;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(36, 87, 90, 0.14);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: inset 0 1px 0 #fff;
}
.chart-description {
  margin: 16px 0;
  color: var(--mountain);
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.45;
}
.birth-strip {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.birth-strip > span {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  height: 58px;
  padding: 10px 12px;
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
  min-height: 166px;
  padding: 16px;
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
.feature-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-bottom: auto;
  border: 1px solid rgba(36, 87, 90, 0.14);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow:
    inset 0 1px 0 #fff,
    0 5px 12px rgba(36, 87, 90, 0.09);
}
.feature-icon img,
.points-card img {
  filter: invert(28%) sepia(15%) saturate(1350%) hue-rotate(134deg)
    brightness(91%) contrast(91%);
}
.feature-card strong {
  margin-top: 14px;
  padding-right: 18px;
  font-size: 19px;
  font-weight: 900;
}
.feature-card small {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 6px;
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
  top: 16px;
  right: 16px;
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
</style>
