import { defineStore } from 'pinia'
import { ApiError, apiFetch, getValidAccessToken, wasAuthCheckUnavailable } from '~/utils/api'
import { clearUserStorage, sessionCache, tokenStorage } from '~/utils/storage'
import { clearAllOfflineData, clearOfflineUser, getOfflineActiveUserUuid, loadOfflineAccount, saveOfflineAccount, saveOfflineSession } from '~/utils/offline-cache'
import { loadCompletedStages, mergeCompletedStages, normalizeCompletedStages, replaceCompletedStages } from '~/utils/learning'

const AUTH_CACHE_KEY = 'ziwei:auth-state'

export interface UserProfile {
  uuid?: string
  email?: string
  name?: string
  birth_time?: string
  gender?: string
  city?: string
  longitude?: number
  completed_learning_stage_ids?: string[]
  [key: string]: unknown
}

function hasCompleteProfileChart(profile?: UserProfile | null) {
  return Boolean(
    profile?.gender
    && profile.birth_time
    && (profile.city || (typeof profile.longitude === 'number' && Number.isFinite(profile.longitude))),
  )
}

function birthInfoProfilePayload(info: NonNullable<ReturnType<typeof useChartStore>['birthInfo']>) {
  return {
    birth_time: `${info.year}-${String(info.month).padStart(2, '0')}-${String(info.day).padStart(2, '0')}T${String(info.hour).padStart(2, '0')}:${String(info.minute).padStart(2, '0')}:00Z`,
    gender: info.gender,
    city: info.cityId.replaceAll('-', '_'),
    longitude: info.cityId === 'OTHER' ? Number((info.longitude ?? 120).toFixed(2)) : null,
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null as string | null,
    sessionReady: false,
    profile: null as UserProfile | null,
    points: 0,
    premium: false,
    membershipQuotaRemaining: 0,
    loading: false,
    error: '',
    isOfflineSession: false,
    offlineLastSyncedAt: 0,
    pendingLearningProgressSync: null as null | { serverStageIds: string[]; localStageIds: string[] },
  }),
  getters: {
    isLoggedIn: state => Boolean(state.accessToken),
    isAuthenticated: state => Boolean(state.accessToken),
    canViewMemberContent: state => Boolean(state.accessToken) || state.isOfflineSession,
  },
  actions: {
    async hydrate() {
      if (!import.meta.client || this.sessionReady) return this.canViewMemberContent
      try {
        this.accessToken = await getValidAccessToken()
        if (this.accessToken) {
          const cached = sessionCache.get<{ profile?: UserProfile | null; points?: number; premium?: boolean; membershipQuotaRemaining?: number }>(AUTH_CACHE_KEY)
          this.profile = cached?.profile ?? null
          this.points = Number(cached?.points || 0)
          this.premium = Boolean(cached?.premium)
          this.membershipQuotaRemaining = Number(cached?.membershipQuotaRemaining || 0)
          // An online session must always reconcile against the latest server
          // profile; the cached profile is only useful as a temporary fallback.
          await this.loadProfile()
        } else {
          const offlineUserUuid = getOfflineActiveUserUuid()
          const mayUseOfflineCache = navigator.onLine === false || wasAuthCheckUnavailable()
          const offlineAccount = mayUseOfflineCache ? await loadOfflineAccount(offlineUserUuid) : null
          if (offlineAccount) {
            this.profile = offlineAccount.profile as UserProfile
            this.isOfflineSession = true
            this.offlineLastSyncedAt = offlineAccount.updatedAt
            useChartStore().restoreFromProfile(this.profile)
          } else if (offlineUserUuid) {
            try { await clearOfflineUser(offlineUserUuid) } catch { /* Invalid online sessions must not restore cached identity. */ }
          } else {
            try { await clearAllOfflineData() } catch { /* No authenticated identity may access orphaned cache data. */ }
          }
        }
        return this.canViewMemberContent
      } finally {
        this.sessionReady = true
      }
    },
    async loadProfile(options: { promptLearningSync?: boolean } = {}) {
      if (!this.accessToken) return null
      this.loading = true
      this.error = ''
      try {
        const chart = useChartStore()
        // Capture an anonymous chart before the server profile can replace it.
        // This also covers startup, where auth hydration runs before the layout
        // hydrates the chart store.
        chart.hydrate()
        const localBirthInfo = chart.birthInfo
        this.profile = await apiFetch<UserProfile>('/users/me')
        if (!hasCompleteProfileChart(this.profile) && localBirthInfo) {
          this.profile = await this.updateProfile(birthInfoProfilePayload(localBirthInfo))
        }
        if (typeof this.profile.is_premium === 'boolean') {
          this.premium = this.profile.is_premium
        }
        const userUuid = this.profile.uuid
        if (userUuid && !this.isOfflineSession) {
          saveOfflineSession(userUuid)
          try {
            await saveOfflineAccount(userUuid, this.profile)
            this.offlineLastSyncedAt = Date.now()
          } catch { /* Offline cache must not break a successful profile request. */ }
        }
        if (hasCompleteProfileChart(this.profile)) chart.restoreFromProfile(this.profile)
        await this.loadBilling({ fallbackToCache: false })
        await this.reconcileLearningProgress(Boolean(options.promptLearningSync))
        this.cacheSession()
        return this.profile
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) this.accessToken = null
        this.error = error instanceof Error ? error.message : '載入會員資料失敗'
        return null
      } finally {
        this.loading = false
      }
    },
    async reconcileLearningProgress(promptLocalExtras = false) {
      if (!this.profile) return
      // Explicit login may already be waiting for the user's sync choice. A
      // duplicate profile request must not silently upload local-only stages.
      if (this.pendingLearningProgressSync && !promptLocalExtras) return
      const serverStageIds = normalizeCompletedStages(this.profile.completed_learning_stage_ids)
      const localStageIds = loadCompletedStages()
      const localExtras = localStageIds.filter((stageId) => !serverStageIds.includes(stageId))
      const union = mergeCompletedStages(serverStageIds, localStageIds)
      replaceCompletedStages(union)
      if (localExtras.length && promptLocalExtras) {
        this.pendingLearningProgressSync = { serverStageIds, localStageIds: union }
        return
      }
      if (!localExtras.length) return
      const response = await apiFetch<{ completed_stage_ids?: string[] }>('/users/me/learning-progress', {
        method: 'PUT',
        body: JSON.stringify({ completed_stage_ids: union }),
      })
      const merged = replaceCompletedStages(response.completed_stage_ids)
      this.profile.completed_learning_stage_ids = merged
      this.cacheSession()
    },
    async acceptLearningProgressSync() {
      const pending = this.pendingLearningProgressSync
      if (!pending) return
      const response = await apiFetch<{ completed_stage_ids?: string[] }>('/users/me/learning-progress', {
        method: 'PUT',
        body: JSON.stringify({ completed_stage_ids: pending.localStageIds }),
      })
      const merged = replaceCompletedStages(response.completed_stage_ids)
      if (this.profile) this.profile.completed_learning_stage_ids = merged
      this.pendingLearningProgressSync = null
      this.cacheSession()
    },
    declineLearningProgressSync() {
      const pending = this.pendingLearningProgressSync
      if (!pending) return
      replaceCompletedStages(pending.serverStageIds)
      if (this.profile) this.profile.completed_learning_stage_ids = pending.serverStageIds
      this.pendingLearningProgressSync = null
      this.cacheSession()
    },
    async completeLearningStage(stageId: string) {
      const local = replaceCompletedStages([...loadCompletedStages(), stageId])
      if (!this.isAuthenticated) return local
      try {
        const response = await apiFetch<{ completed_stage_ids?: string[] }>('/users/me/learning-progress', {
          method: 'PUT',
          body: JSON.stringify({ completed_stage_ids: local }),
        })
        const merged = replaceCompletedStages(response.completed_stage_ids)
        if (this.profile) this.profile.completed_learning_stage_ids = merged
        this.cacheSession()
        return merged
      } catch {
        return local
      }
    },
    async loadBilling(options: { fallbackToCache?: boolean } = {}) {
      const { fallbackToCache = true } = options
      try {
        const data = await apiFetch<{ points?: number, premium?: boolean, is_premium?: boolean, membership_quota_remaining?: number }>('/billing/points/me')
        this.points = Number(data.points || 0)
        this.premium = Boolean(data.premium ?? data.is_premium)
        this.membershipQuotaRemaining = Number(data.membership_quota_remaining || 0)
        this.cacheSession()
        return true
      } catch {
        if (fallbackToCache) {
          const cached = sessionCache.get<{ points?: number; premium?: boolean; membershipQuotaRemaining?: number }>(AUTH_CACHE_KEY)
          this.points = Number(cached?.points ?? this.points)
          this.premium = Boolean(cached?.premium ?? this.premium)
          this.membershipQuotaRemaining = Number(cached?.membershipQuotaRemaining ?? this.membershipQuotaRemaining)
        }
        return false
      }
    },
    async refreshMembership() {
      return this.loadBilling({ fallbackToCache: false })
    },
    async verifyOnlineAccess(requirePremium = false) {
      if (!import.meta.client || navigator.onLine === false) {
        window.dispatchEvent(new CustomEvent('api-error-snackbar', { detail: { message: '此操作需要網路連線，離線時僅能查看已保存的歷史資料。' } }))
        return false
      }
      if (!await getValidAccessToken()) {
        this.accessToken = null
        window.dispatchEvent(new CustomEvent('auth-login-required'))
        return false
      }
      this.accessToken = 'cookie-session'
      if (requirePremium && !this.premium) {
        window.dispatchEvent(new CustomEvent('api-error-snackbar', { detail: { message: '此功能為 Premium 會員專屬，請先確認會員方案。' } }))
        return false
      }
      return true
    },
    async loginWithEmail(email: string, code: string) {
      this.loading = true
      this.error = ''
      try {
        const deviceId = tokenStorage.getDeviceId()
        const data = await apiFetch<{ user_uuid?: string, user?: { uuid?: string } }>('/auth/web/email/login', {
          method: 'POST',
          auth: false,
          body: JSON.stringify({ email, code, device_id: deviceId }),
        })
        const userUuid = data.user?.uuid || data.user_uuid
        if (!userUuid) {
          throw new Error('登入回傳資料不完整，請重新登入')
        }
        sessionCache.remove(AUTH_CACHE_KEY)
        tokenStorage.clearLegacyTokens()
        saveOfflineSession(userUuid)
        this.accessToken = 'cookie-session'
        this.sessionReady = true
        this.isOfflineSession = false
        await this.loadProfile({ promptLearningSync: true })
      } catch (error) {
        this.error = error instanceof Error ? error.message : '登入失敗'
        throw error
      } finally {
        this.loading = false
      }
    },
    async loginWithGoogleCredential(credential: string) {
      this.loading = true
      this.error = ''
      try {
        const deviceId = tokenStorage.getDeviceId()
        const data = await apiFetch<{ user_uuid?: string, user?: { uuid?: string } }>('/auth/web/google/login', {
          method: 'POST',
          auth: false,
          body: JSON.stringify({ credential, device_id: deviceId }),
        })
        const userUuid = data.user?.uuid || data.user_uuid
        if (!userUuid) {
          throw new Error('Google 登入回傳資料不完整，請重新登入')
        }
        sessionCache.remove(AUTH_CACHE_KEY)
        tokenStorage.clearLegacyTokens()
        saveOfflineSession(userUuid)
        this.accessToken = 'cookie-session'
        this.sessionReady = true
        this.isOfflineSession = false
        await this.loadProfile({ promptLearningSync: true })
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : ''
        this.error = rawMessage.includes('not configured')
          ? 'Google 網頁版登入尚未完成設定'
          : rawMessage.includes('credential')
            ? 'Google 登入憑證無效或已過期，請重新登入'
            : rawMessage || 'Google 登入失敗，請稍後再試'
        throw error
      } finally {
        this.loading = false
      }
    },
    async requestEmailCode(email: string) {
      await apiFetch('/auth/email/code', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email }),
      })
    },
    async updateProfile(profile: Record<string, unknown>) {
      const data = await apiFetch<UserProfile>('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(profile),
      })
      this.profile = data
      if (typeof data.is_premium === 'boolean') this.premium = data.is_premium
      useChartStore().restoreFromProfile(data)
      const userUuid = this.profile.uuid
      if (userUuid) {
        try {
          await saveOfflineAccount(userUuid, this.profile)
          this.offlineLastSyncedAt = Date.now()
        } catch { /* Offline cache must not break a successful profile update. */ }
      }
      this.cacheSession()
      return this.profile
    },
    cacheSession() {
      sessionCache.set(AUTH_CACHE_KEY, { profile: this.profile, points: this.points, premium: this.premium, membershipQuotaRemaining: this.membershipQuotaRemaining })
    },
    activateOfflineFallback(updatedAt = 0) {
      this.isOfflineSession = true
      this.offlineLastSyncedAt = Math.max(this.offlineLastSyncedAt, Number(updatedAt || 0))
    },
    leaveOfflineFallback() {
      if (this.accessToken && navigator.onLine) this.isOfflineSession = false
    },
    async logout() {
      const offlineUserUuid = getOfflineActiveUserUuid() || this.profile?.uuid || ''
      useActiveAnalysisStore().reset()
      try { await apiFetch('/auth/web/logout', { method: 'POST', auth: false, notifyError: false }) } catch { /* Local logout still proceeds. */ }
      tokenStorage.clearLegacyTokens()
      if (offlineUserUuid) {
        try { await clearOfflineUser(offlineUserUuid) } catch { /* Local cleanup continues below. */ }
      }
      try { await clearAllOfflineData() } catch { /* Local storage cleanup continues below. */ }
      await clearUserStorage()
      this.accessToken = null
      this.sessionReady = true
      this.profile = null
      this.isOfflineSession = false
      this.offlineLastSyncedAt = 0
      this.points = 0
      this.premium = false
      this.membershipQuotaRemaining = 0
      this.pendingLearningProgressSync = null
      const chart = useChartStore()
      chart.$reset()
    },
  },
})
