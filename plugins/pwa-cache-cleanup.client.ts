export default defineNuxtPlugin(() => {
  if (!('caches' in window)) return
  void caches.delete('api-cache').catch(() => {
    // A legacy runtime cache must never block application startup.
  })
})

