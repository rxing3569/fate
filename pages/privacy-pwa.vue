<script setup lang="ts">
import { ShieldCheck } from "@lucide/vue";

const lang = ref<"zh" | "en">("zh");

useHead({
  title: "隱私權政策 | 江映澄紫微",
  meta: [
    {
      name: "description",
      content:
        "江映澄紫微 PWA 網站隱私權政策，說明個人資料、命盤資料、付款資訊與網站儲存機制。",
    },
  ],
});
</script>

<template>
  <AppPageLayout
    :title="lang === 'zh' ? '隱私權政策' : 'Privacy Policy'"
    screen-class="privacy-screen"
    show-back
  >

    <main class="privacy-content">
      <section class="policy-card glass">
        <div class="policy-heading">
          <span class="policy-icon"><ShieldCheck :size="27" /></span>
          <div>
            <small>JIANG YING CHENG ZI WEI</small>
            <h2>{{ lang === "zh" ? "隱私權政策" : "Privacy Policy" }}</h2>
            <p>
              {{
                lang === "zh"
                  ? "生效日期：2026 年 7 月 16 日"
                  : "Effective date: July 16, 2026"
              }}
            </p>
          </div>
          <div class="language-switch" role="group" aria-label="Language">
            <button
              :class="{ active: lang === 'zh' }"
              type="button"
              @click="lang = 'zh'"
            >
              中</button
            ><button
              :class="{ active: lang === 'en' }"
              type="button"
              @click="lang = 'en'"
            >
              EN
            </button>
          </div>
        </div>

        <article v-if="lang === 'zh'" class="policy-body">
          <p>
            本隱私權政策適用於「江映澄紫微」漸進式網頁應用程式及網站服務（以下稱「本服務」）。本政策說明我們在您使用本服務時，如何收集、使用、保存、分享及保護您的資料。若您不同意本政策，請停止使用本服務。
          </p>

          <h3>一、我們收集的資料</h3>
          <ul>
            <li>
              <strong>帳戶資料：</strong
              >包含電子郵件地址和您建立與管理時主動提供的資料。
            </li>
            <li>
              <strong>出生與命盤資料：</strong
              >包含出生日期、出生時間、生理性別、出生城市、經度及依此計算的命盤內容。
            </li>
            <li>
              <strong>服務內容：</strong>包含您選擇的解析類型、AI
              命盤解析結果、問題回報，以及維持服務連續性所需的歷史紀錄。
            </li>
            <li>
              <strong>交易資料：</strong
              >包含訂單編號、購買項目、付款狀態、付款時間、點數與會員額度異動紀錄。信用卡號、銀行帳戶等敏感付款資料由藍新金流處理，我們不會直接取得或保存完整卡號。
            </li>
            <li>
              <strong>技術與使用資料：</strong>包含 IP
              位址、瀏覽器類型、作業系統、裝置識別碼、存取時間、頁面操作、錯誤與安全紀錄。
            </li>
            <li>
              <strong>瀏覽器儲存資料：</strong
              >為維持登入、降低重複請求及保存操作進度，本服務會使用 Session
              Storage、Local Storage、Cookie、Cache Storage 與 Service
              Worker。登出時會清除與使用者相關的本機快取。
            </li>
          </ul>

          <h3>二、資料使用目的</h3>
          <ul>
            <li>建立及驗證帳戶、維持登入狀態與提供會員功能。</li>
            <li>
              建立紫微命盤、產生 AI 解析、保存完成的歷史結果及提供客服支援。
            </li>
            <li>處理點數、會員方案、額度及付款訂單。</li>
            <li>維護網站效能、資訊安全、錯誤診斷、防止詐欺與濫用。</li>
            <li>履行法律、稅務、會計或主管機關要求。</li>
          </ul>

          <h3>三、第三方服務</h3>
          <p>我們僅在提供服務所必要的範圍內，向受委託的服務提供者傳送資料：</p>
          <ul>
            <li>
              <strong>藍新金流：</strong
              >處理網站付款、交易驗證及付款結果通知。付款頁面所輸入的卡片或銀行資料，依藍新金流的安全措施及隱私政策處理。
            </li>
            <li>
              <strong>雲端及基礎設施服務：</strong
              >用於主機、資料庫、內容傳輸、備份、日誌與系統安全。
            </li>
            <li>
              <strong>AI 服務提供者：</strong
              >在產生命盤解析或回答問題所必要的範圍內處理提示內容。我們會盡量限制傳送可直接識別個人的資料。
            </li>
          </ul>
          <p>
            除非取得您的同意、為提供本服務所必要，或依法令及主管機關要求，我們不會出售或任意提供您的個人資料。
          </p>

          <h3>四、資料保存</h3>
          <ul>
            <li>帳戶與命盤資料於帳戶存續及提供服務所需期間保存。</li>
            <li>
              點數與會員額度異動明細以月份為單位保存最近一年；系統會在查詢時清除保存期限以前的資料。
            </li>
            <li>交易、稅務或爭議處理資料，可能依適用法律保存較長期間。</li>
            <li>
              帳戶刪除後，我們會在合理期間內刪除或去識別化資料，但依法必須保存的資料不在此限。
            </li>
          </ul>

          <h3>五、資料安全</h3>
          <p>
            我們採取 TLS
            加密傳輸、權限控管、身分驗證、存取限制、日誌監控與備份等合理措施保護資料。但網際網路服務無法保證絕對安全，請妥善保管登入憑證並避免與他人共用裝置登入。
          </p>

          <h3>六、您的權利</h3>
          <p>
            依適用法律，您可要求查詢、閱覽、取得副本、補充、更正、停止處理或刪除您的個人資料。您也可以在會員中心更新命盤資料、登出並清除本機使用者快取。若要刪除帳戶，請透過下方聯絡方式提出申請。
          </p>

          <h3>七、兒童隱私</h3>
          <p>
            本服務不以未滿 13
            歲兒童為主要服務對象。我們不會在知情下收集未取得法定代理人同意的兒童個人資料；如您認為我們誤收此類資料，請聯絡我們處理。
          </p>

          <h3>八、政策更新</h3>
          <p>
            我們可能因服務或法令變更調整本政策，並於本頁更新內容及生效日期。重大變更時，我們會以網站公告或其他適當方式通知。
          </p>

          <h3>九、聯絡我們</h3>
          <p>
            若您對本政策或個人資料權利有疑問，請聯絡：<a
              href="mailto:r.xing.3569@gmail.com"
              >r.xing.3569@gmail.com</a
            >。
          </p>
        </article>

        <article v-else class="policy-body en">
          <p>
            This Privacy Policy applies to the “Jiang Ying Cheng Zi Wei”
            progressive web application and website services (the “Service”). It
            explains how we collect, use, retain, disclose, and protect
            information when you use the Service. If you do not agree with this
            Policy, please stop using the Service.
          </p>

          <h3>1. Information We Collect</h3>
          <ul>
            <li>
              <strong>Account information:</strong>Your email address, and
              information you provide when creating or managing an account.
            </li>
            <li>
              <strong>Birth and chart information:</strong> Date and time of
              birth, biological sex, birth city, longitude, and Zi Wei chart
              data calculated from that information.
            </li>
            <li>
              <strong>Service content:</strong> Selected analysis types,
              completed AI chart readings, issue reports, and history required
              to provide continuity across sessions.
            </li>
            <li>
              <strong>Transaction information:</strong> Order identifiers,
              purchased products, payment status and time, points, and
              membership quota records. Sensitive payment details, such as full
              card or bank account numbers, are processed by NewebPay and are
              not directly collected or stored by us.
            </li>
            <li>
              <strong>Technical and usage information:</strong> IP address,
              browser, operating system, device identifier, access time,
              interactions, errors, and security logs.
            </li>
            <li>
              <strong>Browser storage:</strong> The Service uses Session
              Storage, Local Storage, cookies, Cache Storage, and a Service
              Worker to maintain sessions, reduce repeated requests, and
              preserve progress. User-related local caches are cleared when you
              sign out.
            </li>
          </ul>

          <h3>2. How We Use Information</h3>
          <ul>
            <li>
              To create and authenticate accounts, maintain sessions, and
              provide member features.
            </li>
            <li>
              To calculate Zi Wei charts, generate AI readings, retain completed
              results, and provide support.
            </li>
            <li>To process points, memberships, quotas, and payment orders.</li>
            <li>
              To operate, secure, diagnose, and improve the Service and prevent
              fraud or abuse.
            </li>
            <li>
              To comply with legal, tax, accounting, or regulatory obligations.
            </li>
          </ul>

          <h3>3. Third-Party Services</h3>
          <p>
            We disclose information to service providers only as reasonably
            necessary to operate the Service:
          </p>
          <ul>
            <li>
              <strong>NewebPay:</strong> Processes website payments, transaction
              verification, and payment result notifications. Card and bank
              information entered on payment pages is handled under NewebPay’s
              security measures and privacy terms.
            </li>
            <li>
              <strong>Cloud and infrastructure providers:</strong> Support
              hosting, databases, content delivery, backups, logs, and security.
            </li>
            <li>
              <strong>AI service providers:</strong> Process prompts necessary
              to generate chart readings or answers. We seek to limit directly
              identifying information sent for this purpose.
            </li>
          </ul>
          <p>
            We do not sell personal information or disclose it to unrelated
            parties unless you consent, disclosure is necessary to provide the
            Service, or disclosure is required by law.
          </p>

          <h3>4. Data Retention</h3>
          <ul>
            <li>
              Account and chart data is retained while the account remains
              active and as needed to provide the Service.
            </li>
            <li>
              Points and membership quota transaction details are retained for
              the latest twelve calendar months. Older records are removed when
              history is queried.
            </li>
            <li>
              Transaction, tax, accounting, and dispute records may be retained
              longer where required by law.
            </li>
            <li>
              After account deletion, information is deleted or anonymized
              within a reasonable period, except where retention is legally
              required.
            </li>
          </ul>

          <h3>5. Security</h3>
          <p>
            We use reasonable safeguards, including TLS encryption,
            authentication, access controls, restricted data access, monitoring,
            and backups. No Internet service can guarantee absolute security.
            Please protect your credentials and avoid signing in on shared
            devices.
          </p>

          <h3>6. Your Rights</h3>
          <p>
            Subject to applicable law, you may request access, a copy,
            correction, restriction, cessation of processing, or deletion of
            your personal information. You may update chart information in the
            Member Center and sign out to clear user-related local caches. To
            request account deletion, contact us below.
          </p>

          <h3>7. Children’s Privacy</h3>
          <p>
            The Service is not directed primarily to children under 13. We do
            not knowingly collect a child’s personal information without
            appropriate parental consent. Contact us if you believe such
            information was collected in error.
          </p>

          <h3>8. Changes to This Policy</h3>
          <p>
            We may update this Policy to reflect changes in the Service or
            applicable law. The revised content and effective date will be
            posted on this page. Material changes may also be announced through
            the website or another appropriate channel.
          </p>

          <h3>9. Contact Us</h3>
          <p>
            For questions about this Policy or your privacy rights, contact
            <a href="mailto:r.xing.3569@gmail.com">r.xing.3569@gmail.com</a>.
          </p>
        </article>
      </section>
    </main>
  </AppPageLayout>
</template>

<style scoped>
.privacy-content {
  padding: 18px 18px 120px;
}
.policy-card {
  max-width: 780px;
  margin: 0 auto;
  padding: 28px;
  border-radius: 30px;
  overflow: visible;
  color: var(--mountain);
}
.policy-heading {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding-bottom: 22px;
  border-bottom: 1px solid rgba(36, 87, 90, 0.12);
}
.policy-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: rgba(107, 166, 160, 0.16);
}
.policy-heading small {
  color: var(--tea);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
}
.policy-heading h2 {
  margin: 3px 0;
  font-family: "Noto Serif TC", serif;
  font-size: 25px;
}
.policy-heading p {
  margin: 0;
  color: var(--text-soft);
  font-size: 11px;
}
.language-switch {
  display: flex;
  padding: 3px;
  border-radius: 18px;
  background: rgba(36, 87, 90, 0.08);
}
.language-switch button {
  min-width: 38px;
  height: 34px;
  border: 0;
  border-radius: 15px;
  background: transparent;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 900;
}
.language-switch button.active {
  background: var(--mountain);
  color: #fff;
}
.policy-body {
  padding-top: 8px;
  font-size: 14px;
  line-height: 1.8;
}
.policy-body h3 {
  margin: 28px 0 8px;
  padding-left: 10px;
  border-left: 3px solid var(--jade);
  font-size: 18px;
}
.policy-body p {
  margin: 10px 0;
  color: rgba(36, 87, 90, 0.82);
}
.policy-body ul {
  margin: 8px 0;
  padding-left: 22px;
}
.policy-body li {
  margin: 7px 0;
  color: rgba(36, 87, 90, 0.82);
}
.policy-body strong {
  color: var(--mountain);
}
.policy-body a {
  color: var(--cinnabar);
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.policy-body.en {
  font-family: Inter, system-ui, sans-serif;
}
@media (max-width: 520px) {
  .privacy-content {
    padding: 10px 12px 100px;
  }
  .policy-card {
    padding: 20px 17px;
    border-radius: 24px;
  }
  .policy-heading {
    grid-template-columns: 44px 1fr;
    gap: 10px;
  }
  .policy-icon {
    width: 44px;
    height: 44px;
    border-radius: 15px;
  }
  .language-switch {
    grid-column: 1/-1;
    justify-self: end;
    margin-top: -2px;
  }
  .policy-heading h2 {
    font-size: 21px;
  }
  .policy-body {
    font-size: 13px;
  }
  .policy-body h3 {
    font-size: 16px;
  }
}
</style>
