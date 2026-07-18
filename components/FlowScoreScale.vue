<script setup lang="ts">
interface FlowScore {
  title: string;
  score: number;
}

defineProps<{ scores: FlowScore[] }>();
</script>

<template>
  <div class="flow-score-list" aria-label="運勢評分">
    <div v-for="item in scores" :key="item.title" class="flow-score-row">
      <strong>{{ item.title }}</strong>
      <div
        class="flow-score-cells"
        role="img"
        :aria-label="`${item.title} ${item.score} 分，共 5 分`"
      >
        <i
          v-for="value in 5"
          :key="value"
          :class="{ filled: value <= item.score }"
        />
      </div>
      <span>{{ item.score }}／5</span>
    </div>
  </div>
</template>

<style scoped>
.flow-score-list {
  display: grid;
  gap: 12px;
  margin: 8px 0 6px;
}
.flow-score-row {
  display: grid;
  grid-template-columns: minmax(62px, auto) minmax(120px, 1fr) 38px;
  gap: 11px;
  align-items: center;
}
.flow-score-row strong {
  font-size: 13px;
  white-space: nowrap;
}
.flow-score-row > span {
  color: var(--text-soft);
  font-size: 11px;
  font-weight: 800;
  text-align: right;
}
.flow-score-cells {
  display: grid;
  grid-template-columns: repeat(5, minmax(14px, 1fr));
  gap: 0;
}
.flow-score-cells i {
  height: 18px;
  border: 1px solid rgba(36, 87, 90, 0.42);
  border-left: 0;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.58);
}
.flow-score-cells i:first-child {
  border-left: 1px solid rgba(36, 87, 90, 0.42);
  border-radius: 999px 0 0 999px;
}
.flow-score-cells i:last-child {
  border-radius: 0 999px 999px 0;
}
.flow-score-cells i.filled {
  border-color: rgba(74, 130, 127, 0.72);
  border-left: 0;
  background: rgba(145, 197, 191, 0.82);
}
.flow-score-cells i.filled:first-child {
  border-left: 1px solid rgba(74, 130, 127, 0.72);
}
.flow-score-cells i.filled:not(:last-child) {
  border-right-color: rgba(255, 255, 255, 0.82);
}
@media (max-width: 380px) {
  .flow-score-row {
    grid-template-columns: 58px minmax(100px, 1fr) 34px;
    gap: 7px;
  }
}
</style>
