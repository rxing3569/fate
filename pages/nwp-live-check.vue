<script setup lang="ts">
import { AlertTriangle, CalendarClock, CheckCircle2, CreditCard, LoaderCircle, RefreshCw, ShieldAlert, Square, SquareCheckBig, XCircle } from '@lucide/vue'

definePageMeta({ middleware: 'auth' })
useSeoMeta({
  robots: 'noindex, nofollow, noarchive, nosnippet',
  googlebot: 'noindex, nofollow, noarchive, nosnippet',
})

type EventItem = { uuid: string, event_type: string, provider_trade_no?: string, status: string, message?: string, amount: number, paid_at?: string, received_at: string }
type TestOrder = {
  uuid: string
  kind: 'one_time' | 'recurring'
  merchant_order_no: string
  provider_trade_no?: string
  period_no?: string
  status: string
  amount: number
  currency: string
  period_point?: string
  period_times?: number
  next_charge_at?: string
  paid_at?: string
  terminated_at?: string
  termination_error?: string
  created_at: string
  events?: EventItem[]
}
type Checkout = { order: TestOrder, action_url: string, fields: Record<string, string> }

const auth = useAuthStore()
const route = useRoute()
const orders = ref<TestOrder[]>([])
const environment = ref<'test' | 'production' | ''>('')
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const submitting = ref<'' | TestOrder['kind']>('')
const terminating = ref('')
const expanded = ref('')
const detailLoading = ref('')
const acknowledgeCharge = ref(false)
const acknowledgeNoBenefits = ref(false)
const acknowledgeRecurring = ref(false)

const returnNotice = computed(() => {
  const result = String(route.query.result || '')
  if (!result) return null
  if (result === 'success') return { type: 'success', text: '藍新已返回交易結果，請以底下最新紀錄為準。' }
  if (result === 'failed') return { type: 'failed', text: String(route.query.message || '付款未完成，未開通任何權益。') }
  return { type: 'failed', text: '無法驗證藍新返回資料，請勿重複付款並聯絡維運人員。' }
})
const baseAcknowledged = computed(() => acknowledgeCharge.value && acknowledgeNoBenefits.value)
const isProduction = computed(() => environment.value === 'production')

const statusLabels: Record<string, string> = {
  pending: '等待付款', paid: '付款成功', failed: '付款失敗', active: '持續扣款中', past_due: '本期扣款失敗',
  terminated: '已終止', termination_failed: '終止失敗',
}

function formatTime(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}

async function loadOrders(manual = false) {
  if (manual) refreshing.value = true
  else loading.value = true
  error.value = ''
  try {
    const [response, config] = await Promise.all([
      ziweiApi.getPaymentTestOrders() as Promise<{ items?: TestOrder[] }>,
      ziweiApi.getPaymentTestConfig() as Promise<{ environment?: 'test' | 'production' }>,
    ])
    orders.value = response.items || []
    environment.value = config.environment === 'production' ? 'production' : 'test'
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '無法讀取正式金流驗證紀錄'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function checkout(kind: TestOrder['kind']) {
  if (!baseAcknowledged.value || (kind === 'recurring' && !acknowledgeRecurring.value) || submitting.value) return
  submitting.value = kind
  try {
    const checkout = await ziweiApi.createPaymentTestCheckout(kind, String(auth.profile?.email || '')) as Checkout
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = checkout.action_url
    for (const [name, value] of Object.entries(checkout.fields)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    }
    document.body.appendChild(form)
    form.submit()
  } finally {
    submitting.value = ''
  }
}

async function toggleDetails(order: TestOrder) {
  if (expanded.value === order.uuid) { expanded.value = ''; return }
  expanded.value = order.uuid
  if (order.events) return
  detailLoading.value = order.uuid
  try {
    const detail = await ziweiApi.getPaymentTestOrder(order.uuid) as TestOrder
    Object.assign(order, detail)
  } finally { detailLoading.value = '' }
}

async function terminate(order: TestOrder) {
  if (terminating.value || !window.confirm('確定要終止此藍新定期定額委託嗎？已扣款項不會退還。')) return
  terminating.value = order.uuid
  try {
    const updated = await ziweiApi.terminatePaymentTestOrder(order.uuid) as TestOrder
    Object.assign(order, updated)
  } catch {
    await loadOrders(true)
  } finally { terminating.value = '' }
}

onMounted(() => loadOrders())
</script>

<template>
  <AppPageLayout title="正式金流驗證" screen-class="payment-test-screen" show-back back-to="/member">
    <main class="test-content">
      <section class="danger-card" :class="{ 'test-environment': environment === 'test' }">
        <div class="danger-title"><ShieldAlert :size="26" /><div><strong>{{ isProduction ? '目前是正式金流環境' : environment === 'test' ? '目前是藍新測試環境' : '正在確認金流環境' }}</strong><span>{{ isProduction ? '送出後會真實扣款，請務必審慎操作' : environment === 'test' ? '可在本地驗證流程，不會產生正式請款' : '確認完成前無法建立交易' }}</span></div></div>
        <ul>
          <li>{{ isProduction ? '每筆／每期實際扣款新台幣 1 元。' : '測試交易金額固定為新台幣 1 元。' }}</li>
          <li>付款不會獲得點數、Premium 或任何功能。</li>
          <li>定期定額每 2 天扣款，關閉頁面不會停止，必須手動終止。</li>
          <li>只能使用本人或已獲明確授權的信用卡；非維運測試人員請勿付款。</li>
        </ul>
      </section>

      <div v-if="returnNotice" class="return-notice" :class="returnNotice.type">
        <CheckCircle2 v-if="returnNotice.type === 'success'" :size="19" /><XCircle v-else :size="19" />{{ returnNotice.text }}
      </div>

      <section class="acknowledgements glass">
        <button type="button" @click="acknowledgeCharge = !acknowledgeCharge"><SquareCheckBig v-if="acknowledgeCharge" /><Square v-else /><span>{{ isProduction ? '我了解這是正式環境，會產生真實的 1 元信用卡扣款。' : '我了解目前是藍新測試環境，交易資料仍會記錄在獨立測試表。' }}</span></button>
        <button type="button" @click="acknowledgeNoBenefits = !acknowledgeNoBenefits"><SquareCheckBig v-if="acknowledgeNoBenefits" /><Square v-else /><span>我了解本次付款不會開通任何功能，也不會增加點數。</span></button>
        <button type="button" @click="acknowledgeRecurring = !acknowledgeRecurring"><SquareCheckBig v-if="acknowledgeRecurring" /><Square v-else /><span>我了解定期定額會每 2 天持續扣款，直到我手動終止。</span></button>
      </section>

      <section class="product-grid">
        <article class="product-card glass">
          <span class="product-icon"><CreditCard /></span><div><h2>單次購買驗證</h2><p>正式信用卡單次付款，不發放任何權益。</p></div>
          <strong class="price">NT$ 1</strong>
          <button class="app-button" type="button" :disabled="!environment || !baseAcknowledged || Boolean(submitting)" @click="checkout('one_time')">
            <LoaderCircle v-if="submitting === 'one_time'" class="spin" :size="18" />{{ submitting === 'one_time' ? '前往藍新…' : '進行單次 1 元付款' }}
          </button>
        </article>
        <article class="product-card glass recurring">
          <span class="product-icon"><CalendarClock /></span><div><h2>定期定額驗證</h2><p>立即扣首期 1 元，之後每 2 天扣 1 元，最多 99 期。</p></div>
          <strong class="price">NT$ 1 <small>／每 2 天</small></strong>
          <button class="app-button danger" type="button" :disabled="!environment || !baseAcknowledged || !acknowledgeRecurring || Boolean(submitting)" @click="checkout('recurring')">
            <LoaderCircle v-if="submitting === 'recurring'" class="spin" :size="18" />{{ submitting === 'recurring' ? '前往藍新…' : '建立定期 1 元委託' }}
          </button>
        </article>
      </section>

      <section class="history-section">
        <header><div><h2>本人驗證紀錄</h2><p>資料與正式商品訂單完全分開。</p></div><button type="button" :disabled="refreshing" @click="loadOrders(true)"><RefreshCw :class="{ spin: refreshing }" :size="17" />重新讀取</button></header>
        <div v-if="loading" class="state"><LoaderCircle class="spin" />正在讀取</div>
        <div v-else-if="error && !orders.length" class="state error"><AlertTriangle />{{ error }}</div>
        <div v-else-if="!orders.length" class="state">尚無正式金流驗證紀錄</div>
        <div v-else class="order-list">
          <article v-for="order in orders" :key="order.uuid" class="order-card glass">
            <button class="order-summary" type="button" @click="toggleDetails(order)">
              <div><strong>{{ order.kind === 'recurring' ? '定期定額' : '單次購買' }} · NT$1</strong><span>{{ order.merchant_order_no }}</span></div>
              <div class="order-meta"><b :class="order.status">{{ statusLabels[order.status] || order.status }}</b><time>{{ formatTime(order.paid_at || order.created_at) }}</time></div>
            </button>
            <div v-if="order.termination_error" class="termination-error"><AlertTriangle :size="16" /><span>終止未成功：{{ order.termination_error }}<br>請立即至藍新後台確認並終止委託。</span></div>
            <button v-if="order.kind === 'recurring' && ['active','past_due','termination_failed'].includes(order.status)" class="terminate-button" type="button" :disabled="terminating === order.uuid" @click="terminate(order)">
              {{ terminating === order.uuid ? '正在向藍新終止…' : '終止後續扣款' }}
            </button>
            <div v-if="expanded === order.uuid" class="event-list">
              <div v-if="detailLoading === order.uuid" class="event-loading"><LoaderCircle class="spin" :size="17" />讀取扣款明細</div>
              <template v-else>
                <p><span>藍新委託單號</span>{{ order.period_no || '—' }}</p><p><span>下次扣款</span>{{ formatTime(order.next_charge_at) }}</p>
                <p v-for="event in order.events || []" :key="event.uuid"><span>{{ event.status === 'SUCCESS' ? '授權成功' : '授權失敗' }} · NT${{ event.amount }}</span>{{ formatTime(event.paid_at || event.received_at) }}</p>
                <p v-if="!order.events?.length"><span>尚無回呼紀錄</span>請稍後重新讀取</p>
              </template>
            </div>
          </article>
        </div>
      </section>
    </main>
  </AppPageLayout>
</template>

<style scoped>
.danger-card.test-environment{border-color:rgba(107,166,160,.38);background:linear-gradient(145deg,rgba(107,166,160,.14),rgba(255,255,255,.58))}.danger-card.test-environment .danger-title{color:var(--jade)}
.test-content{max-width:920px;margin:0 auto;padding:18px 18px 120px;display:grid;gap:18px}.danger-card{padding:20px;border:1px solid rgba(184,91,75,.38);border-radius:24px;background:linear-gradient(145deg,rgba(184,91,75,.13),rgba(255,255,255,.58));box-shadow:0 16px 40px rgba(104,47,38,.08)}.danger-title{display:flex;gap:12px;align-items:center;color:var(--cinnabar)}.danger-title div{display:grid;gap:3px}.danger-title strong{font-size:18px}.danger-title span{font-size:12px;font-weight:700}.danger-card ul{margin:15px 0 0;padding-left:21px;color:var(--mountain);font-size:13px;line-height:1.8}.return-notice{display:flex;align-items:center;gap:9px;padding:13px 15px;border-radius:16px;font-size:13px;font-weight:750}.return-notice.success{background:rgba(107,166,160,.16);color:var(--jade)}.return-notice.failed{background:rgba(184,91,75,.13);color:var(--cinnabar)}.acknowledgements{display:grid;gap:4px;padding:12px;border-radius:22px}.acknowledgements button{display:flex;align-items:flex-start;gap:10px;width:100%;padding:10px;border:0;background:transparent;color:var(--mountain);font:inherit;font-size:13px;line-height:1.55;text-align:left;cursor:pointer}.acknowledgements svg{flex:0 0 auto;width:20px;color:var(--jade)}.product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.product-card{display:grid;grid-template-columns:auto 1fr;gap:12px;padding:20px;border-radius:26px}.product-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:16px;background:rgba(107,166,160,.15);color:var(--jade)}.product-card h2{margin:2px 0 5px;font-size:17px}.product-card p{margin:0;color:var(--text-soft);font-size:12px;line-height:1.55}.price{grid-column:1/-1;font-size:26px;color:var(--mountain)}.price small{font-size:12px;color:var(--text-soft)}.product-card .app-button{grid-column:1/-1}.app-button.danger{background:var(--cinnabar)}.history-section{display:grid;gap:12px;margin-top:8px}.history-section>header{display:flex;align-items:end;justify-content:space-between;gap:12px}.history-section h2{margin:0 0 3px;font-size:18px}.history-section header p{margin:0;color:var(--text-soft);font-size:12px}.history-section header button{display:flex;align-items:center;gap:6px;border:0;background:transparent;color:var(--jade);font:inherit;font-size:12px;font-weight:800;cursor:pointer}.state{display:flex;align-items:center;justify-content:center;gap:9px;min-height:130px;color:var(--text-soft);font-size:13px}.state.error{color:var(--cinnabar)}.order-list{display:grid;gap:10px}.order-card{padding:13px;border-radius:21px}.order-summary{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;padding:2px;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}.order-summary>div:first-child{display:grid;gap:5px;min-width:0}.order-summary strong{font-size:14px}.order-summary span{overflow:hidden;color:var(--text-soft);font-size:10px;text-overflow:ellipsis}.order-meta{display:grid;justify-items:end;gap:5px}.order-meta b{padding:4px 8px;border-radius:9px;background:rgba(36,87,90,.08);font-size:10px}.order-meta b.paid,.order-meta b.active,.order-meta b.terminated{background:rgba(107,166,160,.16);color:var(--jade)}.order-meta b.failed,.order-meta b.past_due,.order-meta b.termination_failed{background:rgba(184,91,75,.14);color:var(--cinnabar)}.order-meta time{color:var(--text-soft);font-size:10px}.terminate-button{width:100%;margin-top:12px;padding:10px;border:1px solid rgba(184,91,75,.35);border-radius:13px;background:rgba(184,91,75,.08);color:var(--cinnabar);font:inherit;font-size:12px;font-weight:850;cursor:pointer}.terminate-button:disabled{opacity:.55}.termination-error{display:flex;gap:8px;margin-top:12px;padding:11px;border-radius:13px;background:rgba(184,91,75,.1);color:var(--cinnabar);font-size:11px;line-height:1.5}.event-list{display:grid;gap:7px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(36,87,90,.1)}.event-list p{display:flex;justify-content:space-between;gap:12px;margin:0;color:var(--text-soft);font-size:11px}.event-list p span{color:var(--mountain);font-weight:750}.event-loading{display:flex;align-items:center;gap:7px;color:var(--text-soft);font-size:11px}.spin{animation:spin .85s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:680px){.product-grid{grid-template-columns:1fr}.test-content{padding-inline:14px}.history-section>header{align-items:center}.order-summary{align-items:flex-start}.order-meta{flex:0 0 auto}}
</style>
