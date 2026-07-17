<script setup lang="ts">
import { ChevronLeft, ChevronRight, Quote } from "@lucide/vue";
const testimonials = [
  {
    text: "老師不是只告訴我吉凶，而是幫我看懂自己反覆卡住的原因。解盤後，我終於能比較安心地做出職涯選擇。",
    name: "林小姐",
    topic: "職涯與人生方向",
  },
  {
    text: "原本對命理半信半疑，但分析非常具體，也能對應到我的個性和關係模式，給的建議是生活中真的做得到的。",
    name: "陳先生",
    topic: "本命與關係解析",
  },
  {
    text: "在很迷惘的時候找到老師，過程溫和而清楚。不是叫我認命，而是讓我知道現在有哪些選擇可以掌握。",
    name: "許小姐",
    topic: "流年諮詢",
  },
  {
    text: "AI 報告先讓我掌握整體輪廓，再搭配學習內容理解星曜，對第一次接觸紫微的人很友善。",
    name: "王先生",
    topic: "AI 命盤解析",
  },
];
const active = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
function go(index: number) {
  active.value = (index + testimonials.length) % testimonials.length;
}
onMounted(() => {
  timer = setInterval(() => go(active.value + 1), 6000);
});
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>
<template>
  <section
    class="testimonials"
    aria-roledescription="carousel"
    aria-label="使用者見證"
  >
    <div class="testimonial-heading">
      <small>USER STORIES</small>
      <h2>使用者見證</h2>
      <span />
    </div>
    <div class="carousel-window glass">
      <div
        class="carousel-track"
        :style="{ transform: `translateX(-${active * 100}%)` }"
      >
        <article v-for="item in testimonials" :key="item.name">
          <Quote :size="27" />
          <blockquote>{{ item.text }}</blockquote>
          <footer>
            <strong>{{ item.name }}</strong
            ><span>{{ item.topic }}</span>
          </footer>
        </article>
      </div>
      <button
        class="carousel-arrow prev"
        type="button"
        aria-label="上一則見證"
        @click="go(active - 1)"
      >
        <ChevronLeft :size="20" /></button
      ><button
        class="carousel-arrow next"
        type="button"
        aria-label="下一則見證"
        @click="go(active + 1)"
      >
        <ChevronRight :size="20" />
      </button>
    </div>
    <div class="carousel-dots">
      <button
        v-for="(_, index) in testimonials"
        :key="index"
        type="button"
        :class="{ active: active === index }"
        :aria-label="`顯示第 ${index + 1} 則見證`"
        @click="go(index)"
      />
    </div>
  </section>
</template>
<style scoped>
.testimonials {
  padding: 54px 18px 18px;
}
.testimonial-heading {
  text-align: center;
}
.testimonial-heading small {
  color: var(--tea);
  font-weight: 900;
  letter-spacing: 0.16em;
}
.testimonial-heading h2 {
  margin: 8px 0;
  font-family: "Noto Serif TC", serif;
  font-size: 24px;
}
.testimonial-heading > span {
  display: block;
  width: 52px;
  height: 3px;
  margin: 0 auto 22px;
  border-radius: 3px;
  background: var(--jade);
}
.carousel-window {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
}
.carousel-track {
  display: flex;
  transition: transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1);
}
article {
  flex: 0 0 100%;
  min-height: 225px;
  padding: 38px 52px;
  text-align: center;
}
article > svg {
  color: var(--jade);
}
blockquote {
  max-width: 500px;
  margin: 15px auto 22px;
  color: var(--mountain);
  font-family: "Noto Serif TC", serif;
  font-size: 16px;
  line-height: 1.85;
}
footer {
  display: grid;
  gap: 4px;
}
footer span {
  color: var(--text-soft);
  font-size: 12px;
}
.carousel-arrow {
  position: absolute;
  top: 50%;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: rgba(247, 243, 234, 0.8);
  color: var(--mountain);
  transform: translateY(-50%);
}
.prev {
  left: 10px;
}
.next {
  right: 10px;
}
.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 7px;
  margin-top: 14px;
}
.carousel-dots button {
  width: 7px;
  height: 7px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(36, 87, 90, 0.2);
}
.carousel-dots button.active {
  width: 22px;
  border-radius: 6px;
  background: var(--mountain);
}
@media (min-width: 600px) {
  .testimonials {
    padding-right: 28px;
    padding-left: 28px;
  }
}
@media (max-width: 420px) {
  article {
    min-height: 245px;
    padding: 32px 40px;
  }
  blockquote {
    font-size: 14px;
  }
  .carousel-arrow {
    width: 32px;
    height: 32px;
  }
}
</style>
