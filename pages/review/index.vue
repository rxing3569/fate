<script setup lang="ts">
import { BookOpen, Layers3, Sparkles } from "@lucide/vue";
import { reviewLevels } from "~/utils/questionBank";

const icons = [BookOpen, Layers3, Sparkles];

usePageSeo({
  title: "紫微斗數題庫複習｜命盤解析、十四主星、四化、流年與線上解盤教學",
  description:
    "江映澄紫微的 AI紫微、紫微教學平台，依基礎、進階與高階分類整理紫微斗數題庫；逐課複習題目、正確答案與重點解析，掌握命盤結構、星曜特質、四化及流年時運，再搭配免費排盤實際驗證，釐清命盤怎麼看與紫微解析步驟，建立免費算命及線上解盤所需的穩定判讀基礎。",
  keywords: ["紫微斗數", "命盤怎麼看", "紫微解析", "命盤解析"],
  canonicalPath: "/review/",
});
</script>

<template>
  <LearningHubLayout screen-class="review-screen">
    <main class="review-content learning-hub-content">
      <div class="level-grid">
        <NuxtLink
          v-for="(level, index) in reviewLevels"
          :key="level.slug"
          class="level-card glass"
          :to="`/review/${level.slug}/${level.courseIds[0]}/`"
        >
          <span class="level-icon"
            ><component :is="icons[index]" :size="25"
          /></span>
          <span class="level-copy">
            <strong>{{ level.title }}</strong>
            <small>{{ level.subtitle }}</small>
            <p>{{ level.description }}</p>
            <b>{{ level.courseIds.length }} 個課程</b>
          </span>
          <span class="level-arrow">›</span>
        </NuxtLink>
      </div>
    </main>
  </LearningHubLayout>
</template>

<style scoped>
.review-content {
  padding-bottom: 50px;
}

.level-grid {
  display: grid;
  gap: 14px;
}
.level-card {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 13px;
  padding: 20px;
  border-radius: 24px;
  color: var(--mountain);
}
.level-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 17px;
  background: rgba(107, 166, 160, 0.16);
  color: var(--jade);
}
.level-copy {
  display: grid;
  gap: 5px;
}
.level-copy strong {
  font-size: 20px;
}
.level-copy small {
  color: var(--tea);
  font-size: 12px;
  font-weight: 800;
}
.level-copy p {
  margin: 2px 0;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.55;
}
.level-copy b {
  color: var(--cinnabar);
  font-size: 11px;
}
.level-arrow {
  font-size: 26px;
  opacity: 0.55;
}
.level-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px rgba(36, 87, 90, 0.12);
}
</style>
