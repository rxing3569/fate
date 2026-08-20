<script setup lang="ts">
import { ArrowRight, BookOpen } from "@lucide/vue";
import { articles } from "~/utils/articles";

usePageSeo({
  title: "紫微斗數命理專欄｜命盤解析、十四主星、四化、流年與免費排盤教學",
  description:
    "江映澄紫微的 AI紫微、紫微教學平台，整理紫微斗數命理專欄，從紫微命盤入門、十二宮、十四主星、四化到大限與流年，以清楚觀念和實例帶你學會命盤怎麼看、紫微怎麼算；搭配免費排盤練習，理解星曜與宮位關係，逐步建立免費算命、紫微解析及線上解盤所需的實用判讀能力。",
  keywords: ["命盤怎麼看", "紫微怎麼算", "紫微解析", "命盤解析", "紫微斗數"],
  canonicalPath: "/articles/",
  brandLabel: "江映澄紫微、AI紫微、紫微教學平台",
});
</script>
<template>
  <AppPageLayout title="命理專欄" screen-class="articles-screen">
    <main class="articles-content">
      <ArticleBreadcrumb />
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
  margin-top: 18px;
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
