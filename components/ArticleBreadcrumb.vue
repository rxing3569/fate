<script setup lang="ts">
import { ChevronRight } from "@lucide/vue";

defineProps<{ current?: string }>();
</script>

<template>
  <nav class="article-breadcrumb" aria-label="麵包屑">
    <ol>
      <li><NuxtLink to="/">首頁</NuxtLink></li>
      <li><ChevronRight :size="13" aria-hidden="true" /></li>
      <li v-if="current"><NuxtLink to="/articles">命理專欄</NuxtLink></li>
      <li v-if="current"><ChevronRight :size="13" aria-hidden="true" /></li>
      <li aria-current="page">{{ current || "命理專欄" }}</li>
    </ol>
  </nav>
</template>

<style scoped>
.article-breadcrumb {
  overflow: hidden;
  width: 100%;
}
.article-breadcrumb ol {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  margin: 0;
  padding: 0;
  color: rgba(36, 87, 90, 0.5);
  font-size: 12px;
  font-weight: 700;
  list-style: none;
}
.article-breadcrumb li {
  display: flex;
  min-width: 0;
  align-items: center;
}
.article-breadcrumb li:last-child {
  overflow: hidden;
  color: rgba(36, 87, 90, 0.7);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.article-breadcrumb a:hover {
  color: var(--mountain);
}
</style>
