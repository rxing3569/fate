<script setup lang="ts">
withDefaults(
  defineProps<{
    screenClass?: string;
    showNavigation?: boolean;
  }>(),
  {
    screenClass: "",
    showNavigation: true,
  },
);
</script>

<template>
  <AppPageLayout
    title="學習紫微"
    :screen-class="`learning-hub-layout ${screenClass}`"
    content-mode="flush"
    :show-header="showNavigation"
  >
    <div v-if="showNavigation" class="learning-hub-navigation">
      <LearningSectionTabs />
      <LearningAiTeaser />
    </div>
    <slot />
  </AppPageLayout>
</template>

<style>
.learning-hub-layout {
  --learning-content-inline: 18px;
  --learning-content-top: 12px;
}
.learning-hub-navigation {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  width: 100%;
}
.learning-hub-navigation > .learning-section-tabs {
  flex: 0 0 48px;
  margin: 8px auto 0;
}
.learning-hub-navigation > .learning-ai-wrap {
  flex: 0 0 54px;
  margin: 8px auto 6px;
}
.learning-hub-content {
  box-sizing: border-box;
  width: 100%;
  margin-inline: auto;
  padding-top: var(--learning-content-top);
  padding-right: var(--learning-content-inline);
  padding-left: var(--learning-content-inline);
}
@media (max-width: 430px) {
  .learning-hub-layout {
    --learning-content-inline: 16px;
  }
}
</style>
