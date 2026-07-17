import { defineStore } from 'pinia'
import { apiFetch, getValidAccessToken } from '~/utils/api'
import { clearUserStorage, isTokenExpired, sessionCache, tokenStorage } from '~/utils/storage'

const AUTH_CACHE_KEY = 'ziwei:auth-state'

export interface UserProfile {
  uuid?: string
  email?: string
  name?: string
  birth_time?: string
  gender?: string
  city?: string
  longitude?: number
  [key: string]: unknown
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
  }),
  getters: {
    isLoggedIn: state => Boolean(state.accessToken),
    isAuthenticated: state => Boolean(state.accessToken),
  },
  actions: {
    async hydrate() {
      if (!import.meta.client || this.sessionReady) return this.isAuthenticated
      try {
        this.accessToken = await getValidAccessToken()
        if (this.accessToken) {
          const cached = sessionCache.get<{ profile?: UserProfile | null; points?: number; premium?: boolean; membershipQuotaRemaining?: number }>(AUTH_CACHE_KEY)
          this.profile = cached?.profile ?? null
          this.points = Number(cached?.points || 0)
          this.premium = Boolean(cached?.premium)
          this.membershipQuotaRemaining = Number(cached?.membershipQuotaRemaining || 0)
          if (this.profile) useChartStore().restoreFromProfile(this.profile)
          else await this.loadProfile()
        }
        return Boolean(this.accessToken)
      } finally {
        this.sessionReady = true
      }
    },
    async loadProfile() {
      if (!tokenStorage.getAccessToken()) return null
      this.loading = true
      this.error = ''
      try {
        this.profile = await apiFetch<UserProfile>('/users/me')
        useChartStore().restoreFromProfile(this.profile)
        await this.loadBilling()
        this.cacheSession()
        return this.profile
      } catch (error) {
        const storedToken = tokenStorage.getAccessToken()
        this.accessToken = isTokenExpired(storedToken) ? null : storedToken
        this.error = error instanceof Error ? error.message : '載入會員資料失敗'
        return null
      } finally {
        this.loading = false
      }
    },
    async loadBilling() {
      try {
        const data = await apiFetch<{ points?: number, premium?: boolean, is_premium?: boolean, membership_quota_remaining?: number }>('/billing/points/me')
        this.points = Number(data.points || 0)
        this.premium = Boolean(data.premium ?? data.is_premium)
        this.membershipQuotaRemaining = Number(data.membership_quota_remaining || 0)
        this.cacheSession()
      } catch {
        const cached = sessionCache.get<{ points?: number; premium?: boolean; membershipQuotaRemaining?: number }>(AUTH_CACHE_KEY)
        this.points = Number(cached?.points ?? this.points)
        this.premium = Boolean(cached?.premium ?? this.premium)
        this.membershipQuotaRemaining = Number(cached?.membershipQuotaRemaining ?? this.membershipQuotaRemaining)
      }
    },
    async loginWithEmail(email: string, code: string) {
      this.loading = true
      this.error = ''
      try {
        const deviceId = tokenStorage.getDeviceId()
        const data = await apiFetch<{ access_token?: string, refresh_token?: string, user_uuid?: string, user?: { uuid?: string } }>('/auth/email/login', {
          method: 'POST',
          auth: false,
          body: JSON.stringify({ email, code, device_id: deviceId }),
        })
        const userUuid = data.user?.uuid || data.user_uuid
        if (!data.access_token || !data.refresh_token || !userUuid) {
          throw new Error('登入回傳資料不完整，請重新登入')
        }
        tokenStorage.saveTokens(data.access_token, data.refresh_token, userUuid)
        this.accessToken = data.access_token
        this.sessionReady = true
        await this.loadProfile()
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
        const data = await apiFetch<{ access_token?: string, refresh_token?: string, user_uuid?: string, user?: { uuid?: string } }>('/auth/web/google/login', {
          method: 'POST',
          auth: false,
          body: JSON.stringify({ credential, device_id: deviceId }),
        })
        const userUuid = data.user?.uuid || data.user_uuid
        if (!data.access_token || !data.refresh_token || !userUuid) {
          throw new Error('Google 登入回傳資料不完整，請重新登入')
        }
        tokenStorage.saveTokens(data.access_token, data.refresh_token, userUuid)
        this.accessToken = data.access_token
        this.sessionReady = true
        await this.loadProfile()
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
      const data = await apiFetch<UserProfile | { user: UserProfile }>('/users/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(profile),
      })
      this.profile = (data as { user?: UserProfile }).user ?? data as UserProfile
      this.cacheSession()
      return this.profile
    },
    cacheSession() {
      sessionCache.set(AUTH_CACHE_KEY, { profile: this.profile, points: this.points, premium: this.premium, membershipQuotaRemaining: this.membershipQuotaRemaining })
    },
    async logout() {
      useActiveAnalysisStore().reset()
      tokenStorage.clear()
      await clearUserStorage()
      this.accessToken = null
      this.sessionReady = true
      this.profile = null
      this.points = 0
      this.premium = false
      this.membershipQuotaRemaining = 0
      const chart = useChartStore()
      chart.$reset()
    },
  },
})
