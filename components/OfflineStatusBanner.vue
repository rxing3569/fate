<script setup lang="ts">
import { CloudOff, LogIn } from '@lucide/vue'
import type { ComputedRef } from 'vue'

const auth = useAuthStore()
const primaryNavigationVisible = inject<ComputedRef<boolean>>(
  'primary-navigation-visible',
  computed(() => false),
)
const isOnline = ref(true)
const visible = computed(() => auth.sessionReady && (auth.isOfflineSession || !isOnline.value))
const needsLogin = computed(() => auth.isOfflineSession && !auth.isAuthenticated && isOnline.value)
const syncedLabel = computed(() => {
  if (!auth.offlineLastSyncedAt) return ''
  return new Date(auth.offlineLastSyncedAt).toLocaleString('zh-TW', { hour12: false })
})

function updateConnection() {
  isOnline.value = navigator.onLine
  if (isOnline.value) auth.leaveOfflineFallback()
}

onMounted(() => {
  updateConnection()
  window.addEventListener('online', updateConnection)
  window.addEventListener('offline', updateConnection)
})
watch(
  () => [auth.isAuthenticated, isOnline.value] as const,
  ([authenticated, online]) => {
    if (authenticated && online) auth.leaveOfflineFallback()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  window.removeEventListener('online', updateConnection)
  window.removeEventListener('offline', updateConnection)
})
</script>

<template>
  <aside
    v-if="visible"
    class="offline-banner"
    :class="{ 'has-primary-navigation': primaryNavigationVisible }"
    role="status"
    aria-live="polite"
  >
    <CloudOff :size="18" />
    <span>
      <strong>唯讀離線模式</strong>
      <small>{{ syncedLabel ? `本機資料最後同步：${syncedLabel}` : '需連線才能更新或送出資料' }}</small>
    </span>
    <NuxtLink v-if="needsLogin" to="/login"><LogIn :size="14" />重新登入</NuxtLink>
  </aside>
</template>

<style scoped>
.offline-banner {
  position: fixed;
  z-index: 999;
  top: max(10px, env(safe-area-inset-top));
  left: 50%;
  display: flex;
  align-items: center;
  gap: 9px;
  width: min(560px, calc(100vw - 28px));
  padding: 10px 12px;
  border: 1px solid rgba(184, 91, 75, 0.3);
  border-radius: 16px;
  background: rgba(255, 248, 238, 0.95);
  box-shadow: 0 10px 26px rgba(36, 87, 90, 0.15);
  color: var(--cinnabar);
  transform: translateX(-50%);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
}

.offline-banner > span {
  display: grid;
  flex: 1;
  gap: 1px;
  min-width: 0;
}

.offline-banner strong {
  font-size: 13px;
}

.offline-banner small {
  overflow: hidden;
  color: var(--text-soft);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.offline-banner a {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 9px;
  border-radius: 10px;
  background: var(--mountain);
  color: #fff;
  font-size: 11px;
  font-weight: 850;
  white-space: nowrap;
}

@media (min-width: 760px) {
  .offline-banner.has-primary-navigation {
    left: calc(88px + (100vw - 88px) / 2);
  }
}

@media (min-width: 1180px) {
  .offline-banner.has-primary-navigation {
    left: calc(260px + max(24px, (100vw - 940px) / 2 - 80px) + 340px);
  }
}
</style>
