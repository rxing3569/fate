import { defineStore } from 'pinia'
import type { BirthInfo, ZiweiChartData } from '~/types/ziwei'
import { calculateChartFromSolar } from '~/utils/ziwei/calculator'
import type { UserProfile } from '~/stores/auth'
import cityData from '~/data/cities.json'

const CACHE_KEY = 'ziwei_birth_info'

export const useChartStore = defineStore('chart', {
  state: () => ({
    birthInfo: null as BirthInfo | null,
    chart: null as ZiweiChartData | null,
  }),
  actions: {
    hydrate(profile?: UserProfile | null) {
      if (!import.meta.client) return
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        try {
          this.birthInfo = JSON.parse(raw)
          this.recalculate()
          return
        } catch {
          localStorage.removeItem(CACHE_KEY)
        }
      }
      if (profile) this.restoreFromProfile(profile)
    },
    saveBirthInfo(info: BirthInfo) {
      this.birthInfo = info
      if (import.meta.client) localStorage.setItem(CACHE_KEY, JSON.stringify(info))
      this.recalculate()
    },
    restoreFromProfile(profile: UserProfile) {
      const match = profile.birth_time?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
      const hasLongitude = typeof profile.longitude === 'number' && Number.isFinite(profile.longitude)
      if (!match || !profile.gender || (!profile.city && !hasLongitude)) return false
      const cityId = profile.city ? profile.city.replaceAll('-', '_') : 'OTHER'
      const cityLongitude = cityData.find(city => city.id === cityId)?.lng
      this.saveBirthInfo({
        gender: profile.gender === '女' ? '女' : '男',
        year: Number(match[1]), month: Number(match[2]), day: Number(match[3]),
        hour: Number(match[4]), minute: Number(match[5]),
        cityId,
        longitude: Number(profile.longitude ?? cityLongitude ?? 120),
      })
      return true
    },
    async saveBirthInfoAndSync(info: BirthInfo, clearRelatedCaches = false) {
      const auth = useAuthStore()
      if (auth.isAuthenticated) {
        const birthTime = `${info.year}-${String(info.month).padStart(2, '0')}-${String(info.day).padStart(2, '0')}T${String(info.hour).padStart(2, '0')}:${String(info.minute).padStart(2, '0')}:00Z`
        await auth.updateProfile({
          birth_time: birthTime,
          gender: info.gender,
          city: info.cityId.replaceAll('-', '_'),
          longitude: info.cityId === 'OTHER' ? Number((info.longitude ?? 120).toFixed(2)) : null,
        })
      }
      if (clearRelatedCaches && import.meta.client) {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('ziwei_qa_conversation_cache:')) localStorage.removeItem(key)
        }
      }
      this.saveBirthInfo(info)
    },
    recalculate() {
      if (!this.birthInfo) return
      this.chart = calculateChartFromSolar({
        gender: this.birthInfo.gender,
        year: this.birthInfo.year,
        month: this.birthInfo.month,
        day: this.birthInfo.day,
        hour: this.birthInfo.hour,
        minute: this.birthInfo.minute,
        longitude: this.birthInfo.longitude,
      })
    },
  },
})
