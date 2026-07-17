<script setup lang="ts">
import { ChevronLeft } from "@lucide/vue";

type ContentMode = "standard" | "flush" | "centered";
type HeaderLayout = "standard" | "wide";

const props = withDefaults(
  defineProps<{
    title?: string;
    screenClass?: string;
    headerClass?: string;
    showHeader?: boolean;
    showBack?: boolean;
    backTo?: string;
    backReplace?: boolean;
    backLabel?: string;
    contentMode?: ContentMode;
    headerLayout?: HeaderLayout;
  }>(),
  {
    title: "",
    screenClass: "",
    headerClass: "",
    showHeader: true,
    showBack: false,
    backTo: "",
    backReplace: false,
    backLabel: "返回",
    contentMode: "standard",
    headerLayout: "standard",
  },
);

async function goBack() {
  if (props.backTo) {
    await navigateTo(props.backTo, { replace: props.backReplace });
    return;
  }
  useRouter().back();
}
</script>

<template>
  <div
    class="screen app-page-layout"
    :class="[
      screenClass,
      `app-page-layout--${contentMode}`,
      { 'app-page-layout--without-header': !showHeader },
    ]"
  >
    <header
      v-if="showHeader"
      class="app-bar app-page-header"
      :class="[headerClass, `app-page-header--${headerLayout}`]"
    >
      <slot name="leading">
        <button
          v-if="showBack"
          class="icon-button"
          type="button"
          :aria-label="backLabel"
          @click="goBack"
        >
          <ChevronLeft :size="23" />
        </button>
        <span v-else />
      </slot>

      <slot name="title">
        <div class="app-page-title">
          <h1>{{ title }}</h1>
          <slot name="subtitle" />
        </div>
      </slot>

      <slot name="actions"><span /></slot>
    </header>

    <slot />
    <slot name="overlays" />
  </div>
</template>

<style>
.app-page-layout {
  --page-inline: 20px;
  --page-bottom: 100px;
}
.app-page-header {
  flex: 0 0 auto;
  width: 100%;
}
.app-page-header--wide {
  grid-template-columns: 88px minmax(0, 1fr) 88px;
}
.app-page-title {
  min-width: 0;
  text-align: center;
}
.app-page-title h1 {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-page-title > small {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: rgba(36, 87, 90, 0.48);
  font-size: 10px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.app-page-layout--standard > main,
.app-page-layout--standard > .screen-content,
.app-page-layout--standard > .app-page-content {
  width: 100%;
  margin-inline: auto;
  padding-right: var(--page-inline);
  padding-left: var(--page-inline);
  padding-bottom: var(--page-bottom);
}
.app-page-layout--centered > main,
.app-page-layout--centered > .screen-content,
.app-page-layout--centered > .app-page-content {
  width: min(calc(100% - (var(--page-inline) * 2)), 560px);
  margin-inline: auto;
  padding-bottom: var(--page-bottom);
}
@media (max-width: 430px) {
  .app-page-layout {
    --page-inline: 16px;
  }
}
</style>
