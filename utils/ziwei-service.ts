import { apiFetch, connectAnalyzeWebSocket } from './api'
import { markStageCompleted, normalizeCompletedStages } from './learning'

export interface AnalysisRequest {
  type: 'report' | 'flow' | 'match' | 'qa'
  payload: Record<string, unknown>
  onMessage: (message: string) => void
  onDone?: () => void
  onError?: (message: string) => void
  signal?: AbortSignal
}

export async function streamAnalysis(request: AnalysisRequest) {
  const socket = await connectAnalyzeWebSocket()
  let resolveCompletion!: () => void
  let rejectCompletion!: (error: Error) => void
  const completion = new Promise<void>((resolve, reject) => { resolveCompletion = resolve; rejectCompletion = reject })
  let finalized = false
  const finish = () => {
    if (finalized) return
    finalized = true
    request.onDone?.()
    resolveCompletion()
    if (socket.readyState === WebSocket.OPEN) socket.close(1000, 'complete')
  }
  const fail = (message: string) => {
    if (finalized) return
    finalized = true
    request.onError?.(message)
    rejectCompletion(new Error(message))
    if (socket.readyState === WebSocket.OPEN) socket.close(1000, 'error')
  }
  const abort = () => {
    if (finalized) return
    finalized = true
    rejectCompletion(new Error('analysis_cancelled'))
    try {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close(1000, 'cancelled')
    } catch { /* The browser may reject close while the handshake is pending. */ }
  }
  if (request.signal?.aborted) abort()
  else request.signal?.addEventListener('abort', abort, { once: true })
  socket.addEventListener('open', () => {
    if (finalized) return
    socket.send(JSON.stringify({ type: request.type, ...request.payload }))
  })
  socket.addEventListener('message', (event) => {
    const text = String(event.data)
    if (text.trim() === '/end') {
      finish()
      return
    }
    try {
      const data = JSON.parse(text)
      if (data === '/end') { finish(); return }
      if (data.type === 'learning_progress') {
        for (const stageId of normalizeCompletedStages(data.completed_stage_ids)) markStageCompleted(stageId)
        return
      }
      if (data.error || data.type === 'error') { fail(String(data.detail || data.error || data.message || '分析發生錯誤')); return }
      if (data.content) request.onMessage(String(data.content))
      if (data.done || data.type === 'done' || data.type === 'complete') finish()
    } catch {
      request.onMessage(text)
    }
  })
  socket.addEventListener('close', () => {
    if (!finalized) fail('分析連線中斷，請重新讀取最新狀態')
  })
  socket.addEventListener('error', () => fail('分析連線失敗'))
  return completion.finally(() => request.signal?.removeEventListener('abort', abort))
}

export const ziweiApi = {
  mergeLearningProgress(completedStageIds: string[]) {
    return apiFetch('/users/me/learning-progress', {
      method: 'PUT',
      body: JSON.stringify({ completed_stage_ids: completedStageIds }),
    })
  },
  getRecordDetail(options: { notifyError?: boolean } = {}) {
    return apiFetch('/ziwei/records/detail', options)
  },
  getChatList() {
    return apiFetch('/ziwei/qa/chats')
  },
  getChatHistory(chatId: string, options: { notifyError?: boolean } = {}) {
    return apiFetch(`/ziwei/qa/history/${encodeURIComponent(chatId)}`, options)
  },
  deleteChat(chatId: string, options: { notifyError?: boolean } = {}) {
    return apiFetch(`/ziwei/qa/chats/${encodeURIComponent(chatId)}`, { method: 'DELETE', ...options })
  },
  getActiveAnalysisJob(options: { notifyError?: boolean } = {}) {
    return apiFetch('/ziwei/analysis/jobs/active', options)
  },
  getAnalysisJob(jobId: string, options: { notifyError?: boolean } = {}) {
    return apiFetch(`/ziwei/analysis/jobs/${encodeURIComponent(jobId)}`, options)
  },
  getMatchRecords() {
    return apiFetch('/ziwei/match/records')
  },
  getMatchRecord(uuid: string) {
    return apiFetch(`/ziwei/match/records/${uuid}`)
  },
  deleteMatchRecord(uuid: string) {
    return apiFetch(`/ziwei/match/records/${uuid}`, { method: 'DELETE' })
  },
  getFlowRecord(dateKey: number, options: { notifyError?: boolean } = {}) {
    return apiFetch(`/ziwei/flow/record/${dateKey}`, options)
  },
  submitIssueReport(payload: { issue_type: '系統建議' | 'BUG' | '會員權益', description: string }) {
    return apiFetch('/issue-reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getBillingHistory(kind: 'points' | 'quota', params: { cursor?: string, startDate?: string, endDate?: string, limit?: number } = {}) {
    const query = new URLSearchParams({ limit: String(params.limit || 20) })
    if (params.cursor) query.set('cursor', params.cursor)
    if (params.startDate) query.set('start_date', params.startDate)
    if (params.endDate) query.set('end_date', params.endDate)
    return apiFetch(`/billing/${kind === 'points' ? 'points' : 'quota'}/history?${query}`)
  },
  getWebProducts() {
    return apiFetch('/billing/web/products')
  },
  createWebCheckout(productId: string, expectedPrice: number, payerEmail = '') {
    return apiFetch('/billing/web/checkout', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, payer_email: payerEmail, expected_price: expectedPrice }),
    })
  },
  getWebOrder(orderId: string) {
    return apiFetch(`/billing/web/orders/${encodeURIComponent(orderId)}`)
  },
  getWebOrderByMerchantNo(merchantOrderNo: string) {
    return apiFetch(`/billing/web/orders/merchant/${encodeURIComponent(merchantOrderNo)}`)
  },
  getWebOrders(params: { cursor?: string, limit?: number } = {}) {
    const query = new URLSearchParams({ limit: String(params.limit || 20) })
    if (params.cursor) query.set('cursor', params.cursor)
    return apiFetch(`/billing/web/orders?${query}`)
  },
  getWebSubscription() {
    return apiFetch('/billing/web/subscription')
  },
  cancelWebSubscription() {
    return apiFetch('/billing/web/subscription/cancel', { method: 'POST' })
  },
  mockWebPurchase(productId: string) {
    return apiFetch('/billing/web/mock-purchase', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    })
  },
}
