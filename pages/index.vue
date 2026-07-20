<script setup lang="ts">
import { ArrowDown, ArrowRight, BookOpen, Newspaper } from "@lucide/vue";
const auth = useAuthStore();
const chartStore = useChartStore();
useSeoMeta({
  title: "AI 紫微斗數命盤解析｜江映澄紫微",
  description:
    "江映澄紫微提供免費線上排盤、AI 命盤解析、時運解析、感情合盤與紫微斗數問答，結合命理老師經驗，協助你看懂天賦、運勢與人生方向。",
  ogTitle: "AI 紫微斗數命盤解析｜江映澄紫微",
  ogDescription:
    "免費線上排盤，使用 AI 探索紫微命盤、流年時運、感情合盤與人生方向。",
});
async function hydrateNavigationState() {
  if (!auth.sessionReady) await auth.hydrate();
  chartStore.hydrate(auth.profile);
}

async function openChartEntry() {
  await hydrateNavigationState();
  await navigateTo(
    chartStore.chart ? "/chart" : "/ai-analysis?mode=chart&redirect=/chart",
  );
}

async function openReportEntry() {
  await hydrateNavigationState();
  const destination = chartStore.chart
    ? "/report"
    : "/ai-analysis?mode=chart&redirect=/report";
  if (!auth.isAuthenticated) {
    window.dispatchEvent(
      new CustomEvent("auth-login-required", {
        detail: { redirect: destination },
      }),
    );
    return;
  }
  await navigateTo(destination);
}
function scrollToAbout() {
  document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" });
}
</script>

<template>
  <AppPageLayout
    screen-class="landing-screen"
    content-mode="flush"
    :show-header="false"
  >
    <main class="landing-content">
      <section class="hero">
        <h1>AI 紫微斗數命盤解析｜江映澄紫微</h1>
        <p class="hero-subtitle">～ 命有定數・運在人為 ～</p>
        <div class="hero-columns">
          <div class="hero-copy">
            <div class="hero-description">
              <p>AI 結合紫微，融合現代心理學</p>
              <p>帶您揭開命運的面紗，為迷惘的自己尋找方向</p>
            </div>
            <div class="hero-actions">
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
            <div class="stats" aria-label="服務成果">
              <div><b>50+</b><span>書籍數據庫</span></div>
              <div><b>800+</b><span>已生成報告</span></div>
              <div><b>6 年</b><span>資歷老師把關</span></div>
            </div>
          </div>
          <div class="hero-aside">
            <blockquote>
              <span>江海浮沉測吉凶</span><span>映照流年萬象中</span
              ><span>澄澈慧心觀氣數</span><span>撥開雲霧路從容</span>
            </blockquote>
          </div>
        </div>
        <button class="about-float" type="button" @click="scrollToAbout">
          <span>深入認識</span><ArrowDown :size="18" />
        </button>
      </section>
      <section id="about" class="belief">
        <small>ABOUT US</small>
        <h2>關於我們</h2>
        <div class="ink-line" />
        <article class="about-card glass">
          <h3>知命是為了更好地造命</h3>
          <p>
            我們是一套結合<strong>紫微斗數、人工智慧與現代心理學</strong>的命理分析產品。
          </p>
          <p>
            系統以一位擁有六年實務經驗的命理師為核心，整理數百份命盤案例、論命經驗與古籍資料，將分散而複雜的命理知識，建立成可持續分析與比對的命理資料庫，並訓練出專屬的
            AI 命盤分析系統。
          </p>

          <h4>結合心理學的自我探索</h4>
          <p>
            我們不只解讀星曜與宮位，更融入卡爾・榮格等心理學理論，提供貼近現代生活的全方位分析。從性格特質、內在需求、關係模式到人生課題，我們不僅陪您探索內心，<strong
              >更致力於為您發掘潛在的天賦優勢，對應出最能發揮所長的職涯方向與工作領域。</strong
            >
          </p>
          <p>
            AI
            在這裡不代替您決定人生，而是協助整合命盤中的複雜資訊，將傳統命理轉化為清晰、具體的自我探索工具。我們不談怪力亂神，也不以宿命的吉凶製造焦慮，而是幫助您更深入地認識自己，找到在人生合適的出路。
          </p>

          <h4>算命旨在趨吉避凶</h4>

          <p>命盤不是對人生的定論，而是一張理解自身特質與人生節奏的地圖。</p>
          <p>
            我們希望透過 AI
            命理分析，幫助您看見自己的優勢、盲點與潛在課題，在關鍵選擇前掌握方向，在低潮與變化中找到突破口。同時，為您解碼<strong
              >人際互動的深層動態——幫助您看清職場的暗流、避開感情中的無謂消耗，並遠離不必要的人際糾紛。</strong
            >
          </p>
          <p>
            真正的「趨吉避凶」，不是被動地恐懼未知，而是透過深刻的自我覺察，主動篩選出真正契合的伴侶與夥伴，為自己建立一段健康、滋養的關係網。
          </p>
        </article>
      </section>
      <section class="services" aria-labelledby="services-title">
        <small>SYSTEM SERVICES</small>
        <h2 id="services-title">系統服務</h2>
        <div class="ink-line" />
        <div class="entry-grid">
          <NuxtLink to="/report" class="entry-card glass">
            <div class="entry-heading">
              <AppMaterialIcon name="auto_stories_rounded" :size="24" />
              <h3>AI 命盤解析</h3>
            </div>
            <p>
              運用 AI
              紫微斗數解析先天命格（本命格局）、十二宮位詳解與十年大運，從個性天賦、事業財運到人生課題，全面讀懂自己的命盤。
            </p>
            <span class="entry-action">開始解析 <ArrowRight :size="14" /></span>
          </NuxtLink>
          <NuxtLink to="/flow" class="entry-card glass">
            <div class="entry-heading">
              <AppMaterialIcon name="insights_rounded" :size="24" />
              <h3>AI 時運解析</h3>
            </div>
            <p>
              透過 AI
              分析流年、流月與流日運勢，掌握工作、感情及財運變化，提早看見重要時機與需要留意的方向。
            </p>
            <span class="entry-action">查看時運 <ArrowRight :size="14" /></span>
          </NuxtLink>
          <NuxtLink to="/match" class="entry-card glass">
            <div class="entry-heading">
              <AppMaterialIcon name="diversity_1_rounded" :size="24" />
              <h3>AI 合盤解析</h3>
            </div>
            <p>
              結合雙方紫微命盤與 AI
              關係分析，理解感情互動、溝通模式及彼此需求，找出更適合兩人的相處方式。
            </p>
            <span class="entry-action">開始合盤 <ArrowRight :size="14" /></span>
          </NuxtLink>
          <NuxtLink to="/qa" class="entry-card glass">
            <div class="entry-heading">
              <i class="entry-chat-icon" aria-hidden="true" />
              <h3>AI 問答</h3>
            </div>
            <p>
              根據個人紫微命盤向 AI
              即時提問，針對感情、事業、財運與人生選擇，獲得貼近自身命盤脈絡的解答。
            </p>
            <span class="entry-action">立即提問 <ArrowRight :size="14" /></span>
          </NuxtLink>
          <NuxtLink to="/learn/" class="entry-card glass">
            <div class="entry-heading">
              <BookOpen :size="24" />
              <h3>學習紫微</h3>
            </div>
            <p>
              從十四主星、十二宮位到基礎解盤，搭配學習地圖、題庫與測驗，循序建立實用的紫微斗數知識。
            </p>
            <span class="entry-action">開始學習 <ArrowRight :size="14" /></span>
          </NuxtLink>
          <NuxtLink to="/articles" class="entry-card glass">
            <div class="entry-heading">
              <Newspaper :size="24" />
              <h3>命理專欄</h3>
            </div>
            <p>
              閱讀紫微斗數、流年運勢、感情合盤與自我成長文章，以深入淺出的方式理解傳統命理的現代應用。
            </p>
            <span class="entry-action">前往閱讀 <ArrowRight :size="14" /></span>
          </NuxtLink>
        </div>
      </section>
      <TestimonialsCarousel />
      <section class="final-action">
        <h2>準備好看懂自己的命盤了嗎？</h2>
        <p>從認識自己開始，把命運重新握回手中。</p>
        <div class="final-actions">
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
    </main>
  </AppPageLayout>
</template>

<style scoped>
.landing-screen {
  min-height: 100dvh;
  position: relative;
  isolation: isolate;
  overflow: visible;
  background: transparent;
}
.landing-screen::before {
  content: "";
  position: fixed;
  z-index: -1;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  background:
    linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)),
    url("/assets/images/bg_landscape2.png") center / 100% 100% no-repeat;
  pointer-events: none;
}
.landing-content {
  position: relative;
  z-index: 1;
}
.hero > h1,
.hero-aside blockquote,
.belief > h2,
.services > h2,
.about-card > h3,
.final-action h2 {
  font-family: "Noto Serif TC", serif;
}
.belief,
.services,
.final-action {
  text-align: center;
}
.hero {
  position: relative;
  display: grid;
  align-content: center;
  gap: 42px;
  min-height: 100dvh;
  padding: 72px 20px 150px;
  box-sizing: border-box;
  container-type: inline-size;
}
.hero > h1 {
  margin: 0;
  color: var(--mountain);
  font-size: clamp(16px, 6cqw, 46px);
  line-height: 1.25;
  letter-spacing: 0.02em;
  text-align: center;
  text-wrap: balance;
  text-shadow: 0 2px 18px rgba(247, 243, 234, 0.95);
}
.hero-subtitle {
  margin: -28px 0 0;
  color: var(--tea);
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-align: center;
}
.hero-columns {
  display: grid;
  gap: 32px;
}
.hero-copy {
  text-align: center;
}
.hero-description p {
  margin: 6px 0;
  color: rgba(36, 87, 90, 0.82);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.8;
}
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
  justify-content: center;
}
.hero-actions .app-button {
  min-width: 168px;
  margin: 0;
  box-shadow: 0 8px 20px rgba(36, 87, 90, 0.18);
}
.hero-aside {
  display: grid;
  justify-items: center;
}
.hero-aside blockquote {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 0;
  color: rgba(36, 87, 90, 0.82);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.22em;
  line-height: 2;
  flex-direction: row-reverse;
  align-items: flex-start;
  text-shadow:
    0 0 12px var(--paper),
    0 0 24px var(--paper);
}
.hero-aside blockquote span {
  display: block;
  writing-mode: vertical-rl;
  text-orientation: upright;
  white-space: nowrap;
}
.hero-aside blockquote span:nth-child(-n + 3)::first-letter {
  background-color: rgba(36, 87, 90, 0.2);
  border-radius: 100%;
}
.about-float {
  position: absolute;
  bottom: calc(88px + env(safe-area-inset-bottom));
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border: 0;
  background: transparent;
  color: var(--mountain);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  transform: translateX(-50%);
}
.about-float svg {
  animation: float 2s ease-in-out infinite;
}
@keyframes float {
  50% {
    transform: translateY(7px);
  }
}
.belief {
  padding: 64px 18px 22px;
  scroll-margin-top: 58px;
}
.belief > small,
.services > small {
  color: var(--tea);
  font-weight: 900;
  letter-spacing: 0.16em;
}
.belief > h2,
.services > h2 {
  margin: 8px 0;
  font-size: 27px;
}
.ink-line {
  width: 52px;
  height: 3px;
  margin: auto;
  border-radius: 3px;
  background: var(--jade);
}
.stats {
  display: flex;
  align-items: center;
  width: max-content;
  max-width: 100%;
  margin: 16px auto 0;
  color: var(--tea);
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
}
.stats div {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
}
.stats div + div::before {
  content: "•";
  margin: 0 7px;
}
.about-card {
  margin-top: 25px;
  padding: 24px;
  border-radius: 26px;
  text-align: left;
}
.about-card > h3 {
  margin: 0 0 20px;
  color: var(--tea);
  font-size: 24px;
  text-align: center;
}
.about-card h4 {
  margin: 26px 0 8px;
  color: var(--mountain);
  font-size: 18px;
}
.about-card p {
  margin: 10px 0;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.9;
}
.about-card strong {
  color: var(--mountain);
}
.about-card .about-conclusion {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}
.entry-grid {
  display: grid;
  gap: 14px;
  margin-top: 25px;
}
.services {
  padding: 58px 18px 0;
}
.entry-card {
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-radius: 24px;
  text-align: left;
}
.entry-heading {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 6px;
  color: var(--jade);
}
.entry-heading > svg,
.entry-heading > :deep(.app-material-icon) {
  flex: none;
}
.entry-chat-icon {
  display: block;
  flex: none;
  width: 24px;
  height: 24px;
  background: currentColor;
  -webkit-mask: url("/chat.svg") center / contain no-repeat;
  mask: url("/chat.svg") center / contain no-repeat;
}
.entry-card h3 {
  margin: 0;
  color: var(--mountain);
  font-size: 17px;
}
.entry-card p {
  flex: 1;
  margin: 7px 0 13px;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.6;
}
.entry-action {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: 12px;
  font-weight: 900;
}
.final-action {
  padding: 40px 18px 24px;
}
.final-action h2 {
  font-size: 22px;
}
.final-action p {
  color: var(--text-soft);
  font-size: 13px;
}
.final-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}
.final-actions .app-button {
  min-width: 168px;
  margin: 0;
  box-shadow: 0 8px 20px rgba(36, 87, 90, 0.14);
}
@media (min-width: 600px) {
  .belief,
  .services,
  .final-action {
    padding-right: 28px;
    padding-left: 28px;
  }
  .hero {
    padding-inline: 0;
  }
  .hero-columns {
    grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
    align-items: center;
  }
  .hero-copy {
    text-align: left;
  }
  .hero-actions {
    justify-content: flex-start;
  }
  .stats {
    margin-left: 0;
  }
  .hero > h1 {
    white-space: nowrap;
  }
}
@media (min-width: 760px) {
  .entry-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .entry-action {
    align-self: flex-end;
  }
}
</style>
