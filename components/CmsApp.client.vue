<script setup lang="ts">
import { CmsApiError, cmsApi } from "~/utils/cms-api";

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
    average_order_value: number;
    trend: { date: string; amount: number }[];
  };
  recent_grants: {
    operation_id: string;
    email: string;
    days: number;
    expires_at: string;
    created_at: string;
  }[];
  recent_users: { email: string; name: string; created_at: string }[];
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
  period = ref(30),
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
const chartWidth = 680,
  chartHeight = 250,
  chartLeft = 48,
  chartTop = 18,
  chartBottom = 34;
const registrationMax = computed(() =>
  Math.max(
    0,
    ...(dashboard.value?.registration_trend.map((x) => x.count) || [0]),
  ),
);
const registrationUnit = computed(() =>
  registrationMax.value <= 100
    ? 10
    : registrationMax.value <= 1000
      ? 100
      : 1000,
);
const registrationScaleMax = computed(() =>
  Math.max(
    registrationUnit.value,
    Math.ceil(registrationMax.value / registrationUnit.value) *
      registrationUnit.value,
  ),
);
const registrationTicks = computed(() =>
  Array.from(
    { length: registrationScaleMax.value / registrationUnit.value + 1 },
    (_, index) => index * registrationUnit.value,
  ),
);
const registrationPoints = computed(() => {
  const values = dashboard.value?.registration_trend || [];
  const usableHeight = chartHeight - chartTop - chartBottom;
  return values
    .map(
      (item, index) =>
        `${chartLeft + (values.length === 1 ? 0 : (index * (chartWidth - chartLeft - 14)) / (values.length - 1))},${chartTop + usableHeight - (item.count / registrationScaleMax.value) * usableHeight}`,
    )
    .join(" ");
});
const registrationLabels = computed(() => {
  const values = dashboard.value?.registration_trend || [];
  if (!values.length) return [];
  return [
    ...new Set([0, Math.floor((values.length - 1) / 2), values.length - 1]),
  ].map((index) => ({
    date: values[index].date.slice(5),
    x:
      chartLeft +
      (values.length === 1
        ? 0
        : (index * (chartWidth - chartLeft - 14)) / (values.length - 1)),
  }));
});
const usageMax = computed(() =>
  Math.max(1, ...(dashboard.value?.usage.map((x) => x.count) || [1])),
);
const currency = (value: number) =>
  new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);

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
  loading.value = true;
  error.value = "";
  try {
    dashboard.value = await cmsApi<Dashboard>(
      `/dashboard?days=${period.value}`,
    );
  } catch (e) {
    handleError(e);
  } finally {
    loading.value = false;
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
    <aside>
      <div>
        <p class="eyebrow">FATEJYC</p>
        <h2>CMS</h2>
      </div>
      <nav>
        <NuxtLink to="/cms/" :class="{ active: props.page === 'dashboard' }"
          >數據總覽</NuxtLink
        ><NuxtLink to="/cms/members/">會員管理</NuxtLink
        ><NuxtLink to="/cms/orders/">訂單管理</NuxtLink
        ><NuxtLink to="/cms/issues/">問題回報</NuxtLink>
      </nav>
      <div class="admin">
        <small>目前登入</small><span>{{ adminEmail }}</span
        ><button class="text-btn" @click="logout">登出</button>
      </div>
    </aside>
    <div class="content">
      <header>
        <div>
          <p class="eyebrow">管理中心</p>
          <h1>
            {{ props.page === "dashboard" ? "營運儀表板" : "Premium 管理" }}
          </h1>
        </div>
        <button
          v-if="props.page === 'dashboard'"
          class="secondary"
          :disabled="loading"
          @click="loadDashboard"
        >
          重新整理
        </button>
      </header>
      <p v-if="error" class="alert error">{{ error }}</p>
      <p v-if="notice" class="alert success">{{ notice }}</p>
      <section v-if="props.page === 'dashboard' && dashboard">
        <div class="metrics">
          <article>
            <span>註冊總人數</span
            ><strong>{{ dashboard.summary.total_users }}</strong>
          </article>
          <article>
            <span>Premium 人數</span
            ><strong>{{ dashboard.summary.premium_users }}</strong
            ><small>{{ dashboard.summary.premium_rate.toFixed(1) }}%</small>
          </article>
          <article>
            <span>今日註冊</span
            ><strong>{{ dashboard.summary.registrations.today }}</strong>
          </article>
          <article>
            <span>近 30 日註冊</span
            ><strong>{{ dashboard.summary.registrations.thirty_days }}</strong>
          </article>
        </div>
        <article class="panel chart-panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">REGISTRATIONS</p>
              <h3>註冊趨勢</h3>
              <small class="axis-note"
                >X 軸：日期　Y 軸：註冊人數（每格
                {{ registrationUnit }} 人）</small
              >
            </div>
            <select v-model="period" @change="loadDashboard">
              <option :value="7">近 7 日</option>
              <option :value="30">近 30 日</option>
            </select>
          </div>
          <div class="line-chart">
            <svg
              :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
              role="img"
              aria-label="每日註冊人數折線圖"
            >
              <g class="grid-lines">
                <line
                  v-for="tick in registrationTicks"
                  :key="tick"
                  :x1="chartLeft"
                  :x2="chartWidth - 14"
                  :y1="
                    chartTop +
                    (chartHeight - chartTop - chartBottom) *
                      (1 - tick / registrationScaleMax)
                  "
                  :y2="
                    chartTop +
                    (chartHeight - chartTop - chartBottom) *
                      (1 - tick / registrationScaleMax)
                  "
                />
                <text
                  v-for="tick in registrationTicks"
                  :key="`y${tick}`"
                  x="40"
                  :y="
                    chartTop +
                    (chartHeight - chartTop - chartBottom) *
                      (1 - tick / registrationScaleMax) +
                    4
                  "
                  text-anchor="end"
                >
                  {{ tick }}
                </text>
              </g>
              <polyline
                class="trend-area"
                :points="`${chartLeft},${chartHeight - chartBottom} ${registrationPoints} ${chartWidth - 14},${chartHeight - chartBottom}`"
              />
              <polyline class="trend-line" :points="registrationPoints" />
              <g v-for="label in registrationLabels" :key="label.date">
                <line
                  :x1="label.x"
                  :x2="label.x"
                  :y1="chartHeight - chartBottom"
                  :y2="chartHeight - chartBottom + 5"
                />
                <text :x="label.x" :y="chartHeight - 8" text-anchor="middle">
                  {{ label.date }}
                </text>
              </g>
            </svg>
          </div>
        </article>
        <div class="grid">
          <article class="panel">
            <p class="eyebrow">ANALYSIS USAGE</p>
            <h3>解析使用統計</h3>
            <small class="axis-note">近 {{ period }} 日啟動次數</small>
            <div class="usage-chart">
              <div
                v-for="item in dashboard.usage"
                :key="item.type"
                class="usage-column"
              >
                <b>{{ item.count }}</b
                ><i
                  :style="{
                    height: `${Math.max(4, (item.count / usageMax) * 150)}px`,
                  }"
                /><span>{{ usageName[item.type] || item.type }}</span>
              </div>
              <p v-if="!dashboard.usage.length" class="muted">
                此期間尚無解析紀錄
              </p>
            </div>
          </article>
          <article class="panel">
            <p class="eyebrow">WEB REVENUE</p>
            <h3>Web 消費金額</h3>
            <div class="revenue-metrics">
              <p>
                <span>近 {{ period }} 日營收</span
                ><strong>{{
                  currency(dashboard.web_revenue.period_revenue)
                }}</strong>
              </p>
              <p>
                <span>累積營收</span
                ><strong>{{
                  currency(dashboard.web_revenue.all_time_revenue)
                }}</strong>
              </p>
              <p>
                <span>成功交易</span
                ><strong
                  >{{ dashboard.web_revenue.paid_transactions }} 筆</strong
                >
              </p>
              <p>
                <span>平均客單價</span
                ><strong>{{
                  currency(dashboard.web_revenue.average_order_value)
                }}</strong>
              </p>
              <p>
                <span>失敗交易</span
                ><strong
                  >{{ dashboard.web_revenue.failed_transactions }} 筆</strong
                >
              </p>
            </div>
          </article>
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
      <section
        v-if="props.page === 'dashboard' && dashboard?.recent_grants.length"
        class="panel"
      >
        <p class="eyebrow">AUDIT</p>
        <h2>近期手動開通</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>增加天數</th>
                <th>開通時間</th>
                <th>到期時間</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in dashboard.recent_grants" :key="g.operation_id">
                <td>{{ g.email }}</td>
                <td>{{ g.days }} 天</td>
                <td>{{ format(g.created_at) }}</td>
                <td>{{ format(g.expires_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section
        v-if="props.page === 'dashboard' && dashboard?.recent_users.length"
        class="panel"
      >
        <p class="eyebrow">NEW USERS</p>
        <h2>近期註冊會員</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>名稱</th>
                <th>註冊時間</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in dashboard.recent_users" :key="item.email">
                <td>{{ item.email }}</td>
                <td>{{ item.name || "—" }}</td>
                <td>{{ format(item.created_at) }}</td>
              </tr>
            </tbody>
          </table>
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
aside {
  position: sticky;
  top: 0;
  height: 100dvh;
  padding: 30px 24px;
  background: #123e37;
  color: #fff;
  display: flex;
  flex-direction: column;
}
aside h2 {
  margin: 0;
  font-size: 28px;
}
nav {
  display: grid;
  gap: 8px;
  margin-top: 55px;
}
nav a {
  padding: 11px 12px;
  color: #d8ebe6;
  text-decoration: none;
  border-radius: 9px;
}
nav a:hover {
  background: #ffffff12;
}
.admin {
  margin-top: auto;
  display: grid;
  gap: 5px;
  overflow-wrap: anywhere;
}
.admin small {
  color: #9cc1b8;
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
.grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
.panel-head,
.user-head,
.grant-row,
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.panel-head select {
  width: auto;
}
.bars {
  display: grid;
  gap: 8px;
  margin-top: 20px;
}
.bar-row {
  display: grid;
  grid-template-columns: 42px 1fr 26px;
  gap: 8px;
  align-items: center;
}
.bar-row i {
  height: 8px;
  background: #29a287;
  border-radius: 5px;
}
.bar-row b {
  text-align: right;
  font-size: 12px;
}
.source-list p {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid #edf1ef;
  padding: 10px 0;
  margin: 0;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.chips span,
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
nav a.active {
  background: #ffffff18;
  color: #fff;
}
.axis-note {
  color: #81908d;
}
.chart-panel {
  margin-top: 16px;
}
.line-chart {
  width: 100%;
  overflow-x: auto;
  margin-top: 14px;
}
.line-chart svg {
  display: block;
  width: 100%;
  min-width: 500px;
}
.grid-lines line {
  stroke: #dfe8e5;
  stroke-width: 1;
}
.grid-lines text,
.line-chart g text {
  fill: #738480;
  font-size: 11px;
}
.trend-area {
  fill: #36a58a18;
  stroke: none;
}
.trend-line {
  fill: none;
  stroke: #16806c;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.line-chart g > line {
  stroke: #aebdb9;
}
.usage-chart {
  height: 210px;
  display: flex;
  align-items: flex-end;
  gap: clamp(8px, 2vw, 24px);
  padding: 18px 4px 0;
  border-bottom: 1px solid #cad8d4;
  overflow-x: auto;
}
.usage-column {
  height: 100%;
  min-width: 58px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
}
.usage-column i {
  display: block;
  width: min(48px, 70%);
  background: linear-gradient(#34a98d, #176b5b);
  border-radius: 7px 7px 0 0;
}
.usage-column b {
  font-size: 12px;
}
.usage-column span {
  min-height: 34px;
  font-size: 11px;
  text-align: center;
  color: #657873;
}
.revenue-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 18px;
}
.revenue-metrics p {
  margin: 0;
  padding: 13px;
  background: #f3f7f5;
  border-radius: 10px;
}
.revenue-metrics p:first-child {
  grid-column: 1/-1;
  background: #e2f2ed;
}
.revenue-metrics span {
  display: block;
  color: #71827e;
  font-size: 12px;
}
.revenue-metrics strong {
  display: block;
  margin-top: 5px;
  font-size: 19px;
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
  aside {
    position: static;
    height: auto;
    flex-wrap: wrap;
    flex-direction: row;
    align-items: center;
    gap: 14px;
    padding: 16px 20px;
  }
  aside nav {
    order: 3;
    width: 100%;
    display: flex;
    margin: 0;
  }
  aside nav a {
    flex: 1;
    text-align: center;
  }
  .admin {
    margin: 0 0 0 auto;
    max-width: 55%;
    font-size: 12px;
  }
  .metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .user-card dl {
    grid-template-columns: repeat(2, 1fr);
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
  .revenue-metrics {
    grid-template-columns: 1fr;
  }
  .revenue-metrics p:first-child {
    grid-column: auto;
  }
  .panel {
    padding: 17px;
  }
  aside h2 {
    font-size: 20px;
  }
  .admin small {
    display: none;
  }
}
</style>
