<script setup lang="ts">
type GoogleCredentialResponse = { credential?: string };
type GoogleIdentityAPI = {
  initialize(options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(
    element: HTMLElement,
    options: Record<string, string | number>,
  ): void;
  cancel(): void;
};
declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentityAPI } };
  }
}

const auth = useAuthStore();
const config = useRuntimeConfig();
const route = useRoute();
const email = ref("");
const code = ref("");
const sent = ref(false);
const message = ref("");
const googleButton = ref<HTMLElement | null>(null);
const googleReady = ref(false);
const googleSetupError = ref("");

const redirectAfterLogin = computed(() => {
  const redirect = Array.isArray(route.query.redirect)
    ? route.query.redirect[0]
    : route.query.redirect;

  if (
    typeof redirect !== "string" ||
    !redirect.startsWith("/") ||
    redirect.startsWith("//") ||
    redirect.startsWith("/login")
  ) {
    return "/";
  }

  return redirect;
});

async function finishLogin() {
  await navigateTo(redirectAfterLogin.value, { replace: true });
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-identity-services]",
    );
    const script = existing || document.createElement("script");
    const timeout = window.setTimeout(
      () => reject(new Error("Google 登入元件載入逾時")),
      10000,
    );
    const loaded = () => {
      window.clearTimeout(timeout);
      window.google?.accounts?.id
        ? resolve()
        : reject(new Error("Google 登入元件載入失敗"));
    };
    script.addEventListener("load", loaded, { once: true });
    script.addEventListener(
      "error",
      () => {
        window.clearTimeout(timeout);
        script.remove();
        reject(new Error("Google 登入元件載入失敗"));
      },
      { once: true },
    );
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client?hl=zh_TW";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentityServices = "true";
      document.head.appendChild(script);
    }
  });
}

async function handleGoogleCredential(response: GoogleCredentialResponse) {
  if (!response.credential || auth.loading) return;
  message.value = "";
  try {
    await auth.loginWithGoogleCredential(response.credential);
    await finishLogin();
  } catch {
    message.value = auth.error || "Google 登入失敗，請稍後再試";
  }
}

async function setupGoogleButton() {
  const clientId = String(config.public.googleWebClientId || "").trim();
  if (!clientId) {
    googleSetupError.value = "尚未設定 Google 網頁版登入 Client ID";
    return;
  }
  try {
    await loadGoogleIdentityServices();
    const api = window.google?.accounts?.id;
    const host = googleButton.value;
    if (!api || !host) throw new Error("Google 登入元件載入失敗");
    api.initialize({
      client_id: clientId,
      callback: (response) => {
        void handleGoogleCredential(response);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    host.replaceChildren();
    api.renderButton(host, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      logo_alignment: "left",
      locale: "zh_TW",
      width: Math.max(240, Math.floor(host.clientWidth)),
    });
    googleReady.value = true;
  } catch (error) {
    googleSetupError.value =
      error instanceof Error ? error.message : "Google 登入元件載入失敗";
  }
}

onMounted(() => {
  void setupGoogleButton();
});
onBeforeUnmount(() => window.google?.accounts?.id?.cancel());

async function requestCode() {
  message.value = "";
  try {
    await auth.requestEmailCode(email.value);
    sent.value = true;
    message.value = "驗證碼已寄送至您的信箱";
  } catch {
    message.value = auth.error || "驗證碼寄送失敗，請稍後再試";
  }
}
async function login() {
  try {
    await auth.loginWithEmail(email.value, code.value);
    await finishLogin();
  } catch {
    message.value = auth.error;
  }
}
</script>

<template>
  <AppPageLayout
    title="江映澄紫微"
    screen-class="login-screen"
    content-mode="centered"
    show-back
  >
    <main class="login-content">
      <h2>探索紫微，揭開命運的輪廓</h2>
      <form
        v-if="!sent"
        class="form-stack form-input"
        @submit.prevent="requestCode"
      >
        <div class="field">
          <label for="email">請輸入您的電子郵件以繼續</label
          ><input
            id="email"
            v-model.trim="email"
            class="input"
            type="email"
            autocomplete="email"
            placeholder="name@example.com"
            required
          />
        </div>
        <button class="app-button" type="submit" :disabled="auth.loading">
          {{ auth.loading ? "傳送中…" : "獲取驗證碼" }}
        </button>
        <div class="divider"><span>或使用以下方式登入</span></div>
        <div
          v-if="!googleSetupError"
          class="google-button-wrap app-button"
          :class="{ loading: auth.loading || !googleReady }"
          :aria-busy="!googleReady"
        >
          <div ref="googleButton" class="google-button-host" />
          <span class="google-button-label">
            <svg
              v-if="googleReady"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844c-.209 1.125-.843 2.078-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.615z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332C2.437 15.983 5.482 18 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.963 10.707A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.281-1.707V4.961H.956A9.003 9.003 0 0 0 0 9c0 1.45.347 2.824.956 4.039l3.007-2.332z"
              />
              <path
                fill="#EA4335"
                d="M9 3.579c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0 5.482 0 2.437 2.017.956 4.961l3.007 2.332C4.672 5.164 6.656 3.579 9 3.579z"
              />
            </svg>
            {{ googleReady ? "使用 Google 帳號登入" : "正在載入 Google 登入…" }}
          </span>
        </div>
        <button
          v-if="googleSetupError"
          class="google-fallback app-button"
          type="button"
          disabled
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844c-.209 1.125-.843 2.078-1.797 2.716v2.258h2.909c1.702-1.567 2.684-3.874 2.684-6.615z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332C2.437 15.983 5.482 18 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.963 10.707A5.41 5.41 0 0 1 3.682 9c0-.592.102-1.167.281-1.707V4.961H.956A9.003 9.003 0 0 0 0 9c0 1.45.347 2.824.956 4.039l3.007-2.332z"
            />
            <path
              fill="#EA4335"
              d="M9 3.579c1.321 0 2.507.454 3.441 1.346l2.581-2.581C13.464.892 11.426 0 9 0 5.482 0 2.437 2.017.956 4.961l3.007 2.332C4.672 5.164 6.656 3.579 9 3.579z"
            />
          </svg>
          使用 Google 帳號登入
        </button>
        <p v-if="googleSetupError" class="google-setup-error">
          {{ googleSetupError }}
        </p>
        <p class="terms">
          註冊/登入表示您同意我們的
          <NuxtLink to="/privacy-pwa">隱私權政策</NuxtLink>
        </p>
      </form>
      <form v-else class="form-stack" @submit.prevent="login">
        <p class="sent-note">
          驗證碼已寄送至<br /><strong>{{ email }}</strong>
        </p>
        <div class="field">
          <label for="code">請輸入六位數驗證碼</label
          ><input
            id="code"
            v-model.trim="code"
            class="input code-input"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            required
          />
        </div>
        <button
          class="app-button"
          type="submit"
          :disabled="code.length < 6 || auth.loading"
        >
          {{ auth.loading ? "登入中…" : "驗證並登入" }}
        </button>
        <button
          class="text-button"
          type="button"
          @click="
            sent = false;
            code = '';
          "
        >
          更換電子郵件
        </button>
      </form>
      <p v-if="message || auth.error" class="status-message">
        {{ auth.error || message }}
      </p>
    </main>
  </AppPageLayout>
</template>

<style scoped>
.login-content {
  width: min(100% - 60px, 480px);
  margin: 0 auto;
  padding: 22px 0 44px;
}
.login-content h2 {
  margin: 0 0 34px;
  text-align: center;
  font-size: 24px;
  line-height: 1.3;
}
.divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 8px 0;
  color: #888;
  font-size: 12px;
}
.divider::before,
.divider::after {
  content: "";
  height: 1px;
  flex: 1;
  background: #ddd;
}
.google-button-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  overflow: hidden;
  cursor: pointer;
}
.google-button-wrap.app-button,
.google-fallback.app-button {
  border-color: #dadce0;
  background: #fff;
  box-shadow: none;
  color: #3c4043;
  font-weight: 600;
}
.google-button-wrap.app-button::before,
.google-fallback.app-button::before {
  display: none;
}
.google-button-wrap.loading {
  pointer-events: none;
}
.google-button-wrap.loading .google-button-host {
  opacity: 0;
}
.google-button-host {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.001;
  transition: opacity 0.18s;
}
.google-button-host :deep(iframe) {
  display: block;
  width: 100% !important;
  max-width: 100%;
}
.google-button-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  pointer-events: none;
}
.google-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
}
.google-setup-error {
  margin: 0;
  color: var(--cinnabar);
  font-size: 12px;
  text-align: center;
}
.terms {
  color: rgba(36, 87, 90, 0.56);
  font-size: 12px;
  text-align: center;
}
.terms a {
  font-weight: 800;
  text-decoration: underline;
}
.sent-note {
  margin: 0 0 10px;
  text-align: center;
  color: var(--text-soft);
  line-height: 1.6;
}
.code-input {
  text-align: center;
  font-size: 24px;
  letter-spacing: 8px !important;
}
.text-button {
  border: 0;
  background: transparent;
  color: var(--mountain);
  font-weight: 800;
}
.status-message {
  text-align: center;
  color: var(--cinnabar);
  font-size: 13px;
}
.form-input {
  gap: 16px;
}
</style>
