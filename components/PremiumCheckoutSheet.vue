<script setup lang="ts">
import { BadgeCheck, LoaderCircle } from "@lucide/vue";
import type {
  PremiumCheckoutDraft,
  WebCheckoutResult,
  WebProduct,
} from "~/types/billing";
import { ApiError } from "~/utils/api";
import { savePremiumCheckoutIntent } from "~/utils/premium-checkout";
import { trackAttributedEvent } from "~/utils/next-step";
import {
  hostedPaymentCopy,
  premiumBenefits,
  premiumRenewalCopy,
} from "~/utils/premium-product-copy";

const props = defineProps<{
  open: boolean;
  draft: PremiumCheckoutDraft | null;
}>();
const emit = defineEmits<{ close: [] }>();

const auth = useAuthStore();
const product = ref<WebProduct | null>(null);
const loading = ref(false);
const purchasing = ref(false);
const payerEmail = ref("");
const payerEmailError = ref("");
const error = ref("");

const fallbackProduct: WebProduct = {
  id: "web.premium.monthly",
  name: "升級 Premium",
  description: "解鎖合盤解析與 AI 問答",
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
};

const money = (amount: number) => `NT$${amount}`;

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    trackAttributedEvent("premium_sheet_opened");
    payerEmail.value = String(auth.profile?.email || "");
    payerEmailError.value = "";
    error.value = "";
    await loadProduct();
  },
);

async function loadProduct() {
  loading.value = true;
  try {
    const response = (await ziweiApi.getWebProducts()) as {
      products?: WebProduct[];
    };
    product.value =
      response.products?.find((item) => item.id === "web.premium.monthly") ||
      fallbackProduct;
  } catch (reason) {
    product.value = fallbackProduct;
    error.value =
      reason instanceof Error ? reason.message : "目前無法讀取方案資料";
  } finally {
    loading.value = false;
  }
}

function submitHostedCheckout(checkout: WebCheckoutResult) {
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
  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

async function purchase() {
  const selected = product.value;
  if (!selected || !props.draft || purchasing.value) return;
  const email = payerEmail.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    payerEmailError.value = "請輸入有效的付款電子信箱";
    return;
  }
  const userUuid = String(auth.profile?.uuid || "");
  if (!userUuid) {
    error.value = "無法確認目前登入帳號，請重新登入後再試。";
    return;
  }
  purchasing.value = true;
  error.value = "";
  payerEmailError.value = "";
  try {
    const checkout = (await ziweiApi.createWebCheckout(
      selected.id,
      selected.price,
      email,
    )) as WebCheckoutResult;
    trackAttributedEvent("checkout_started");
    savePremiumCheckoutIntent(
      props.draft,
      userUuid,
      checkout.order.merchant_order_no,
    );
    submitHostedCheckout(checkout);
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 409) {
      const payload = reason.payload as {
        code?: string;
        product?: WebProduct;
      };
      if (payload?.code === "PRICE_CHANGED" && payload.product) {
        product.value = payload.product;
        error.value = "方案價格已更新，請確認新價格後再次前往付款。";
        return;
      }
    }
    error.value =
      reason instanceof Error ? reason.message : "建立付款訂單失敗，請稍後再試";
  } finally {
    purchasing.value = false;
  }
}
</script>

<template>
  <AppBottomSheet
    :open="open"
    labelledby="premium-checkout-title"
    :locked="purchasing"
    sheet-class="premium-checkout-sheet"
    @close="emit('close')"
  >
    <span id="premium-checkout-title" class="premium-accessible-title">
      訂閱 Premium
    </span>
    <div v-if="loading && !product" class="premium-loading">
      <LoaderCircle class="spin" :size="24" />正在讀取最新方案…
    </div>
    <div v-else-if="product" class="premium-checkout-content">
      <div class="premium-price-row">
        <div>
          <strong>{{ product.name }}</strong>
          <span v-if="product.promotion">{{ product.promotion.label }}</span>
        </div>
        <p>
          <del v-if="product.original_price">{{
            money(product.original_price)
          }}</del>
          <b>{{ money(product.price) }}</b
          ><small>/月</small>
        </p>
      </div>
      <ul class="premium-benefits">
        <li v-for="benefit in premiumBenefits" :key="benefit">
          <BadgeCheck :size="18" />{{ benefit }}
        </li>
      </ul>

      <div class="premium-email-field">
        <label for="premium-payer-email">付款電子信箱</label>
        <input
          id="premium-payer-email"
          v-model.trim="payerEmail"
          type="email"
          inputmode="email"
          autocomplete="email"
          :class="{ invalid: payerEmailError }"
          placeholder="name@example.com"
          @input="payerEmailError = ''"
        />
        <small v-if="payerEmailError">{{ payerEmailError }}</small>
      </div>

      <p class="premium-information-copy">
        {{ hostedPaymentCopy }}
      </p>

      <p v-if="error" class="premium-error" role="alert">{{ error }}</p>

      <div class="premium-actions">
        <button
          class="app-button outline"
          type="button"
          :disabled="purchasing"
          @click="emit('close')"
        >
          取消
        </button>
        <button
          class="app-button"
          type="button"
          :disabled="purchasing"
          @click="purchase"
        >
          <LoaderCircle v-if="purchasing" class="spin" :size="17" />
          {{ purchasing ? "建立訂單中..." : "前往付款" }}
        </button>
      </div>
    </div>
  </AppBottomSheet>
</template>

<style scoped>
.premium-accessible-title {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.premium-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 190px;
  color: var(--text-soft);
  font-size: 13px;
  font-weight: 700;
}
.premium-checkout-content {
  display: grid;
  gap: 10px;
}
.premium-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 13px;
  border-radius: 16px;
  background: rgba(36, 87, 90, 0.07);
}
.premium-price-row > div {
  display: grid;
  gap: 5px;
}
.premium-price-row strong {
  font-size: 15px;
}
.premium-price-row span {
  width: max-content;
  padding: 3px 7px;
  border-radius: 999px;
  color: #fff;
  background: var(--cinnabar);
  font-size: 9px;
  font-weight: 800;
}
.premium-price-row p {
  margin: 0;
  text-align: right;
}
.premium-price-row del {
  display: block;
  color: var(--text-soft);
  font-size: 11px;
}
.premium-price-row b {
  color: var(--cinnabar);
  font-size: 22px;
}
.premium-price-row p small {
  color: var(--text-soft);
  font-weight: 700;
}
.premium-benefits {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.premium-benefits li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--mountain);
  font-size: 12.5px;
  font-weight: 700;
}
.premium-benefits svg {
  flex: 0 0 auto;
  color: var(--jade);
}
.premium-renewal-copy,
.premium-information-copy {
  width: 100%;
  max-width: none !important;
  margin: 0;
  color: var(--text-soft);
  font-size: 11px;
  line-height: 1.6;
}
.premium-email-field {
  display: grid;
  gap: 5px;
  text-align: left;
}
.premium-email-field label {
  color: var(--mountain);
  font-size: 12px;
  font-weight: 750;
}
.premium-email-field input {
  min-height: 42px;
  padding: 0 13px;
  border: 1px solid rgba(36, 87, 90, 0.28);
  border-radius: 13px;
  outline: 0;
  color: var(--mountain);
  background: #fff;
  font: inherit;
}
.premium-email-field input:focus {
  border: 2px solid var(--mountain);
}
.premium-email-field input.invalid {
  border-color: var(--cinnabar);
}
.premium-email-field > small,
.premium-error {
  color: var(--cinnabar);
  font-size: 11px;
  font-weight: 700;
}
.premium-error {
  margin: 0;
  padding: 9px 11px;
  border-radius: 11px;
  background: rgba(184, 91, 75, 0.08);
}
.premium-actions {
  display: grid;
  grid-template-columns: 0.75fr 1.6fr;
  gap: 9px;
}
.premium-actions .app-button {
  width: 100%;
  min-width: 0;
  padding-inline: 10px;
  font-size: 12px;
}
.spin {
  animation: premium-spin 0.9s linear infinite;
}
@keyframes premium-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
