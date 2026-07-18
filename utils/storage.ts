const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const USER_UUID_KEY = 'user_uuid'
const DEVICE_ID_KEY = 'device_id'
const NON_USER_LOCAL_KEYS = new Set([
  DEVICE_ID_KEY,
  'ziwei:pwa-install-prompt-dismissed',
])

function read(key: string) {
  if (!import.meta.client) return null
  const current = sessionStorage.getItem(key)
  if (current) return current
  const legacy = localStorage.getItem(key)
  if (legacy && key !== DEVICE_ID_KEY) {
    sessionStorage.setItem(key, legacy)
    localStorage.removeItem(key)
  }
  return legacy
}

function write(key: string, value: string) {
  if (!import.meta.client) return
  if (key === DEVICE_ID_KEY) localStorage.setItem(key, value)
  else sessionStorage.setItem(key, value)
}

function remove(key: string) {
  if (!import.meta.client) return
  sessionStorage.removeItem(key)
  localStorage.removeItem(key)
}

export const tokenStorage = {
  getAccessToken: () => read(ACCESS_TOKEN_KEY),
  getRefreshToken: () => read(REFRESH_TOKEN_KEY),
  getUserUuid: () => read(USER_UUID_KEY),
  saveTokens(accessToken: string, refreshToken: string, userUuid?: string | null) {
    write(ACCESS_TOKEN_KEY, accessToken)
    write(REFRESH_TOKEN_KEY, refreshToken)
    if (userUuid) write(USER_UUID_KEY, userUuid)
  },
  clear() {
    remove(ACCESS_TOKEN_KEY)
    remove(REFRESH_TOKEN_KEY)
    remove(USER_UUID_KEY)
  },
  clearLegacyTokens() {
    remove(ACCESS_TOKEN_KEY)
    remove(REFRESH_TOKEN_KEY)
    remove(USER_UUID_KEY)
  },
  getDeviceId() {
    let deviceId = read(DEVICE_ID_KEY)
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      write(DEVICE_ID_KEY, deviceId)
    }
    return deviceId
  },
}

export const sessionCache = {
  get<T>(key: string): T | null {
    if (!import.meta.client) return null
    try { return JSON.parse(sessionStorage.getItem(key) || 'null') as T | null } catch { return null }
  },
  set(key: string, value: unknown) {
    if (import.meta.client) sessionStorage.setItem(key, JSON.stringify(value))
  },
  remove(key: string) {
    if (import.meta.client) sessionStorage.removeItem(key)
  },
  clearPrefix(prefix: string) {
    if (!import.meta.client) return
    for (const key of Object.keys(sessionStorage)) if (key.startsWith(prefix)) sessionStorage.removeItem(key)
  },
}

/** Clear every browser cache that may contain data belonging to the signed-in user. */
export async function clearUserStorage() {
  if (!import.meta.client) return

  sessionStorage.clear()
  for (const key of Object.keys(localStorage)) {
    if (!NON_USER_LOCAL_KEYS.has(key)) localStorage.removeItem(key)
  }

  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys()
      await Promise.allSettled(cacheNames.filter(name => name === 'api-cache' || name.includes('api')).map(name => caches.delete(name)))
    } catch {
      // Storage cleanup must not prevent the in-memory logout from completing.
    }
  }
}

export function isTokenExpired(token?: string | null) {
  if (!token) return true
  try {
    const [, payload] = token.split('.')
    if (!payload) return true
    const normalized = payload.padEnd(payload.length + ((4 - payload.length % 4) % 4), '=')
    const data = JSON.parse(atob(normalized.replace(/-/g, '+').replace(/_/g, '/')))
    if (!data.exp) return false
    return data.exp * 1000 < Date.now() + 15_000
  } catch {
    return true
  }
}
