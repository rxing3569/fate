<script setup lang="ts">
import { ChevronLeft, Clock } from "@lucide/vue";
import { getArticle } from "~/utils/articles";
import type { NextStepAction } from "~/types/next-step";
const route = useRoute();
const article = computed(() => getArticle(String(route.params.slug || "")));
if (!article.value)
  throw createError({ statusCode: 404, statusMessage: "找不到這篇文章" });
const articleSeoTitle = computed(
  () =>
    `${article.value?.title || "紫微斗數專欄"}｜江映澄紫微、AI紫微、紫微教學平台`,
);
const articleSeoDescription = computed(
  () => article.value?.seoDescription || article.value?.excerpt || "",
);
const articleCanonical = computed(
  () => `https://www.fatejyc.com/articles/${article.value?.slug || ""}/`,
);
useSeoMeta({
  title: () => articleSeoTitle.value,
  description: () => articleSeoDescription.value,
  keywords: () => article.value?.seoKeywords.join(", ") || "",
  ogTitle: () => articleSeoTitle.value,
  ogDescription: () => articleSeoDescription.value,
  ogType: "article",
  ogUrl: () => articleCanonical.value,
  twitterCard: "summary_large_image",
  twitterTitle: () => articleSeoTitle.value,
  twitterDescription: () => articleSeoDescription.value,
});
useHead(() => ({
  link: [{ rel: "canonical", href: articleCanonical.value }],
}));
const articleNextSteps = computed<NextStepAction[]>(() => {
  const current = article.value!;
  if (current.nextStepVariant === "stars")
    return [
      {
        id: "article_stars_to_report",
        eyebrow: "回到你的命盤",
        title: "看看這些星曜如何落在你的先天命格",
        description: "從自己的命盤出發，理解星曜與四化如何形成個人特質。",
        label: "解析先天命格",
        destination: "report",
        reportCategory: "general",
      },
      {
        id: "article_stars_to_qa",
        eyebrow: "結合文章提問",
        title: "讓 AI 用你的命盤解釋這篇文章",
        description: "預先帶入文章問題，再由你確認是否送出。",
        label: "帶著文章問 AI",
        destination: "qa",
        questions: [
          `我剛讀完〈${current.title}〉，請結合我的命盤，說明這個觀念對我目前的影響與可以採取的行動。`,
        ],
      },
    ];
  if (current.nextStepVariant === "fortune")
    return [
      {
        id: "article_fortune_to_ten_year",
        eyebrow: "長期方向",
        title: "看看你的十年人生主題",
        description: "把文章中的大限觀念，放回自己的十年大運中理解。",
        label: "解析十年大運",
        destination: "report",
        reportCategory: "ten_year",
      },
      {
		id: "article_fortune_to_annual_flow",
        eyebrow: "近期時機",
        title: "從十年方向聚焦到現在",
		description: "選擇年份，查看全年與四季適合留意的重點。",
		label: "查看流年運勢",
		destination: "annual_flow",
      },
    ];
  return [
    {
      id: "article_intro_to_chart",
      eyebrow: "免費開始",
      title: "建立你的紫微命盤",
      description: "輸入出生資料，先看見命宮、身宮與十二宮星曜。",
      label: "免費線上排盤",
      destination: "chart",
    },
    {
      id: "article_intro_to_report",
      eyebrow: "深入理解",
      title: "讓 AI 整理你的先天命格",
      description: "從人格特質、天賦與發展方向，建立完整的自我理解。",
      label: "解析先天命格",
      destination: "report",
      reportCategory: "general",
    },
  ];
});
</script>
<template>
  <AppPageLayout
    v-if="article"
    title="命理專欄"
    screen-class="article-screen"
    show-back
  >
    <template #title><span class="article-app-title">命理專欄</span></template>
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
      <NextStepCtas
        heading="把文章觀念放進你的命盤"
        :source="{ type: 'article', id: article.slug }"
        :actions="articleNextSteps"
      />
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
.article-app-title {
  overflow: hidden;
  color: var(--mountain);
  font-size: 18px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.article-surface :deep(h3) {
  padding-bottom: 0;
  border-bottom: 0;
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
