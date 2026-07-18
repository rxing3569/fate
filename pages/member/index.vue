<script setup lang="ts">
import {
  Bug,
  ChevronRight,
  History,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  UserRoundCog,
} from "@lucide/vue";
definePageMeta({ middleware: "auth" });
const auth = useAuthStore();
const showLogoutSheet = ref(false);
const loggingOut = ref(false);
async function logout() {
  if (loggingOut.value) return;
  loggingOut.value = true;
  try {
    await auth.logout();
    showLogoutSheet.value = false;
    window.dispatchEvent(
      new CustomEvent("api-error-snackbar", {
        detail: { message: "您已成功登出", type: "info" },
      }),
    );
    await navigateTo("/");
  } finally {
    loggingOut.value = false;
  }
}
const menu = [
  { icon: UserRoundCog, label: "命盤資料", to: "/profile/edit" },
  { icon: History, label: "點數異動紀錄", to: "/point-history" },
  { icon: ShoppingBag, label: "購買紀錄", to: "/purchase-history" },
  { icon: Bug, label: "問題回報", to: "/issue-report" },
  { icon: ShieldCheck, label: "隱私權政策", to: "/privacy-pwa" },
];
function select(item: (typeof menu)[number]) {
  if (item.to) return navigateTo(item.to);
}
</script>

<template>
  <AppPageLayout title="會員中心" screen-class="member-screen">
    <div class="screen-content member-content">
      <button class="purchase-card" type="button" @click="navigateTo('/store')">
        <span class="bag"><ShoppingBag :size="24" /></span
        ><span
          ><strong>選購方案</strong><small>點數與 Premium 會員方案</small></span
        ><ChevronRight :size="21" />
      </button>
      <section class="menu-card glass">
        <button
          v-for="item in menu"
          :key="item.label"
          type="button"
          @click="select(item)"
        >
          <component :is="item.icon" :size="20" /><strong>{{
            item.label
          }}</strong
          ><ChevronRight :size="18" />
        </button>
      </section>
      <button
        class="logout-button glass"
        type="button"
        @click="showLogoutSheet = true"
      >
        <LogOut :size="20" /><strong>登出</strong>
      </button>
    </div>
    <template #overlays>
      <Transition name="sheet">
        <div
          v-if="showLogoutSheet"
          class="sheet-backdrop"
          @click.self="!loggingOut && (showLogoutSheet = false)"
        >
          <section
            class="clear-progress-sheet"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
          >
            <div class="sheet-handle" />
            <span class="clear-progress-icon logout-confirm-icon">
              <LogOut :size="25" />
            </span>
            <h2 id="logout-confirm-title">確定要登出？</h2>
            <p>登出後需要重新登入，才能繼續使用會員功能與查看個人資料。</p>
            <div class="clear-progress-actions">
              <button
                class="app-button outline"
                type="button"
                :disabled="loggingOut"
                @click="showLogoutSheet = false"
              >
                取消
              </button>
              <button
                class="app-button danger-button"
                type="button"
                :disabled="loggingOut"
                @click="logout"
              >
                {{ loggingOut ? "登出中…" : "確定登出" }}
              </button>
            </div>
          </section>
        </div>
      </Transition>
    </template>
  </AppPageLayout>
</template>

<style scoped>
.purchase-card {
  display: grid;
  grid-template-columns: 58px 1fr 20px;
  gap: 16px;
  align-items: center;
  width: 100%;
  padding: 28px 24px;
  border: 1px solid rgba(255, 255, 255, 0.54);
  border-radius: 32px;
  background: linear-gradient(
    135deg,
    rgba(36, 87, 90, 0.96),
    rgba(107, 166, 160, 0.8),
    rgba(237, 230, 216, 0.9)
  );
  box-shadow: 0 16px 32px rgba(36, 87, 90, 0.22);
  color: white;
  text-align: left;
}
.bag {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  font-size: 25px;
}
.purchase-card strong,
.purchase-card small {
  display: block;
}
.purchase-card strong {
  font-size: 22px;
}
.purchase-card small {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
}
.menu-card {
  margin-top: 18px;
  padding: 8px 0;
  border-radius: 30px;
}
.menu-card button {
  display: grid;
  grid-template-columns: 38px 1fr 20px;
  align-items: center;
  width: 100%;
  min-height: 58px;
  padding: 8px 20px;
  border: 0;
  background: transparent;
  color: var(--mountain);
  text-align: left;
}
.menu-card button + button {
  border-top: 1px solid rgba(36, 87, 90, 0.07);
}
.menu-card button strong {
  font-size: 15px;
}
.menu-card .danger {
  color: var(--cinnabar);
}
.logout-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 58px;
  margin-top: 18px;
  padding: 8px 20px;
  border: 1px solid rgba(255, 255, 255, 0.54);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow:
    0 12px 28px rgba(36, 87, 90, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
  color: var(--cinnabar);
  text-align: center;
  -webkit-backdrop-filter: blur(20px) saturate(145%);
  backdrop-filter: blur(20px) saturate(145%);
}
.logout-button strong {
  font-size: 15px;
}
.logout-button:hover {
  background: rgba(255, 255, 255, 0.72);
}
.clear-progress-sheet {
  width: min(100%, 680px);
  padding: 10px 24px calc(30px + env(safe-area-inset-bottom));
  border-radius: 30px 30px 0 0;
  background: var(--paper);
  box-shadow: 0 -12px 34px rgba(36, 87, 90, 0.16);
  text-align: center;
}
.clear-progress-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 18px auto 0;
  border-radius: 18px;
  background: rgba(184, 91, 75, 0.1);
  color: var(--cinnabar);
}
.logout-confirm-icon {
  border-radius: 50%;
}
.clear-progress-sheet h2 {
  margin: 16px 0 8px;
  font-size: 20px;
}
.clear-progress-sheet p {
  margin: 0;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.65;
}
.clear-progress-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 26px;
}
.danger-button {
  border-color: var(--cinnabar);
  background: var(--cinnabar);
}
</style>
