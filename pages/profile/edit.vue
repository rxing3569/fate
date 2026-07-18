<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const chartStore = useChartStore()
const message = ref('')
const error = ref('')
const saving = ref(false)
const pendingBirthInfo = ref<Parameters<typeof chartStore.saveBirthInfo>[0] | null>(null)

onMounted(() => {
  if (auth.profile) chartStore.restoreFromProfile(auth.profile)
  else chartStore.hydrate()
})

function isSameBirthInfo(next: Parameters<typeof chartStore.saveBirthInfo>[0]) {
  const current = chartStore.birthInfo
  if (!current) return false
  return current.gender === next.gender && current.year === next.year && current.month === next.month && current.day === next.day
    && current.hour === next.hour && current.minute === next.minute && current.cityId === next.cityId
    && Number(current.longitude ?? 120).toFixed(2) === Number(next.longitude ?? 120).toFixed(2)
}

function saveProfileBirth(info: Parameters<typeof chartStore.saveBirthInfo>[0]) {
  message.value = ''
  error.value = ''
  if (isSameBirthInfo(info)) {
    navigateTo('/member')
    return
  }
  pendingBirthInfo.value = info
}

async function confirmProfileBirth() {
  if (!pendingBirthInfo.value) return
  saving.value = true
  error.value = ''
  try {
    await chartStore.saveBirthInfoAndSync(pendingBirthInfo.value, true)
    pendingBirthInfo.value = null
    message.value = '命盤資料已修改，舊命盤紀錄已清空。'
    await navigateTo('/member')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '資料更新失敗，請稍後再試。'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppPageLayout title="命盤資料" screen-class="profile-screen" show-back>
    <main class="profile-content">
      <p class="profile-note">修改出生資料後，命盤與分析內容也會同步更新。</p>
      <BirthInfoForm :initial="chartStore.birthInfo" :disabled="saving" :submit-label="saving ? '更新中…' : '儲存修改'" @submit="saveProfileBirth" />
      <p v-if="error" class="form-message error" role="alert">{{ error }}</p>
      <p v-if="message" class="form-message">{{ message }}</p>
    </main>
    <BirthInfoChangeConfirm :open="Boolean(pendingBirthInfo)" :loading="saving" @cancel="pendingBirthInfo = null" @confirm="confirmProfileBirth" />
  </AppPageLayout>
</template>

<style scoped>
.profile-content { max-width:780px;padding:18px 18px 120px;margin:0 auto; }
.profile-note { margin: 0 0 18px; color: var(--text-soft); font-size: 14px; line-height: 1.6; text-align: center; }
.form-message { margin:14px 0 0;color:var(--mountain);font-size:13px;font-weight:700;text-align:center; }
.form-message.error { color:var(--cinnabar); }
@media(max-width:520px){.profile-content{padding:10px 12px 100px}}
</style>
