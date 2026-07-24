import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [globalCss, layout, hub, tabs, teaser, learn, quiz, reviewDetail, chart, chartGrid, learnHtml, quizHtml] =
  await Promise.all([
    read("assets/css/main.css"),
    read("layouts/default.vue"),
    read("components/LearningHubLayout.vue"),
    read("components/LearningSectionTabs.vue"),
    read("components/LearningAiTeaser.vue"),
    read("pages/learn.vue"),
    read("pages/quiz.vue"),
    read("pages/review/[level]/[course].vue"),
    read("pages/chart.vue"),
    read("components/ChartGrid.vue"),
    read(".output/public/learn/index.html"),
    read(".output/public/quiz/index.html"),
  ]);

assert.doesNotMatch(layout, /quiz-navigation/);
assert.doesNotMatch(globalCss, /primary-nav\.quiz-navigation/);
assert.match(hub, /\.learning-hub-navigation\s*\{[^}]*gap:\s*8px;[^}]*padding:\s*8px 0 6px;/s);
assert.match(hub, /\.learning-hub-navigation > \.learning-section-tabs\s*\{[^}]*margin:\s*0 auto;/s);
assert.match(hub, /\.learning-hub-navigation > \.learning-ai-wrap\s*\{[^}]*margin:\s*0 auto;/s);

const tabRule = tabs.match(/\.learning-section-tabs\s*\{([^}]*)\}/s)?.[1] || "";
const teaserRule = teaser.match(/\.learning-ai-wrap\s*\{([^}]*)\}/s)?.[1] || "";
assert.doesNotMatch(tabRule, /\bmargin(?:-[a-z]+)?:/);
assert.doesNotMatch(teaserRule, /\bmargin(?:-[a-z]+)?:/);
assert.doesNotMatch(learn, /revealFrame|requestAnimationFrame\(\(\)\s*=>\s*\{\s*mapReady/);
assert.match(reviewDetail, /<LearningHubLayout[\s\S]*<main class="review-detail-content">/);
assert.doesNotMatch(reviewDetail, /<AppPageLayout/);
assert.match(quiz, /<template v-if="view === 'quiz'" #leading>/);
assert.doesNotMatch(quiz, /<header class="quiz-progress">/);
assert.doesNotMatch(quiz, /\.quiz-progress\s*\{[^}]*position:\s*fixed/s);
assert.match(chart, /height:\s*100svh;/);
assert.match(chartGrid, /\.palace\s*\{[^}]*border:\s*1\.5px solid transparent;/s);

assert.match(
  learnHtml,
  /href="\/learn\/" class="[^"]*\bactive\b[^"]*"[^>]*>學習地圖<\/a>/,
);
assert.match(
  quizHtml,
  /href="\/quiz\/\?mode=exam" class="[^"]*\bactive\b[^"]*"[^>]*>測驗挑戰<\/a>/,
);
assert.match(
  quizHtml,
  /<button class="[^"]*\bactive\b[^"]*primary-nav-item[^"]*"[^>]*>[\s\S]{0,1400}<span class="nav-label nav-label-mobile"[^>]*>學習<\/span>/,
);

console.log("Learning layout and active-state regression checks passed.");
