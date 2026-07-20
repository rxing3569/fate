<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  label: string;
  description: string;
  badge?: string;
  cost?: string;
}>();

defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>

<template>
  <label class="analysis-option" :class="{ selected: modelValue }">
    <input
      type="checkbox"
      :checked="modelValue"
      @change="
        $emit('update:modelValue', ($event.target as HTMLInputElement).checked)
      "
    />
    <i>{{ modelValue ? "✓" : "" }}</i>
    <span>
      <span class="option-title"
        >{{ label }}<em v-if="badge">{{ badge }}</em></span
      >
      <small>{{ description }}</small>
    </span>
    <b v-if="cost">{{ cost }}</b>
  </label>
</template>

<style scoped>
.analysis-option {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  margin-top: 6px;
  padding: 8px;
  border: 1px solid rgba(36, 87, 90, 0.1);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.58);
  text-align: left;
  transition:
    border-color 0.18s ease,
    background 0.18s ease;
}
.analysis-option.selected {
  border-color: rgba(107, 166, 160, 0.48);
  background: rgba(107, 166, 160, 0.1);
}
input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
i {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1.5px solid rgba(36, 87, 90, 0.25);
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}
.selected i {
  border-color: var(--mountain);
  background: var(--mountain);
}
.option-title {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--mountain);
  font-weight: 850;
}
em {
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(107, 166, 160, 0.14);
  color: var(--jade);
  font-size: 9px;
  font-style: normal;
}
small {
  display: block;
  margin-top: 4px;
  color: var(--text-soft);
  font-size: 11px;
  line-height: 1.45;
}
b {
  color: var(--cinnabar);
  font-size: 12px;
  white-space: nowrap;
}
</style>
