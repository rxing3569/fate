<script setup lang="ts">
definePageMeta({ layout: 'cms' })
useSeoMeta({ title: '會員管理', robots: 'noindex, nofollow, noarchive, nosnippet', googlebot: 'noindex, nofollow, noarchive, nosnippet' })
onMounted(() => navigateTo('/cms/members/', { replace: true }))
</script>

<template><div /></template>
