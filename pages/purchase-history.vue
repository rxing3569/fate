<script setup lang="ts">
import {
  Clock3,
  CreditCard,
  LoaderCircle,
  RefreshCw,
} from "@lucide/vue";
definePageMeta({ middleware: "auth" });
type Order = {
  uuid: string;
  product_id: string;
  merchant_order_no: string;
  status: string;
  amount: number;
  currency: string;
  paid_at?: string;
  created_at: string;
};
type Page = { items: Order[]; next_cursor?: string; has_more: boolean };
const items = ref<Order[]>([]),
  cursor = ref(""),
  loading = ref(true),
  loadingMore = ref(false),
  error = ref(""),
  hasMore = ref(false);
const labels: Record<string, string> = {
  pending: "確認中",
  paid: "付款成功",
  failed: "付款失敗",
  cancelled: "已取消",
  refunded: "已退款",
};
const product = (id: string) =>
  id === "web.points.500" ? "500 點數" : "Premium 月訂閱";
const time = (value: string) =>
  new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
async function load(more = false) {
  if (more) loadingMore.value = true;
  else loading.value = true;
  error.value = "";
  try {
    const page = (await ziweiApi.getWebOrders({
      cursor: more ? cursor.value : undefined,
      limit: 15,
    })) as Page;
    if (!more) items.value = [];
    items.value.push(...(page.items || []));
    cursor.value = page.next_cursor || "";
    hasMore.value = Boolean(page.has_more && cursor.value);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "讀取購買紀錄失敗";
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}
onMounted(() => load());
</script>
<template>
  <AppPageLayout
    title="購買紀錄"
    screen-class="history-screen"
    show-back
    back-to="/member"
    back-replace
    back-label="返回會員中心"
  >
    <main class="history-content">
      <div v-if="loading" class="state">
        <LoaderCircle class="spin" :size="28" />正在讀取訂單
      </div>
      <div v-else-if="error && !items.length" class="state">
        <strong>讀取失敗</strong>
        <p>{{ error }}</p>
        <button class="app-button outline" @click="load()">重新嘗試</button>
      </div>
      <div v-else-if="!items.length" class="state">
        <CreditCard :size="42" /><strong>尚無購買紀錄</strong>
      </div>
      <section v-else class="order-list">
        <article
          v-for="order in items"
          :key="order.uuid"
          class="order-card glass"
        >
          <span class="order-icon"><CreditCard :size="22" /></span>
          <div>
            <header>
              <strong>{{ product(order.product_id) }}</strong
              ><b :class="order.status">{{
                labels[order.status] || order.status
              }}</b>
            </header>
            <p>NT${{ order.amount }} · {{ order.merchant_order_no }}</p>
            <time
              ><Clock3 :size="12" />{{
                time(order.paid_at || order.created_at)
              }}</time
            >
          </div>
        </article>
        <button
          v-if="hasMore"
          class="load-more"
          type="button"
          :disabled="loadingMore"
          @click="load(true)"
        >
          <RefreshCw :class="{ spin: loadingMore }" :size="16" />{{
            loadingMore ? "讀取中" : "載入更多"
          }}
        </button>
      </section>
    </main>
  </AppPageLayout>
</template>
<style scoped>
.history-content {
  padding: 14px 18px 90px;
}
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 55dvh;
  color: var(--text-soft);
  text-align: center;
}
.state p {
  font-size: 12px;
}
.order-list {
  display: grid;
  gap: 12px;
}
.order-card {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 15px;
  border-radius: 21px;
}
.order-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: rgba(107, 166, 160, 0.14);
}
.order-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.order-card header strong {
  font-size: 14px;
}
.order-card header b {
  padding: 4px 7px;
  border-radius: 8px;
  background: rgba(36, 87, 90, 0.08);
  font-size: 10px;
}
.order-card header b.paid {
  background: rgba(107, 166, 160, 0.15);
  color: var(--jade);
}
.order-card header b.failed,
.order-card header b.refunded {
  background: rgba(184, 91, 75, 0.1);
  color: var(--cinnabar);
}
.order-card p {
  overflow: hidden;
  margin: 5px 0;
  color: var(--text-soft);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-card time {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(36, 87, 90, 0.48);
  font-size: 10px;
}
.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--mountain);
  font-weight: 800;
}
.spin {
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
