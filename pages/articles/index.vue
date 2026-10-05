<script setup lang="ts">
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
} from "@lucide/vue";
import Fuse from "fuse.js";
import { articles } from "~/utils/articles";

const route = useRoute();
const router = useRouter();
const pageSize = 10;
const searchQuery = ref(String(route.query.q || ""));
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const fuse = new Fuse(articles, {
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 1,
  threshold: 0.32,
  keys: [
    { name: "title", weight: 0.38 },
    { name: "seoKeywords", weight: 0.25 },
    { name: "excerpt", weight: 0.16 },
    { name: "category", weight: 0.11 },
    { name: "content", weight: 0.1 },
  ],
});

const filteredArticles = computed(() => {
  const query = searchQuery.value.trim();
  return query ? fuse.search(query).map(({ item }) => item) : articles;
});
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredArticles.value.length / pageSize)),
);
const requestedPage = computed(() => {
  const value = Number.parseInt(String(route.query.page || "1"), 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
});
const currentPage = computed(() =>
  Math.min(requestedPage.value, totalPages.value),
);
const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  return filteredArticles.value.slice(start, start + pageSize);
});
const pageNumbers = computed(() =>
  Array.from({ length: totalPages.value }, (_, index) => index + 1),
);

watch(
  () => route.query.q,
  (value) => {
    const routeQuery = String(value || "");
    if (routeQuery !== searchQuery.value) searchQuery.value = routeQuery;
  },
);
watch(searchQuery, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const query = { ...route.query };
    const normalized = value.trim();
    if (normalized) query.q = normalized;
    else delete query.q;
    delete query.page;
    router.replace({ query });
  }, 250);
});
watch([totalPages, requestedPage], ([lastPage, page]) => {
  if (page <= lastPage) return;
  const query = { ...route.query };
  if (lastPage > 1) query.page = String(lastPage);
  else delete query.page;
  router.replace({ query });
});
onBeforeUnmount(() => clearTimeout(searchTimer));

function clearSearch() {
  searchQuery.value = "";
}
async function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  const query = { ...route.query };
  if (page === 1) delete query.page;
  else query.page = String(page);
  await router.push({ query });
  await nextTick();
  document.querySelector(".articles-toolbar")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

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
      <section class="articles-toolbar" aria-label="文章搜尋">
        <label class="article-search">
          <Search :size="19" aria-hidden="true" />
          <span class="sr-only">搜尋命理專欄</span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="搜尋文章、主星或命盤主題"
            autocomplete="off"
          />
          <button
            v-if="searchQuery"
            type="button"
            aria-label="清除搜尋"
            @click="clearSearch"
          >
            <X :size="17" aria-hidden="true" />
          </button>
        </label>
        <p aria-live="polite">
          <template v-if="searchQuery.trim()">
            「{{ searchQuery.trim() }}」找到 {{ filteredArticles.length }} 篇文章
          </template>
          <template v-else>共 {{ filteredArticles.length }} 篇文章</template>
        </p>
      </section>
      <section v-if="paginatedArticles.length" class="article-list">
        <NuxtLink
          v-for="article in paginatedArticles"
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
      <section v-else class="article-empty glass">
        <BookOpen :size="30" aria-hidden="true" />
        <h2>找不到符合的文章</h2>
        <p>換一個主星、宮位或主題關鍵字再試試看。</p>
        <button type="button" @click="clearSearch">清除搜尋</button>
      </section>
      <nav
        v-if="filteredArticles.length && totalPages > 1"
        class="article-pagination"
        aria-label="文章分頁"
      >
        <button
          type="button"
          :disabled="currentPage === 1"
          aria-label="上一頁"
          @click="goToPage(currentPage - 1)"
        >
          <ChevronLeft :size="18" aria-hidden="true" />
        </button>
        <button
          v-for="page in pageNumbers"
          :key="page"
          type="button"
          :class="{ active: page === currentPage }"
          :aria-current="page === currentPage ? 'page' : undefined"
          :aria-label="`第 ${page} 頁`"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
        <button
          type="button"
          :disabled="currentPage === totalPages"
          aria-label="下一頁"
          @click="goToPage(currentPage + 1)"
        >
          <ChevronRight :size="18" aria-hidden="true" />
        </button>
      </nav>
    </main>
  </AppPageLayout>
</template>
<style scoped>
.articles-content {
  padding: 20px 18px 120px;
}
.articles-toolbar {
  scroll-margin-top: 86px;
  margin-top: 18px;
}
.article-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 15px;
  border: 1px solid rgba(36, 87, 90, 0.14);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--jade);
  box-shadow: 0 8px 24px rgba(36, 87, 90, 0.06);
}
.article-search:focus-within {
  border-color: rgba(107, 166, 160, 0.65);
  box-shadow: 0 0 0 3px rgba(107, 166, 160, 0.12);
}
.article-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--mountain);
  font: inherit;
}
.article-search input::placeholder {
  color: rgba(36, 87, 90, 0.45);
}
.article-search button {
  display: grid;
  place-items: center;
  padding: 4px;
  border: 0;
  background: transparent;
  color: rgba(36, 87, 90, 0.56);
  cursor: pointer;
}
.articles-toolbar > p {
  margin: 9px 4px 0;
  color: rgba(36, 87, 90, 0.58);
  font-size: 12px;
}
.article-list {
  display: grid;
  gap: 16px;
  margin-top: 14px;
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
.article-empty {
  margin-top: 18px;
  padding: 42px 24px;
  border-radius: 25px;
  color: var(--text-soft);
  text-align: center;
}
.article-empty h2 {
  margin: 12px 0 5px;
  color: var(--mountain);
  font-size: 19px;
}
.article-empty p {
  margin: 0;
  font-size: 13px;
}
.article-empty button {
  margin-top: 18px;
  padding: 9px 17px;
  border: 0;
  border-radius: 999px;
  background: var(--mountain);
  color: white;
  font-weight: 800;
  cursor: pointer;
}
.article-pagination {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 28px;
}
.article-pagination button {
  display: grid;
  place-items: center;
  min-width: 38px;
  height: 38px;
  padding: 0 10px;
  border: 1px solid rgba(36, 87, 90, 0.14);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--mountain);
  font-weight: 800;
  cursor: pointer;
}
.article-pagination button.active {
  border-color: var(--mountain);
  background: var(--mountain);
  color: white;
}
.article-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
  .article-search {
    max-width: 620px;
  }
}
</style>
