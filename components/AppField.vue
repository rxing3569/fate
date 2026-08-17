<script setup lang="ts">
const props = withDefaults(defineProps<{ id: string; label?: string; help?: string; error?: string; required?: boolean }>(), { label: "", help: "", error: "", required: false });
const describedBy = computed(() => [props.help ? `${props.id}-help` : "", props.error ? `${props.id}-error` : ""].filter(Boolean).join(" ") || undefined);
</script>
<template>
  <div class="app-field" :class="{ 'app-field--invalid': Boolean(error) }">
    <label v-if="label" :for="id">{{ label }}<span v-if="required" aria-hidden="true">＊</span></label>
    <slot :control-id="id" :described-by="describedBy" :invalid="Boolean(error)" />
    <p v-if="help" :id="`${id}-help`" class="app-field__help">{{ help }}</p>
    <p v-if="error" :id="`${id}-error`" class="app-field__error" role="alert">{{ error }}</p>
  </div>
</template>
<style scoped>
.app-field { display: grid; gap: var(--space-2); text-align: left; }.app-field > label { font-size: var(--font-size-body-sm); font-weight: var(--font-weight-bold); }.app-field > label span { color: var(--color-danger); }.app-field__help,.app-field__error { margin: 0; font-size: var(--font-size-caption); line-height: 1.5; }.app-field__help { color: var(--color-text-secondary); }.app-field__error { color: var(--color-danger); }
</style>
