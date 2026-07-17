<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <nav class="learning-section-tabs segmented" aria-label="學習紫微內容">
    <NuxtLink to="/learn" :class="{ active: route.path === '/learn' }">學習地圖</NuxtLink>
    <NuxtLink to="/review" :class="{ active: route.path.startsWith('/review') }">題庫複習</NuxtLink>
    <NuxtLink to="/quiz?mode=exam" :class="{ active: route.path === '/quiz' && route.query.mode !== 'reading' }">測驗挑戰</NuxtLink>
  </nav>
</template>

<style scoped>
.learning-section-tabs { position:relative;grid-template-columns:repeat(3,1fr);width:min(calc(100% - 36px),644px);height:48px;margin:8px auto 6px;padding:4px;border:1px solid rgba(255,255,255,.74);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.66),rgba(247,243,234,.38) 58%,rgba(107,166,160,.1));box-shadow:inset 0 1px 0 rgba(255,255,255,.94),0 9px 24px rgba(36,87,90,.09);-webkit-backdrop-filter:blur(24px) saturate(150%);backdrop-filter:blur(24px) saturate(150%);overflow:hidden; }
.learning-section-tabs::before { content:"";position:absolute;inset:0;background:radial-gradient(circle at 10% 0,rgba(255,255,255,.78),transparent 42%);pointer-events:none; }
.learning-section-tabs a { position:relative;z-index:1;display:flex;align-items:center;justify-content:center;border:1px solid transparent;border-radius:19px;color:rgba(36,87,90,.6);font-size:13px;font-weight:800;transition:color .18s ease,background .18s ease,box-shadow .18s ease; }
.learning-section-tabs a.active { border-color:rgba(255,255,255,.36);background:linear-gradient(145deg,rgba(36,87,90,.94),rgba(36,87,90,.78));box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 5px 13px rgba(36,87,90,.2);color:#fff; }
.learning-section-tabs a:not(.active):hover { color:var(--mountain);background:rgba(255,255,255,.32); }
@media(min-width:760px){.learning-section-tabs{margin-top:10px}}
</style>
