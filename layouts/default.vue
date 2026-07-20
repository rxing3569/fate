<script setup lang="ts">
import { BookOpen, Home, Newspaper, UserRound } from "@lucide/vue";
const route = useRoute();
const auth = useAuthStore();
const activeAnalysis = useActiveAnalysisStore();
const showLoginSheet = ref(false);
const loginRedirect = ref("/");
const learningSyncing = ref(false);

const tabs = [
  { to: "/", label: "首頁", icon: Home },
  { to: "/learn/", label: "學習紫微", icon: BookOpen },
  {
    to: "/ai-analysis",
    label: "排盤解盤",
    materialIcon: "grid_view_rounded" as const,
    featured: true,
  },
  { to: "/articles", label: "命理專欄", icon: Newspaper },
  { to: "/member", label: "會員中心", icon: UserRound, gated: true },
];

const showTabs = true;

onMounted(async () => {
  window.addEventListener("auth-login-required", openLoginSheet);
  window.addEventListener("offline-snapshot-used", handleOfflineSnapshot);
  window.addEventListener("online", handleOnline);
  const isAuthenticated = await auth.hydrate();
  if (isAuthenticated) await activeAnalysis.hydrate();
  else activeAnalysis.reset();
  useChartStore().hydrate(auth.profile);
});
onBeforeUnmount(() => {
  window.removeEventListener("auth-login-required", openLoginSheet);
  window.removeEventListener("offline-snapshot-used", handleOfflineSnapshot);
  window.removeEventListener("online", handleOnline);
});

async function acceptLearningProgressSync() {
  if (learningSyncing.value) return;
  learningSyncing.value = true;
  try {
    await auth.acceptLearningProgressSync();
  } finally {
    learningSyncing.value = false;
  }
}

function handleOfflineSnapshot(event: Event) {
  const updatedAt = Number((event as CustomEvent<{ updatedAt?: number }>).detail?.updatedAt || 0);
  auth.activateOfflineFallback(updatedAt);
}

function handleOnline() {
  auth.leaveOfflineFallback();
}

function openLoginSheet(event?: Event) {
  const requestedRedirect =
    event instanceof CustomEvent && typeof event.detail?.redirect === "string"
      ? event.detail.redirect
      : route.fullPath;
  loginRedirect.value =
    requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
      ? requestedRedirect
      : "/";
  showLoginSheet.value = true;
}

function openTab(tab: (typeof tabs)[number]) {
  if (tab.gated && !auth.canViewMemberContent) {
    loginRedirect.value = tab.to;
    showLoginSheet.value = true;
    return;
  }
  navigateTo(tab.to);
}

function isTabActive(path: string) {
  if (path === "/") return route.path === "/";
  if (path === "/learn/")
    return (
      route.path === "/learn/" ||
      route.path === "/quiz" ||
      route.path.startsWith("/learning/") ||
      route.path.startsWith("/review")
    );
  if (path === "/articles") return route.path.startsWith("/articles");
  if (path === "/member")
    return (
      route.path === "/member" ||
      route.path === "/store" ||
      route.path === "/purchase-history" ||
      route.path === "/point-history" ||
      route.path.startsWith("/profile/") ||
      route.path === "/issue-report" ||
      route.path === "/privacy-pwa" ||
      route.path === "/nwp-live-check"
    );
  if (path === "/ai-analysis")
    return ["/ai-analysis", "/chart", "/report", "/flow", "/match", "/qa"].includes(
      route.path,
    );
  return route.path === path;
}
</script>

<template>
  <div class="app-shell">
    <PwaPrompt />
    <ApiErrorSnackbar />
    <OfflineStatusBanner />
    <main class="app-main" :class="{ 'with-tabs': showTabs }">
      <slot />
      <SiteFooter v-if="showTabs" />
      <AppBottomSheet
        :open="Boolean(auth.pendingLearningProgressSync)"
        role="alertdialog"
        labelledby="learning-sync-title"
        :close-on-backdrop="false"
        locked
      >
        <template #header><h2 id="learning-sync-title">同步學習進度？</h2></template>
        <p>偵測到登入前已完成的學習關卡。是否將這些進度合併到目前帳號？同步後只會增加，不會覆蓋帳號原有進度。</p>
        <div class="learning-sync-actions">
          <button
            class="app-button outline"
            type="button"
            :disabled="learningSyncing"
            @click="auth.declineLearningProgressSync()"
          >
            不同步
          </button>
          <button
            class="app-button"
            type="button"
            :disabled="learningSyncing"
            @click="acceptLearningProgressSync"
          >
            {{ learningSyncing ? "同步中…" : "同步進度" }}
          </button>
        </div>
      </AppBottomSheet>
    </main>

    <AppGoToTop
      v-if="showTabs && !['/report', '/report/'].includes(route.path)"
    />

    <nav v-if="showTabs" class="primary-nav" aria-label="主要功能">
      <NuxtLink class="nav-brand" to="/" aria-label="江映澄紫微首頁">
        <img src="/remove-background-logo.png" alt="" />
        <strong>江映澄紫微</strong>
      </NuxtLink>
      <div class="nav-items">
        <button
          v-for="tab in tabs"
          :key="tab.to"
          class="primary-nav-item"
          :class="{ active: isTabActive(tab.to), featured: tab.featured }"
          type="button"
          @click="openTab(tab)"
        >
          <span class="nav-icon-bubble">
            <AppMaterialIcon
              v-if="tab.materialIcon"
              :name="tab.materialIcon"
              :size="25"
              class="primary-nav-icon"
            />
            <component
              :is="tab.icon"
              v-else
              class="primary-nav-icon"
              :size="22"
              aria-hidden="true"
            />
            <b
              v-if="tab.to === '/member' && auth.premium"
              class="premium-nav-badge"
              aria-label="Premium 會員"
              >P</b
            >
          </span>
          <span>{{ tab.label }}</span>
        </button>
      </div>
      <div class="nav-footer"><span>AI 打造的紫微解析與學習平台</span></div>
    </nav>

    <AppBottomSheet
      :open="showLoginSheet"
      sheet-class="login-sheet"
      labelledby="login-sheet-title"
      @close="showLoginSheet = false"
    >
          <template #header><img class="sheet-logo" src="/remove-background-logo.png" alt="" /><h2 id="login-sheet-title">開始探索紫微</h2></template>
          <p>
            命盤解析盤等 AI 功能需要登入帳號後方可使用。<br />立即註冊領取 300P
          </p>
          <div class="sheet-actions">
            <button
              class="app-button outline"
              type="button"
              @click="showLoginSheet = false"
            >
              先逛逛看
            </button>
            <NuxtLink
              class="app-button"
              :to="{
                path: '/login',
                query: { redirect: loginRedirect },
              }"
              @click="showLoginSheet = false"
              >前往登入 / 註冊</NuxtLink
            >
          </div>
    </AppBottomSheet>

  </div>
</template>

<style scoped>
.learning-sync-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  margin-top: 18px;
}
.learning-sync-actions .app-button { width: 100%; }
</style>
