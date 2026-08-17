<script setup lang="ts">
import { BadgeCheck, Download, History } from "@lucide/vue";
import type { PremiumFeature } from "~/composables/usePremiumFeatureGate";

const props = defineProps<{
  feature: PremiumFeature | null;
  loading?: boolean;
}>();
const emit = defineEmits<{ close: []; confirm: [] }>();

const isHistory = computed(() => props.feature === "match_history");
const title = computed(() =>
  isHistory.value ? "Premium 已開通" : "繼續下載 PDF",
);
const description = computed(() =>
  isHistory.value
    ? "會員權益已更新，現在可以開啟合盤歷史紀錄。"
    : "會員權益已更新，解析內容已準備完成，是否繼續下載 PDF？",
);
const confirmLabel = computed(() =>
  isHistory.value ? "開啟歷史紀錄" : "繼續下載 PDF",
);
</script>

<template>
  <AppBottomSheet
    :open="Boolean(feature)"
    labelledby="premium-feature-resume-title"
    :locked="loading"
    @close="emit('close')"
  >
    <template #header>
      <BadgeCheck :size="24" aria-hidden="true" />
      <h2 id="premium-feature-resume-title">{{ title }}</h2>
    </template>
    <p class="premium-feature-resume-copy">{{ description }}</p>
    <div class="premium-feature-resume-actions">
      <AppButton
        variant="secondary"
        :disabled="loading"
        @click="emit('close')"
      >
        稍後再說
      </AppButton>
      <AppButton :loading="loading" @click="emit('confirm')">
        <template #leading>
          <History v-if="isHistory" :size="18" aria-hidden="true" />
          <Download v-else :size="18" aria-hidden="true" />
        </template>
        {{ confirmLabel }}
      </AppButton>
    </div>
  </AppBottomSheet>
</template>

<style scoped>
.premium-feature-resume-copy {
  margin: 0 0 var(--space-6);
  color: var(--color-text-secondary);
  font-size: var(--font-size-body-sm);
  line-height: 1.7;
}
.premium-feature-resume-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
@media (max-width: 430px) {
  .premium-feature-resume-actions {
    grid-template-columns: 1fr;
  }
}
</style>
