<script setup lang="ts">
definePageMeta({ layout: 'cms' })
useHead({
  title: '管理後台',
  meta: [
    { name: 'robots', content: 'noindex,nofollow,noarchive,nosnippet' },
    { name: 'googlebot', content: 'noindex,nofollow,noarchive,nosnippet' },
  ],
})
</script>

<template>
  <CmsApp page="dashboard" />
</template>
