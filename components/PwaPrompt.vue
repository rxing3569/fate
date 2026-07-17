<script setup lang="ts">
import { Download, RefreshCw, Smartphone, X } from '@lucide/vue'
const { $pwa } = useNuxtApp()
const dismissed = ref(false)
const dismissalLoaded = ref(false)
const dismissalKey = 'ziwei:pwa-install-prompt-dismissed'
const visible = computed(() => dismissalLoaded.value && !dismissed.value && Boolean($pwa?.needRefresh || $pwa?.offlineReady || $pwa?.showInstallPrompt))
onMounted(() => {
  dismissed.value = localStorage.getItem(dismissalKey) === '1'
  dismissalLoaded.value = true
})
function dismiss() {
  dismissed.value = true
  localStorage.setItem(dismissalKey, '1')
  $pwa?.cancelPrompt?.()
}
</script>

<template>
  <Transition name="install-banner">
    <aside v-if="visible" class="pwa-prompt" role="status" aria-live="polite">
      <span class="prompt-icon"><RefreshCw v-if="$pwa?.needRefresh" :size="22" /><Smartphone v-else :size="23" /></span>
      <div class="prompt-copy">
        <strong v-if="$pwa?.needRefresh">發現新的版本</strong>
        <strong v-else-if="$pwa?.offlineReady">已可離線使用</strong>
        <strong v-else>安裝江映澄紫微</strong>
        <small v-if="$pwa?.needRefresh">立即更新，取得最新內容與功能。</small>
        <small v-else-if="$pwa?.offlineReady">即使網路不穩，也能開啟已保存的內容。</small>
        <small v-else>加入主畫面，開啟更快速、使用更方便。</small>
      </div>
      <button v-if="$pwa?.needRefresh" class="prompt-action" type="button" @click="$pwa.updateServiceWorker(true)"><RefreshCw :size="15" />更新</button>
      <button v-else-if="$pwa?.showInstallPrompt" class="prompt-action" type="button" @click="$pwa.install()"><Download :size="15" />安裝</button>
      <button class="prompt-close" type="button" aria-label="關閉安裝提示" @click="dismiss"><X :size="17" /></button>
    </aside>
  </Transition>
</template>

<style scoped>
.pwa-prompt{position:fixed;z-index:calc(var(--layer-navigation) + 2);right:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(50%);display:grid;grid-template-columns:44px minmax(0,1fr) auto 34px;align-items:center;gap:10px;width:min(652px,calc(100vw - 28px));min-height:74px;padding:10px max(14px,env(safe-area-inset-left)) 10px max(14px,env(safe-area-inset-right));border:1px solid rgba(255,255,255,.74);border-radius:22px;background:linear-gradient(105deg,rgba(255,255,255,.94),rgba(107,166,160,.16));box-shadow:0 14px 34px rgba(36,87,90,.18);color:var(--mountain);-webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%)}
.prompt-icon{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(107,166,160,.25);border-radius:14px;background:rgba(107,166,160,.16);color:var(--mountain)}.prompt-copy{display:grid;gap:3px;min-width:0}.prompt-copy strong{font-size:14px}.prompt-copy small{overflow:hidden;color:var(--text-soft);font-size:11.5px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.prompt-action{display:flex;align-items:center;justify-content:center;gap:5px;min-height:36px;padding:7px 13px;border:1px solid var(--mountain);border-radius:14px;background:var(--mountain);color:#fff;font-size:12px;font-weight:900}.prompt-close{display:grid;place-items:center;width:31px;height:31px;padding:0;border:1.5px solid rgba(36,87,90,.3);border-radius:50%;background:rgba(255,255,255,.64);color:var(--mountain)}
.install-banner-enter-active,.install-banner-leave-active{transition:opacity .2s ease,transform .25s ease}.install-banner-enter-from,.install-banner-leave-to{opacity:0;transform:translate(50%,12px)}.install-banner-enter-to,.install-banner-leave-from{opacity:1;transform:translate(50%,0)}
@media(min-width:760px) and (max-width:1179px){.pwa-prompt{right:calc((100vw - 88px)/2);bottom:20px;width:min(652px,calc(100vw - 124px))}}
@media(min-width:1180px){.pwa-prompt{display:none}}
@media(max-width:420px){.pwa-prompt{grid-template-columns:40px minmax(0,1fr) auto 30px;gap:7px;min-height:70px;padding-inline:10px}.prompt-icon{width:38px;height:38px}.prompt-copy small{max-width:150px}.prompt-action{padding-inline:9px}.prompt-close{width:29px;height:29px}}
</style>
