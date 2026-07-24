<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    screenClass?: string;
    showHeader?: boolean;
    showNavigation?: boolean;
    showBack?: boolean;
    backTo?: string;
    backLabel?: string;
  }>(),
  {
    title: "學習紫微",
    screenClass: "",
    showHeader: true,
    showNavigation: true,
    showBack: false,
    backTo: "",
    backLabel: "返回",
  },
);
</script>

<template>
  <AppPageLayout
    :title="title"
    :screen-class="`learning-hub-layout ${screenClass}`"
    content-mode="flush"
    :show-header="showHeader"
    :show-back="showBack"
    :back-to="backTo"
    :back-label="backLabel"
  >
    <template v-if="$slots.leading" #leading><slot name="leading" /></template>
    <template v-if="$slots.title" #title><slot name="title" /></template>
    <template v-if="$slots.actions" #actions><slot name="actions" /></template>
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
  gap: 8px;
  width: 100%;
  padding: 8px 0 6px;
}
.learning-hub-navigation > .learning-section-tabs {
  flex: 0 0 48px;
  margin: 0 auto;
}
.learning-hub-navigation > .learning-ai-wrap {
  flex: 0 0 54px;
  margin: 0 auto;
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
@media (min-width: 760px) {
  .learning-hub-navigation {
    padding-top: 10px;
  }
}
</style>
