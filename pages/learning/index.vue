<script setup lang="ts">
const topics = [
  { to: '/learning/1/', title: '入門', desc: '紫微斗數基礎觀念' },
  { to: '/quiz/', title: '測驗', desc: '題庫與學習進度' },
]
useSeoMeta({
  title: '紫微斗數學習中心｜江映澄紫微',
  description: '從紫微斗數入門課程、星曜與宮位知識開始學習，搭配題庫測驗與進度複習，循序建立命盤判讀能力。',
})
</script>

<template>
  <AppPageLayout title="學習中心" screen-class="learning-index-screen">
    <main class="app-page-content">
      <p class="subtitle">選擇課程或題庫，開始學習紫微斗數。</p>
      <section class="section grid grid-2">
        <NuxtLink v-for="topic in topics" :key="topic.to" class="panel panel-pad" :to="topic.to">
          <span class="tag">{{ topic.title }}</span>
          <h2>{{ topic.desc }}</h2>
        </NuxtLink>
      </section>
    </main>
  </AppPageLayout>
</template>
