<script setup lang="ts">
import { AlertCircle, ArrowRight, CircleCheck, X } from '@lucide/vue'
import { APP_SNACKBAR_EVENT, type AppSnackbarOptions } from '~/utils/app-snackbar'

type SnackbarItem = AppSnackbarOptions & { type: 'error' | 'info' }

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

onMounted(() => window.addEventListener(APP_SNACKBAR_EVENT, receive))
onBeforeUnmount(() => {
  window.removeEventListener(APP_SNACKBAR_EVENT, receive)
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fate-app-snackbar">
      <div v-if="visible" class="fate-app-snackbar" :class="`fate-app-snackbar--${type}`" role="status" aria-live="polite">
        <span class="fate-app-snackbar__icon">
          <CircleCheck v-if="type === 'info'" :size="20" />
          <AlertCircle v-else :size="20" />
        </span>
        <div class="fate-app-snackbar__copy">
          <strong>{{ title }}</strong>
          <span>{{ message }}</span>
          <button v-if="actionLabel && actionTo" class="fate-app-snackbar__action" type="button" @click="followAction">
            {{ actionLabel }} <ArrowRight :size="14" />
          </button>
        </div>
        <button class="fate-app-snackbar__close" type="button" aria-label="關閉提醒" @click="close"><X :size="18" /></button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fate-app-snackbar {
  position: fixed;
  z-index: 1000;
  left: var(--fate-app-content-center-x, 50vw);
  bottom: calc(24px + env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 11px;
  width: min(430px, calc(100vw - 28px));
  padding: 13px 11px 13px 13px;
  transform: translateX(-50%);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 20px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(247, 243, 234, 0.86));
  box-shadow: inset 0 1px 0 #fff, 0 16px 38px rgba(36, 87, 90, 0.2);
  color: var(--mountain);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  backdrop-filter: blur(24px) saturate(150%);
}
.fate-app-snackbar__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 13px;
  background: rgba(184, 91, 75, 0.13);
  color: var(--cinnabar);
}
.fate-app-snackbar--info .fate-app-snackbar__icon {
  background: rgba(107, 166, 160, 0.16);
  color: var(--jade);
}
.fate-app-snackbar__copy {
  display: grid;
  align-content: center;
  gap: 3px;
  min-width: 0;
  text-align: left;
}
.fate-app-snackbar__copy strong {
  font-size: 13px;
}
.fate-app-snackbar__copy > span {
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.fate-app-snackbar__action {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 4px;
  min-height: 30px;
  margin-top: 5px;
  padding: 5px 10px;
  border: 0;
  border-radius: 10px;
  background: rgba(36, 87, 90, 0.09);
  color: var(--mountain);
  font-size: 12px;
  font-weight: 850;
}
.fate-app-snackbar__close {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: rgba(36, 87, 90, 0.07);
  color: var(--mountain);
}
.fate-app-snackbar-enter-active,
.fate-app-snackbar-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.fate-app-snackbar-enter-from,
.fate-app-snackbar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(14px) scale(0.97);
}
@media (max-width: 759px) {
  .fate-app-snackbar {
    bottom: calc(88px + env(safe-area-inset-bottom));
  }
}
</style>
