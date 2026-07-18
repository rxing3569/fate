<script setup lang="ts">
import { ArrowLeft, Home, SearchX } from '@lucide/vue'

definePageMeta({ layout: false })
useSeoMeta({ title: '找不到頁面｜江映澄紫微', robots: 'noindex, nofollow' })

const event = useRequestEvent()
if (event) setResponseStatus(event, 404, 'Page Not Found')

function goBack() {
  if (window.history.length > 1) window.history.back()
  else navigateTo('/')
}
</script>

<template>
  <div class="not-found-screen">
    <main class="not-found-card glass">
      <span class="not-found-icon"><SearchX :size="40" /></span>
      <p class="not-found-code">404</p>
      <h1>這個頁面不存在</h1>
      <p class="not-found-copy">網址可能已變更、輸入有誤，或這個頁面已經移除。</p>
      <div class="not-found-actions">
        <button class="secondary-action" type="button" @click="goBack">
          <ArrowLeft :size="18" />返回上一頁
        </button>
        <NuxtLink class="primary-action" to="/">
          <Home :size="18" />回到首頁
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<style scoped>
.not-found-screen {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at 50% 20%, rgba(107, 166, 160, 0.18), transparent 42%),
    var(--paper, #f7f3ea);
  color: var(--mountain, #24575a);
}
.not-found-card {
  display: grid;
  justify-items: center;
  width: min(100%, 460px);
  padding: 40px 26px 30px;
  border-radius: 32px;
  text-align: center;
}
.not-found-icon {
  display: grid;
  width: 76px;
  height: 76px;
  margin-bottom: 17px;
  place-items: center;
  border-radius: 24px;
  background: rgba(107, 166, 160, 0.15);
  color: var(--jade, #6ba6a0);
}
.not-found-code {
  margin: 0 0 5px;
  color: var(--jade, #6ba6a0);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.16em;
}
h1 { margin: 0; font-size: clamp(23px, 6vw, 30px); }
.not-found-copy {
  max-width: 330px;
  margin: 13px 0 25px;
  color: var(--text-soft, #687d7d);
  font-size: 14px;
  line-height: 1.75;
}
.not-found-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
.not-found-actions button,
.not-found-actions a {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 46px;
  border-radius: 15px;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
  cursor: pointer;
}
.primary-action { border: 0; background: var(--mountain, #24575a); color: white; }
.secondary-action { border: 1px solid rgba(36, 87, 90, 0.18); background: rgba(255, 255, 255, 0.5); color: var(--mountain, #24575a); }
@media (max-width: 420px) { .not-found-actions { grid-template-columns: 1fr; } }
</style>
