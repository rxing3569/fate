<script setup lang="ts">
import { BookOpen, Check } from "@lucide/vue";
import { learningStages } from "~/utils/learning";
import { getReviewLevel, parseReviewQuestions } from "~/utils/questionBank";

const route = useRoute();
const levelSlug = computed(() => String(route.params.level || ""));
const courseId = computed(() => String(route.params.course || ""));
const level = computed(() => getReviewLevel(levelSlug.value));
const course = computed(() =>
  learningStages.find(
    (item) => item.id === courseId.value && item.kind !== "action",
  ),
);
const isValidCourse = computed(() =>
  Boolean(level.value?.courseIds.includes(courseId.value) && course.value),
);

function courseTitle(id: string) {
  return learningStages.find((item) => item.id === id)?.title || id;
}

const {
  data: questions,
  status,
  error: questionError,
} = await useAsyncData(
  `review-${levelSlug.value}-${courseId.value}`,
  async () => {
    if (!isValidCourse.value) throw new Error("invalid-course");

    let markdown: string;
    if (import.meta.server) {
      const [{ readFile }, { resolve }] = await Promise.all([
        import("node:fs/promises"),
        import("node:path"),
      ]);
      markdown = await readFile(
        resolve(
          process.cwd(),
          "public",
          "docs",
          "question",
          `${courseId.value}.md`,
        ),
        "utf8",
      );
    } else {
      markdown = await $fetch<string>(`/docs/question/${courseId.value}.md`, {
        responseType: "text",
      });
    }

    const parsed = parseReviewQuestions(markdown);
    if (!parsed.length) throw new Error("empty-question-bank");
    return parsed;
  },
  {
    default: () => [],
    watch: [levelSlug, courseId],
  },
);

const loading = computed(() => status.value === "pending");
const error = computed(() => {
  if (!isValidCourse.value) return "找不到指定的題庫課程。";
  return questionError.value ? "題庫內容載入失敗，請稍後再試。" : "";
});

useSeoMeta({
  title: () => `${course.value?.title || "題庫複習"}｜紫微斗數題庫｜江映澄紫微`,
  description: () =>
    `複習${course.value?.title || "紫微斗數"}題目、正確答案與重點解析。`,
});
</script>

<template>
  <LearningHubLayout
    :title="level?.title || '題庫複習'"
    screen-class="review-detail-screen"
    show-back
    back-to="/review/"
    back-label="返回題庫分類"
  >
    <main class="review-detail-content">
      <nav
        v-if="level"
        class="course-scroll"
        :aria-label="`${level.title}題庫課程`"
      >
        <NuxtLink
          v-for="id in level.courseIds"
          :key="id"
          :to="`/review/${level.slug}/${id}/`"
          :class="{ active: id === courseId }"
        >
          <small>{{ id.replace("_", "-") }}</small>
          <span>{{ courseTitle(id) }}</span>
        </NuxtLink>
      </nav>

      <header v-if="isValidCourse" class="course-heading">
        <small>{{ level?.title }}題庫</small>
        <h2>{{ course?.title }}</h2>
        <p>
          共 {{ questions.length }} 題，正確答案與解析會直接顯示於題目下方。
        </p>
      </header>

      <div v-if="loading" class="review-state">
        <span class="loading-ring" />載入題庫內容
      </div>
      <p v-else-if="error" class="review-state error-state">{{ error }}</p>
      <div v-else class="question-list">
        <article
          v-for="(question, index) in questions"
          :key="question.text"
          class="question-card glass"
        >
          <small>第 {{ index + 1 }} 題</small>
          <h3>{{ question.text }}</h3>
          <ul>
            <li
              v-for="option in question.options"
              :key="option.key"
              :class="{ correct: option.key === question.answer }"
            >
              <b>{{ option.key }}</b
              ><span>{{ option.text }}</span
              ><Check v-if="option.key === question.answer" :size="17" />
            </li>
          </ul>
          <p v-if="question.explanation" class="explanation">
            <BookOpen :size="16" /><span>{{ question.explanation }}</span>
          </p>
        </article>
      </div>
    </main>
  </LearningHubLayout>
</template>

<style scoped>
.review-detail-content {
  padding: 10px 18px calc(122px + env(safe-area-inset-bottom));
  overflow-x: hidden;
}
.course-scroll {
  display: flex;
  gap: 9px;
  width: 100%;
  margin: 0;
  padding: 8px 0 14px;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
}
.course-scroll::-webkit-scrollbar {
  display: none;
}
.course-scroll a {
  display: grid;
  flex: 0 0 auto;
  gap: 2px;
  min-width: 112px;
  padding: 10px 13px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.54);
  color: var(--text-soft);
  scroll-snap-align: start;
}
.course-scroll a small {
  font-size: 10px;
  font-weight: 900;
}
.course-scroll a span {
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}
.course-scroll a.active {
  border-color: var(--mountain);
  background: var(--mountain);
  color: #fff;
  box-shadow: 0 8px 18px rgba(36, 87, 90, 0.18);
}
.course-heading {
  padding: 17px 2px 15px;
}
.course-heading > small {
  color: var(--cinnabar);
  font-size: 11px;
  font-weight: 900;
}
.course-heading h2 {
  margin: 5px 0;
  font-family: "Noto Serif TC", serif;
  font-size: 23px;
}
.course-heading p {
  margin: 0;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.6;
}
.question-list {
  display: grid;
  gap: 13px;
}
.question-card {
  min-width: 0;
  overflow: hidden;
  padding: 17px;
  border-radius: 20px;
}
.question-card > small {
  color: var(--cinnabar);
  font-size: 11px;
  font-weight: 900;
}
.question-card h3 {
  margin: 7px 0 13px;
  font-size: 16px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.question-card ul {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.question-card li {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 8px;
  padding: 9px;
  border-radius: 11px;
  color: var(--text-soft);
  font-size: 13px;
}
.question-card li > span,
.explanation > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.question-card li b {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: rgba(36, 87, 90, 0.08);
}
.question-card li.correct {
  background: rgba(107, 166, 160, 0.15);
  color: var(--mountain);
  font-weight: 800;
}
.explanation {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 13px 0 0;
  padding: 11px;
  border-radius: 12px;
  background: rgba(180, 155, 117, 0.12);
  color: var(--mountain);
  font-size: 12px;
  line-height: 1.6;
}
.explanation svg {
  flex: none;
  margin-top: 2px;
}
.review-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 180px;
  color: var(--text-soft);
  font-size: 13px;
  font-weight: 800;
}
.loading-ring {
  width: 21px;
  height: 21px;
  border: 3px solid rgba(36, 87, 90, 0.13);
  border-top-color: var(--mountain);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.error-state {
  color: var(--cinnabar);
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
