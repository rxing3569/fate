<script setup lang="ts">
import { CheckCircle2, Clock3, LoaderCircle, XCircle } from '@lucide/vue'
import type { PremiumCheckoutIntent } from '~/types/billing'
import { readPremiumCheckoutIntent } from '~/utils/premium-checkout'
import { clearNextStepIntent, trackAttributedEvent } from '~/utils/next-step'

definePageMeta({ middleware: 'auth' })
type Order = { uuid:string, product_id:string, merchant_order_no:string, status:'pending'|'paid'|'failed'|'cancelled'|'refunded', amount:number, currency:string, paid_at?:string }
const route = useRoute()
const auth = useAuthStore()
const order = ref<Order | null>(null)
const loading = ref(true)
const error = ref('')
const fallbackMerchantOrderNo = ref('')
const resumeIntent = ref<PremiumCheckoutIntent | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null
let attempts = 0
let historyGuardActive = false
let checkoutHistorySteps = 0
const historyGuardKey = 'newebpayPaymentResultGuard'
const checkoutHistoryLengthKey = computed(() => `newebpay_checkout_history_length:${merchantOrderNo.value}`)
const merchantOrderNo = computed(() => String(route.query.merchant_order_no || fallbackMerchantOrderNo.value || ''))
const rejectedReturn = computed(() => route.query.result === 'invalid' || route.query.result === 'failed')
const returnStatus = computed(() => String(route.query.status || ''))
const returnMessage = computed(() => String(route.query.message || ''))
const productName = computed(() => order.value?.product_id === 'web.points.500' ? '500 點數' : 'Premium 月訂閱')
const resumeDestination = computed(() => {
  const intent = resumeIntent.value
  if (!intent) return null
  if (intent.source === 'premium_feature') {
    const labels = {
      report_pdf: '返回命盤解析',
	  flow_pdf: '返回近期運勢',
	  annual_flow: '開始流年運勢',
	  annual_flow_pdf: '返回流年運勢',
      qa_pdf: '返回線上問答',
      match_pdf: '返回合盤解析',
      match_history: '查看合盤歷史紀錄',
    }
    return { label: labels[intent.feature], to: intent.returnTo }
  }
  return intent.source === 'qa'
    ? { label: '繼續線上問答', to: '/qa' }
    : { label: '繼續合盤解析', to: '/match' }
})
const isPointsOrder = computed(() => order.value?.product_id === 'web.points.500')
const successGuide = computed(() => isPointsOrder.value
  ? '點數已入帳，現在可以前往命盤解盤，或查看近期運勢。'
  : resumeIntent.value?.source === 'premium_feature'
    ? 'Premium 已開通，返回原頁即可繼續剛才的操作。'
  : 'Premium 已開通，現在可以開始合盤解析，或使用線上問答。')
const successActions = computed(() => isPointsOrder.value
  ? [
      { label: '前往命盤解盤', to: '/ai-analysis' },
	  { label: '查看今日運勢', to: '/flow?period=today' },
    ]
  : resumeIntent.value
    ? [
        {
          label: resumeDestination.value!.label,
          to: resumeDestination.value!.to,
        },
      ]
    : [
        { label: '開始合盤解析', to: '/match' },
        { label: '前往線上問答', to: '/qa' },
      ])
const resumeAction = computed(() => resumeIntent.value
  ? {
      label: resumeIntent.value.source === 'premium_feature'
        ? resumeDestination.value!.label
        : resumeIntent.value.source === 'qa'
          ? '返回未完成的問題'
          : '返回未完成的合盤資料',
      to: resumeDestination.value!.to,
    }
  : null)

function restoreCheckoutIntent() {
  resumeIntent.value = readPremiumCheckoutIntent({
    userUuid: String(auth.profile?.uuid || ''),
    merchantOrderNo: merchantOrderNo.value || undefined,
  })
}

function removeHistoryGuardListener() {
  if (!historyGuardActive) return
  historyGuardActive = false
  window.removeEventListener('popstate', handlePaymentHistoryBack)
}

function handlePaymentHistoryBack() {
  if (!historyGuardActive) return
  removeHistoryGuardListener()
  if (checkoutHistorySteps > 0) {
    sessionStorage.removeItem(checkoutHistoryLengthKey.value)
    window.history.go(-checkoutHistorySteps)
    return
  }
  navigateTo('/store', { replace: true })
}

function installPaymentHistoryGuard() {
  if (!merchantOrderNo.value || rejectedReturn.value || historyGuardActive) return
  const checkoutHistoryLength = Number(sessionStorage.getItem(checkoutHistoryLengthKey.value))
  checkoutHistorySteps = Number.isInteger(checkoutHistoryLength) && checkoutHistoryLength > 0
    ? Math.max(0, window.history.length - checkoutHistoryLength)
    : 0
  historyGuardActive = true
  window.addEventListener('popstate', handlePaymentHistoryBack)
  if (window.history.state?.[historyGuardKey]) return
  window.history.pushState(
    { ...window.history.state, [historyGuardKey]: true },
    '',
    window.location.href,
  )
}

async function loadOrder() {
  if (rejectedReturn.value) {
    const code = returnStatus.value ? `（${returnStatus.value}）` : ''
    error.value = returnMessage.value
      ? `${returnMessage.value}${code}，您可以保留原本資料後再決定是否重新付款。`
      : `藍新未接受這筆交易${code}，原本填寫的資料仍會保留。`
    restoreCheckoutIntent()
    sessionStorage.removeItem('newebpay_pending_merchant_order_no')
    loading.value = false
    return
  }
  if (!merchantOrderNo.value) { error.value = '缺少訂單資訊'; loading.value = false; return }
  try {
    order.value = await ziweiApi.getWebOrderByMerchantNo(merchantOrderNo.value) as Order
    if (order.value.product_id === 'web.premium.monthly') restoreCheckoutIntent()
    if (order.value.status === 'paid') {
      sessionStorage.removeItem('newebpay_pending_merchant_order_no')
      await auth.loadBilling()
      if (!isPointsOrder.value) {
        trackAttributedEvent('subscription_completed')
        clearNextStepIntent()
      }
    }
    if (order.value.status === 'pending' && attempts++ < 30) timer = setTimeout(loadOrder, 2000)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '無法讀取訂單狀態'
  } finally { loading.value = false }
}
onMounted(() => {
  fallbackMerchantOrderNo.value = sessionStorage.getItem('newebpay_pending_merchant_order_no') || ''
  installPaymentHistoryGuard()
  loadOrder()
})
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
  removeHistoryGuardListener()
})
</script>

<template>
  <AppPageLayout title="付款結果" screen-class="result-screen" show-back back-to="/store" back-replace back-label="返回選購方案">
    <main class="result-content">
      <section v-if="loading && !order" class="result-card glass"><LoaderCircle class="spin" :size="48" /><h2>正在確認付款結果</h2><p>請稍候，系統正在等待藍新付款通知。</p></section>
      <section v-else-if="error" class="result-card glass error"><XCircle :size="48" /><h2>{{ rejectedReturn ? '付款未完成' : '無法確認訂單' }}</h2><p>{{ error }}</p><button class="app-button" type="button" @click="rejectedReturn && resumeAction ? navigateTo(resumeAction.to, { replace:true }) : rejectedReturn ? navigateTo('/store', { replace:true }) : loadOrder()">{{ rejectedReturn && resumeAction ? resumeAction.label : rejectedReturn ? '返回選購方案' : '重新查詢' }}</button></section>
      <section v-else-if="order?.status === 'paid'" class="result-card glass success"><CheckCircle2 :size="54" /><h2>付款成功</h2><p>{{ productName }}已加入目前登入帳號，會員資料也已更新。<br />{{ successGuide }}</p><div class="order-row"><span>訂單編號</span><b>{{ order.merchant_order_no }}</b></div><div class="success-actions"><button v-for="action in successActions" :key="action.to" class="app-button" type="button" @click="navigateTo(action.to, { replace:true })">{{ action.label }}</button></div><button class="member-link" type="button" @click="navigateTo('/member', { replace:true })">返回會員中心</button></section>
      <section v-else-if="order?.status === 'pending'" class="result-card glass"><Clock3 :size="50" /><h2>付款結果確認中</h2><p>藍新通知可能需要幾秒鐘，您可以留在此頁等待，或稍後至購買紀錄查看。</p><button class="app-button outline" type="button" @click="navigateTo('/purchase-history', { replace:true })">查看購買紀錄</button></section>
      <section v-else class="result-card glass error"><XCircle :size="52" /><h2>付款未完成</h2><p>此訂單狀態為「{{ order?.status }}」，不會發放點數或會員權益。</p><button class="app-button" type="button" @click="resumeAction ? navigateTo(resumeAction.to, { replace:true }) : navigateTo('/store', { replace:true })">{{ resumeAction ? resumeAction.label : '返回選購方案' }}</button></section>
    </main>
  </AppPageLayout>
</template>

<style scoped>
.result-content{display:grid;place-items:center;min-height:calc(100dvh - 74px);padding:24px 20px 100px}.result-card{display:flex;flex-direction:column;align-items:center;width:100%;padding:34px 24px;border-radius:30px;text-align:center}.result-card>svg{color:var(--tea)}.result-card.success>svg{color:var(--jade)}.result-card.error>svg{color:var(--cinnabar)}.result-card h2{margin:15px 0 7px;font-size:22px}.result-card p{margin:0 0 22px;color:var(--text-soft);font-size:13px;line-height:1.65}.result-card>.order-row{display:flex;justify-content:space-between;gap:14px;width:100%;margin-bottom:20px;padding:12px;border-radius:14px;background:rgba(36,87,90,.07);font-size:11px}.result-card>.order-row b{overflow:hidden;text-overflow:ellipsis}.result-card>.success-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:100%;margin:0;padding:0;background:none}.result-card .app-button{width:100%}.member-link{margin-top:14px;border:0;background:none;color:var(--text-soft);font-size:12px;font-weight:750;text-decoration:underline;text-underline-offset:3px}.spin{animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:420px){.result-card>.success-actions{grid-template-columns:1fr}}
</style>
