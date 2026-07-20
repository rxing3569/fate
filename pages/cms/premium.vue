<script setup lang="ts">
definePageMeta({ layout: 'cms' })
useHead({
  title: '會員管理',
  meta: [
    { name: 'robots', content: 'noindex,nofollow,noarchive,nosnippet' },
    { name: 'googlebot', content: 'noindex,nofollow,noarchive,nosnippet' },
  ],
})
onMounted(() => navigateTo('/cms/members/', { replace: true }))
</script>

<template>
  <div />
</template>
