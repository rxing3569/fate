<script setup lang="ts">
import { Sparkles } from "@lucide/vue";

const title = ref("AI 解讀詳解");
const content = ref("");
const summary = computed(
  () =>
    content.value
      .match(/\/summary\s*([\s\S]*?)\s*\/summary_end/i)?.[1]
      ?.trim() || "",
);
const detailBefore = computed(() => {
  const match = content.value.match(/\/summary\s*([\s\S]*?)\s*\/summary_end/i);
  return match?.index == null
    ? content.value
    : content.value.slice(0, match.index).trim();
});
const detailAfter = computed(() => {
  const regex = /\/summary\s*([\s\S]*?)\s*\/summary_end/i;
  const match = regex.exec(content.value);
  return match
    ? content.value.slice((match.index || 0) + match[0].length).trim()
    : "";
});

onMounted(() => {
  try {
    const value = JSON.parse(
      sessionStorage.getItem("ziwei_report_detail") || "{}",
    ) as { title?: string; content?: string };
    title.value = value.title || "AI 解讀詳解";
    content.value = value.content || "";
  } catch {
    content.value = "";
  }
});
</script>

<template>
  <AppPageLayout :title="title" screen-class="detail-screen" show-back>
    <main class="detail-body">
      <section v-if="content" class="detail-surface glass">
        <MarkdownContent v-if="detailBefore" :source="detailBefore" />
        <aside v-if="summary" class="summary-box">
          <div><Sparkles :size="18" /><strong>核心小結</strong></div>
          <MarkdownContent class="summary-markdown" :source="summary" />
        </aside>
        <MarkdownContent v-if="detailAfter" :source="detailAfter" />
      </section>
      <section v-else class="missing-detail">
        <p>找不到這份解析內容。</p>
        <button class="app-button" type="button" @click="$router.back()">
          返回報告
        </button>
      </section>
    </main>
  </AppPageLayout>
</template>

<style scoped>
.detail-body {
  padding: 8px 16px 90px;
}
.detail-surface {
  padding: 22px 18px;
  border-radius: 30px;
}
.summary-box {
  margin: 18px 0 22px;
  padding: 16px 18px;
  border: 1.5px solid rgba(107, 166, 160, 0.28);
  border-radius: 18px;
  background: rgba(107, 166, 160, 0.12);
}
.summary-box > div {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 10px;
  font-size: 14px;
}
.summary-markdown:deep(.markdown-content) {
  color: rgba(36, 87, 90, 0.9);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.6;
}
.missing-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60dvh;
  color: var(--text-soft);
}
</style>
