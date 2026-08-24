<script setup lang="ts">
import { Check, ChevronDown, CircleX } from "@lucide/vue";

const props = withDefaults(defineProps<{
  modelValue: string;
  label: string;
  placeholder?: string;
  options: string[];
  triggerLabel?: string;
}>(), { placeholder: "尚未指定", triggerLabel: "" });
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
const open = ref(false);

function choose(value: string) {
  emit("update:modelValue", value);
  open.value = false;
}
</script>

<template>
  <div class="annual-focus-select">
    <button class="focus-trigger glass" type="button" aria-haspopup="dialog" :aria-expanded="open" @click="open = true">
      <span><small>{{ label }}</small><strong>{{ triggerLabel || modelValue || placeholder }}</strong></span><ChevronDown :size="20" />
    </button>
    <AppBottomSheet :open="open" height-mode="viewport" scroll-mode="nested" sheet-class="annual-focus-sheet" content-class="annual-focus-sheet-content" :labelledby="`annual-focus-${label}`" @close="open = false">
      <template #header><header class="focus-sheet-header"><strong :id="`annual-focus-${label}`">選擇{{ label }}</strong></header></template>
      <div class="focus-option-list" data-sheet-scroll>
        <button v-if="modelValue" class="focus-option clear" type="button" @click="choose('')"><CircleX :size="19" /><span>清除選擇</span></button>
        <button v-for="option in options" :key="option" class="focus-option" :class="{ selected: option === modelValue }" type="button" @click="choose(option)"><span>{{ option }}</span><Check v-if="option === modelValue" :size="20" /></button>
      </div>
    </AppBottomSheet>
  </div>
</template>

<style scoped>
.focus-trigger{display:grid;grid-template-columns:minmax(0,1fr) 20px;gap:8px;align-items:center;width:100%;min-height:54px;padding:9px 13px;border-radius:16px;color:var(--mountain);text-align:left}.focus-trigger span{min-width:0}.focus-trigger small,.focus-trigger strong{display:block}.focus-trigger small{margin-bottom:3px;color:var(--text-soft);font-size:10px}.focus-trigger strong{overflow:hidden;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.focus-sheet-header{padding:0 4px 10px;text-align:left}:global(.annual-focus-sheet-content.app-bottom-sheet-content){display:flex;flex:1;min-height:0;overflow:hidden;text-align:left}.focus-option-list{display:grid;align-content:start;gap:8px;flex:1;min-height:0;overflow-y:auto;padding:4px 2px}.focus-option{display:grid;grid-template-columns:minmax(0,1fr) 24px;gap:8px;align-items:center;width:100%;min-height:48px;padding:7px 11px;border:1px solid rgba(36,87,90,.13);border-radius:14px;background:rgba(255,255,255,.5);color:var(--mountain);font:inherit;font-size:13px;font-weight:700;text-align:left}.focus-option:hover,.focus-option.selected{border-color:rgba(107,166,160,.48);background:rgba(107,166,160,.13)}.focus-option.clear{grid-template-columns:24px 1fr;margin-bottom:2px;color:var(--text-soft)}
</style>
