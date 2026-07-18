<script setup lang="ts">
import { ApiError } from "~/utils/api";
import {
  BadgeCheck,
  Coins,
  Crown,
  Info,
  LoaderCircle,
  Sparkles,
  TestTube2,
  X,
} from "@lucide/vue";

definePageMeta({ middleware: "auth" });

interface WebProduct {
  id: string;
  name: string;
  description: string;
  kind: "points" | "subscription";
  points?: number;
  price: number;
  original_price?: number;
  currency: string;
  period?: string;
  promotion?: {
    code: string;
    label: string;
    discount_percent: number;
    price_lock: "until_cancelled";
  };
}

interface CheckoutResult {
  order: { uuid: string; merchant_order_no: string; status: string };
  action_url: string;
  fields: Record<string, string>;
}
interface WebSubscription {
  status: string;
  will_renew: boolean;
  current_period_end?: string;
  next_charge_at?: string;
  locked_amount: number;
  list_amount: number;
  discount_percent: number;
  promotion_code?: string;
  currency: string;
}

const auth = useAuthStore();
const products = ref<WebProduct[]>([]);
const loading = ref(true);
const purchasing = ref(false);
const selected = ref<WebProduct | null>(null);
const error = ref("");
const subscription = ref<WebSubscription | null>(null);
const cancelling = ref(false);
const payerEmail = ref("");
const payerEmailError = ref("");

const fallbackProducts: WebProduct[] = [
  {
    id: "web.points.500",
    name: "購買500點數",
    description: "單次解盤與運勢分析首選",
    kind: "points",
    points: 500,
    price: 150,
    currency: "TWD",
  },
  {
    id: "web.premium.monthly",
    name: "升級 Premium",
    description: "解鎖專屬功能",
    kind: "subscription",
    price: 270,
    original_price: 450,
    currency: "TWD",
    period: "month",
    promotion: {
      code: "early_bird_40_off",
      label: "早鳥優惠・6 折",
      discount_percent: 40,
      price_lock: "until_cancelled",
    },
  },
];

const pointsProduct = computed(
  () =>
    products.value.find((item) => item.kind === "points") ||
    fallbackProducts[0]!,
);
const premiumProduct = computed(
  () =>
    products.value.find((item) => item.kind === "subscription") ||
    fallbackProducts[1]!,
);

onMounted(async () => {
  await Promise.all([auth.loadBilling(), loadProducts(), loadSubscription()]);
});

async function loadSubscription() {
  try {
    const response = (await ziweiApi.getWebSubscription()) as {
      subscription?: WebSubscription | null;
    };
    subscription.value = response.subscription || null;
  } catch {
    subscription.value = null;
  }
}

async function loadProducts() {
  loading.value = true;
  error.value = "";
  try {
    const response = (await ziweiApi.getWebProducts()) as {
      products?: WebProduct[];
    };
    products.value =
      Array.isArray(response?.products) && response.products.length
        ? response.products
        : fallbackProducts;
  } catch (reason) {
    products.value = fallbackProducts;
    error.value =
      reason instanceof Error ? reason.message : "目前無法讀取商品資料";
  } finally {
    loading.value = false;
  }
}

function choose(product: WebProduct) {
  if (product.kind === "subscription" && auth.premium) return;
  selected.value = product;
  payerEmail.value = String(auth.profile?.email || "");
  payerEmailError.value = "";
  error.value = "";
}

async function purchase() {
  if (!selected.value || purchasing.value) return;
  purchasing.value = true;
  error.value = "";
  try {
    if (selected.value.kind === "subscription" && !payerEmail.value) {
      await auth.loadProfile();
      payerEmail.value = String(auth.profile?.email || "");
    }
    const email = payerEmail.value.trim();
    if (
      selected.value.kind === "subscription" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      payerEmailError.value = "請輸入有效的付款電子信箱";
      return;
    }
    payerEmailError.value = "";
    const checkout = (await ziweiApi.createWebCheckout(
      selected.value.id,
      selected.value.price,
      email,
    )) as CheckoutResult;
    sessionStorage.setItem(
      "newebpay_pending_merchant_order_no",
      checkout.order.merchant_order_no,
    );
    sessionStorage.setItem(
      `newebpay_checkout_history_length:${checkout.order.merchant_order_no}`,
      String(window.history.length),
    );
    const form = document.createElement("form");
    form.method = "POST";
    form.action = checkout.action_url;
    Object.entries(checkout.fields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 409) {
      const payload = reason.payload as { code?: string; product?: WebProduct };
      if (payload?.code === "PRICE_CHANGED" && payload.product) {
        products.value = products.value.map((item) =>
          item.id === payload.product!.id ? payload.product! : item,
        );
        selected.value = payload.product;
        return;
      }
    }
    error.value =
      reason instanceof Error ? reason.message : "購買失敗，請稍後再試";
  } finally {
    purchasing.value = false;
  }
}

async function cancelSubscription() {
  if (cancelling.value || !subscription.value?.will_renew) return;
  cancelling.value = true;
  error.value = "";
  try {
    await ziweiApi.cancelWebSubscription();
    await Promise.all([loadSubscription(), auth.loadBilling()]);
    window.dispatchEvent(
      new CustomEvent("api-error-snackbar", {
        detail: {
          type: "info",
          message: "已取消自動續訂，權益保留至本期截止日",
        },
      }),
    );
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "取消訂閱失敗";
  } finally {
    cancelling.value = false;
  }
}

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    : "";

function formatPrice(product: WebProduct) {
  const suffix = product.kind === "subscription" ? "/月" : "/次";
  return `NT$${product.price}${suffix}`;
}

const money = (amount: number) => `NT$${amount}`;
</script>

<template>
  <AppPageLayout
    title="選購方案"
    screen-class="store-screen"
    show-back
    back-to="/member"
    back-replace
    back-label="返回會員中心"
  >
    <main class="store-body">
      <div class="sandbox-notice">
        <TestTube2 :size="16" /><span
          ><strong>藍新安全付款</strong>　
          本站服務使用「藍新金流」，付款將於「藍新安全頁面」完成，本站不保存信用卡資料。</span
        >
      </div>

      <div v-if="loading" class="store-loading">
        <LoaderCircle :size="28" /><span>正在讀取方案...</span>
      </div>

      <template v-else>
        <button
          class="plan-card glass"
          type="button"
          @click="choose(pointsProduct)"
        >
          <div class="plan-heading">
            <span class="plan-icon"><Coins :size="29" /></span>
            <span class="plan-title"
              ><strong>{{ pointsProduct.name }}</strong
              ><small>{{ pointsProduct.description }}</small></span
            >
            <b class="price-badge">{{ formatPrice(pointsProduct) }}</b>
          </div>
          <div class="divider" />
          <ul>
            <li>點數可以用於「命盤解析」、「時運解析」</li>
          </ul>
          <p class="plan-note">
            <Info :size="16" />如要使用「合盤解析」、「AI 問答」等功能請升級
            Premium。
          </p>
        </button>

        <button
          class="plan-card glass"
          :class="{ disabled: auth.premium }"
          type="button"
          :disabled="auth.premium"
          @click="choose(premiumProduct)"
        >
          <div class="plan-heading">
            <span class="plan-icon"><Crown :size="29" /></span>
            <span class="plan-title">
              <span class="title-row"
                ><strong>{{ premiumProduct.name }}</strong
                ><em v-if="premiumProduct.promotion" class="early-bird-tag">{{
                  premiumProduct.promotion.label
                }}</em></span
              >
              <small>{{
                auth.premium ? "您已開通此方案" : premiumProduct.description
              }}</small>
            </span>
            <b
              class="price-badge"
              :class="{ promotional: premiumProduct.promotion }"
            >
              <del
                v-if="premiumProduct.promotion && premiumProduct.original_price"
                >{{ money(premiumProduct.original_price) }}</del
              >
              <span>{{ money(premiumProduct.price) }}<small>/月</small></span>
            </b>
          </div>
          <div class="divider" />
          <ul>
            <li>每月有 60 次不扣除點數之額度（額度將於每月一號重置）</li>
            <li>解鎖「合盤解析」、「AI 問答」等專屬功能</li>
          </ul>
          <p v-if="premiumProduct.promotion" class="early-bird-copy">
            <Sparkles :size="16" />早鳥期間完成訂閱，只要持續訂閱，即維持
            {{
              money(premiumProduct.price)
            }}/月；取消後重新訂閱，將依當時方案售價計費。
          </p>
          <p class="renewal-note">
            <Info
              :size="16"
            />付款成功當日立即扣款並開通，後續由藍新於每月同日自動續扣；若於
            29～31 日訂閱，後續扣款日固定為每月 28
            日。您可隨時取消自動續訂，權益仍保留至當期截止日。
          </p>
          <p v-if="auth.premium" class="active-note">
            <BadgeCheck :size="17" />您正在使用此方案，享有所有專屬功能！
          </p>
        </button>

        <section v-if="subscription" class="subscription-card glass">
          <div>
            <strong>Premium 訂閱</strong
            ><small
              v-if="subscription.promotion_code === 'early_bird_40_off'"
              class="locked-price"
              >早鳥價 {{ money(subscription.locked_amount) }}/月{{
                subscription.will_renew ? "續訂中" : ""
              }}</small
            ><small
              >權益至 {{ formatDate(subscription.current_period_end) }}</small
            >
          </div>
          <button
            v-if="subscription.will_renew"
            type="button"
            :disabled="cancelling"
            @click="cancelSubscription"
          >
            {{ cancelling ? "處理中" : "取消自動續訂" }}
          </button>
          <b v-else>已取消續訂</b>
        </section>

        <p v-if="error" class="error-message">{{ error }}</p>

        <section class="purchase-policy">
          <h2>關於購買與權益</h2>
          <a href="/privacy-pwa" target="_blank" rel="noopener">隱私權政策</a>
          <p>
            本站服務使用「藍新金流」，付款將於「藍新安全頁面」完成，本站不保存信用卡資料。
          </p>
        </section>
      </template>
    </main>

    <Transition name="sheet">
      <div
        v-if="selected"
        class="sheet-backdrop"
        @click.self="!purchasing && (selected = null)"
      >
        <section class="purchase-sheet" role="dialog" aria-modal="true">
          <div class="sheet-handle" />
          <div class="sheet-title">
            <span><Sparkles :size="22" /></span>
            <div>
              <h2>前往付款</h2>
              <p>{{ selected.name }}</p>
            </div>
            <button
              type="button"
              aria-label="關閉"
              :disabled="purchasing"
              @click="selected = null"
            >
              <X :size="20" />
            </button>
          </div>
          <div class="order-row">
            <span>商品金額</span
            ><strong class="checkout-price"
              ><del v-if="selected.promotion && selected.original_price">{{
                money(selected.original_price)
              }}</del
              ><span>{{ money(selected.price) }}</span></strong
            >
          </div>
          <div
            v-if="selected.kind === 'subscription'"
            class="payer-email-field"
          >
            <label for="payer-email">付款電子信箱</label>
            <input
              id="payer-email"
              v-model.trim="payerEmail"
              :class="{ invalid: payerEmailError }"
              type="email"
              inputmode="email"
              autocomplete="email"
              placeholder="name@example.com"
              @input="payerEmailError = ''"
            />
            <small :class="{ visible: payerEmailError }">{{
              payerEmailError || "請輸入有效的付款電子信箱"
            }}</small>
          </div>
          <p v-if="selected.promotion" class="checkout-promo-copy">
            <Sparkles :size="15" />目前享有早鳥六折優惠。持續訂閱即維持
            {{ money(selected.price) }}/月；取消後重新訂閱將依當時售價計費。
          </p>
          <p class="mock-copy">
            下一步將離開本站前往藍新安全付款頁。付款結果會由後端驗證後發放點數或會員權益。
          </p>
          <div class="sheet-actions">
            <button
              class="app-button outline"
              type="button"
              :disabled="purchasing"
              @click="selected = null"
            >
              取消</button
            ><button
              class="app-button"
              type="button"
              :disabled="purchasing"
              @click="purchase"
            >
              <LoaderCircle v-if="purchasing" class="spin" :size="17" />{{
                purchasing ? "建立訂單中..." : "前往付款"
              }}
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </AppPageLayout>
</template>

<style scoped>
.store-body {
  padding: 12px 20px 80px;
}
.sandbox-notice {
  display: grid;
  grid-template-columns: 20px 1fr;
  gap: 8px;
  align-items: start;
  margin-bottom: 14px;
  padding: 11px 13px;
  border: 1px solid rgba(180, 155, 117, 0.24);
  border-radius: 14px;
  background: rgba(180, 155, 117, 0.09);
  color: var(--text-soft);
  font-size: 11.5px;
  line-height: 1.45;
}
.sandbox-notice strong {
  color: var(--mountain);
}
.store-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 55dvh;
  color: var(--text-soft);
  font-weight: 700;
}
.store-loading svg,
.spin {
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.subscription-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 16px;
  padding: 14px 16px;
  border-radius: 18px;
}
.subscription-card div {
  display: grid;
  gap: 3px;
}
.subscription-card small {
  color: var(--text-soft);
  font-size: 11px;
}
.subscription-card button {
  padding: 7px 10px;
  border: 1px solid rgba(184, 91, 75, 0.3);
  border-radius: 11px;
  background: transparent;
  color: var(--cinnabar);
  font-size: 11px;
  font-weight: 850;
}
.subscription-card b {
  color: var(--text-soft);
  font-size: 11px;
}
.plan-card {
  display: block;
  width: 100%;
  margin-bottom: 14px;
  padding: 22px;
  border: 0;
  border-radius: 28px;
  color: var(--mountain);
  text-align: left;
}
.plan-card.disabled {
  opacity: 0.7;
  cursor: default;
}
.plan-heading {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
}
.plan-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border: 1px solid rgba(200, 174, 120, 0.28);
  border-radius: 50%;
  background: rgba(180, 155, 117, 0.12);
}
.plan-title {
  min-width: 0;
}
.plan-title strong,
.plan-title small {
  display: block;
}
.plan-title strong {
  font-size: 16px;
  font-weight: 800;
}
.plan-title small {
  margin-top: 4px;
  color: rgba(36, 87, 90, 0.48);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}
.price-badge {
  padding: 8px 13px;
  border: 1px solid rgba(184, 91, 75, 0.24);
  border-radius: 15px;
  background: rgba(184, 91, 75, 0.1);
  color: var(--cinnabar);
  font-size: 15px;
  white-space: nowrap;
}
.divider {
  height: 1px;
  margin: 18px 0 15px;
  background: rgba(255, 255, 255, 0.52);
}
.plan-card ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.plan-card li {
  position: relative;
  padding-left: 16px;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.45;
}
.plan-card li::before {
  position: absolute;
  left: 0;
  top: 7px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--jade);
  content: "";
}
.renewal-note,
.plan-note,
.active-note {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 7px;
  margin: 12px 0 0;
  padding: 11px 12px;
  border: 1px solid rgba(180, 155, 117, 0.16);
  border-radius: 14px;
  background: rgba(180, 155, 117, 0.08);
  color: rgba(36, 87, 90, 0.8);
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.55;
}
.renewal-note {
  border-color: rgba(107, 166, 160, 0.22);
  background: rgba(107, 166, 160, 0.1);
}
.active-note {
  border-color: rgba(107, 166, 160, 0.18);
  background: rgba(107, 166, 160, 0.09);
  text-align: center;
}
.error-message {
  color: var(--cinnabar);
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}
.early-bird-tag {
  padding: 3px 7px;
  border: 1px solid rgba(184, 91, 75, 0.3);
  border-radius: 999px;
  background: rgba(184, 91, 75, 0.12);
  color: var(--cinnabar);
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
  line-height: 1.2;
  white-space: nowrap;
}
.price-badge.promotional {
  display: grid;
  gap: 1px;
}
.price-badge del {
  color: rgba(36, 87, 90, 0.42);
  font-size: 10px;
  font-weight: 700;
  text-align: right;
}
.price-badge span {
  font-weight: 900;
}
.price-badge small {
  font-size: 10px;
}
.early-bird-copy {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 7px;
  margin: 12px 0 0;
  padding: 11px 12px;
  border: 1px solid rgba(184, 91, 75, 0.2);
  border-radius: 14px;
  background: rgba(184, 91, 75, 0.08);
  color: var(--cinnabar);
  font-size: 11.5px;
  font-weight: 750;
  line-height: 1.55;
}
.subscription-card .locked-price {
  color: var(--cinnabar);
  font-weight: 850;
}
.purchase-policy {
  margin-top: 26px;
}
.purchase-policy h2 {
  margin: 0 0 9px;
  font-size: 16px;
}
.purchase-policy a,
.purchase-policy p {
  display: block;
  margin: 0 0 8px;
  padding-left: 16px;
  color: var(--mountain);
  font-size: 13px;
  line-height: 1.5;
}
.purchase-policy a {
  font-weight: 800;
  text-decoration: underline;
}
.purchase-policy a::before,
.purchase-policy p::before {
  margin-left: -16px;
  margin-right: 9px;
  content: "•";
  font-weight: 800;
}
.purchase-sheet {
  width: min(100%, 680px);
  padding: 12px 24px calc(30px + env(safe-area-inset-bottom));
  border-radius: 28px 28px 0 0;
  background: var(--paper);
}
.sheet-title {
  display: grid;
  grid-template-columns: 42px 1fr 36px;
  gap: 11px;
  align-items: center;
}
.sheet-title > span {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(36, 87, 90, 0.1);
}
.sheet-title h2,
.sheet-title p {
  margin: 0;
}
.sheet-title h2 {
  font-size: 18px;
}
.sheet-title p {
  margin-top: 3px;
  color: var(--text-soft);
  font-size: 12px;
}
.sheet-title button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  color: var(--mountain);
}
.order-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 22px 0 12px;
  padding: 15px;
  border-radius: 15px;
  background: rgba(107, 166, 160, 0.1);
  font-size: 14px;
}
.payer-email-field {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}
.payer-email-field label {
  font-size: 12px;
  font-weight: 800;
}
.payer-email-field input {
  width: 100%;
  padding: 12px 13px;
  border: 1px solid rgba(36, 87, 90, 0.18);
  border-radius: 13px;
  outline: 0;
  background: rgba(255, 255, 255, 0.56);
  color: var(--mountain);
  font: inherit;
}
.payer-email-field input:focus {
  border-color: rgba(36, 87, 90, 0.55);
}
.payer-email-field input.invalid {
  border-color: var(--cinnabar);
}
.payer-email-field small {
  min-height: 16px;
  color: var(--cinnabar);
  font-size: 11px;
  line-height: 16px;
  opacity: 0;
}
.payer-email-field small.visible {
  opacity: 1;
}
.mock-copy {
  margin: 0 0 22px;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.55;
}
.purchase-sheet .app-button {
  gap: 7px;
}
.success-sheet {
  text-align: center;
}
.success-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin: 0 auto;
  border-radius: 50%;
  background: rgba(107, 166, 160, 0.13);
}
.success-sheet h2 {
  margin: 15px 0 8px;
}
.success-sheet p {
  margin: 0 0 22px;
  color: var(--text-soft);
}
.success-sheet .app-button {
  width: 100%;
}
.checkout-price {
  display: flex;
  align-items: baseline;
  gap: 7px;
}
.checkout-price del {
  color: var(--text-soft);
  font-size: 11px;
  font-weight: 650;
}
.checkout-price span {
  color: var(--cinnabar);
  font-size: 16px;
}
.checkout-promo-copy {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 7px;
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 13px;
  background: rgba(184, 91, 75, 0.08);
  color: var(--cinnabar);
  font-size: 11.5px;
  font-weight: 750;
  line-height: 1.5;
}
@media (max-width: 430px) {
  .store-body {
    padding-inline: 14px;
  }
  .plan-card {
    padding: 18px 16px;
  }
  .plan-heading {
    grid-template-columns: 48px 1fr;
  }
  .plan-icon {
    width: 48px;
    height: 48px;
  }
  .price-badge {
    grid-column: 2;
    justify-self: start;
    padding: 6px 11px;
    font-size: 14px;
  }
  .divider {
    margin-top: 15px;
  }
}
</style>
