<script setup lang="ts">
import { Download, RefreshCw, Smartphone, X } from '@lucide/vue'

const { $pwa } = useNuxtApp()
const cooldownMs = 7 * 24 * 60 * 60 * 1000
const nextPromptKey = 'ziwei:pwa-install-prompt-next-at'
const legacyDismissalKey = 'ziwei:pwa-install-prompt-dismissed'

const mounted = ref(false)
const mobile = ref(false)
const ios = ref(false)
const standalone = ref(false)
const installSheetOpen = ref(false)
const iosInstructionsVisible = ref(false)
const nextPromptAt = ref(0)
const statusDismissed = ref(false)

const installEligible = computed(() => (
  mounted.value &&
  mobile.value &&
  !standalone.value &&
  Date.now() >= nextPromptAt.value
))

const androidInstallReady = computed(() => (
  installEligible.value && !ios.value && Boolean($pwa?.showInstallPrompt)
))

const statusVisible = computed(() => (
  mounted.value &&
  !installSheetOpen.value &&
  !statusDismissed.value &&
  Boolean($pwa?.needRefresh || $pwa?.offlineReady)
))

onMounted(() => {
  const navigatorWithHints = navigator as Navigator & {
    standalone?: boolean
    userAgentData?: { mobile?: boolean }
  }
  const userAgent = navigator.userAgent

  ios.value = /iPhone|iPod/i.test(userAgent)
  mobile.value = navigatorWithHints.userAgentData?.mobile === true || /iPhone|iPod|Android.*Mobile/i.test(userAgent)
  standalone.value = window.matchMedia('(display-mode: standalone)').matches || navigatorWithHints.standalone === true

  const storedNextPromptAt = Number(localStorage.getItem(nextPromptKey) || 0)
  if (Number.isFinite(storedNextPromptAt)) nextPromptAt.value = storedNextPromptAt

  if (localStorage.getItem(legacyDismissalKey) === '1' && !nextPromptAt.value) {
    deferInstallPrompt()
    localStorage.removeItem(legacyDismissalKey)
  }

  mounted.value = true
})

watch(
  [installEligible, androidInstallReady],
  ([eligible, androidReady]) => {
    if (!eligible || installSheetOpen.value) return
    if (ios.value || androidReady) installSheetOpen.value = true
  },
  { immediate: true },
)

function deferInstallPrompt() {
  installSheetOpen.value = false
  iosInstructionsVisible.value = false
  nextPromptAt.value = Date.now() + cooldownMs
  localStorage.setItem(nextPromptKey, String(nextPromptAt.value))
}

async function handlePrimaryInstallAction() {
  if (ios.value) {
    if (!iosInstructionsVisible.value) {
      iosInstructionsVisible.value = true
      return
    }
    deferInstallPrompt()
    return
  }

  const choice = await $pwa?.install()
  installSheetOpen.value = false
  if (choice?.outcome !== 'accepted') deferInstallPrompt()
}

function dismissStatus() {
  statusDismissed.value = true
  void $pwa?.cancelPrompt?.()
}
</script>

<template>
  <AppBottomSheet
    :open="installSheetOpen"
    labelledby="pwa-install-title"
    @close="deferInstallPrompt"
  >
    <div class="install-sheet-content">
      <span class="install-sheet-icon"><Smartphone :size="28" /></span>
      <template v-if="iosInstructionsVisible">
        <h2 id="pwa-install-title">在 iPhone 加入主畫面</h2>
        <p>在 Safari 下方工具列點選「分享」，向下捲動後選擇「加入主畫面」，再點右上角的「加入」。</p>
      </template>
      <template v-else>
        <h2 id="pwa-install-title">把江映澄紫微加入主畫面</h2>
        <p>加入主畫面後，可像 App 一樣快速開啟，並在網路不穩時繼續查看已儲存的內容。</p>
      </template>
      <div class="install-sheet-actions">
        <button class="app-button outline" type="button" @click="deferInstallPrompt">稍後再說</button>
        <button class="app-button" type="button" @click="handlePrimaryInstallAction">
          <Download v-if="!ios || !iosInstructionsVisible" :size="16" />
          {{ ios ? (iosInstructionsVisible ? '我知道了' : '查看安裝步驟') : '立即安裝' }}
        </button>
      </div>
    </div>
  </AppBottomSheet>

  <Transition name="install-banner">
    <aside
      v-if="statusVisible"
      class="pwa-prompt"
      :class="{ 'without-action': !$pwa?.needRefresh }"
      role="status"
      aria-live="polite"
    >
      <span class="prompt-icon"><RefreshCw v-if="$pwa?.needRefresh" :size="22" /><Smartphone v-else :size="23" /></span>
      <div class="prompt-copy">
        <strong v-if="$pwa?.needRefresh">發現新的版本</strong>
        <strong v-else>已可離線使用</strong>
        <small v-if="$pwa?.needRefresh">立即更新，取得最新內容與功能。</small>
        <small v-else>即使網路不穩，也能開啟已保存的內容。</small>
      </div>
      <button v-if="$pwa?.needRefresh" class="prompt-action" type="button" @click="$pwa.updateServiceWorker(true)"><RefreshCw :size="15" />更新</button>
      <button class="prompt-close" type="button" aria-label="關閉提示" @click="dismissStatus"><X :size="17" /></button>
    </aside>
  </Transition>
</template>

<style scoped>
.install-sheet-content{display:grid;justify-items:center}.install-sheet-icon{display:grid;place-items:center;width:58px;height:58px;margin:4px auto 2px;border:1px solid rgba(107,166,160,.25);border-radius:19px;background:rgba(107,166,160,.16);color:var(--mountain)}.install-sheet-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:100%;max-width:430px;margin:4px auto 0}.install-sheet-actions .app-button{width:100%;gap:6px}
.pwa-prompt{position:fixed;z-index:calc(var(--layer-navigation) + 2);right:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(50%);display:grid;grid-template-columns:44px minmax(0,1fr) auto 34px;align-items:center;gap:10px;width:min(652px,calc(100vw - 28px));min-height:74px;padding:10px max(14px,env(safe-area-inset-left)) 10px max(14px,env(safe-area-inset-right));border:1px solid rgba(255,255,255,.74);border-radius:22px;background:linear-gradient(105deg,rgba(255,255,255,.94),rgba(107,166,160,.16));box-shadow:0 14px 34px rgba(36,87,90,.18);color:var(--mountain);-webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%)}
.pwa-prompt.without-action{grid-template-columns:44px minmax(0,1fr) 34px}.pwa-prompt.without-action .prompt-close{grid-column:3}
.prompt-icon{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(107,166,160,.25);border-radius:14px;background:rgba(107,166,160,.16);color:var(--mountain)}.prompt-copy{display:grid;gap:3px;min-width:0}.prompt-copy strong{font-size:14px}.prompt-copy small{color:var(--text-soft);font-size:11.5px;line-height:1.45;white-space:normal}.prompt-action{display:flex;align-items:center;justify-content:center;gap:5px;min-height:36px;padding:7px 13px;border:1px solid var(--mountain);border-radius:14px;background:var(--mountain);color:#fff;font-size:12px;font-weight:900}.prompt-close{grid-column:4;grid-row:1;display:grid;place-items:center;width:31px;height:31px;padding:0;border:1.5px solid rgba(36,87,90,.3);border-radius:50%;background:rgba(255,255,255,.64);color:var(--mountain)}
.install-banner-enter-active,.install-banner-leave-active{transition:opacity .2s ease,transform .25s ease}.install-banner-enter-from,.install-banner-leave-to{opacity:0;transform:translate(50%,12px)}.install-banner-enter-to,.install-banner-leave-from{opacity:1;transform:translate(50%,0)}
@media(min-width:760px) and (max-width:1179px){.pwa-prompt{right:calc((100vw - 88px)/2);bottom:20px;width:min(652px,calc(100vw - 124px))}}
@media(min-width:1180px){.pwa-prompt{display:none}}
@media(max-width:420px){.install-sheet-actions{grid-template-columns:1fr}.install-sheet-actions .app-button:first-child{order:2}.pwa-prompt{grid-template-columns:40px minmax(0,1fr) auto 30px;gap:7px;min-height:70px;padding-inline:10px}.pwa-prompt.without-action{grid-template-columns:40px minmax(0,1fr) 30px}.prompt-icon{width:38px;height:38px}.prompt-action{padding-inline:9px}.prompt-close{width:29px;height:29px}}
</style>
