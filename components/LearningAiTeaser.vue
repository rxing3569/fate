<script setup lang="ts">
import { ArrowRight, Sparkles } from "@lucide/vue";
</script>

<template>
  <div class="learning-ai-wrap">
    <NuxtLink class="learning-ai-teaser" to="/ai-analysis">
      <span class="teaser-icon"><Sparkles :size="16" /></span>
      <span class="teaser-copy"
        ><strong>直接體驗排盤解盤</strong
        ><small>從命盤開始探索 AI 紫微解析</small></span
      >
      <span class="teaser-action">前往 <ArrowRight :size="13" /></span>
    </NuxtLink>
  </div>
</template>

<style scoped>
.learning-ai-wrap {
  box-sizing: border-box;
  width: min(calc(100% - 36px), 644px);
  height: 54px;
}
.learning-ai-teaser {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  height: 54px;
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 19px;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.68),
    rgba(247, 243, 234, 0.38) 58%,
    rgba(107, 166, 160, 0.12)
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 9px 24px rgba(36, 87, 90, 0.09);
  -webkit-backdrop-filter: blur(22px) saturate(145%);
  backdrop-filter: blur(22px) saturate(145%);
  color: var(--mountain);
  overflow: hidden;
}
.learning-ai-teaser::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 8% 0,
    rgba(255, 255, 255, 0.75),
    transparent 36%
  );
  pointer-events: none;
}
.teaser-icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: rgba(107, 166, 160, 0.16);
  color: var(--jade);
}
.teaser-copy {
  position: relative;
  display: grid;
  gap: 2px;
  min-width: 0;
}
.teaser-copy strong {
  font-size: 13px;
}
.teaser-copy small {
  overflow: hidden;
  color: var(--text-soft);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.teaser-action {
  position: relative;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 8px 11px;
  border-radius: 12px;
  background: var(--mountain);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}
.learning-ai-teaser:hover {
  box-shadow:
    inset 0 1px 0 #fff,
    0 12px 28px rgba(36, 87, 90, 0.14);
  transform: translateY(-1px);
}
</style>
