export class CmsApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

export async function cmsApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = useRuntimeConfig().public.apiBase.replace(/\/$/, '')
  const response = await fetch(`${base}/admin${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new CmsApiError(data.error || '系統暫時無法處理請求', response.status)
  return data as T
}
