import { isTokenExpired, tokenStorage } from './storage'

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload?: unknown) {
    super(message)
    this.status = status
    this.payload = payload
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

async function rotateTokenOnce() {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return false

  let response: Response
  try {
    response = await fetch(`${apiBase()}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshToken,
        device_id: tokenStorage.getDeviceId(),
      }),
    })
  } catch {
    // Keep the refresh token for temporary offline/network failures.
    return false
  }

  if (!response.ok) {
    tokenStorage.clear()
    return false
  }

  const data = await parseResponse(response) as { access_token?: string, refresh_token?: string, user_uuid?: string }
  if (!data?.access_token || !data.refresh_token || isTokenExpired(data.access_token)) {
    tokenStorage.clear()
    return false
  }
  tokenStorage.saveTokens(data.access_token, data.refresh_token, data.user_uuid || tokenStorage.getUserUuid() || '')
  return true
}

async function rotateToken() {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = rotateTokenOnce().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

export async function getValidAccessToken(forceRefresh = false) {
  let token = tokenStorage.getAccessToken()
  if (forceRefresh || isTokenExpired(token)) {
    const refreshed = await rotateToken()
    if (!refreshed) return null
    token = tokenStorage.getAccessToken()
  }
  return isTokenExpired(token) ? null : token
}

type ApiFetchOptions = RequestInit & {
  auth?: boolean
  notifyError?: boolean
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = true, notifyError = true, ...requestOptions } = options
  const headers = new Headers(requestOptions.headers)
  if (!headers.has('Content-Type') && requestOptions.body) headers.set('Content-Type', 'application/json')

  if (auth) {
    const token = await getValidAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const url = path.startsWith('http') ? path : `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`
  let response: Response
  try {
    response = await fetch(url, { ...requestOptions, headers })
  } catch (cause) {
    const message = cause instanceof TypeError ? '無法連線至伺服器，請檢查網路後再試。' : '請求未能完成，請稍後再試。'
    if (notifyError) notifyApiError(message)
    throw cause
  }
  if (response.status === 401 && auth) {
    const refreshed = await getValidAccessToken(true)
    if (refreshed) {
      headers.set('Authorization', `Bearer ${refreshed}`)
      try {
        response = await fetch(url, { ...requestOptions, headers })
      } catch (cause) {
        if (notifyError) notifyApiError('重新連線失敗，請稍後再試。')
        throw cause
      }
    }
  }

  const payload = await parseResponse(response)
  if (!response.ok) {
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
  const token = await getValidAccessToken()
  if (!token) throw new Error('登入狀態已失效，請重新登入')
  const configuredUrl = useRuntimeConfig().public.wsAnalyzeUrl
  const wsUrl = configuredUrl.startsWith('/')
    ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}${configuredUrl}`
    : configuredUrl
  return new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`)
}
