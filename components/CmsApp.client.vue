<script setup lang="ts">
import { CmsApiError, cmsApi } from "~/utils/cms-api";
import type { ChartConfiguration } from "chart.js";

const props = withDefaults(defineProps<{ page?: "dashboard" | "premium" }>(), {
  page: "dashboard",
});

type UserStatus = {
  uuid: string;
  email: string;
  name: string;
  created_at: string;
  is_premium: boolean;
  app_expires_at?: string;
  web_expires_at?: string;
  manual_expires_at?: string;
  effective_expires_at?: string;
  web_will_renew: boolean;
  sources: string[];
};
type Dashboard = {
  days: number;
  range?: { start_date: string; end_date: string; days: number };
  summary: {
    total_users: number;
    premium_users: number;
    non_premium_users: number;
    premium_rate: number;
    registrations: { today: number; seven_days: number; thirty_days: number };
  };
  registration_trend: { date: string; count: number }[];
  usage: { type: string; count: number }[];
  web_revenue: {
    period_revenue: number;
    all_time_revenue: number;
    paid_transactions: number;
    failed_transactions: number;
    refunded_transactions: number;
    average_order_value: number;
    trend: { date: string; amount: number; transactions: number }[];
    subscription_health: Record<string, number>;
  };
};

const checking = ref(true),
  loggedIn = ref(false),
  loading = ref(false);
const cmsSessionHintKey = "fate-cms-session";
const adminEmail = ref(""),
  loginEmail = ref(""),
  loginPassword = ref(""),
  error = ref(""),
  notice = ref("");
const dashboard = ref<Dashboard | null>(null),
  dashboardFormatError = ref(""),
  todayRevenue = ref(0),
  period = ref(30),
  rangeMode = ref<"7" | "30" | "custom">("30"),
  startDate = ref(""),
  endDate = ref(""),
  lookupEmail = ref(""),
  user = ref<UserStatus | null>(null);
const days = ref(7),
  durationPreset = ref("7"),
  confirmOpen = ref(false),
  confirmPassword = ref(""),
  operationId = ref("");
const format = (v?: string) =>
  v
    ? new Intl.DateTimeFormat("zh-TW", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(v))
    : "—";
const sourceName: Record<string, string> = {
  app: "App",
  web: "Web",
  manual: "後台手動",
};
const usageName: Record<string, string> = {
  general: "本命解析",
  flow: "時運解析",
  match: "合盤解析",
  qa: "命理問答",
  palace_detail: "十二宮詳解",
  ten_year: "十年大運",
  other: "其他",
};
const currency = (value: number) =>
  new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
let dashboardRequest = 0;

function niceAxisMax(values: number[], minimum: number) {
  const maximum = Math.max(0, ...values);
  if (maximum <= 0) return minimum;
  const target = Math.max(minimum, maximum * 1.25);
  const magnitude = 10 ** Math.floor(Math.log10(maximum));
  const step = Math.max(1, magnitude / 2);
  return Math.max(minimum, Math.ceil(target / step) * step);
}
function normalizeDashboard(value: Dashboard): Dashboard {
  const missing: string[] = [];
  if (!Array.isArray(value.registration_trend)) missing.push("registration_trend");
  if (!Array.isArray(value.usage)) missing.push("usage");
  if (!Array.isArray(value.web_revenue?.trend)) missing.push("web_revenue.trend");
  if (!value.web_revenue?.subscription_health) missing.push("web_revenue.subscription_health");
  dashboardFormatError.value = missing.length
    ? `Dashboard API 回應格式不完整：${missing.join("、")}`
    : "";
  const todayRevenueEntry = value.web_revenue?.trend?.find(
    (entry) => entry.date === isoDate(new Date()),
  );
  if (todayRevenueEntry) todayRevenue.value = todayRevenueEntry.amount;
  return {
    ...value,
    registration_trend: Array.isArray(value.registration_trend) ? value.registration_trend : [],
    usage: Array.isArray(value.usage) ? value.usage : [],
    web_revenue: {
      ...value.web_revenue,
      trend: Array.isArray(value.web_revenue?.trend) ? value.web_revenue.trend : [],
      subscription_health: value.web_revenue?.subscription_health || {},
    },
  };
}
const chartBase = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" as const },
  plugins: { legend: { position: "bottom" as const } },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 9 } },
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
};
const registrationChart = computed<ChartConfiguration<"line">>(() => ({
  type: "line",
  data: {
    labels: dashboard.value?.registration_trend.map((x) => x.date.slice(5)) || [],
    datasets: [{
      label: "註冊人數",
      data: dashboard.value?.registration_trend.map((x) => x.count) || [],
      borderColor: "#176b5b",
      backgroundColor: "#176b5b22",
      fill: true,
      tension: 0.32,
      pointRadius: 2,
    }],
  },
  options: {
    ...chartBase,
    scales: {
      ...chartBase.scales,
      y: {
        ...chartBase.scales.y,
        max: niceAxisMax(dashboard.value?.registration_trend.map((x) => x.count) || [], 5),
      },
    },
  },
}));
const revenueChart = computed<ChartConfiguration>(() => ({
  type: "bar",
  data: {
    labels: dashboard.value?.web_revenue.trend.map((x) => x.date.slice(5)) || [],
    datasets: [
      {
        type: "bar",
        label: "營收（TWD）",
        data: dashboard.value?.web_revenue.trend.map((x) => x.amount) || [],
        backgroundColor: "#2b927bcc",
        borderRadius: 5,
        yAxisID: "revenue",
      },
      {
        type: "line",
        label: "成功付款筆數",
        data: dashboard.value?.web_revenue.trend.map((x) => x.transactions) || [],
        borderColor: "#d68b3c",
        backgroundColor: "#d68b3c",
        tension: 0.3,
        yAxisID: "transactions",
      },
    ],
  },
  options: {
    ...chartBase,
    scales: {
      x: chartBase.scales.x,
      revenue: {
        beginAtZero: true,
        max: niceAxisMax(dashboard.value?.web_revenue.trend.map((x) => x.amount) || [], 500),
        position: "left",
        ticks: { callback: (v) => `NT$${Number(v).toLocaleString()}` },
      },
      transactions: {
        beginAtZero: true,
        max: niceAxisMax(dashboard.value?.web_revenue.trend.map((x) => x.transactions) || [], 5),
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: { precision: 0 },
      },
    },
  },
}));
const usageChart = computed<ChartConfiguration<"bar">>(() => ({
  type: "bar",
  data: {
    labels: dashboard.value?.usage.map((x) => usageName[x.type] || x.type) || [],
    datasets: [{ label: "啟動次數", data: dashboard.value?.usage.map((x) => x.count) || [], backgroundColor: "#5d8f85", borderRadius: 6 }],
  },
  options: {
    ...chartBase,
    indexAxis: "y",
    scales: {
      y: { grid: { display: false } },
      x: { beginAtZero: true, max: niceAxisMax(dashboard.value?.usage.map((x) => x.count) || [], 5), ticks: { precision: 0 } },
    },
  },
}));
function isoDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(date);
}
function markCustomRange() {
  rangeMode.value = "custom";
}
async function selectRange(value: "7" | "30") {
  rangeMode.value = value;
  period.value = Number(value);
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - period.value + 1);
  startDate.value = isoDate(start);
  endDate.value = isoDate(end);
  await loadDashboard();
}

async function restore() {
  try {
    const s = await cmsApi<{ email: string }>("/auth/session");
    adminEmail.value = s.email;
    loggedIn.value = true;
    if (props.page === "dashboard") await loadDashboard();
  } catch {
    sessionStorage.removeItem(cmsSessionHintKey);
  } finally {
    checking.value = false;
  }
}
async function login() {
  error.value = "";
  loading.value = true;
  try {
    const s = await cmsApi<{ email: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: loginEmail.value,
        password: loginPassword.value,
      }),
    });
    adminEmail.value = s.email;
    loginPassword.value = "";
    loggedIn.value = true;
    sessionStorage.setItem(cmsSessionHintKey, "1");
    if (props.page === "dashboard") await loadDashboard();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "登入失敗";
  } finally {
    loginPassword.value = "";
    loading.value = false;
  }
}
async function logout() {
  try {
    await cmsApi("/auth/logout", { method: "POST" });
  } finally {
    sessionStorage.removeItem(cmsSessionHintKey);
    loggedIn.value = false;
    dashboard.value = null;
    user.value = null;
  }
}
async function loadDashboard() {
  const request = ++dashboardRequest;
  loading.value = true;
  error.value = "";
  try {
    let query = `days=${period.value}`;
    if (startDate.value && endDate.value) {
      const daysBetween = Math.floor((new Date(endDate.value).getTime() - new Date(startDate.value).getTime()) / 86400000) + 1;
      if (daysBetween < 1 || daysBetween > 366) throw new Error("日期區間必須介於 1 到 366 天");
      query = `start_date=${startDate.value}&end_date=${endDate.value}`;
    }
    const response = await cmsApi<Dashboard>(`/dashboard?${query}`);
    if (request === dashboardRequest) dashboard.value = normalizeDashboard(response);
  } catch (e) {
    if (request === dashboardRequest) handleError(e);
  } finally {
    if (request === dashboardRequest) loading.value = false;
  }
}
async function lookup() {
  loading.value = true;
  error.value = "";
  notice.value = "";
  user.value = null;
  try {
    const r = await cmsApi<{ user: UserStatus }>(
      `/users/lookup?email=${encodeURIComponent(lookupEmail.value.trim())}`,
    );
    user.value = r.user;
  } catch (e) {
    handleError(e);
  } finally {
    loading.value = false;
  }
}
function prepareGrant() {
  if (!user.value) return;
  if (days.value < 1 || days.value > 1000) {
    error.value = "天數必須介於 1 到 1000 天";
    return;
  }
  operationId.value = crypto.randomUUID();
  confirmPassword.value = "";
  confirmOpen.value = true;
}
async function grant() {
  if (!user.value || !confirmPassword.value) return;
  loading.value = true;
  error.value = "";
  try {
    const r = await cmsApi<{ user: UserStatus; message: string }>(
      "/premium/grants",
      {
        method: "POST",
        body: JSON.stringify({
          user_id: user.value.uuid,
          days: days.value,
          password: confirmPassword.value,
          operation_id: operationId.value,
        }),
      },
    );
    user.value = r.user;
    notice.value = r.message;
    confirmOpen.value = false;
  } catch (e) {
    handleError(e);
  } finally {
    confirmPassword.value = "";
    loading.value = false;
  }
}
function handleError(e: unknown) {
  if (e instanceof CmsApiError && e.status === 401) {
    sessionStorage.removeItem(cmsSessionHintKey);
    loggedIn.value = false;
    error.value = e.message;
  } else error.value = e instanceof Error ? e.message : "操作失敗";
}
onMounted(() => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  startDate.value = isoDate(start);
  endDate.value = isoDate(end);
  if (sessionStorage.getItem(cmsSessionHintKey) === "1") restore();
  else checking.value = false;
});
watch(durationPreset, (value) => {
  if (value !== "other") days.value = Number(value);
});
watch(lookupEmail, () => {
  user.value = null;
  notice.value = "";
});
</script>

<template>
  <div v-if="checking" class="cms-center">
    <div class="spinner" aria-label="載入中" />
  </div>
  <div v-else-if="!loggedIn" class="login-shell">
    <section class="login-card">
      <p class="eyebrow">FATEJYC ADMIN</p>
      <h1>管理後台</h1>
      <p class="muted">請使用管理員帳號登入，此頁不提供註冊。</p>
      <form @submit.prevent="login">
        <label
          >管理員帳號<input
            v-model="loginEmail"
            type="email"
            autocomplete="username"
            required /></label
        ><label
          >密碼<input
            v-model="loginPassword"
            type="password"
            autocomplete="current-password"
            required
        /></label>
        <p v-if="error" class="alert error">{{ error }}</p>
        <button class="primary full" :disabled="loading">
          {{ loading ? "登入中…" : "登入" }}
        </button>
      </form>
    </section>
  </div>
  <div v-else class="app-shell">
    <CmsNavigation page="dashboard" @logout="logout" />
    <div class="content">
      <CmsPageHeader
        :title="props.page === 'dashboard' ? '營運儀表板' : 'Premium 管理'"
        :loading="loading"
        @refresh="loadDashboard"
      />
      <p v-if="error" class="alert error">{{ error }}</p>
      <p v-if="dashboardFormatError" class="alert error">{{ dashboardFormatError }}</p>
      <p v-if="notice" class="alert success">{{ notice }}</p>
      <section v-if="props.page === 'dashboard' && dashboard" class="dashboard">
        <div class="metrics">
          <article><span>總註冊人數</span><strong>{{ dashboard.summary.total_users.toLocaleString() }}</strong></article>
          <article><span>Premium</span><strong>{{ dashboard.summary.premium_users.toLocaleString() }}</strong><small>{{ dashboard.summary.premium_rate.toFixed(1) }}%</small></article>
          <article><span>今日註冊人數</span><strong>{{ dashboard.summary.registrations.today.toLocaleString() }}</strong></article>
          <article><span>今日營收</span><strong>{{ currency(todayRevenue) }}</strong></article>
        </div>
        <form class="range-toolbar" @submit.prevent="loadDashboard">
          <div class="range-title">
            <p class="eyebrow">REPORTING PERIOD</p>
            <h2>數據區間</h2>
          </div>
          <div class="range-presets" role="group" aria-label="選擇數據區間">
            <button type="button" :disabled="loading" :class="{ active: rangeMode === '7' }" @click="selectRange('7')">近 7 日</button>
            <button type="button" :disabled="loading" :class="{ active: rangeMode === '30' }" @click="selectRange('30')">近 30 日</button>
          </div>
          <div class="custom-range">
            <label aria-label="起日"><input v-model="startDate" type="date" :max="endDate || isoDate(new Date())" @input="markCustomRange"></label>
            <span class="date-separator" aria-hidden="true">—</span>
            <label aria-label="迄日"><input v-model="endDate" type="date" :min="startDate" :max="isoDate(new Date())" @input="markCustomRange"></label>
            <button class="primary" :disabled="loading">套用</button>
          </div>
        </form>
        <div class="dashboard-grid">
          <article class="panel chart-wide">
            <div class="panel-header"><div><p class="eyebrow">REGISTRATIONS</p><h3>每日註冊人數</h3></div><span class="period-label">{{ dashboard.range?.start_date }} — {{ dashboard.range?.end_date }}</span></div>
            <CmsChart :config="registrationChart" label="每日註冊人數折線圖" :empty="!dashboard.registration_trend.some(x => x.count)" />
          </article>
          <article class="panel chart-wide">
            <div class="panel-header"><div><p class="eyebrow">WEB TWD FINANCE</p><h3>營收與成功付款</h3></div><span class="period-label">{{ dashboard.range?.start_date }} — {{ dashboard.range?.end_date }}</span></div>
            <CmsChart :config="revenueChart" label="每日 Web TWD 營收與成功付款筆數" :empty="!dashboard.web_revenue.trend.some(x => x.amount || x.transactions)" />
          </article>
          <article class="panel">
            <div class="panel-header"><div><p class="eyebrow">FINANCE SUMMARY</p><h3>財務摘要</h3></div></div>
            <div class="finance-list">
              <p><span>區間營收</span><b>{{ currency(dashboard.web_revenue.period_revenue) }}</b></p>
              <p><span>平均客單價</span><b>{{ currency(dashboard.web_revenue.average_order_value) }}</b></p>
              <p><span>累積營收</span><b>{{ currency(dashboard.web_revenue.all_time_revenue) }}</b></p>
              <p><span>成功交易</span><b>{{ dashboard.web_revenue.paid_transactions }} 筆</b></p>
              <p><span>失敗交易</span><b>{{ dashboard.web_revenue.failed_transactions }} 筆</b></p>
              <p><span>退款交易</span><b>{{ dashboard.web_revenue.refunded_transactions }} 筆</b></p>
              <p><span>付款成功率</span><b>{{ ((dashboard.web_revenue.paid_transactions / Math.max(1, dashboard.web_revenue.paid_transactions + dashboard.web_revenue.failed_transactions)) * 100).toFixed(1) }}%</b></p>
            </div>
          </article>
          <article class="panel subscription-health">
            <div class="panel-header"><div><p class="eyebrow">SUBSCRIPTIONS</p><h3>訂閱健康度</h3></div></div>
            <div class="subscription-health-grid"><p><span>續訂中</span><b>{{ dashboard.web_revenue.subscription_health.active || 0 }}</b></p><p><span>已取消仍有效</span><b>{{ dashboard.web_revenue.subscription_health.cancelled || 0 }}</b></p><p><span>扣款異常</span><b>{{ dashboard.web_revenue.subscription_health.past_due || 0 }}</b></p></div>
          </article>
          <article class="panel chart-wide"><div class="panel-header"><div><p class="eyebrow">ANALYSIS USAGE</p><h3>解析功能使用量</h3></div></div><CmsChart :config="usageChart" label="解析功能使用量" :empty="!dashboard.usage.length" /></article>
        </div>
      </section>
      <section v-if="props.page === 'premium'" class="panel premium-panel">
        <div>
          <p class="eyebrow">PREMIUM ACCESS</p>
          <h2>替使用者增加 Premium 天數</h2>
          <p class="muted">先查詢會員目前狀態，確認對象後再選擇開通期間。</p>
        </div>
        <div class="step-title">
          <span>1</span>
          <div><strong>查詢會員</strong><small>請輸入完整 Email</small></div>
        </div>
        <form class="lookup-form" @submit.prevent="lookup">
          <label
            >Email<input
              v-model.trim="lookupEmail"
              type="email"
              placeholder="user@example.com"
              required /></label
          ><button class="primary" :disabled="loading">
            {{ loading ? "查詢中…" : "查詢帳號" }}
          </button>
        </form>
        <div v-if="user" class="user-card">
          <div class="user-head">
            <div>
              <small>使用者</small>
              <h3>{{ user.name || "未設定姓名" }}</h3>
              <p>{{ user.email }}</p>
            </div>
            <span :class="['badge', user.is_premium ? 'on' : 'off']">{{
              user.is_premium ? "Premium" : "一般會員"
            }}</span>
          </div>
          <dl>
            <div>
              <dt>註冊時間</dt>
              <dd>{{ format(user.created_at) }}</dd>
            </div>
            <div>
              <dt>有效來源</dt>
              <dd>
                {{
                  user.sources.map((x) => sourceName[x] || x).join("、") || "無"
                }}
              </dd>
            </div>
            <div>
              <dt>目前最晚到期</dt>
              <dd>{{ format(user.effective_expires_at) }}</dd>
            </div>
            <div>
              <dt>Web 自動續訂</dt>
              <dd>{{ user.web_will_renew ? "是" : "否" }}</dd>
            </div>
          </dl>
          <div class="duration-section">
            <div class="step-title">
              <span>2</span>
              <div>
                <strong>選擇開通期間</strong
                ><small>將從目前最晚到期日接續計算</small>
              </div>
            </div>
            <form class="duration-form" @submit.prevent="prepareGrant">
              <label
                >期間<select v-model="durationPreset">
                  <option value="1">一天</option>
                  <option value="3">三天</option>
                  <option value="7">一週</option>
                  <option value="30">一個月</option>
                  <option value="90">三個月</option>
                  <option value="180">半年</option>
                  <option value="365">一年</option>
                  <option value="other">其他</option>
                </select></label
              ><label v-if="durationPreset === 'other'"
                >自訂天數<input
                  v-model.number="days"
                  type="number"
                  min="1"
                  max="1000"
                  placeholder="1–1000"
                  required /></label
              ><button class="primary">增加 {{ days }} 天 Premium</button>
            </form>
          </div>
        </div>
      </section>
    </div>
    <div
      v-if="confirmOpen"
      class="modal-backdrop"
      @click.self="confirmOpen = false"
    >
      <form class="modal" @submit.prevent="grant">
        <p class="eyebrow">再次驗證</p>
        <h2>確認增加 {{ days }} 天 Premium？</h2>
        <p>對象：{{ user?.email }}</p>
        <label
          >請再次輸入管理員密碼<input
            v-model="confirmPassword"
            type="password"
            autocomplete="current-password"
            required
            autofocus
        /></label>
        <div class="actions">
          <button type="button" class="secondary" @click="confirmOpen = false">
            取消</button
          ><button class="primary" :disabled="loading">
            {{ loading ? "處理中…" : "確認開通" }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.cms-center,
.login-shell {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
}
.login-shell {
  background:
    radial-gradient(circle at top right, #d7ebe4, transparent 45%), #eef3f1;
}
.login-card {
  width: min(430px, 100%);
  padding: 42px;
  background: #fff;
  border: 1px solid #dce6e2;
  border-radius: 24px;
  box-shadow: 0 24px 70px #173f3620;
}
.eyebrow {
  margin: 14px 0 5px;
  color: #63827b;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
.login-card h1,
.content h1,
.content h2,
.content h3 {
  margin: 0;
}
.muted {
  color: #6b7f7b;
  line-height: 1.6;
}
form label,
.grant-row label {
  display: grid;
  gap: 8px;
  margin-top: 18px;
  font-size: 13px;
  font-weight: 700;
}
input,
select {
  width: 100%;
  border: 1px solid #cbd9d5;
  background: #fff;
  border-radius: 10px;
  padding: 12px 14px;
  font: inherit;
  color: #183532;
  outline: none;
}
input:focus,
select:focus {
  border-color: #16806c;
  box-shadow: 0 0 0 3px #16806c18;
}
button {
  font: inherit;
  font-weight: 750;
  cursor: pointer;
  border-radius: 10px;
  padding: 11px 17px;
  border: 0;
}
.primary {
  background: #176b5b;
  color: #fff;
}
.secondary {
  background: #fff;
  color: #28544c;
  border: 1px solid #cedbd7;
}
.full {
  width: 100%;
  margin-top: 24px;
}
.text-btn {
  padding: 8px 0;
  background: transparent;
  color: #9cd3c7;
  text-align: left;
}
.alert {
  padding: 12px 14px;
  border-radius: 10px;
}
.error {
  color: #9d3131;
  background: #fbe9e9;
}
.success {
  color: #176044;
  background: #def4e9;
}
.app-shell {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 240px 1fr;
}
.range-toolbar {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) auto minmax(390px, auto);
  align-items: end;
  gap: 16px;
  margin-bottom: 16px;
  padding: 18px 20px;
  background: #edf4f1;
  border: 1px solid #d8e5e0;
  border-radius: 16px;
}
.range-title .eyebrow,
.range-title h2 {
  margin: 0;
}
.range-title {
  display: grid;
  gap: 5px;
  align-self: center;
}
.range-presets {
  display: flex;
  gap: 6px;
}
.range-presets button {
  padding: 9px 13px;
  background: #fff;
  color: #28544c;
  border: 1px solid #cedbd7;
}
.range-presets button.active {
  background: #176b5b;
  border-color: #176b5b;
  color: #fff;
}
.custom-range {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) auto minmax(140px, 1fr) auto;
  align-items: center;
  gap: 8px;
}
.custom-range label {
  margin: 0;
}
.date-separator {
  color: #71827f;
  font-weight: 700;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.panel-header {
  min-height: 45px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.panel-header > div {
  display: grid;
  gap: 5px;
}
.panel-header .eyebrow,
.panel-header h3 {
  margin: 0;
}
.chart-wide {
  grid-column: span 2;
  min-width: 0;
}
.period-label {
  color: #71827f;
  font-size: 12px;
}
.finance-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.finance-list p,
.subscription-health-grid p {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 14px;
  background: #f3f7f5;
  border-radius: 10px;
}
.finance-list span,
.subscription-health-grid span {
  color: #71827f;
  font-size: 12px;
}
.subscription-health-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.subscription-health-grid b {
  font-size: 24px;
}
.content {
  padding: 42px clamp(24px, 4vw, 64px);
  max-width: 1500px;
  width: 100%;
  margin: 0 auto;
}
.content > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.metrics article,
.panel {
  background: #fff;
  border: 1px solid #dae5e1;
  border-radius: 16px;
  padding: 22px;
}
.metrics span {
  display: block;
  color: #70817e;
  font-size: 13px;
}
.metrics strong {
  font-size: 32px;
  display: inline-block;
  margin-top: 10px;
}
.metrics small {
  margin-left: 8px;
  color: #16806c;
}
.user-head,
.grant-row,
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.badge {
  padding: 6px 9px;
  border-radius: 99px;
  background: #edf5f2;
  font-size: 12px;
}
.premium-panel {
  margin-top: 16px;
}
.lookup {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  margin: 20px 0;
}
.user-card {
  border-top: 1px solid #e1e9e6;
  padding-top: 20px;
}
.user-head p {
  margin: 5px 0;
}
.badge.on {
  background: #dcf4e8;
  color: #176b4b;
}
.badge.off {
  background: #ecefed;
  color: #63716e;
}
.user-card dl {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.user-card dl div {
  background: #f5f8f7;
  padding: 13px;
  border-radius: 10px;
}
.user-card dt {
  font-size: 12px;
  color: #71827f;
}
.user-card dd {
  margin: 6px 0 0;
  font-weight: 700;
}
.grant-row {
  justify-content: flex-end;
}
.grant-row label {
  display: flex;
  align-items: center;
}
.grant-row input {
  width: 110px;
}
.content > .panel {
  margin-top: 16px;
}
.table-wrap {
  overflow: auto;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin-top: 16px;
  text-align: left;
}
th,
td {
  padding: 12px;
  border-bottom: 1px solid #e2e9e7;
  white-space: nowrap;
  font-size: 13px;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: #102c2770;
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 20;
}
.modal {
  width: min(480px, 100%);
  background: #fff;
  border-radius: 18px;
  padding: 28px;
  box-shadow: 0 24px 70px #0003;
}
.actions {
  justify-content: flex-end;
  margin-top: 24px;
}
.spinner {
  width: 34px;
  height: 34px;
  border: 3px solid #c9ddd7;
  border-top-color: #176b5b;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
button:disabled {
  opacity: 0.55;
  cursor: wait;
}
.step-title {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 24px;
}
.step-title > span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #176b5b;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}
.step-title div {
  display: grid;
  gap: 2px;
}
.step-title small {
  color: #71827e;
}
.lookup-form {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto;
  gap: 12px;
  align-items: end;
  margin: 14px 0 24px;
}
.lookup-form label,
.duration-form label {
  margin: 0;
}
.lookup-form button,
.duration-form button {
  height: 45px;
}
.duration-section {
  margin-top: 22px;
  padding-top: 4px;
  border-top: 1px solid #e1e9e6;
}
.duration-form {
  display: grid;
  grid-template-columns: minmax(180px, 260px) minmax(160px, 220px) auto;
  gap: 12px;
  align-items: end;
  margin-top: 16px;
}
.duration-form button {
  white-space: nowrap;
}
@media (max-width: 900px) {
  .app-shell {
    display: block;
  }
  .metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .user-card dl {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 1200px) {
  .range-toolbar {
    grid-template-columns: 1fr auto;
  }
  .custom-range {
    grid-column: 1 / -1;
  }
}
@media (max-width: 760px) {
  .content {
    padding: 22px 14px;
  }
  .content > header {
    align-items: flex-start;
  }
  .range-toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
  .custom-range {
    grid-column: auto;
  }
  .range-presets {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .chart-wide {
    grid-column: auto;
  }
  .finance-list,
  .subscription-health-grid {
    grid-template-columns: 1fr;
  }
  .period-label {
    display: block;
  }
}
@media (max-width: 560px) {
  .login-card {
    padding: 28px 22px;
  }
  .content {
    padding: 25px 15px;
  }
  .content > header {
    align-items: flex-end;
  }
  .content > header h1 {
    font-size: 24px;
  }
  .metrics {
    gap: 9px;
  }
  .metrics article {
    padding: 15px;
  }
  .metrics strong {
    font-size: 25px;
  }
  .user-card dl {
    grid-template-columns: 1fr;
  }
  .lookup-form,
  .duration-form {
    grid-template-columns: 1fr;
  }
  .panel {
    padding: 17px;
  }
  .custom-range {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  }
  .custom-range button {
    grid-column: 1 / -1;
  }
}
</style>
