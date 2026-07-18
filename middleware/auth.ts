export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  if (import.meta.client && !auth.sessionReady) {
    await auth.hydrate()
  }
  if (import.meta.client && !auth.canViewMemberContent) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }
})
