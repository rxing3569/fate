<script setup lang="ts">
const props = withDefaults(defineProps<{
  name: 'access_time' | 'arrow_outward_rounded' | 'auto_awesome_rounded' | 'auto_stories_rounded' | 'calendar_month' | 'check_rounded' | 'diversity_1_rounded' | 'edit_rounded' | 'grid_view_rounded' | 'insights_rounded' | 'person_outline_rounded' | 'warning_amber_rounded'
  size?: number
}>(), { size: 24 })

const codepoints = {
  access_time: 0xe03a,
  arrow_outward_rounded: 0xf087d,
  auto_awesome_rounded: 0xf596,
  auto_stories_rounded: 0xf59c,
  calendar_month: 0xf06bb,
  check_rounded: 0xf636,
  diversity_1_rounded: 0xf0881,
  edit_rounded: 0xf6fb,
  grid_view_rounded: 0xf7c4,
  insights_rounded: 0xf820,
  person_outline_rounded: 0xf006c,
  warning_amber_rounded: 0xf02a0,
} as const

const glyph = computed(() => String.fromCodePoint(codepoints[props.name]))
</script>

<template>
  <span class="app-material-icon" :style="{ fontSize: `${size}px` }" aria-hidden="true">{{ glyph }}</span>
</template>

<style scoped>
.app-material-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  overflow: hidden;
  font-family: 'App Material Icons';
  font-style: normal;
  font-weight: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}
</style>
