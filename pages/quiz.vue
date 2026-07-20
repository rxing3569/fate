<script setup lang="ts">
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
} from "@lucide/vue";
import { learningStages, stageLabel } from "~/utils/learning";

type Question = {
  text: string;
  options: { key: string; text: string }[];
  answer: string;
  explanation: string;
  courseId: string;
};
type Category = {
  title: string;
  subtitle: string;
  description: string;
  ids: string[];
};

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const stageId = computed(() =>
  typeof route.query.stage === "string" ? route.query.stage : "",
);
const stage = computed(() =>
  learningStages.find(
    (item) => item.id === stageId.value && item.kind !== "action",
  ),
);
const courseStages = learningStages.filter((item) => item.kind !== "action");
const groups = [
  { title: "基礎入門", ids: ["1", "2_1", "2_2", "2_3"] },
  {
    title: "星曜進階",
    ids: ["3_1", "3_2", "3_3", "3_4", "3_5", "3_6", "3_7", "3_8"],
  },
  { title: "進階變化", ids: ["4_1", "4_2"] },
];
const categories: Category[] = [
  {
    title: "基礎題",
    subtitle: "課程 1 - 2 基礎觀念",
    description: "認識命盤、天干地支、十二宮、三方四正判讀。",
    ids: groups[0]!.ids,
  },
  {
    title: "進階題",
    subtitle: "課程 3 星曜特質",
    description: "十四主星、吉星、凶星、雜曜與四類十二神。",
    ids: groups[1]!.ids,
  },
  {
    title: "高階題",
    subtitle: "課程 4 進階變化",
    description: "宮位四化、十年大限主題與流年推算。",
    ids: groups[2]!.ids,
  },
];

const mode = ref<"exam" | "reading">(
  route.query.mode === "reading" ? "reading" : "exam",
);
const selectedCategory = ref(0);
const customIds = ref<string[]>([]);
const readingGroup = ref(0);
const readingCourseId = ref("1");
const readingQuestions = ref<Question[]>([]);
const questions = ref<Question[]>([]);
const current = ref(0);
const selected = ref("");
const score = ref(0);
const wrongQuestions = ref<Question[]>([]);
const view = ref<"dashboard" | "quiz" | "result" | "stage-result">("dashboard");
const stagePassed = ref(false);
const loading = ref(false);
const error = ref("");
const showExit = ref(false);
const showCustomSheet = ref(false);
const feedbackOpen = computed(
  () => view.value === "quiz" && Boolean(selected.value),
);

useBodyScrollLock(feedbackOpen);

function shuffle<T>(values: T[]) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function parseQuestions(markdown: string, courseId: string) {
  return markdown
    .split(/^##\s+/m)
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const text = lines.shift() || "";
      const raw = lines
        .filter((line) => /^[A-D]\.\s/.test(line))
        .map((line) => ({ original: line[0]!, text: line.slice(3).trim() }));
      const answerLine =
        lines.find((line) => /^\*\*答案[：:]/.test(line)) || "";
      const originalAnswer = answerLine
        .replace(/^\*\*答案[：:]\s*/, "")
        .replace(/\*\*.*/, "")
        .trim();
      const shuffled = shuffle(raw);
      const options = shuffled.map((option, index) => ({
        key: String.fromCharCode(65 + index),
        text: option.text,
        original: option.original,
      }));
      const explanationLine =
        lines.find((line) => /^\*\*解析[：:]\*\*/.test(line)) || "";
      return {
        text,
        options: options.map(({ key, text }) => ({ key, text })),
        answer:
          options.find((option) => option.original === originalAnswer)?.key ||
          "",
        explanation: explanationLine
          .replace(/^\*\*解析[：:]\*\*\s*/, "")
          .trim(),
        courseId,
      };
    })
    .filter(
      (question) =>
        question.text && question.options.length === 4 && question.answer,
    );
}

async function loadCourse(courseId: string) {
  const response = await fetch(`/docs/question/${courseId}.md`);
  if (!response.ok) throw new Error(courseId);
  return parseQuestions(await response.text(), courseId);
}

async function loadCourses(ids: string[]) {
  const results = await Promise.all(
    ids.map((id) => loadCourse(id).catch(() => [])),
  );
  return results.flat();
}

async function loadReading(courseId = readingCourseId.value) {
  readingCourseId.value = courseId;
  loading.value = true;
  error.value = "";
  try {
    readingQuestions.value = await loadCourse(courseId);
  } catch {
    error.value = "無法載入該課程的題庫內容。";
  } finally {
    loading.value = false;
  }
}

async function startQuiz(ids: string[], isStage = false) {
  if (!ids.length) {
    error.value = "請先選擇要挑戰的課程。";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const bank = await loadCourses(ids);
    if (!bank.length) throw new Error("empty");
    questions.value = shuffle(bank).slice(0, isStage ? 8 : 10);
    current.value = 0;
    selected.value = "";
    score.value = 0;
    wrongQuestions.value = [];
    view.value = "quiz";
    await router.replace({ query: { ...route.query, active: "1" } });
  } catch {
    error.value = "載入考題失敗，請稍後再試。";
  } finally {
    loading.value = false;
  }
}

function startSelectedExam() {
  const ids =
    selectedCategory.value === 3
      ? customIds.value
      : categories[selectedCategory.value]?.ids || [];
  startQuiz(ids);
}

function selectCategory(index: number) {
  selectedCategory.value = index;
  if (index === 3) {
    error.value = "";
    showCustomSheet.value = true;
    return;
  }
  void startQuiz(categories[index]?.ids || []);
}

async function confirmCustomExam() {
  if (!customIds.value.length) {
    error.value = "請至少選擇一個課程單元。";
    return;
  }
  await startQuiz(customIds.value);
  if (view.value === "quiz") showCustomSheet.value = false;
}

function choose(key: string) {
  if (selected.value) return;
  selected.value = key;
  const question = questions.value[current.value];
  if (!question) return;
  if (key === question.answer) score.value++;
  else wrongQuestions.value.push(question);
}

async function next() {
  if (!selected.value) return;
  if (current.value < questions.value.length - 1) {
    current.value++;
    selected.value = "";
    return;
  }
  if (stage.value) {
    stagePassed.value =
      wrongQuestions.value.length === 0 &&
      score.value === questions.value.length;
    if (stagePassed.value) await auth.completeLearningStage(stage.value.id);
    view.value = "stage-result";
  } else {
    view.value = "result";
  }
  await router.replace({ query: stage.value ? { stage: stage.value.id } : {} });
}

async function exitQuiz() {
  showExit.value = false;
  if (stage.value) return router.replace(`/learning/${stage.value.id}/`);
  view.value = "dashboard";
  await router.replace({ query: {} });
}

function requestExit() {
  const hasAnswered =
    current.value > 0 ||
    Boolean(selected.value) ||
    score.value > 0 ||
    wrongQuestions.value.length > 0;
  if (!hasAnswered) {
    void exitQuiz();
    return;
  }
  showExit.value = true;
}

function retry() {
  if (stage.value) startQuiz([stage.value.id], true);
  else startSelectedExam();
}

async function returnToQuizDashboard() {
  view.value = "dashboard";
  await router.replace({ query: {} });
}

async function init() {
  view.value = "dashboard";
  if (stage.value) await startQuiz([stage.value.id], true);
  else await loadReading("1");
}

watch(stageId, init, { immediate: true });
watch(
  () => route.query.mode,
  (value) => {
    mode.value = value === "reading" ? "reading" : "exam";
  },
);
</script>

<template>
  <LearningHubLayout
    screen-class="quiz-screen"
    :show-navigation="view === 'dashboard'"
  >
    <main v-if="view === 'dashboard'" class="dashboard learning-hub-content">
      <template v-if="mode === 'exam'">
        <button
          v-for="(category, index) in categories"
          :key="category.title"
          class="category-card glass"
          type="button"
          :disabled="loading"
          @click="selectCategory(index)"
        >
          <span class="category-icon"
            ><BookOpen v-if="index === 0" :size="22" /><Sparkles
              v-else
              :size="22"
          /></span>
          <span
            ><strong>{{ category.title }}</strong
            ><small>{{ category.subtitle }}</small>
            <p>{{ category.description }}</p>
            <b>共 {{ category.ids.length }} 個單元</b></span
          >
          <i>›</i>
        </button>
        <button
          class="category-card glass"
          type="button"
          :disabled="loading"
          @click="selectCategory(3)"
        >
          <span class="category-icon"><SlidersHorizontal :size="22" /></span
          ><span
            ><strong>自訂題庫</strong><small>自訂出題範圍</small>
            <p>手動勾選欲測驗的單元，進行針對性挑戰。</p>
            <b>已選 {{ customIds.length }} 個單元</b></span
          ><i>›</i>
        </button>
        <p v-if="error" class="form-error">{{ error }}</p>
      </template>

      <template v-else>
        <div class="level-tabs">
          <button
            v-for="(group, index) in groups"
            :key="group.title"
            type="button"
            :class="{ active: readingGroup === index }"
            @click="
              readingGroup = index;
              loadReading(group.ids[0]);
            "
          >
            {{ group.title }}
          </button>
        </div>
        <div class="course-tabs">
          <button
            v-for="id in groups[readingGroup]?.ids"
            :key="id"
            type="button"
            :class="{ active: readingCourseId === id }"
            @click="loadReading(id)"
          >
            {{ learningStages.find((item) => item.id === id)?.title }}
          </button>
        </div>
        <div v-if="loading" class="loading-state">
          <span class="loading-ring" />載入題庫
        </div>
        <p v-else-if="error" class="form-error">{{ error }}</p>
        <section
          v-else
          v-for="(question, index) in readingQuestions"
          :key="question.text"
          class="reading-card"
        >
          <small>第 {{ index + 1 }} 題</small>
          <h3>{{ question.text }}</h3>
          <p
            v-for="option in question.options"
            :key="option.key"
            :class="{ correct: option.key === question.answer }"
          >
            <b>{{ option.key }}</b
            >{{ option.text
            }}<Check v-if="option.key === question.answer" :size="16" />
          </p>
          <article v-if="question.explanation">
            <BookOpen :size="16" />{{ question.explanation }}
          </article>
        </section>
      </template>
    </main>

    <main v-else-if="view === 'quiz'" class="active-quiz">
      <header class="quiz-progress">
        <button
          class="icon-button"
          type="button"
          aria-label="返回並退出測驗"
          @click="requestExit"
        >
          <ChevronLeft :size="23" />
        </button>
        <h1>{{ stage ? stageLabel(stage) : "測驗挑戰" }}</h1>
        <div class="progress-track">
          <span
            :style="{
              width: `${((current + (selected ? 1 : 0)) / questions.length) * 100}%`,
            }"
          />
        </div>
        <b>{{ current + 1 }} / {{ questions.length }}</b>
      </header>
      <section class="question-area">
        <h2>{{ current + 1 }}. {{ questions[current]?.text }}</h2>
        <button
          v-for="option in questions[current]?.options"
          :key="option.key"
          class="answer"
          :class="{
            correct: selected && option.key === questions[current]?.answer,
            wrong:
              selected === option.key &&
              option.key !== questions[current]?.answer,
          }"
          type="button"
          @click="choose(option.key)"
        >
          <span>{{ option.key }}</span
          ><strong>{{ option.text }}</strong
          ><Check
            v-if="selected && option.key === questions[current]?.answer"
            :size="19"
          /><X v-else-if="selected === option.key" :size="19" />
        </button>
      </section>
      <section
        v-if="selected"
        class="feedback"
        :class="{ wrong: selected !== questions[current]?.answer }"
      >
        <h3>
          {{
            selected === questions[current]?.answer
              ? "答對了！"
              : `答錯了！正確答案是：${questions[current]?.answer}`
          }}
        </h3>
        <p>{{ questions[current]?.explanation }}</p>
        <button class="app-button" type="button" @click="next">
          {{ current === questions.length - 1 ? "查看結果" : "下一題"
          }}<ChevronRight :size="18" />
        </button>
      </section>
    </main>

    <main v-else-if="view === 'stage-result'" class="result-page">
      <span class="result-icon" :class="{ failed: !stagePassed }"
        ><Check v-if="stagePassed" :size="34" /><X v-else :size="34"
      /></span>
      <h1>{{ stagePassed ? "挑戰成功！" : "挑戰失敗" }}</h1>
      <p>
        {{
          stagePassed
            ? "您已順利通過本關卡，學習進度已推進！"
            : `答對 ${score} 題，答錯 ${wrongQuestions.length} 題。需要全部答對才能通過關卡。`
        }}
      </p>
      <button
        v-if="stagePassed"
        class="app-button result-button"
        type="button"
        @click="navigateTo('/learn/', { replace: true })"
      >
        返回關卡地圖
      </button>
      <div v-else class="result-actions">
        <button
          class="app-button outline"
          type="button"
          @click="navigateTo('/learn/', { replace: true })"
        >
          退出關卡</button
        ><button class="app-button" type="button" @click="retry">
          重新挑戰
        </button>
      </div>
    </main>

    <main v-else class="summary-page">
      <header class="summary-header">
        <button
          class="icon-button"
          type="button"
          aria-label="返回練習測驗"
          @click="returnToQuizDashboard"
        >
          <ChevronLeft :size="23" />
        </button>
        <h1>測驗結果評定</h1>
        <span />
      </header>
      <div class="stamp">
        {{
          score === questions.length
            ? "融會貫通"
            : score / questions.length >= 0.8
              ? "略有登堂"
              : score / questions.length >= 0.5
                ? "初學乍練"
                : "再接再厲"
        }}
      </div>
      <section class="score-card">
        <strong
          >正確率 {{ Math.round((score / questions.length) * 100) }}%</strong
        >
        <div>
          <span
            >答對題數<b>{{ score }} 題</b></span
          ><span
            >答錯題數<b class="wrong-text"
              >{{ wrongQuestions.length }} 題</b
            ></span
          >
        </div>
      </section>
      <template v-if="wrongQuestions.length"
        ><h2>錯題分析與重點複習：</h2>
        <section
          v-for="(question, index) in wrongQuestions"
          :key="question.text"
          class="wrong-card"
        >
          <small
            >錯題 {{ index + 1 }}　[{{
              learningStages.find((item) => item.id === question.courseId)
                ?.title
            }}]</small
          >
          <h3>{{ question.text }}</h3>
          <b
            >正確答案：{{ question.answer }}.
            {{
              question.options.find((option) => option.key === question.answer)
                ?.text
            }}</b
          >
          <p>{{ question.explanation }}</p>
        </section></template
      >
      <div class="result-actions">
        <button
          class="app-button outline"
          type="button"
          @click="returnToQuizDashboard"
        >
          返回練習測驗</button
        ><button class="app-button" type="button" @click="retry">
          <RotateCcw :size="17" />再試一次
        </button>
      </div>
    </main>

    <AppBottomSheet
      :open="showExit"
      role="alertdialog"
      labelledby="quiz-exit-title"
      @close="showExit = false"
    >
      <template #header><h2 id="quiz-exit-title">確定退出測驗？</h2></template>
      <section class="exit-sheet">
        <p>退出後，本次測驗的進度將不會被保存。</p>
        <div>
          <button
            class="app-button outline"
            type="button"
            @click="showExit = false"
          >
            繼續測驗</button
          ><button class="app-button danger" type="button" @click="exitQuiz">
            確定退出
          </button>
        </div>
      </section>
    </AppBottomSheet>

    <AppBottomSheet
      :open="showCustomSheet"
      labelledby="custom-sheet-title"
      :locked="loading"
      @close="showCustomSheet = false"
    >
      <template #header>
        <header class="custom-sheet-header">
          <div>
            <small>測驗挑戰</small>
            <h2 id="custom-sheet-title">自訂題庫範圍</h2>
          </div>
          <button
            class="icon-button"
            type="button"
            aria-label="關閉自訂題庫"
            @click="showCustomSheet = false"
          >
            <X :size="21" />
          </button>
        </header>
      </template>
      <div class="custom-sheet">
        <div class="custom-course-list" data-sheet-scroll>
          <label
            v-for="course in courseStages"
            :key="course.id"
            :class="{ selected: customIds.includes(course.id) }"
          >
            <input v-model="customIds" type="checkbox" :value="course.id" />
            <span
              ><small>課程 {{ course.id.replace("_", "-") }}</small
              ><strong>{{ course.title }}</strong></span
            >
            <Check :size="17" />
          </label>
        </div>
        <p class="sheet-selection">已選擇 {{ customIds.length }} 個課程單元</p>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button
          class="app-button sheet-confirm"
          type="button"
          :disabled="loading || !customIds.length"
          @click="confirmCustomExam"
        >
          {{ loading ? "正在準備題目" : "確認並開始 10 題挑戰" }}
        </button>
      </div>
    </AppBottomSheet>
  </LearningHubLayout>
</template>

<style scoped>
.dashboard {
  box-sizing: border-box;
  width: 100%;
  margin: 0 auto;
  padding-bottom: 120px;
}
.summary-page,
.result-page {
  box-sizing: border-box;
  width: 100%;
  margin: 0 auto;
  padding: 18px 18px 120px;
}
.mode-toggle {
  margin: 8px 0 22px;
}

.category-card {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) 20px;
  gap: 12px;
  align-items: center;
  width: 100%;
  margin-bottom: 14px;
  padding: 20px;
  border-radius: 24px;
  color: var(--mountain);
  text-align: left;
}
.category-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 17px;
  background: rgba(107, 166, 160, 0.16);
  color: var(--jade);
}
.category-card strong,
.category-card small,
.category-card b {
  display: block;
}
.category-card strong {
  font-size: 20px;
}
.category-card small {
  margin-top: 5px;
  color: var(--tea);
  font-size: 12px;
  font-weight: 800;
}
.category-card p {
  margin: 7px 0 2px;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.55;
}
.category-card b {
  color: var(--cinnabar);
  font-size: 11px;
}
.category-card i {
  font-style: normal;
  font-weight: 900;
  font-size: 26px;
  opacity: 0.55;
}
.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px rgba(36, 87, 90, 0.12);
}
.category-card:disabled {
  cursor: wait;
  opacity: 0.65;
}
.form-error {
  color: var(--cinnabar);
  font-weight: 700;
  text-align: center;
}
.level-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 13px;
  padding: 3px;
  border-radius: 18px;
  background: var(--paper-deep);
}
.level-tabs button,
.course-tabs button {
  border: 0;
  background: transparent;
  color: var(--mountain);
  font-weight: 800;
}
.level-tabs button {
  min-height: 42px;
  border-radius: 15px;
  font-size: 12px;
}
.level-tabs button.active {
  background: var(--mountain);
  color: white;
}
.course-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.course-tabs button {
  flex: none;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.6);
}
.course-tabs button.active {
  border-color: var(--mountain);
  background: var(--mountain);
  color: white;
}
.loading-state {
  display: flex;
  justify-content: center;
  gap: 9px;
  padding: 50px;
  color: var(--text-soft);
  font-weight: 700;
}
.loading-ring {
  width: 22px;
  height: 22px;
  border: 3px solid rgba(36, 87, 90, 0.14);
  border-top-color: var(--mountain);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.reading-card {
  margin-bottom: 13px;
  padding: 16px;
  border: 1px solid rgba(36, 87, 90, 0.09);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.64);
}
.reading-card small {
  color: var(--cinnabar);
  font-weight: 800;
}
.reading-card h3 {
  margin: 7px 0 12px;
  font-size: 16px;
  line-height: 1.5;
}
.reading-card > p {
  display: grid;
  grid-template-columns: 28px 1fr 18px;
  align-items: center;
  gap: 7px;
  margin: 6px 0;
  padding: 8px;
  border-radius: 10px;
  color: var(--text-soft);
  font-size: 13px;
}
.reading-card > p.correct {
  background: rgba(107, 166, 160, 0.13);
  color: var(--mountain);
  font-weight: 700;
}
.reading-card article {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding: 11px;
  border-radius: 11px;
  background: rgba(180, 155, 117, 0.1);
  font-size: 12px;
  line-height: 1.5;
}
.active-quiz {
  position: relative;
  min-height: 100dvh;
  padding-top: 130px;
  padding-bottom: 220px;
}
.quiz-progress {
  position: fixed;
  z-index: 20;
  top: 0;
  left: 50%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 56px;
  grid-template-rows: 44px 8px;
  column-gap: 10px;
  row-gap: 48px;
  align-items: center;
  width: min(100%, 680px);
  height: 130px;
  padding: 0 12px 30px;
  background: rgba(247, 243, 234, 0.94);
  transform: translateX(-50%);
}
.quiz-progress > .icon-button {
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
}
.quiz-progress h1 {
  grid-column: 1 / -1;
  grid-row: 1;
  justify-self: center;
  overflow: hidden;
  margin: 0;
  font-size: 17px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.quiz-progress .progress-track {
  grid-column: 1;
  grid-row: 2;
  height: 8px;
  overflow: hidden;
  border-radius: 99px;
  background: rgba(36, 87, 90, 0.1);
}
.quiz-progress .progress-track span {
  display: block;
  height: 100%;
  background: var(--jade);
}
.quiz-progress b {
  grid-column: 2;
  grid-row: 2;
  align-self: center;
  text-align: right;
  font-size: 13px;
}
.question-area {
  padding: 22px 20px;
}
.question-area h2 {
  margin: 0 0 21px;
  font-size: 19px;
  line-height: 1.5;
}
.answer {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 58px;
  margin-bottom: 11px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--mountain);
  text-align: left;
}
.answer > span {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  border-radius: 50%;
  background: rgba(107, 166, 160, 0.14);
  font-weight: 900;
}
.answer.correct {
  border-color: var(--jade);
  background: rgba(255, 255, 255, 0.94);
}
.answer.wrong {
  border-color: var(--cinnabar);
  background: rgba(255, 255, 255, 0.94);
}
.feedback {
  position: fixed;
  z-index: var(--layer-bottom-sheet);
  left: 50%;
  bottom: 0;
  width: min(100%, 680px);
  padding: 19px 20px calc(20px + env(safe-area-inset-bottom));
  border: 1px solid var(--line);
  border-radius: 24px 24px 0 0;
  background: var(--paper);
  box-shadow: 0 -8px 22px rgba(36, 87, 90, 0.1);
  transform: translateX(-50%);
}
.feedback.wrong {
  border-color: var(--line);
  background: var(--paper);
}
.feedback h3 {
  margin: 0;
  color: var(--jade);
}
.feedback.wrong h3 {
  color: var(--cinnabar);
}
.feedback p {
  margin: 7px 0 15px;
  line-height: 1.55;
  font-size: 13px;
}
.feedback .app-button {
  width: 100%;
}
.result-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  text-align: center;
}
.result-icon {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: rgba(107, 166, 160, 0.15);
  color: var(--jade);
}
.result-icon.failed {
  background: rgba(184, 91, 75, 0.12);
  color: var(--cinnabar);
}
.result-page h1 {
  margin: 16px 0 7px;
}
.result-page p {
  max-width: 390px;
  color: var(--text-soft);
  line-height: 1.65;
}
.result-button {
  width: min(100%, 360px);
  margin-top: 15px;
}
.summary-header {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
}
.summary-header .icon-button {
  justify-self: start;
}
.summary-header h1 {
  margin: 0;
  text-align: center;
  font-size: 22px;
}
.stamp {
  display: grid;
  place-items: center;
  width: 102px;
  height: 102px;
  margin: 20px auto;
  border: 4px double var(--cinnabar);
  border-radius: 50%;
  color: var(--cinnabar);
  font-size: 17px;
  font-weight: 900;
  transform: rotate(-7deg);
}
.score-card {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  text-align: center;
}
.score-card > strong {
  color: var(--cinnabar);
  font-size: 20px;
}
.score-card > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin-top: 15px;
}
.score-card span {
  display: grid;
  gap: 5px;
  color: var(--text-soft);
  font-size: 12px;
}
.score-card b {
  color: var(--jade);
  font-size: 16px;
}
.score-card b.wrong-text {
  color: var(--cinnabar);
}
.summary-page > h2 {
  margin-top: 24px;
  font-size: 15px;
}
.wrong-card {
  margin-bottom: 11px;
  padding: 14px;
  border: 1px solid rgba(184, 91, 75, 0.16);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.68);
}
.wrong-card small {
  color: var(--cinnabar);
  font-weight: 800;
}
.wrong-card h3 {
  font-size: 14px;
}
.wrong-card > b {
  color: var(--jade);
  font-size: 13px;
}
.wrong-card p {
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.5;
}
.result-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
  width: 100%;
  margin-top: 22px;
}
.result-actions .app-button {
  gap: 5px;
}
.exit-sheet {
  width: 100%;
  text-align: center;
}
.exit-sheet h2 {
  margin: 10px 0;
}
.exit-sheet p {
  color: var(--text-soft);
}
.exit-sheet > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
  margin-top: 22px;
}
.app-button.danger {
  border-color: var(--cinnabar);
  background: var(--cinnabar);
}
.custom-sheet {
  width: 100%;
  overflow: hidden;
}
.sheet-handle {
  display: block;
  width: 42px;
  height: 4px;
  margin: 2px auto 12px;
  border-radius: 99px;
  background: rgba(36, 87, 90, 0.2);
}
.custom-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.custom-sheet-header small {
  color: var(--cinnabar);
  font-size: 11px;
  font-weight: 900;
}
.custom-sheet h2 {
  margin: 3px 0 0;
  font-size: 21px;
}
.custom-course-list {
  display: grid;
  gap: 8px;
  max-height: calc(82dvh - 225px);
  padding: 1px 2px;
  overflow-y: auto;
  scrollbar-width: none;
}
.custom-course-list::-webkit-scrollbar {
  display: none;
}
.custom-course-list label {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20px;
  align-items: center;
  gap: 10px;
  min-height: 54px;
  padding: 9px 13px;
  border: 1px solid rgba(36, 87, 90, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--mountain);
  cursor: pointer;
}
.custom-course-list label.selected {
  border-color: rgba(107, 166, 160, 0.65);
  background: rgba(107, 166, 160, 0.14);
}
.custom-course-list input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.custom-course-list label > span {
  display: grid;
  gap: 2px;
}
.custom-course-list label small {
  color: var(--tea);
  font-size: 10px;
  font-weight: 800;
}
.custom-course-list label strong {
  font-size: 13px;
}
.custom-course-list label > svg {
  color: var(--jade);
  opacity: 0;
}
.custom-course-list label.selected > svg {
  opacity: 1;
}
.sheet-selection {
  margin: 10px 0 8px;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}
.sheet-confirm {
  width: 100%;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 380px) {
  .category-card {
    grid-template-columns: 44px minmax(0, 1fr) 18px;
  }
  .category-icon {
    width: 42px;
    height: 42px;
  }
}
</style>
