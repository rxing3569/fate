<script setup lang="ts">
import { ArrowUp } from "@lucide/vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    suggestions?: readonly string[];
    disabled?: boolean;
    submitDisabled?: boolean;
    maxLength?: number;
    maxRows?: number;
    ariaLabel?: string;
  }>(),
  {
    placeholder: "輸入問題…",
    suggestions: () => [],
    disabled: false,
    submitDisabled: false,
    maxLength: 300,
    maxRows: 5,
    ariaLabel: "輸入問題",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [];
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);
const composing = ref(false);
const canSubmit = computed(
  () =>
    Boolean(props.modelValue.trim()) &&
    !props.disabled &&
    !props.submitDisabled,
);

function resize() {
  const input = textarea.value;
  if (!input) return;
  input.style.height = "auto";
  const styles = getComputedStyle(input);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 22;
  const padding =
    (Number.parseFloat(styles.paddingTop) || 0) +
    (Number.parseFloat(styles.paddingBottom) || 0);
  const maxHeight = lineHeight * props.maxRows + padding;
  const height = Math.min(input.scrollHeight, maxHeight);
  input.style.height = `${height}px`;
  input.style.overflowY = input.scrollHeight > maxHeight ? "auto" : "hidden";
}

function updateValue(event: Event) {
  emit("update:modelValue", (event.target as HTMLTextAreaElement).value);
  resize();
}

function submit() {
  if (canSubmit.value) emit("submit");
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== "Enter" || event.shiftKey) return;
  if (composing.value || event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  submit();
}

async function chooseSuggestion(suggestion: string) {
  if (props.disabled) return;
  emit("update:modelValue", suggestion.slice(0, props.maxLength));
  await nextTick();
  resize();
  textarea.value?.focus();
  textarea.value?.setSelectionRange(
    textarea.value.value.length,
    textarea.value.value.length,
  );
}

watch(
  () => [props.modelValue, props.maxRows],
  () => {
    if (props.modelValue.length > props.maxLength) {
      emit("update:modelValue", props.modelValue.slice(0, props.maxLength));
      return;
    }
    nextTick(resize);
  },
);
onMounted(() => nextTick(resize));
</script>

<template>
  <div class="app-question-composer" :class="{ disabled }">
    <div class="question-field">
      <textarea
        ref="textarea"
        :value="modelValue"
        rows="1"
        :maxlength="maxLength"
        :disabled="disabled"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        @input="updateValue"
        @compositionstart="composing = true"
        @compositionend="composing = false"
        @keydown="handleKeydown"
      />
      <button
        type="button"
        aria-label="送出問題"
        :disabled="!canSubmit"
        @click="submit"
      >
        <ArrowUp :size="21" :stroke-width="2.8" aria-hidden="true" />
      </button>
    </div>
    <div class="question-meta" :class="{ 'without-suggestions': !suggestions.length }">
      <span v-if="suggestions.length">快速提問</span>
      <span>{{ modelValue.length }}/{{ maxLength }}</span>
    </div>
    <div v-if="suggestions.length" class="question-suggestions">
      <button
        v-for="suggestion in suggestions"
        :key="suggestion"
        type="button"
        :disabled="disabled"
        @click="chooseSuggestion(suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.app-question-composer {
  width: 100%;
  min-width: 0;
  text-align: left;
}
.app-question-composer.disabled {
  opacity: 0.58;
}
.question-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 46px;
  align-items: end;
  min-height: 56px;
  border: 1.4px solid rgba(36, 87, 90, 0.42);
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 20px rgba(36, 87, 90, 0.08);
  overflow: hidden;
}
textarea {
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 54px;
  padding: 16px 8px 14px 17px;
  border: 0;
  outline: 0;
  resize: none;
  overflow-x: hidden;
  background: transparent;
  color: var(--mountain);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
}
textarea::placeholder {
  color: var(--text-soft);
}
.question-field > button {
  display: grid;
  place-items: center;
  align-self: end;
  width: 38px;
  height: 38px;
  margin: 0 8px 9px 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--mountain);
  box-shadow: 0 5px 12px rgba(36, 87, 90, 0.24);
  color: #fff;
}
.question-field > button:disabled {
  box-shadow: none;
  opacity: 0.3;
}
.question-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 7px 4px 6px;
  color: var(--text-soft);
  font-size: 10px;
  font-weight: 700;
}
.question-meta.without-suggestions {
  justify-content: flex-end;
}
.question-suggestions {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 1px 0 4px;
}
.question-suggestions button {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(36, 87, 90, 0.34);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.58);
  color: var(--mountain);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  text-align: left;
}
.question-suggestions button:disabled {
  opacity: 0.45;
}
@supports (-webkit-touch-callout: none) {
  @media (hover: none) and (pointer: coarse) {
    textarea {
      font-size: 16px;
    }
  }
}
</style>
