<script setup lang="ts">
const route = useRoute()
const privateRoutes = new Set([
  '/chart',
  '/cms',
  '/flow',
  '/issue-report',
  '/login',
  '/match',
  '/member',
  '/nwp-live-check',
  '/payment-result',
  '/point-history',
  '/profile/edit',
  '/purchase-history',
  '/qa',
  '/report',
  '/report-detail',
  '/store',
])
const normalizedPath = computed(() => route.path.replace(/\/$/, '') || '/')
useSeoMeta({
  robots: () => privateRoutes.has(normalizedPath.value)
    ? 'noindex, nofollow'
    : 'index, follow',
  ogImage: 'https://www.fatejyc.com/og.png',
  ogImageAlt: '江映澄紫微｜AI 紫微斗數命盤解析',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
  twitterImage: 'https://www.fatejyc.com/og.png',
  twitterImageAlt: '江映澄紫微｜AI 紫微斗數命盤解析',
})
</script>

<template>
  <NuxtPwaManifest />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
