const updateIntervalMs = 15 * 60 * 1000
const updateThrottleMs = 10 * 1000

export default defineNuxtPlugin((nuxtApp) => {
  if (!('serviceWorker' in navigator)) return

  let lastCheckAt = 0
  let reloading = false
  const controlledAtStartup = Boolean(navigator.serviceWorker.controller)

  async function checkForUpdate(force = false) {
    const now = Date.now()
    if (!force && now - lastCheckAt < updateThrottleMs) return
    lastCheckAt = now

    try {
      // updateViaCache: "none" is important on iOS and prevents the browser's
      // HTTP cache from hiding a newly deployed service worker script.
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      await registration.update()
    } catch {
      // Offline startup is valid for a PWA. The next foreground/online event
      // will retry without interrupting the user.
    }
  }

  function handleControllerChange() {
    if (!controlledAtStartup || reloading) return
    reloading = true
    window.location.reload()
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') void checkForUpdate(true)
  }

  function handlePageShow() {
    void checkForUpdate(true)
  }

  nuxtApp.hook('app:mounted', () => {
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('online', handlePageShow)
    window.setInterval(() => void checkForUpdate(), updateIntervalMs)
    void checkForUpdate(true)
  })
})
