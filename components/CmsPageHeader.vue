<script setup lang="ts">
defineProps<{ title: string; loading?: boolean }>();
defineEmits<{ refresh: [] }>();
</script>

<template>
  <header class="cms-page-header">
    <div>
      <p>管理中心</p>
      <h1>{{ title }}</h1>
    </div>
    <button type="button" :disabled="loading" @click="$emit('refresh')">重新整理</button>
  </header>
</template>

<style scoped>
.cms-page-header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:26px}
.cms-page-header p{margin:0 0 5px;color:#63827b;font-size:11px;font-weight:800;letter-spacing:.16em}
.cms-page-header h1{margin:0;color:#183532;font-size:32px;line-height:1.2}
.cms-page-header button{padding:11px 17px;border:1px solid #cedbd7;border-radius:10px;background:#fff;color:#28544c;font:inherit;font-weight:750;cursor:pointer}
.cms-page-header button:disabled{opacity:.55}
@media(max-width:560px){.cms-page-header{align-items:flex-end}.cms-page-header h1{font-size:24px}}
</style>
