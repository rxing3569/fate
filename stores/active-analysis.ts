import { defineStore } from 'pinia'
import { ApiError, getValidAccessToken } from '~/utils/api'

export type AnalysisKind = 'report' | 'flow' | 'match' | 'qa'
export type AnalysisStatus = 'idle' | 'running' | 'completed' | 'failed' | 'timed_out'

export interface ActiveAnalysisState {
  jobId: string
  kind: AnalysisKind
  contextKey: string
  status: AnalysisStatus
  contents: Record<string, string>
  metadata: Record<string, unknown>
  error: string
  startedAt: number
  connected: boolean
}

const CACHE_KEY = 'ziwei:active-analysis'
let pollingTimer: ReturnType<typeof setInterval> | undefined
let activeController: AbortController | undefined

type SnackbarOptions = {
  title?: string
  actionLabel?: string
  actionTo?: string
  duration?: number
}

function snackbar(message: string, type: 'info' | 'error', options: SnackbarOptions = {}) {
  if (!import.meta.client) return
  window.dispatchEvent(new CustomEvent('api-error-snackbar', { detail: { message, type, ...options } }))
}

const labels: Record<AnalysisKind, string> = {
  report: '命盤解析',
  flow: '時運解析',
  match: '合盤解析',
  qa: 'AI 問答',
}

const destinations: Record<AnalysisKind, string> = {
  report: '/report',
  flow: '/flow',
  match: '/match',
  qa: '/qa',
}

function normalizePath(path: string) {
  const normalized = path.replace(/\/+$/, '')
  return normalized || '/'
}

function notifyCompleted(kind: AnalysisKind) {
  if (
    import.meta.client
    && normalizePath(window.location.pathname) === normalizePath(destinations[kind])
  ) return
  snackbar(`${labels[kind]}結果已保存，點擊下方按鈕即可前往查看。`, 'info', {
    title: `${labels[kind]}已完成`,
    actionLabel: kind === 'qa' ? '前往 AI 問答' : '查看解析結果',
    actionTo: destinations[kind],
    duration: 6000,
  })
}

function notifyConflict(runningKind: AnalysisKind, requestedKind: AnalysisKind) {
  snackbar(`目前正在進行「${labels[runningKind]}」。為避免重複扣點、重複送出或中斷既有結果，完成前無法開始「${labels[requestedKind]}」。`, 'error', {
    title: '已有分析任務進行中',
    actionLabel: `查看${labels[runningKind]}進度`,
    actionTo: destinations[runningKind],
  })
}

export const useActiveAnalysisStore = defineStore('active-analysis', {
  state: () => ({
    active: null as ActiveAnalysisState | null,
    hydrated: false,
  }),
  getters: {
    isRunning: state => state.active?.status === 'running',
    runningLabel: state => state.active ? labels[state.active.kind] : '',
  },
  actions: {
    persist() {
      if (!import.meta.client) return
      if (this.active) sessionStorage.setItem(CACHE_KEY, JSON.stringify(this.active))
      else sessionStorage.removeItem(CACHE_KEY)
    },
    async hydrate() {
      if (!import.meta.client || this.hydrated) return
      if (!await getValidAccessToken()) {
        this.stopPolling()
        this.active = null
        sessionStorage.removeItem(CACHE_KEY)
        return
      }
      this.hydrated = true
      try {
        const raw = sessionStorage.getItem(CACHE_KEY)
        if (raw) {
          this.active = JSON.parse(raw) as ActiveAnalysisState
          if (this.active.status === 'running') this.active.connected = false
        }
      } catch {
        sessionStorage.removeItem(CACHE_KEY)
      }
      try {
        const response = await ziweiApi.getActiveAnalysisJob({ notifyError: false }) as { data?: { client_job_id?: string, analysis_type?: string, context_key?: string, status?: AnalysisStatus, started_at?: string } | null }
        const job = response?.data
        if (job?.status === 'running') {
          const kind = (['report', 'flow', 'match', 'qa'].includes(job.analysis_type || '') ? job.analysis_type : this.active?.kind) as AnalysisKind | undefined
          if (kind && (!this.active || this.active.jobId !== job.client_job_id)) {
            this.active = {
              jobId: job.client_job_id || crypto.randomUUID(), kind,
              contextKey: job.context_key || '', status: 'running', contents: {}, metadata: {},
              error: '', startedAt: Date.parse(job.started_at || '') || Date.now(), connected: false,
            }
          }
        } else if (this.active?.status === 'running' && !this.active.connected) {
          await this.refreshStatus()
        }
      } catch {
        // Keep the session snapshot while temporarily offline.
      }
      this.persist()
      if (this.active?.status === 'running' && !this.active.connected) this.startPolling()
    },
    startPolling() {
      if (!import.meta.client || pollingTimer) return
      pollingTimer = setInterval(() => { void this.refreshStatus() }, 3000)
    },
    stopPolling() {
      if (pollingTimer) clearInterval(pollingTimer)
      pollingTimer = undefined
    },
    async refreshStatus() {
      const job = this.active
      if (!job || job.status !== 'running' || job.connected) { this.stopPolling(); return }
      if (!await getValidAccessToken()) { this.stopPolling(); return }
      try {
        const response = await ziweiApi.getAnalysisJob(job.jobId, { notifyError: false }) as { data?: { status?: AnalysisStatus, error?: string } }
        const status = response.data?.status
        if (!status || status === 'running') return
        job.status = status
        job.error = response.data?.error || ''
        this.persist()
        this.stopPolling()
        if (status === 'completed') notifyCompleted(job.kind)
        else snackbar(job.error || '工作未完成，請稍後重新執行。', 'error', { title: `${labels[job.kind]}執行失敗` })
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 401) {
          this.stopPolling()
          return
        }
        if (reason instanceof ApiError && reason.status === 404 && this.active?.jobId === job.jobId) {
          job.status = 'failed'
          job.error = '找不到分析工作，請重新執行'
          this.persist()
          this.stopPolling()
          snackbar(`${labels[job.kind]}失敗：${job.error}`, 'error')
        }
        // Other failures may be temporary network errors; keep polling.
      }
    },
    async ensureAvailable(kind: AnalysisKind) {
      await this.hydrate()
      if (this.active?.status === 'running') {
        notifyConflict(this.active.kind, kind)
        return false
      }
      return true
    },
    async begin(kind: AnalysisKind, contextKey: string, metadata: Record<string, unknown> = {}) {
      if (!await this.ensureAvailable(kind)) return false
      this.active = {
        jobId: crypto.randomUUID(), kind, contextKey, status: 'running', contents: {}, metadata,
        error: '', startedAt: Date.now(), connected: false,
      }
      activeController?.abort()
      activeController = new AbortController()
      this.persist()
      return true
    },
    updateMetadata(metadata: Record<string, unknown>) {
      if (!this.active) return
      this.active.metadata = { ...this.active.metadata, ...metadata }
      this.persist()
    },
    async runStep(payload: Record<string, unknown>, contentKey = 'main', final = true) {
      const job = this.active
      if (!job || job.status !== 'running') throw new Error('沒有可執行的分析工作')
      job.contents[contentKey] = ''
      job.connected = true
      this.persist()
      try {
        await streamAnalysis({
          type: job.kind,
          payload: {
            ...payload,
            client_job_id: job.jobId,
            analysis_context_key: job.contextKey,
            job_is_final: final,
          },
          signal: activeController?.signal,
          onMessage: chunk => {
            if (this.active?.jobId !== job.jobId) return
            this.active.contents[contentKey] = (this.active.contents[contentKey] || '') + chunk
            this.persist()
          },
        })
        if (this.active?.jobId !== job.jobId) return ''
        this.active.connected = false
        if (final) {
          this.active.status = 'completed'
          activeController = undefined
          notifyCompleted(job.kind)
        }
        this.persist()
        return this.active.contents[contentKey] || ''
      } catch (reason) {
        const failureMessage = reason instanceof Error ? reason.message : '分析連線失敗'
        if (failureMessage === 'analysis_in_progress') {
          activeController = undefined
          let runningKind = job.kind
          try {
            const response = await ziweiApi.getActiveAnalysisJob({ notifyError: false }) as { data?: { client_job_id?: string, analysis_type?: string, context_key?: string, started_at?: string } | null }
            const running = response.data
            const recoveredKind = running?.analysis_type && ['report', 'flow', 'match', 'qa'].includes(running.analysis_type)
              ? running.analysis_type as AnalysisKind
              : runningKind
            runningKind = recoveredKind
            if (running?.client_job_id) {
              this.active = {
                jobId: running.client_job_id,
                kind: recoveredKind,
                contextKey: running.context_key || '',
                status: 'running',
                contents: {},
                metadata: {},
                error: '',
                startedAt: Date.parse(running.started_at || '') || Date.now(),
                connected: false,
              }
              this.persist()
              this.startPolling()
            }
          } catch { /* The explanatory snackbar is still useful while offline. */ }
          notifyConflict(runningKind, job.kind)
          throw reason
        }
        if (this.active?.jobId === job.jobId) {
          this.active.connected = false
          this.active.status = 'failed'
          this.active.error = failureMessage
          activeController = undefined
          this.persist()
          snackbar(this.active.error, 'error', { title: `${labels[job.kind]}執行失敗` })
        }
        throw reason
      }
    },
    reset() {
      this.stopPolling()
      activeController?.abort()
      activeController = undefined
      this.active = null
      this.hydrated = false
      if (import.meta.client) sessionStorage.removeItem(CACHE_KEY)
    },
  },
})
