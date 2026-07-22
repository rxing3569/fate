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

export interface BatchAnalysisEvent {
  type: 'chunk' | 'step_completed' | 'step_failed' | 'batch_completed'
  step_key?: string
  content?: string
  message?: string
  failed_steps?: string[]
}

export async function streamAnalysis(request: AnalysisRequest) {
  const socket = await connectAnalyzeWebSocket()
  let requestSent = false
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
    requestSent = true
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
    if (!finalized) fail(requestSent ? 'analysis_connection_lost' : 'analysis_connection_failed')
  })
  socket.addEventListener('error', () => fail(requestSent ? 'analysis_connection_lost' : 'analysis_connection_failed'))
  return completion.finally(() => request.signal?.removeEventListener('abort', abort))
}

export async function streamBatchAnalysis(options: {
  payload: Record<string, unknown>
  onEvent: (event: BatchAnalysisEvent) => void
  signal?: AbortSignal
}) {
  const socket = await connectAnalyzeWebSocket()
  return await new Promise<void>((resolve, reject) => {
    let sent = false
    let finished = false
    const finish = (error?: Error) => {
      if (finished) return
      finished = true
      options.signal?.removeEventListener('abort', abort)
      if (socket.readyState === WebSocket.OPEN) socket.close(1000, error ? 'error' : 'complete')
      if (error) reject(error)
      else resolve()
    }
    const abort = () => finish(new Error('analysis_cancelled'))
    if (options.signal?.aborted) return abort()
    options.signal?.addEventListener('abort', abort, { once: true })
    socket.addEventListener('open', () => {
      sent = true
      socket.send(JSON.stringify({ type: 'report', ...options.payload, analysis_type: 'report_batch' }))
    })
    socket.addEventListener('message', (message) => {
      const text = String(message.data)
      if (text.trim() === '/end') return finish()
      try {
        const data = JSON.parse(text) as { type?: string; detail?: string; error?: string; message?: string; step_key?: string; content?: string; failed_steps?: string[] }
        if (data.type === 'learning_progress') return
        if (data.type === 'error' || data.error) return finish(new Error(data.detail || data.message || data.error || '分析發生錯誤'))
        if (data.type && ['chunk', 'step_completed', 'step_failed', 'batch_completed'].includes(data.type)) {
          options.onEvent(data as BatchAnalysisEvent)
          if (data.type === 'batch_completed') finish()
        }
      } catch {
        // report_batch only accepts tagged JSON events.
      }
    })
    socket.addEventListener('close', () => {
      if (!finished) finish(new Error(sent ? 'analysis_connection_lost' : 'analysis_connection_failed'))
    })
    socket.addEventListener('error', () => finish(new Error(sent ? 'analysis_connection_lost' : 'analysis_connection_failed')))
  })
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
  finalizeAnalysisTimeout(jobId: string) {
    return apiFetch(`/ziwei/analysis/jobs/${encodeURIComponent(jobId)}/finalize-timeout`, { method: 'POST' })
  },
  getIncompleteAnalyses(kind: 'flow' | 'match', options: { notifyError?: boolean } = {}) {
    return apiFetch(`/ziwei/analysis/incomplete?kind=${kind}`, options)
  },
  prepareIncompleteRetry(kind: 'flow' | 'match', uuid: string) {
    return apiFetch(`/ziwei/analysis/incomplete/${kind}/${encodeURIComponent(uuid)}/prepare-retry`, { method: 'POST' })
  },
  abandonIncompleteAnalysis(kind: 'flow' | 'match', uuid: string) {
    return apiFetch(`/ziwei/analysis/incomplete/${kind}/${encodeURIComponent(uuid)}`, { method: 'DELETE' })
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
  createPaymentTestCheckout(kind: 'one_time' | 'recurring', payerEmail = '') {
    return apiFetch('/billing/payment-test/checkout', {
      method: 'POST',
      body: JSON.stringify({ kind, payer_email: payerEmail }),
    })
  },
  getPaymentTestConfig() {
    return apiFetch('/billing/payment-test/config', { notifyError: false })
  },
  getPaymentTestOrders() {
    return apiFetch('/billing/payment-test/orders', { notifyError: false })
  },
  getPaymentTestOrder(orderId: string) {
    return apiFetch(`/billing/payment-test/orders/${encodeURIComponent(orderId)}`, { notifyError: false })
  },
  terminatePaymentTestOrder(orderId: string) {
    return apiFetch(`/billing/payment-test/orders/${encodeURIComponent(orderId)}/terminate`, { method: 'POST' })
  },
}
