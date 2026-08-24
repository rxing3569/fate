<script setup lang="ts">
const props = defineProps<{ source: string }>();

const segments = computed(() =>
  props.source
    .split(/(「[^」]+」)/g)
    .filter(Boolean)
    .map((text) => ({
      text: text.startsWith("「") && text.endsWith("」")
        ? text.slice(1, -1)
        : text,
      highlighted: text.startsWith("「") && text.endsWith("」"),
    })),
);
</script>

<template>
  <span class="purchase-feature-copy">
    <template v-for="(segment, index) in segments" :key="`${index}-${segment.text}`">
      <strong v-if="segment.highlighted">{{ segment.text }}</strong>
      <template v-else>{{ segment.text }}</template>
    </template>
  </span>
</template>

<style scoped>
.purchase-feature-copy {
  display: inline;
}
.purchase-feature-copy strong {
  color: var(--cinnabar);
  font-weight: 900;
}
</style>
