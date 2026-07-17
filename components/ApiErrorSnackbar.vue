<script setup lang="ts">
import { AlertCircle, ArrowRight, CircleCheck, X } from '@lucide/vue'

type SnackbarItem = {
  message: string
  type: 'error' | 'info'
  title?: string
  actionLabel?: string
  actionTo?: string
  duration?: number
}

const visible = ref(false)
const message = ref('')
const type = ref<SnackbarItem['type']>('error')
const title = ref('')
const actionLabel = ref('')
const actionTo = ref('')
const queue: SnackbarItem[] = []
let timer: ReturnType<typeof setTimeout> | undefined

function showNext() {
  if (visible.value || !queue.length) return
  const next = queue.shift() || { message: '連線發生錯誤，請稍後再試。', type: 'error' }
  message.value = next.message
  type.value = next.type
  title.value = next.title || (next.type === 'info' ? '操作完成' : '操作失敗')
  actionLabel.value = next.actionLabel || ''
  actionTo.value = next.actionTo || ''
  visible.value = true
  timer = setTimeout(close, next.duration ?? 3000)
}

function close() {
  if (timer) clearTimeout(timer)
  timer = undefined
  visible.value = false
  setTimeout(showNext, 180)
}

function receive(event: Event) {
  const detail = (event as CustomEvent<Partial<SnackbarItem>>).detail
  const next: SnackbarItem = {
    message: detail?.message?.trim() || '連線發生錯誤，請稍後再試。',
    type: detail?.type === 'info' ? 'info' : 'error',
    title: detail?.title?.trim(),
    actionLabel: detail?.actionLabel?.trim(),
    actionTo: detail?.actionTo?.trim(),
    duration: detail?.duration,
  }
  const queued = queue.at(-1)
  if (queued?.message === next.message && queued.type === next.type) return
  queue.push(next)
  showNext()
}

async function followAction() {
  const destination = actionTo.value
  close()
  if (destination) await navigateTo(destination)
}

onMounted(() => window.addEventListener('api-error-snackbar', receive))
onBeforeUnmount(() => {
  window.removeEventListener('api-error-snackbar', receive)
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="api-snackbar">
      <div v-if="visible" class="api-snackbar" :class="`is-${type}`" role="status" aria-live="polite">
        <span class="snackbar-icon">
          <CircleCheck v-if="type === 'info'" :size="20" />
          <AlertCircle v-else :size="20" />
        </span>
        <div class="snackbar-copy">
          <strong>{{ title }}</strong>
          <span>{{ message }}</span>
          <button v-if="actionLabel && actionTo" class="snackbar-action" type="button" @click="followAction">
            {{ actionLabel }} <ArrowRight :size="14" />
          </button>
        </div>
        <button class="snackbar-close" type="button" aria-label="關閉提醒" @click="close"><X :size="18" /></button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.api-snackbar{position:fixed;z-index:1000;right:22px;bottom:24px;display:grid;grid-template-columns:38px minmax(0,1fr) 34px;align-items:start;gap:11px;width:min(430px,calc(100vw - 28px));padding:13px 11px 13px 13px;border:1px solid rgba(255,255,255,.72);border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,.94),rgba(247,243,234,.86));box-shadow:inset 0 1px 0 #fff,0 16px 38px rgba(36,87,90,.2);color:var(--mountain);-webkit-backdrop-filter:blur(24px) saturate(150%);backdrop-filter:blur(24px) saturate(150%)}.snackbar-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:13px;background:rgba(184,91,75,.13);color:var(--cinnabar)}.api-snackbar.is-info .snackbar-icon{background:rgba(107,166,160,.16);color:var(--jade)}.snackbar-copy{display:grid;gap:3px;min-width:0}.snackbar-copy strong{font-size:13px}.snackbar-copy>span{color:var(--text-soft);font-size:12px;line-height:1.5;overflow-wrap:anywhere;white-space:normal}.snackbar-action{display:inline-flex;align-items:center;justify-self:start;gap:4px;min-height:30px;margin-top:5px;padding:5px 10px;border:0;border-radius:10px;background:rgba(36,87,90,.09);color:var(--mountain);font-size:12px;font-weight:850}.snackbar-close{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:50%;background:rgba(36,87,90,.07);color:var(--mountain)}.api-snackbar-enter-active,.api-snackbar-leave-active{transition:opacity .22s ease,transform .22s ease}.api-snackbar-enter-from,.api-snackbar-leave-to{opacity:0;transform:translateY(14px) scale(.97)}@media(max-width:759px){.api-snackbar{right:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(50%)}.api-snackbar-enter-from,.api-snackbar-leave-to{transform:translateX(50%) translateY(14px) scale(.97)}}
</style>
