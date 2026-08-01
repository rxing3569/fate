<script setup lang="ts">
import { ArrowRight } from "@lucide/vue";
import type { NextStepAction, NextStepSource } from "~/types/next-step";
import { trackNextStepEvent } from "~/utils/next-step";

const props = defineProps<{
  heading?: string;
  source: NextStepSource;
  actions: NextStepAction[];
}>();
const { openNextStep } = useNextStepNavigation();
const impressionKey = computed(
  () =>
    `${props.source.type}:${props.source.id}:${props.actions.map((item) => item.id).join(",")}`,
);
const tracked = new Set<string>();

function trackImpressions() {
  if (tracked.has(impressionKey.value)) return;
  tracked.add(impressionKey.value);
  for (const action of props.actions) {
    trackNextStepEvent("next_step_impression", {
      source_type: props.source.type,
      source_id: props.source.id,
      action_id: action.id,
      destination: action.destination,
    });
  }
}

onMounted(trackImpressions);
watch(impressionKey, trackImpressions);
</script>

<template>
  <section class="next-step-section" aria-label="下一步建議">
    <div class="next-step-heading">
      <h2>{{ heading || "接下來，你可以這樣探索" }}</h2>
    </div>
    <div class="next-step-grid">
      <article v-for="action in actions" :key="action.id" class="next-step-card glass">
        <small>{{ action.eyebrow }}</small>
        <h3>{{ action.title }}</h3>
        <p>{{ action.description }}</p>
        <button
          class="next-step-button"
          type="button"
          @click="openNextStep(action, source)"
        >
          <span>{{ action.label }}</span>
          <ArrowRight :size="17" />
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.next-step-section {
  margin-top: 28px;
  padding: 4px 2px 8px;
}
.next-step-heading {
  margin: 0 4px 14px;
  color: var(--mountain);
}
.next-step-heading h2 {
  margin: 0;
  font-size: 17px;
}
.next-step-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.next-step-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 20px;
  border-radius: 22px;
}
.next-step-card small {
  color: var(--cinnabar);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
}
.next-step-card h3 {
  margin: 8px 0 7px;
  font-size: 16px;
  line-height: 1.5;
}
.next-step-card p {
  flex: 1;
  margin: 0 0 16px;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.7;
}
.next-step-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  min-height: 43px;
  padding: 10px 12px;
  border: 0;
  border-radius: 14px;
  background: var(--mountain);
  color: white;
  font-size: 13px;
  font-weight: 850;
}
.next-step-button svg:last-child {
  margin-left: auto;
}
@media (max-width: 620px) {
  .next-step-grid {
    grid-template-columns: 1fr;
  }
}
</style>
