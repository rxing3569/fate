<script setup lang="ts">
import { Coins, Gauge, Gift, ShoppingBag, Sparkles } from '@lucide/vue'
definePageMeta({ middleware: 'auth' })

type HistoryKind = 'points' | 'quota'
interface HistoryItem {
  uuid: string
  amount: number
  balance_after?: number
  quota_remaining_after?: number
  type: string
  description?: string
  analysis_type?: string
  created_at: string
}
interface HistoryPage { items: HistoryItem[], next_cursor?: string, has_more: boolean }

const activeKind = ref<HistoryKind>('points')
const items = ref<HistoryItem[]>([])
const cursor = ref('')
const hasMore = ref(true)
const loading = ref(false)
const loadingMore = ref(false)
const error = ref('')
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const normalizeType = (value = '') => value.trim().toLowerCase().replace(/[\s-]+/g, '_')
const analysisLabels: Record<string, string> = {
  natal: '本命解析', general: '本命解析', report: '命盤解析',
  palace: '十二宮解析', palace_detail: '十二宮解析',
  decade: '十年大運解析', ten_year: '十年大運解析',
  flow: '時運解析', match: '合盤解析', qa: 'AI 問答',
}
const quotaTypeLabels: Record<string, string> = {
  usage: '會員額度使用', use: '會員額度使用', consumption: '會員額度使用',
  consume: '會員額度使用', deduction: '會員額度使用', quota_usage: '會員額度使用',
  grant: '會員額度發放', reward: '會員額度發放', recharge: '會員額度發放',
  reset: '每月額度重置', monthly_reset: '每月額度重置', quota_reset: '每月額度重置',
  refund: '會員額度退還', restore: '會員額度退還', adjustment: '會員額度調整',
}
const pointTypeLabels: Record<string, string> = {
  purchase: '購買點數', consumption: '點數消費', consume: '點數消費',
  reward: '獎勵贈送', refund: '點數退還', adjustment: '點數調整',
}
const analysisLabel = (value = '') => {
  const normalized = normalizeType(value)
  const withoutAffix = normalized.replace(/^analysis_/, '').replace(/_analysis$/, '')
  return analysisLabels[normalized] || analysisLabels[withoutAffix] || ''
}
const titleFor = (item: HistoryItem) => {
  if (activeKind.value === 'quota') {
    return analysisLabel(item.analysis_type) || analysisLabel(item.type) || quotaTypeLabels[normalizeType(item.type)] || '會員額度異動'
  }
  return pointTypeLabels[normalizeType(item.type)] || '點數異動'
}
const readableFlowDate = (dateKey: string) => {
  if (!/^\d{8}$/.test(dateKey)) return ''
  const year = Number(dateKey.slice(0, 4))
  const month = Number(dateKey.slice(4, 6))
  const day = Number(dateKey.slice(6, 8))
  if (!year) return ''
  if (month === 0 && day === 0) return `${year} 年流年`
  if (month >= 1 && month <= 12 && day === 0) return `${year} 年 ${month} 月流月`
  const date = new Date(year, month - 1, day)
  if (
    month >= 1 && month <= 12 &&
    day >= 1 &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  ) return `${year} 年 ${month} 月 ${day} 日流日`
  return ''
}
const humanizeDescription = (description: string) => description.replace(
  /\s*[（(]\s*日期\s*Key\s*:\s*(\d{8})\s*[)）]/gi,
  (original, dateKey: string) => {
    const readable = readableFlowDate(dateKey)
    return readable ? `（${readable}）` : original
  },
)
const descriptionFor = (item: HistoryItem) => {
  const description = item.description?.trim() || ''
  if (description && /[\u3400-\u9fff]/.test(description)) return humanizeDescription(description)
  return analysisLabel(description) || titleFor(item)
}
const formatTime = (value: string) => new Intl.DateTimeFormat('zh-TW', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }).format(new Date(value))

async function load(reset = false) {
  if (loading.value || loadingMore.value || (!reset && !hasMore.value)) return
  reset ? loading.value = true : loadingMore.value = true
  error.value = ''
  if (reset) { items.value = []; cursor.value = ''; hasMore.value = true }
  try {
    const page = await ziweiApi.getBillingHistory(activeKind.value, {
      cursor: cursor.value || undefined,
      limit: 10,
    }) as HistoryPage
    const known = new Set(items.value.map(item => item.uuid))
    items.value.push(...(page.items || []).filter(item => !known.has(item.uuid)))
    cursor.value = page.next_cursor || ''
    hasMore.value = Boolean(page.has_more && cursor.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '讀取異動紀錄失敗'
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

watch(activeKind, () => load(true))
onMounted(async () => {
  await load(true)
  observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) load() }, { rootMargin:'180px' })
  if (sentinel.value) observer.observe(sentinel.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <AppPageLayout title="異動紀錄" screen-class="history-screen" show-back>
    <main class="history-content">
      <div class="history-tabs" role="tablist">
        <button :class="{active:activeKind === 'points'}" type="button" @click="activeKind = 'points'"><Coins :size="17" />點數紀錄</button>
        <button :class="{active:activeKind === 'quota'}" type="button" @click="activeKind = 'quota'"><Gauge :size="17" />額度紀錄</button>
      </div>

      <aside class="retention-note"><Coins :size="18" /><span><strong>紀錄僅保存一年</strong><small>系統以月份為單位保留最近 12 個月紀錄。</small></span></aside>

      <div v-if="loading" class="history-state"><span class="loading-ring" />正在讀取紀錄…</div>
      <div v-else-if="error && !items.length" class="history-state error"><strong>讀取紀錄失敗</strong><span>{{ error }}</span><button class="app-button outline" type="button" @click="load(true)">重新嘗試</button></div>
      <div v-else-if="!items.length" class="history-state"><span class="empty-icon"><Coins v-if="activeKind === 'points'" :size="32" /><Gauge v-else :size="32" /></span><strong>尚無{{ activeKind === 'points' ? '點數' : '額度' }}異動紀錄</strong></div>

      <section v-else class="history-list">
        <article v-for="item in items" :key="item.uuid" class="history-card glass">
          <span class="transaction-icon" :class="{positive:item.amount > 0}"><ShoppingBag v-if="item.type === 'purchase'" :size="23" /><Gift v-else-if="item.type === 'reward' || item.type === 'refund'" :size="23" /><Gauge v-else-if="activeKind === 'quota'" :size="23" /><Sparkles v-else :size="23" /></span>
          <div class="transaction-copy"><div><strong>{{ titleFor(item) }}</strong><b :class="{positive:item.amount > 0}">{{ item.amount > 0 ? '+' : '' }}{{ item.amount }} {{ activeKind === 'points' ? 'P' : '次' }}</b></div><p>{{ descriptionFor(item) }}</p><time>{{ formatTime(item.created_at) }}</time></div>
          <small class="balance-after">{{ activeKind === 'points' ? `異動後 ${item.balance_after ?? 0} P` : `剩餘 ${item.quota_remaining_after ?? 0} 次` }}</small>
        </article>
      </section>
      <p v-if="error && items.length" class="inline-error">{{ error }}</p>
      <div ref="sentinel" class="history-sentinel"><span v-if="loadingMore" class="loading-ring" /><small v-else-if="items.length && !hasMore">已顯示全部一年內紀錄</small></div>
    </main>
  </AppPageLayout>
</template>

<style scoped>
.history-screen{background:linear-gradient(180deg,var(--paper),rgba(107,166,160,.1))}.history-content{padding:10px 18px calc(42px + env(safe-area-inset-bottom))}.history-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;height:48px;padding:4px;border-radius:24px;background:rgba(36,87,90,.08)}.history-tabs button{display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:20px;background:transparent;color:rgba(36,87,90,.58);font-size:13px;font-weight:900}.history-tabs button.active{background:var(--mountain);box-shadow:0 6px 14px rgba(36,87,90,.18);color:#fff}.retention-note{display:flex;align-items:center;gap:10px;margin:13px 2px;padding:11px 14px;border:1px solid rgba(180,155,117,.3);border-radius:16px;background:rgba(180,155,117,.11);color:var(--mountain)}.retention-note span{display:grid;gap:2px}.retention-note strong{font-size:12px}.retention-note small{color:var(--text-soft);font-size:11px}.range-filter{display:grid;grid-template-columns:1fr auto 1fr 40px;align-items:end;gap:7px;margin-bottom:16px;padding:12px;border-radius:20px;overflow:visible}.range-filter label{display:grid;gap:5px;min-width:0}.range-filter label span{font-size:10px;font-weight:800}.range-filter input{min-width:0;width:100%;height:38px;padding:0 8px;border:1px solid rgba(36,87,90,.14);border-radius:12px;background:rgba(255,255,255,.68);color:var(--mountain);font-size:11px;font-weight:700}.range-filter i{padding-bottom:10px;color:var(--text-soft);font-style:normal}.range-filter button{display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:13px;background:var(--mountain);color:white}.history-list{display:grid;gap:13px}.history-card{position:relative;display:grid;grid-template-columns:48px minmax(0,1fr);align-items:center;gap:13px;padding:15px 16px;border-radius:22px}.transaction-icon{display:grid;place-items:center;width:48px;height:48px;border:1px solid rgba(36,87,90,.16);border-radius:50%;background:rgba(36,87,90,.08);color:var(--mountain)}.transaction-icon.positive{border-color:rgba(107,166,160,.3);background:rgba(107,166,160,.14)}.transaction-copy{min-width:0}.transaction-copy>div{display:flex;align-items:center;justify-content:space-between;gap:8px}.transaction-copy strong{font-size:15px}.transaction-copy b{color:var(--cinnabar);font-size:16px;white-space:nowrap}.transaction-copy b.positive{color:var(--jade)}.transaction-copy p{overflow:hidden;margin:5px 0 4px;color:var(--text-soft);font-size:12px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.transaction-copy time{color:rgba(36,87,90,.48);font-size:10.5px;font-weight:700}.balance-after{grid-column:2;justify-self:end;margin-top:-3px;padding:4px 8px;border-radius:8px;background:rgba(107,166,160,.1);color:var(--mountain);font-size:10px;font-weight:800}.history-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;min-height:280px;color:var(--text-soft);text-align:center}.history-state.error span{font-size:12px}.history-state .app-button{min-height:42px}.empty-icon{display:grid;place-items:center;width:74px;height:74px;border-radius:50%;background:rgba(107,166,160,.13);color:var(--jade)}.loading-ring{display:inline-block;width:22px;height:22px;border:3px solid rgba(36,87,90,.13);border-top-color:var(--mountain);border-radius:50%;animation:spin .8s linear infinite}.history-sentinel{display:flex;align-items:center;justify-content:center;min-height:72px;color:var(--text-soft)}.inline-error{color:var(--cinnabar);font-size:12px;text-align:center}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:420px){.range-filter{grid-template-columns:1fr 1fr 40px}.range-filter i{display:none}.range-filter label span{font-size:9px}.range-filter input{font-size:10px;padding-inline:5px}}@media(min-width:760px){.history-content{padding-inline:28px}}
</style>
