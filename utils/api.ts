import { tokenStorage } from './storage'
import {
  getOfflineActiveUserUuid,
  isOfflineSnapshotPath,
  loadOfflineSnapshot,
  saveOfflineSnapshot,
} from './offline-cache'

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload?: unknown) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

export class OfflineWriteError extends Error {
  constructor() {
    super('目前為唯讀離線模式，請恢復連線後再操作。')
  }
}

function apiBase() {
  return useRuntimeConfig().public.apiBase.replace(/\/$/, '')
}

function notifyApiError(message: string) {
  if (!import.meta.client) return
  window.dispatchEvent(new CustomEvent('api-error-snackbar', { detail: { message } }))
}

async function parseResponse(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

let refreshInFlight: Promise<boolean> | null = null
let authCheckUnavailable = false

export function wasAuthCheckUnavailable() {
  return authCheckUnavailable
}

async function rotateTokenOnce() {
  let response: Response
  try {
    response = await fetch(`${apiBase()}/auth/web/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        refresh_token: tokenStorage.getRefreshToken() || undefined,
        device_id: tokenStorage.getDeviceId(),
      }),
    })
  } catch {
    // Keep the refresh token for temporary offline/network failures.
    authCheckUnavailable = true
    return false
  }

  if (!response.ok) {
    if (response.status >= 500) authCheckUnavailable = true
    tokenStorage.clearLegacyTokens()
    return false
  }
  tokenStorage.clearLegacyTokens()
  return true
}

async function rotateToken() {
  if (refreshInFlight) return refreshInFlight
  const refresh = async () => {
    if (import.meta.client && 'locks' in navigator) {
      return navigator.locks.request('fate-auth-refresh', async () => {
        try {
          const current = await fetch(`${apiBase()}/auth/web/session`, { credentials: 'include' })
          if (current.ok) return true
        } catch {
          authCheckUnavailable = true
          // Continue with refresh; it will preserve cookies on network failure.
        }
        return rotateTokenOnce()
      })
    }
    return rotateTokenOnce()
  }
  refreshInFlight = refresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

export async function getValidAccessToken(forceRefresh = false) {
  authCheckUnavailable = false
  const hasSessionHint = Boolean(getOfflineActiveUserUuid() || tokenStorage.getRefreshToken())
  if (!hasSessionHint) return null
  if (forceRefresh && !await rotateToken()) return null
  try {
    const response = await fetch(`${apiBase()}/auth/web/session`, { credentials: 'include' })
    if (response.ok) return 'cookie-session'
    if (response.status !== 401) {
      if (response.status >= 500) authCheckUnavailable = true
      return null
    }
    if (!await rotateToken()) return null
    const retried = await fetch(`${apiBase()}/auth/web/session`, { credentials: 'include' })
    if (retried.status >= 500) authCheckUnavailable = true
    return retried.ok ? 'cookie-session' : null
  } catch {
    authCheckUnavailable = true
    return null
  }
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean
  notifyError?: boolean
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = true, notifyError = true, ...requestOptions } = options
  const headers = new Headers(requestOptions.headers)
  if (!headers.has('Content-Type') && requestOptions.body) headers.set('Content-Type', 'application/json')

  const url = path.startsWith('http') ? path : `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`
  const method = String(requestOptions.method || 'GET').toUpperCase()
  const snapshotPath = path.startsWith('http') ? new URL(path).pathname + new URL(path).search : path
  const snapshotUserUuid = getOfflineActiveUserUuid() || ''
  const offlineOnlySession = auth && import.meta.client && navigator.onLine === false && Boolean(snapshotUserUuid)
  const canUseSnapshot = method === 'GET' && Boolean(snapshotUserUuid) && isOfflineSnapshotPath(snapshotPath)
  const useSnapshot = async () => {
    if (!canUseSnapshot) return null
    const cached = await loadOfflineSnapshot<T>(snapshotUserUuid, snapshotPath)
    if (cached && import.meta.client) {
      window.dispatchEvent(new CustomEvent('offline-snapshot-used', { detail: { updatedAt: cached.updatedAt } }))
    }
    return cached
  }

  if (import.meta.client && (navigator.onLine === false || offlineOnlySession)) {
    if (method !== 'GET') {
      const offlineError = new OfflineWriteError()
      if (notifyError) notifyApiError(offlineError.message)
      throw offlineError
    }
    const cached = await useSnapshot()
    if (cached) return cached.payload
  }
  let response: Response
  try {
    response = await fetch(url, { ...requestOptions, headers, credentials: 'include' })
  } catch (cause) {
    const cached = await useSnapshot()
    if (cached) return cached.payload
    const message = cause instanceof TypeError ? '無法連線至伺服器，請檢查網路後再試。' : '請求未能完成，請稍後再試。'
    if (notifyError) notifyApiError(message)
    throw cause
  }
  if (response.status === 401 && auth) {
    const refreshed = await getValidAccessToken(true)
    if (refreshed) {
      try {
        response = await fetch(url, { ...requestOptions, headers, credentials: 'include' })
      } catch (cause) {
        const cached = await useSnapshot()
        if (cached) return cached.payload
        if (notifyError) notifyApiError('重新連線失敗，請稍後再試。')
        throw cause
      }
    }
  }

  const payload = await parseResponse(response)
  if (response.ok && canUseSnapshot) {
    try { await saveOfflineSnapshot(snapshotUserUuid, snapshotPath, payload) } catch { /* Offline persistence must not break a successful API request. */ }
  }
  if (!response.ok) {
    if (response.status >= 500) {
      const cached = await useSnapshot()
      if (cached) return cached.payload
    }
    const message = typeof payload === 'object' && payload && ('error' in payload || 'message' in payload)
      ? String((payload as { error?: unknown, message?: unknown }).error || (payload as { message?: unknown }).message)
      : response.status === 401 ? '登入狀態已失效，請重新登入。'
        : response.status === 403 ? '您目前沒有執行此操作的權限。'
          : response.status >= 500 ? '伺服器暫時發生錯誤，請稍後再試。'
            : `請求發生錯誤（${response.status}）`
    if (notifyError) notifyApiError(message)
    throw new ApiError(response.status, message, payload)
  }
  return payload as T
}

export async function connectAnalyzeWebSocket() {
  if (!await getValidAccessToken()) throw new Error('登入狀態已失效，請重新登入')
  const configuredUrl = useRuntimeConfig().public.wsAnalyzeUrl
  const wsUrl = configuredUrl.startsWith('/')
    ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${configuredUrl}`
    : configuredUrl
  return new WebSocket(wsUrl)
}
