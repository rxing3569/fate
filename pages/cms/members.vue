<script setup lang="ts">
definePageMeta({ layout: 'cms' })
useHead({
  title: '會員管理｜FATEJYC CMS',
  meta: [{ name: 'robots', content: 'noindex,nofollow,noarchive,nosnippet' }],
})
</script>

<template>
  <CmsManager page="members" />
</template>
