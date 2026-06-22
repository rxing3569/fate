<script setup>
import { ref } from 'vue'

const lang = ref('zh')

useHead({
  title: '隱私權政策 | 江映澄命相',
  meta: [
    { name: 'description', content: '江映澄命相行動應用程式之隱私權政策。本政策說明我們如何收集、使用、揭露及保護您的個人資訊。' }
  ]
})
</script>

<template>
  <div class="privacy-page-container">
    <div class="privacy-card">
      
      <!-- 右上角語言切換按鈕 -->
      <div class="lang-switch-wrapper">
        <button 
          :class="['btn-lang', { active: lang === 'zh' }]" 
          @click="lang = 'zh'"
        >
          中
        </button>
        <button 
          :class="['btn-lang', { active: lang === 'en' }]" 
          @click="lang = 'en'"
        >
          EN
        </button>
      </div>

      <!-- 頁面標題與生效日期 -->
      <h1 class="policy-title">{{ lang === 'zh' ? '隱私權政策' : 'Privacy Policy' }}</h1>
      <div class="effective-date">
        {{ lang === 'zh' ? '生效日期：2026-06-22' : 'Effective Date: 2026-06-22' }}
      </div>
      
      <hr class="divider" />

      <!-- 中文版隱私權政策 -->
      <div v-if="lang === 'zh'" class="policy-content">
        <p>
          本隱私權政策適用於 
          <span class="fill-blank">江映澄紫微-AI 紫微斗數</span> 
          行動應用程式（以下簡稱「本應用程式」）以及由 
          <span class="fill-blank">R.Xing</span>
          （以下簡稱「我們」）所提供之相關服務。我們非常重視您的個人隱私，並致力於保護您的個人資料。
        </p>
        
        <p>本政策說明了我們如何收集、使用、揭露及保護您的個人資訊，請您在使用本應用程式前仔細閱讀。如果您不同意本隱私權政策的任何內容，請立即停止使用本應用程式。</p>

        <h2>1. 我們收集的資訊</h2>
        <p>為了提供、維護與改善本應用程式的服務，我們可能會在您使用過程中收集以下資訊：</p>
        
        <ul>
          <li>
            <strong>個人帳戶資訊</strong>：當您註冊或使用本應用程式時（例如透過 Google 登入或 Apple 登入），我們可能會收集您的電子郵件地址及基本個人檔案資訊。
          </li>

          <li>
            <strong>交易與付款紀錄</strong>：當您在本應用程式內購買點數或訂閱服務時，所有的交易與付款程序皆是透過第三方金流平台（Apple App Store / Google Play / RevenueCat）安全處理。我們僅會收集交易產生的收據 ID、訂閱狀態、購買項目與交易時間，我們<strong>絕對不會</strong>直接接觸、收集或儲存您的信用卡號、銀行帳戶等敏感支付資訊。
          </li>

          <li>
            <strong>裝置與使用數據</strong>：我們可能會自動收集您的裝置型號、作業系統版本、IP 位址、裝置唯一識別碼、App 崩潰紀錄（Crash Logs）、使用時間及點擊紀錄等，用於優化系統效能與安全性。
          </li>
        </ul>

        <h2>2. 資訊的使用方式</h2>
        <p>We 收集的資訊將用於以下目的：</p>
        <ul>
          <li>運作、提供及維護本應用程式的各項功能與核心服務。</li>
          <li>驗證您的付款收據、處理點數購買、以及管理您的訂閱狀態與權益。</li>
          <li>改善與優化我們的產品與服務，提升用戶體驗。</li>
          <li>進行內部統計、數據分析與系統錯誤偵測。</li>
          <li>解答您的客服諮詢、技術支援或與您聯繫。</li>
        </ul>

        <h2>3. 資訊的分享與揭露</h2>
        <p>我們不會將您的個人資訊出售、出租或分享給無關的第三方，除非符合以下情況：</p>
        <ul>
          <li>獲得您的明確書面同意。</li>
          <li>符合法律要求：因應法律程序、法院命令、政府機關要求或為履行法律義務。</li>
          
          <li>
            <strong>第三方服務提供商 (SDK)</strong>：本應用程式整合了第三方的軟體開發套件 (SDK) 以提供特定功能。這些第三方可能根據其自身的隱私權政策收集您的裝置與使用數據。我們使用的第三方服務包括：
            <ul class="sub-list">
              <li><strong>Sign in with Apple (Apple 登入)</strong>：提供快速、安全的第三方帳號登入服務。隱私權政策：<a href="https://www.apple.com/legal/privacy/tzh/" target="_blank" rel="noopener">Apple 隱私權政策</a></li>
              <li><strong>Google Sign-In (Google 登入)</strong>：提供第三方帳號快速登入服務。隱私權政策：<a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google 隱私權政策</a></li>
              <li><strong>RevenueCat</strong>：用於驗證應用程式內購買、管理訂閱狀態與付費權益。隱私權政策：<a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener">RevenueCat 隱私權政策</a></li>
            </ul>
          </li>
        </ul>

        <h2>4. 資料保留與安全</h2>
        <ul>
          <li>我們將在提供本服務所必須的期間內保留您的個人資料，或在符合適用法律規定的時間內保留。</li>
          <li>我們採用符合行業標準的安全防護措施（如傳輸層安全協議 TLS/SSL 加密、限制資料存取等）來保護您的個人資料免遭未經授權的存取、修改或洩漏。</li>
        </ul>

        <h2>5. 用戶權利與帳號刪除</h2>
        <p>您對您的個人資料擁有以下權利，包括要求查詢、修正、限制處理或刪除。</p>
        <ul>
          <li>
            <strong>刪除帳號與資料之權利</strong>：我們提供您隨時申請刪除帳號與相關個人資料的權利。您可以透過以下管道提出申請：
            <div class="deletion-box">
              <strong>申請途徑：</strong>
              <span>您可以直接在 App 內點選「會員中心」->「刪除帳號」按鈕，即可立即完成帳號刪除與所有個人資料的清理。</span>
            </div>
          </li>
          <li>一旦收到您的申請，我們將在合理時間內（通常於 30 天內）永久刪除或去識別化您的所有相關個人資料，除非法律要求我們保留特定數據（例如稅務或交易收據紀錄）。</li>
        </ul>

        <h2>6. 兒童隱私保護</h2>
        <p>我們的服務不針對 13 歲（或您所在國家規定的兒童年齡限制，例如歐盟為 16 歲）以下的兒童。我們不會在知情的情況下收集兒童的個人資料。若您發現您的孩子在未經您的同意下向我們提供了個人資料，請立即與我們聯絡，我們將會儘速採取步驟刪除該等資訊。</p>

        <h2>7. 隱私權政策的修訂</h2>
        <p>我們可能會不時更新本隱私權政策。任何修改將於此頁面公佈，並更新政策頂部的「生效日期」。建議您定期查看本政策以獲取最新資訊。</p>

        <h2>8. 聯絡我們</h2>
        <p>如果您對本隱私權政策有任何疑問、建議，或希望行使您的隱私權利，請與我們聯絡：</p>
        <ul>
          <li><strong>電子郵件：</strong> <span class="fill-blank">r.xing.3569@gmail.com</span></li>
          <li><strong>開發者：</strong> <span class="fill-blank">R.Xing</span></li>
        </ul>
      </div>

      <!-- 英文版隱私權政策 -->
      <div v-else class="policy-content">
        <p>
          This Privacy Policy applies to the 
          <span class="fill-blank">江映澄紫微-AI 紫微斗數</span> 
          mobile application (hereinafter referred to as "the App") and the services provided by 
          <span class="fill-blank">R.Xing</span>
          (hereinafter referred to as "we", "us", or "our"). We take your privacy very seriously and are committed to protecting your personal data.
        </p>
        
        <p>Please read this Privacy Policy carefully before using the App to understand how we collect, use, disclose, and protect your information. If you do not agree with any terms of this Privacy Policy, please stop using the App immediately.</p>

        <h2>1. Information Collection</h2>
        <p>To provide, maintain, and improve our services, we may collect the following types of information when you use the App:</p>
        
        <ul>
          <li>
            <strong>Personal Account Information</strong>: When you register or use the App (such as logging in via Google or Apple Sign-In), we may collect your email address and basic profile information.
          </li>

          <li>
            <strong>Transaction and Payment History</strong>: When you purchase points or subscribe to services within the App, all transaction and payment processes are securely handled by third-party payment platforms (Apple App Store / Google Play / RevenueCat). We only collect receipt IDs, subscription statuses, purchased items, and transaction times generated by the transactions. We <strong>never</strong> directly access, collect, or store your sensitive payment information such as credit card numbers or bank accounts.
          </li>

          <li>
            <strong>Device and Usage Data</strong>: We may automatically collect information about your device, including device model, operating system version, IP address, unique device identifiers, App crash logs (Crash Logs), usage times, and click logs to optimize system performance and security.
          </li>
        </ul>

        <h2>2. Use of Information</h2>
        <p>We use the collected information for the following purposes:</p>
        <ul>
          <li>To operate, provide, and maintain the App's features and core services.</li>
          <li>To verify your payment receipts, process point purchases, and manage your subscription status and benefits.</li>
          <li>To improve, optimize, and personalize our products and services, enhancing user experience.</li>
          <li>For internal statistics, data analysis, and system error troubleshooting.</li>
          <li>To respond to your support queries, technical support, or communicate with you.</li>
        </ul>

        <h2>3. Sharing and Disclosure of Information</h2>
        <p>We will not sell, rent, or share your personal data with unrelated third parties, except in the following circumstances:</p>
        <ul>
          <li>With your explicit written consent.</li>
          <li>To comply with legal processes, court orders, government requests, or legal obligations.</li>
          <li>
            <strong>Third-Party SDKs</strong>: The App integrates third-party Software Development Kits (SDKs) to offer specific functions. These third parties may collect device metrics under their own privacy policies. Our active third-party integrations include:
            <ul class="sub-list">
              <li><strong>Sign in with Apple</strong>: Provides secure, fast third-party account sign-in services. Privacy Policy: <a href="https://www.apple.com/legal/privacy/" target="_blank" rel="noopener">Apple Privacy Policy</a></li>
              <li><strong>Google Sign-In</strong>: Provides third-party account fast sign-in services. Privacy Policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google Privacy Policy</a></li>
              <li><strong>RevenueCat</strong>: Used to verify in-app purchases, manage subscription status and payment rights. Privacy Policy: <a href="https://www.revenuecat.com/privacy" target="_blank" rel="noopener">RevenueCat Privacy Policy</a></li>
            </ul>
          </li>
        </ul>

        <h2>4. Data Retention and Security</h2>
        <ul>
          <li>We retain your personal data only as long as necessary to fulfill the purposes outlined in this policy, or as required by applicable laws.</li>
          <li>We implement industry-standard security measures (such as TLS/SSL encryption and restricted data access) to protect your personal data from unauthorized access, loss, or disclosure.</li>
        </ul>

        <h2>5. User Rights and Account Deletion</h2>
        <p>You hold rights regarding your personal data, including the right to access, correct, restrict processing, or request deletion.</p>
        <ul>
          <li>
            <strong>Right to Delete Account & Data</strong>: We provide you with the right to delete your account and associated personal data at any time. You can apply via:
            <div class="deletion-box">
              <strong>Method:</strong>
              <span>You can tap the "Delete Account" button in the "Member Center" within the App to immediately complete the deletion of your account and purge all personal data.</span>
            </div>
          </li>
          <li>Once we receive your deletion request, we will delete or anonymize your personal information within a reasonable timeframe (typically within 30 days) unless legally required to retain specific data (such as tax or transaction record receipts).</li>
        </ul>

        <h2>6. Children's Privacy</h2>
        <p>Our services are not intended for children under 13 (or the child age threshold specified by your local jurisdiction, such as 16 under GDPR). We do not knowingly collect personal data from children. If you find that your child has provided personal information without your consent, please contact us immediately, and we will take prompt steps to purge such data.</p>

        <h2>7. Changes to This Privacy Policy</h2>
        <p>We may update our Privacy Policy from time to time. Any changes will be posted on this page with the updated "Effective Date". We recommend reviewing this policy periodically.</p>

        <h2>8. Contact Us</h2>
        <p>If you have any questions or feedback regarding this Privacy Policy, please contact us:</p>
        <ul>
          <li><strong>Email:</strong> <span class="fill-blank">r.xing.3569@gmail.com</span></li>
          <li><strong>Developer:</strong> <span class="fill-blank">R.Xing</span></li>
        </ul>
      </div>

    </div>
  </div>
</template>

<style scoped>
.privacy-page-container {
  padding: 8rem 2rem 6rem;
  background: radial-gradient(circle at 10% 20%, rgba(129, 199, 212, 0.03) 0%, rgba(255, 255, 255, 0.4) 90%);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  font-family: 'Inter', 'Noto Serif TC', serif;
}

.privacy-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(93, 64, 55, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(93, 64, 55, 0.08);
  max-width: 800px;
  width: 100%;
  padding: 3.5rem;
  position: relative; /* 確保右上角定位生效 */
}

/* 語言切換按鈕 */
.lang-switch-wrapper {
  position: absolute;
  top: 2rem;
  right: 2.5rem;
  display: flex;
  background: #f5f5f4;
  border-radius: 20px;
  padding: 0.2rem;
  border: 1px solid #e7e5e4;
  z-index: 10;
}

.btn-lang {
  border: none;
  background: transparent;
  padding: 0.35rem 0.9rem;
  font-size: 0.85rem;
  font-weight: bold;
  color: #78716c;
  cursor: pointer;
  border-radius: 15px;
  transition: all 0.3s;
}

.btn-lang:hover {
  color: #5d4037;
}

.btn-lang.active {
  background: #ffffff;
  color: #5d4037;
  box-shadow: 0 2px 6px rgba(93, 64, 55, 0.08);
}

.policy-title {
  font-size: 2.2rem;
  color: #2c2c2c;
  margin: 1.5rem 0 0.8rem; /* 上方預留 1.5rem 以防遮擋切換按鈕 */
  font-family: 'Noto Serif TC', serif;
  font-weight: 700;
  text-align: center;
}

.effective-date {
  font-size: 0.95rem;
  color: #666;
  text-align: center;
  font-weight: 600;
  margin-bottom: 2rem;
}

.divider {
  border: 0;
  height: 1px;
  background: rgba(93, 64, 55, 0.15);
  margin: 0 0 2.5rem 0;
}

.policy-content {
  color: #333333;
  line-height: 1.8;
  font-size: 1.05rem;
}

.policy-content p {
  margin-bottom: 1.5rem;
  text-align: justify;
}

.policy-content h2 {
  font-size: 1.4rem;
  color: #4a3b32;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  font-weight: 700;
  border-left: 4px solid #81C7D4;
  padding-left: 0.8rem;
  line-height: 1.2;
}

.policy-content ul {
  padding-left: 1.5rem;
  margin-bottom: 1.5rem;
}

.policy-content li {
  margin-bottom: 1rem;
}

.policy-content ul.sub-list {
  margin-top: 0.8rem;
  padding-left: 1.2rem;
  list-style-type: circle;
}

.policy-content ul.sub-list li {
  margin-bottom: 0.6rem;
  font-size: 0.95rem;
}

.policy-content a {
  color: #2b7a8c;
  text-decoration: none;
  font-weight: 600;
  border-bottom: 1px solid rgba(129, 199, 212, 0.4);
  transition: all 0.3s;
}

.policy-content a:hover {
  color: #81C7D4;
  border-bottom-color: #81C7D4;
}

/* 填空樣式 */
.fill-blank {
  background: rgba(93, 64, 55, 0.03);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-weight: 600;
  color: #5d4037;
}

.deletion-box {
  background: #fafaf9;
  border: 1px solid #e7e5e4;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  margin-top: 0.6rem;
  display: inline-block;
  max-width: 100%;
}

@media (max-width: 768px) {
  .privacy-card {
    padding: 2rem 1.5rem;
    border-radius: 12px;
  }
  
  .lang-switch-wrapper {
    position: relative;
    top: auto;
    right: auto;
    margin: 0 auto 1.5rem;
    justify-content: center;
    max-width: 150px;
  }
  
  .policy-title {
    font-size: 1.8rem;
    margin: 0 0 0.8rem; /* 手機版重設 margin */
  }
  
  .policy-content h2 {
    font-size: 1.25rem;
  }
}
</style>
