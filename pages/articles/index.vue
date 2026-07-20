<script setup lang="ts">
import { ArrowRight, BookOpen } from "@lucide/vue";
import { articles } from "~/utils/articles";

useSeoMeta({
  title: "紫微斗數命理專欄｜江映澄紫微",
  description: "閱讀紫微斗數入門、星曜四化與大限運勢等命理文章，用清楚的觀念與實例建立正確的命盤閱讀方法。",
  ogTitle: "紫微斗數命理專欄｜江映澄紫微",
  ogDescription: "從命盤基礎、星曜四化到大限運勢，循序建立紫微斗數的閱讀方法。",
});
</script>
<template>
  <AppPageLayout title="命理專欄" screen-class="articles-screen">
    <main class="articles-content">
      <section class="article-list">
        <NuxtLink
          v-for="article in articles"
          :key="article.slug"
          :to="`/articles/${article.slug}`"
          class="article-card glass"
          ><span class="article-icon"><BookOpen :size="22" /></span>
          <div>
            <small>{{ article.category }}・{{ article.readingTime }}</small>
            <h2>{{ article.title }}</h2>
            <p>{{ article.excerpt }}</p>
            <footer>
              <time :datetime="article.date">{{ article.date }}</time
              ><b>閱讀文章 <ArrowRight :size="14" /></b>
            </footer></div
        ></NuxtLink>
      </section>
    </main>
  </AppPageLayout>
</template>
<style scoped>
.articles-content {
  padding: 20px 18px 120px;
}
.article-list {
  display: grid;
  gap: 16px;
}
.article-card {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 14px;
  padding: 22px;
  border-radius: 25px;
}
.article-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: rgba(107, 166, 160, 0.14);
  color: var(--jade);
}
.article-card small {
  color: var(--cinnabar);
  font-size: 11px;
  font-weight: 800;
}
.article-card h2 {
  margin: 7px 0;
  font-size: 19px;
  line-height: 1.45;
}
.article-card p {
  margin: 0;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.65;
}
.article-card footer {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
  color: rgba(36, 87, 90, 0.46);
  font-size: 11px;
}
.article-card footer b {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--mountain);
  font-size: 14px;
}
@media (min-width: 760px) {
  .articles-content {
    padding-inline: 28px;
  }
  .article-card {
    padding: 26px;
  }
  .article-card:hover {
    transform: translateY(-2px);
  }
}
</style>
