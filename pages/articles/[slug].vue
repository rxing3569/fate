<script setup lang="ts">
import { ChevronLeft, Clock } from "@lucide/vue";
import { getArticle } from "~/utils/articles";
const route = useRoute();
const { openChartEntry, openReportEntry } = useChartEntryNavigation();
const article = computed(() => getArticle(String(route.params.slug || "")));
if (!article.value)
  throw createError({ statusCode: 404, statusMessage: "找不到這篇文章" });
useSeoMeta({
  title: () => `${article.value?.title}｜江映澄紫微`,
  description: () => article.value?.excerpt || "",
  ogTitle: () => `${article.value?.title}｜江映澄紫微`,
  ogDescription: () => article.value?.excerpt || "",
  ogType: "article",
});
useHead(() => ({
  link: [{ rel: "canonical", href: `https://www.fatejyc.com/articles/${article.value?.slug}/` }],
}));
</script>
<template>
  <AppPageLayout
    v-if="article"
    title="命理專欄"
    screen-class="article-screen"
    show-back
  >
    <main class="article-content">
      <ArticleBreadcrumb :current="article.title" />
      <header class="article-heading">
        <small>{{ article.category }}</small>
        <h1>{{ article.title }}</h1>
        <p>{{ article.excerpt }}</p>
        <div>
          <time :datetime="article.date">{{ article.date }}</time
          ><span><Clock :size="13" />{{ article.readingTime }}</span>
        </div>
      </header>
      <article class="article-surface glass">
        <MarkdownContent :source="article.content" :report-formatting="false" />
      </article>
      <section class="article-actions" aria-label="命盤服務">
        <div>
          <button class="app-button" type="button" @click="openChartEntry">
            免費線上排盤
          </button>
          <button
            class="app-button outline"
            type="button"
            @click="openReportEntry"
          >
            馬上解析命盤
          </button>
        </div>
      </section>
      <NuxtLink class="back-link" to="/articles"
        ><ChevronLeft :size="15" />返回所有文章</NuxtLink
      >
    </main></AppPageLayout
  >
</template>
<style scoped>
.article-content {
  padding: 22px 18px 120px;
}
.article-heading {
  padding: 22px 6px 25px;
}
.article-heading > small {
  color: var(--cinnabar);
  font-weight: 900;
}
.article-heading h1 {
  margin: 9px 0;
  font-family: "Noto Serif TC", serif;
  font-size: 28px;
  line-height: 1.42;
}
.article-heading p {
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.7;
}
.article-heading > div {
  display: flex;
  gap: 17px;
  color: rgba(36, 87, 90, 0.48);
  font-size: 12px;
}
.article-heading span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.article-surface {
  padding: 24px 20px;
  border-radius: 28px;
}
.article-surface :deep(.markdown-content) {
  font-size: 16px;
  line-height: 1.9;
}
.article-surface :deep(h2) {
  margin-top: 34px;
  font-family: "Noto Serif TC", serif;
}
.article-actions {
  padding: 38px 12px 4px;
  text-align: center;
}
.article-actions > div {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.article-actions .app-button {
  width: 100%;
  min-width: 0;
  margin: 0;
  box-shadow: 0 8px 20px rgba(36, 87, 90, 0.14);
}
.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: fit-content;
  margin: 24px auto 0;
  color: var(--mountain);
  font-size: 13px;
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;
}
@media (min-width: 760px) {
  .article-content {
    padding-inline: 28px;
  }
  .article-surface {
    padding: 38px 42px;
  }
  .article-heading h1 {
    font-size: 34px;
  }
}
</style>
