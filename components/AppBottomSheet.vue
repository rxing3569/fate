<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()

function closeFromBackdrop() {
  if (!props.closeOnBackdrop || props.locked) return
  emit("close")
}

const props = withDefaults(defineProps<{
  open: boolean
  role?: "dialog" | "alertdialog"
  labelledby?: string
  closeOnBackdrop?: boolean
  locked?: boolean
}>(), {
  role: "dialog",
  labelledby: undefined,
  closeOnBackdrop: true,
  locked: false,
})
</script>

<template>
  <Transition name="sheet">
    <div v-if="open" class="sheet-backdrop" @click.self="closeFromBackdrop">
      <section
        class="app-bottom-sheet"
        :role="role"
        aria-modal="true"
        :aria-labelledby="labelledby"
      >
        <div class="sheet-handle" />
        <div class="app-bottom-sheet-content"><slot /></div>
      </section>
    </div>
  </Transition>
</template>

<style scoped>
.app-bottom-sheet {
  box-sizing: border-box;
  width: min(100%, 680px);
  max-height: 88dvh;
  overflow-y: auto;
  padding: 12px 22px calc(26px + env(safe-area-inset-bottom));
  border-radius: 30px 30px 0 0;
  background: var(--paper);
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.08);
  color: var(--mountain);
}
.app-bottom-sheet-content {
  text-align: center;
}
.app-bottom-sheet-content :deep(h2) {
  margin: 13px 0 8px;
  font-size: 19px;
  text-align: center;
}
.app-bottom-sheet-content :deep(p) {
  max-width: 430px;
  margin: 0 auto 15px;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.6;
}
</style>
