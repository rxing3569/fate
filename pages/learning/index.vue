<script setup lang="ts">
const topics = [
  { to: '/learning/1/', title: '入門', desc: '紫微斗數基礎觀念' },
  { to: '/quiz/', title: '測驗', desc: '題庫與學習進度' },
]
usePageSeo({
  title: '紫微斗數入門課程｜命盤教學、線上題庫、免費排盤與解盤學習中心',
  description: '江映澄紫微的 AI紫微、紫微教學平台，整理紫微命盤、宮位、星曜、四化與流年等入門課程；搭配線上題庫、答案解析與學習進度，幫助初學者循序學會命盤怎麼看、紫微怎麼算，再透過免費排盤理解星曜與宮位關係，掌握從基礎到流年的學習順序，建立免費算命及線上解盤的實用判讀能力。',
  keywords: ['紫微斗數', '命盤怎麼看', '紫微怎麼算', '紫微命盤'],
  canonicalPath: '/learning/',
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
