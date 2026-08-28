<script setup lang="ts">
import {
  BookOpen,
  Home,
  Newspaper,
  UserRound,
} from "@lucide/vue";
import type { Component } from "vue";
import { signupRewardPoints } from "~/utils/signup-reward";

// Vite replaces import.meta.dev at build time. In production this entire
// dynamic-import branch is removed, so the dev component is not shipped.
const DevFloatingButton = import.meta.dev
  ? defineAsyncComponent(
      () => import("~/components/dev/DevFloatingButton.client.vue"),
    )
  : null;

const route = useRoute();
const auth = useAuthStore();
const activeAnalysis = useActiveAnalysisStore();
const showLoginSheet = ref(false);
const loginRedirect = ref("/");
const learningSyncing = ref(false);
const libraryMenuOpen = ref(false);
const libraryMenuRoot = ref<HTMLElement | null>(null);
const registrationReward = signupRewardPoints();
const appMain = ref<HTMLElement | null>(null);
let contentResizeObserver: ResizeObserver | undefined;
let observedContent: Element | null = null;

interface NavigationTab {
  to: string;
  label: string;
  mobileLabel: string;
  icon?: Component;
  materialIcon?: "grid_view_rounded";
  featured?: boolean;
  gated?: boolean;
  library?: boolean;
}

const tabs: NavigationTab[] = [
  { to: "/", label: "首頁", mobileLabel: "首頁", icon: Home },
  {
    to: "/learn/",
    label: "紫微教學",
    mobileLabel: "教學",
    icon: BookOpen,
  },
  {
    to: "/ai-analysis",
    label: "排盤解盤",
    mobileLabel: "解盤",
    materialIcon: "grid_view_rounded" as const,
    featured: true,
  },
  { to: "/articles", label: "文章專欄", mobileLabel: "文章", icon: Newspaper },
  {
    to: "/member",
    label: "會員中心",
    mobileLabel: "會員",
    icon: UserRound,
    gated: true,
  },
];

const mobileTabs: NavigationTab[] = [...tabs];

const mobileNavigationHiddenRoutes = new Set([
  "/chart",
  "/report",
  "/report-detail",
  "/flow",
  "/annual-flow",
  "/match",
  "/qa",
]);
const normalizedPath = computed(() =>
  route.path === "/" ? "/" : route.path.replace(/\/+$/, ""),
);
const mobileNavigationHidden = computed(
  () =>
    mobileNavigationHiddenRoutes.has(normalizedPath.value) ||
    (normalizedPath.value === "/ai-analysis" &&
      typeof route.query.mode === "string" &&
      route.query.mode.length > 0),
);
const showTabs = computed(() => {
  if (normalizedPath.value === "/profile/edit" && route.query.from === "chart")
    return false;
  return true;
});
// AppBottomSheet is teleported to <body>, so it cannot infer the navigation
// layout from its rendered DOM ancestry. Share the actual layout state instead.
provide("primary-navigation-visible", showTabs);
const showFooter = computed(
  () =>
    normalizedPath.value === "/" ||
    normalizedPath.value === "/articles" ||
    normalizedPath.value.startsWith("/articles/"),
);
const copyProtected = computed(() => {
  const path = normalizedPath.value;
  return (
    path === "/learn" ||
    path === "/learning" ||
    path.startsWith("/learning/") ||
    path === "/review" ||
    path.startsWith("/review/") ||
    path === "/quiz" ||
    path === "/report" ||
    path === "/report-detail" ||
		path === "/flow" ||
		path === "/annual-flow" ||
    path === "/match"
  );
});

function preventProtectedContentAction(event: Event) {
  if (copyProtected.value) event.preventDefault();
}

onMounted(async () => {
  window.addEventListener("auth-login-required", openLoginSheet);
  window.addEventListener("offline-snapshot-used", handleOfflineSnapshot);
  window.addEventListener("online", handleOnline);
  window.addEventListener("resize", updateContentCenter);
  document.addEventListener("click", closeLibraryMenuOnOutsideClick);
  document.addEventListener("keydown", closeLibraryMenuOnEscape);
  await nextTick();
  observeContentCenter();
  const isAuthenticated = await auth.hydrate();
  if (isAuthenticated) await activeAnalysis.hydrate();
  else activeAnalysis.reset();
  useChartStore().hydrate(auth.profile);
});
onBeforeUnmount(() => {
  window.removeEventListener("auth-login-required", openLoginSheet);
  window.removeEventListener("offline-snapshot-used", handleOfflineSnapshot);
  window.removeEventListener("online", handleOnline);
  window.removeEventListener("resize", updateContentCenter);
  document.removeEventListener("click", closeLibraryMenuOnOutsideClick);
  document.removeEventListener("keydown", closeLibraryMenuOnEscape);
  contentResizeObserver?.disconnect();
  document.documentElement.style.removeProperty(
    "--fate-app-content-center-x",
  );
});

watch(
  () => route.fullPath,
  async () => {
    libraryMenuOpen.value = false;
    await nextTick();
    observeContentCenter();
  },
);

function contentCenterTarget() {
  return (
    appMain.value?.querySelector(
      ".screen > main, .screen > .screen-content, .screen > .app-page-content",
    ) ||
    appMain.value?.querySelector(".screen") ||
    appMain.value
  );
}

function updateContentCenter() {
  const target = contentCenterTarget();
  if (!target) return;
  const rect = target.getBoundingClientRect();
  document.documentElement.style.setProperty(
    "--fate-app-content-center-x",
    `${Math.round(rect.left + rect.width / 2)}px`,
  );
}

function observeContentCenter() {
  const target = contentCenterTarget();
  if (!target) return;
  if (!contentResizeObserver)
    contentResizeObserver = new ResizeObserver(updateContentCenter);
  if (observedContent !== target) {
    contentResizeObserver.disconnect();
    contentResizeObserver.observe(target);
    observedContent = target;
  }
  updateContentCenter();
}

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
  const updatedAt = Number(
    (event as CustomEvent<{ updatedAt?: number }>).detail?.updatedAt || 0,
  );
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

function openTab(tab: NavigationTab) {
  if (tab.gated && !auth.canViewMemberContent) {
    loginRedirect.value = tab.to;
    showLoginSheet.value = true;
    return;
  }
  navigateTo(tab.to);
}

function openMobileTab(tab: NavigationTab) {
  if ("library" in tab && tab.library) {
    libraryMenuOpen.value = !libraryMenuOpen.value;
    return;
  }
  openTab(tab);
}

function closeLibraryMenuOnOutsideClick(event: MouseEvent) {
  if (!libraryMenuRoot.value?.contains(event.target as Node))
    libraryMenuOpen.value = false;
}

function closeLibraryMenuOnEscape(event: KeyboardEvent) {
  if (event.key === "Escape") libraryMenuOpen.value = false;
}

function openLibraryPage(path: string) {
  libraryMenuOpen.value = false;
  navigateTo(path);
}

function isLibraryActive() {
  const path = normalizedPath.value;
  return (
    path === "/learn" ||
    path === "/quiz" ||
    path.startsWith("/learning/") ||
    path.startsWith("/review") ||
    path.startsWith("/articles")
  );
}

function isTabActive(path: string) {
  const currentPath = normalizedPath.value;
  if (path === "/") return currentPath === "/";
  if (path === "/learn/")
    return (
      currentPath === "/learn" ||
      currentPath === "/quiz" ||
      currentPath.startsWith("/learning/") ||
      currentPath.startsWith("/review")
    );
  if (path === "/articles") return currentPath.startsWith("/articles");
  if (path === "/member")
    return (
      currentPath === "/member" ||
      currentPath === "/store" ||
      currentPath === "/purchase-history" ||
      currentPath === "/point-history" ||
      currentPath.startsWith("/profile/") ||
      currentPath === "/issue-report" ||
      currentPath === "/privacy-pwa" ||
      currentPath === "/nwp-live-check"
    );
  if (path === "/ai-analysis")
    return [
      "/ai-analysis",
      "/chart",
      "/report",
      "/flow",
      "/match",
      "/qa",
    ].includes(currentPath);
  return currentPath === path.replace(/\/+$/, "");
}
</script>

<template>
  <div class="app-shell">
    <PwaPrompt />
    <AppSnackbarHost />
    <OfflineStatusBanner />
    <main
      ref="appMain"
      class="app-main"
      :class="{
        'with-tabs': showTabs,
        'mobile-navigation-hidden': mobileNavigationHidden,
        'copy-protected': copyProtected,
      }"
      @selectstart.capture="preventProtectedContentAction"
      @copy.capture="preventProtectedContentAction"
      @cut.capture="preventProtectedContentAction"
      @contextmenu.capture="preventProtectedContentAction"
    >
      <slot />
      <SiteFooter v-if="showFooter" />
      <AppBottomSheet
        :open="Boolean(auth.pendingLearningProgressSync)"
        role="alertdialog"
        labelledby="learning-sync-title"
        :close-on-backdrop="false"
        locked
      >
        <template #header
          ><h2 id="learning-sync-title">同步學習進度？</h2></template
        >
        <p>
          偵測到登入前已完成的學習關卡。是否將這些進度合併到目前帳號？同步後只會增加，不會覆蓋帳號原有進度。
        </p>
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

    <DevFloatingButton v-if="DevFloatingButton" />

    <nav
      v-if="showTabs"
      class="primary-nav"
      :class="{ 'mobile-navigation-hidden': mobileNavigationHidden }"
      aria-label="主要功能"
    >
      <NuxtLink class="nav-brand" to="/" aria-label="江映澄紫微首頁">
        <img src="/remove-background-logo.png" alt="" />
        <strong>江映澄紫微</strong>
      </NuxtLink>
      <div ref="libraryMenuRoot" class="nav-items nav-items-mobile">
        <button
          v-for="tab in mobileTabs"
          :key="tab.to"
          class="primary-nav-item"
          :class="{
            active:
              ('library' in tab && tab.library)
                ? isLibraryActive()
                : isTabActive(tab.to),
            featured: tab.featured,
          }"
          type="button"
          :aria-expanded="
            'library' in tab && tab.library ? libraryMenuOpen : undefined
          "
          :aria-haspopup="'library' in tab && tab.library ? 'menu' : undefined"
          @click.stop="openMobileTab(tab)"
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
          <span class="nav-label nav-label-full">{{ tab.label }}</span>
          <span class="nav-label nav-label-mobile">{{ tab.mobileLabel }}</span>
        </button>
        <Transition name="library-menu">
          <div
            v-if="libraryMenuOpen"
            class="library-menu-panel"
            role="menu"
            aria-label="文庫"
          >
            <button type="button" role="menuitem" @click="openLibraryPage('/learn/')">
              <BookOpen :size="19" /><span>紫微教學</span>
            </button>
            <button type="button" role="menuitem" @click="openLibraryPage('/articles')">
              <Newspaper :size="19" /><span>文章專欄</span>
            </button>
          </div>
        </Transition>
      </div>
      <div class="nav-items nav-items-expanded">
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
          <span class="nav-label nav-label-full">{{ tab.label }}</span>
          <span class="nav-label nav-label-mobile">{{ tab.mobileLabel }}</span>
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
      <template #header
        ><img class="sheet-logo" src="/remove-background-logo.png" alt="" />
        <h2 id="login-sheet-title">開始探索紫微</h2></template
      >
      <p>
        命盤解析盤等 AI 功能需要登入帳號後方可使用。<br />立即註冊領取
        {{ registrationReward }}P
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
.learning-sync-actions .app-button {
  width: 100%;
}
.copy-protected {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
.nav-items-expanded {
  display: none;
}
.nav-items-mobile {
  position: relative;
}
.library-menu-panel {
  position: absolute;
  right: 2px;
  bottom: calc(100% + 12px);
  display: grid;
  gap: 6px;
  width: 174px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 20px;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.9),
    rgba(247, 243, 234, 0.78)
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    0 16px 34px rgba(36, 87, 90, 0.2);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  backdrop-filter: blur(24px) saturate(150%);
}
.library-menu-panel button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 45px;
  padding: 0 13px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: var(--mountain);
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  text-align: left;
}
.library-menu-panel button:hover,
.library-menu-panel button:focus-visible {
  background: rgba(107, 166, 160, 0.14);
  outline: none;
}
.library-menu-enter-active,
.library-menu-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
  transform-origin: bottom right;
}
.library-menu-enter-from,
.library-menu-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}
@media (min-width: 760px) {
  .nav-items-mobile {
    display: none;
  }
  .nav-items-expanded {
    display: flex;
  }
}
</style>
