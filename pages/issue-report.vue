<script setup lang="ts">
import { AtSign, Check, ChevronDown, ExternalLink, Send } from "@lucide/vue";
definePageMeta({ middleware: "auth" });
type IssueCategory = "BUG" | "會員權益" | "系統建議";

const category = ref<IssueCategory>("BUG");
const content = ref("");
const contentError = ref("");
const submitting = ref(false);
const categoryOpen = ref(false);
const categoryPicker = ref<HTMLElement | null>(null);
const categories = [
  { value: "BUG", label: "錯誤" },
  { value: "會員權益", label: "付款／會員權益" },
  { value: "系統建議", label: "建議" },
] satisfies Array<{ value: IssueCategory; label: string }>;
const categoryLabel = computed(
  () =>
    categories.find((item) => item.value === category.value)?.label || "請選擇",
);

function selectCategory(value: IssueCategory) {
  category.value = value;
  categoryOpen.value = false;
}

function closeCategory(event: MouseEvent) {
  if (!categoryPicker.value?.contains(event.target as Node))
    categoryOpen.value = false;
}

onMounted(() => document.addEventListener("click", closeCategory));
onBeforeUnmount(() => document.removeEventListener("click", closeCategory));

async function submit() {
  const normalizedContent = content.value.trim();
  if (!normalizedContent) {
    contentError.value = "請輸入問題內容";
    return;
  }

  contentError.value = "";
  submitting.value = true;
  try {
    await ziweiApi.submitIssueReport({
      issue_type: category.value,
      description: normalizedContent,
    });
    showAppInfo("問題回報已送出");
    await navigateTo("/member");
  } finally {
    submitting.value = false;
  }
}

function handleContentInput() {
  if (contentError.value && content.value.trim()) contentError.value = "";
}

function openOfficialThreads() {
  window.open(
    "https://www.threads.com/@fate.jyc",
    "_blank",
    "noopener,noreferrer",
  );
}
</script>

<template>
  <AppPageLayout title="問題回報" screen-class="issue-screen" show-back>
    <main class="issue-content">
      <p class="issue-note">請描述您遇到的狀況，我們會儘快協助處理。</p>
      <form class="issue-form glass" @submit.prevent="submit">
        <div ref="categoryPicker" class="form-row category-picker">
          <label id="category-label">分類</label>
          <button
            class="category-trigger"
            type="button"
            aria-labelledby="category-label"
            :aria-expanded="categoryOpen"
            aria-haspopup="listbox"
            @click.stop="categoryOpen = !categoryOpen"
          >
            <span>{{ categoryLabel }}</span
            ><ChevronDown :size="18" :class="{ rotated: categoryOpen }" />
          </button>
          <Transition name="category-menu">
            <div
              v-if="categoryOpen"
              class="category-menu glass"
              role="listbox"
              aria-labelledby="category-label"
            >
              <button
                v-for="item in categories"
                :key="item.value"
                type="button"
                role="option"
                :aria-selected="category === item.value"
                :class="{ active: category === item.value }"
                @click="selectCategory(item.value)"
              >
                <span>{{ item.label }}</span
                ><Check v-if="category === item.value" :size="17" />
              </button>
            </div>
          </Transition>
        </div>
        <div class="form-row">
          <label for="content">內容</label>
          <textarea
            id="content"
            v-model="content"
            class="issue-input"
            :class="{ invalid: contentError }"
            rows="4"
            placeholder="請輸入問題內容…"
            :aria-invalid="Boolean(contentError)"
            aria-describedby="content-error"
            @input="handleContentInput"
          />
          <p id="content-error" class="field-error" aria-live="polite">
            {{ contentError || "\u00a0" }}
          </p>
        </div>
        <button class="app-button submit-button" type="submit" :disabled="submitting">
          <Send :size="18" />{{ submitting ? "送出中…" : "送出回報" }}
        </button>
      </form>
      <section class="threads-card glass" aria-labelledby="threads-card-title">
        <span class="threads-icon"><AtSign :size="22" /></span>
        <div class="threads-copy">
          <strong id="threads-card-title">官方 Threads</strong>
          <p>問題也可以私訊到官方 Threads，將會儘快會為您協助處理。</p>
        </div>
        <button
          class="app-button threads-button"
          type="button"
          @click="openOfficialThreads"
        >
          前往官方 Threads<ExternalLink :size="16" />
        </button>
      </section>
    </main>
  </AppPageLayout>
</template>

<style scoped>
.issue-content {
  max-width: 780px;
  padding: 18px 18px 120px;
  margin: 0 auto;
}
.issue-note {
  margin: 0 0 18px;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
}
.issue-form {
  display: grid;
  gap: 20px;
  padding: 24px;
  border-radius: 30px;
  overflow: visible;
}
.form-row {
  display: grid;
  gap: 9px;
}
.form-row label {
  color: var(--mountain);
  font-size: 13px;
  font-weight: 800;
}
.issue-input,
.category-trigger {
  width: 100%;
  border: 1px solid rgba(36, 87, 90, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.62);
  color: var(--mountain);
  font: inherit;
  outline: none;
}
.issue-input:focus,
.category-trigger:focus-visible {
  border-color: rgba(107, 166, 160, 0.72);
  box-shadow: 0 0 0 3px rgba(107, 166, 160, 0.12);
}
.issue-input.invalid,
.issue-input.invalid:focus {
  border-color: var(--cinnabar);
  box-shadow: 0 0 0 3px rgba(184, 91, 75, 0.1);
}
.field-error {
  min-height: 18px;
  margin: -3px 2px 0;
  color: var(--cinnabar);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
}
textarea.issue-input {
  min-height: 120px;
  padding: 14px;
  line-height: 1.65;
  resize: vertical;
}
.threads-card {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  margin-top: 16px;
  padding: 18px;
  border-radius: 24px;
}
.threads-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(107, 166, 160, 0.14);
  color: var(--mountain);
}
.threads-copy strong {
  color: var(--mountain);
  font-size: 14px;
}
.threads-copy p {
  margin: 4px 0 0;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.55;
}
.threads-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  white-space: nowrap;
}
@media (max-width: 620px) {
  .threads-card {
    grid-template-columns: 44px minmax(0, 1fr);
  }
  .threads-button {
    grid-column: 1 / -1;
    width: 100%;
  }
}
.category-picker {
  position: relative;
  z-index: 5;
}
.category-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 14px;
  text-align: left;
}
.category-trigger svg {
  transition: transform 0.18s ease;
}
.category-trigger svg.rotated {
  transform: rotate(180deg);
}
.category-menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 8px);
  left: 0;
  display: grid;
  gap: 6px;
  width: 100%;
  padding: 7px;
  border-radius: 18px;
  overflow: hidden;
}
.category-menu button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 44px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.18);
  color: var(--mountain);
  font-size: 14px;
  font-weight: 750;
  text-align: left;
}
.category-menu button:hover {
  border-color: rgba(107, 166, 160, 0.16);
  background: rgba(107, 166, 160, 0.1);
}
.category-menu button.active {
  border-color: rgba(107, 166, 160, 0.25);
  background: rgba(107, 166, 160, 0.18);
}
.category-menu-enter-active,
.category-menu-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}
.category-menu-enter-from,
.category-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  border: 0;
}
@media (max-width: 520px) {
  .issue-content {
    padding: 10px 12px 100px;
  }
  .issue-form {
    padding: 20px 17px;
    border-radius: 24px;
  }
}
</style>
