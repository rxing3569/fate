<script setup>
import { ref } from 'vue'

useHead({
  title: '聯繫我 | 江映澄命相',
  meta: [
    { name: 'description', content: '歡迎聯繫江映澄命相，諮詢紫微斗數、八字命理，或關注社群動態。' },
  ],
})

// Contact Form Logic
const formData = ref({
    name: '',
    email: '',
    message: '',
    type: '免費諮詢'
})

const isSubmitting = ref(false)
const statusMessage = ref({ text: '', type: '' }) // type: 'success' | 'error'

async function submitForm() {
    const { name, email, message, type } = formData.value
    if (!name || !email || !message) {
        alert('請填寫完整資訊')
        return
    }

    isSubmitting.value = true
    statusMessage.value = { text: '', type: '' }

    const WORKER_URL = "https://sendemail.sasuke01260616.workers.dev/"
    
    // Prepare data (worker expects this structure based on user request)
    const data = { name, email, message, type }

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            statusMessage.value = { text: "發送成功！我們會盡快聯絡您。", type: 'success' }
            // Reset form
            formData.value = { name: '', email: '', message: '' }
        } else {
            console.error(result);
            statusMessage.value = { text: "發送失敗，請稍後再試。", type: 'error' }
        }
    } catch (error) {
        console.error(error);
        statusMessage.value = { text: "發生錯誤，請檢查網路連線。", type: 'error' }
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="page-container">
        <section class="section-block contact-section">
            <div class="container-narrow">
                <div class="section-header">
                    <h2>聯繫我</h2>
                    <span class="eng-title">CONTACT ME</span>
                    <div class="ink-line"></div>
                </div>

                <div class="contact-wrapper glass">
                    <div class="social-links">
                         <h3>追蹤社群</h3>
                         <div class="icons">
                            <a href="https://www.instagram.com/jiang.yin.cheng/" target="_blank" class="social-btn instagram" title="Instagram">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                <span>Instagram</span>
                            </a>
                            <a href="https://www.threads.net/@jiang.yin.cheng" target="_blank" class="social-btn threads" title="Threads">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12a7 7 0 1 1-14 0c0 4.969 2.508 8.423 7 9.5 2.5.6 5.5.6 7-3.5"></path><path d="M9 12a3 3 0 1 1 5.92-.88"></path></svg>
                                <span>Threads</span>
                            </a>
                         </div>
                         <p class="contact-note">歡迎追蹤我的社群，獲取最新命理資訊與生活分享，或有問題也可以直接私訊與我聯繫。</p>
                    </div>

                    <div class="contact-form">
                        <h3>免費諮詢</h3>
                        <form @submit.prevent="submitForm">
                            <div class="form-group">
                                <label for="name">名字 / 暱稱</label>
                                <input type="text" id="name" v-model="formData.name" placeholder="您的稱呼" required :disabled="isSubmitting">
                            </div>
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" v-model="formData.email" placeholder="您的電子信箱" required :disabled="isSubmitting">
                            </div>
                            <div class="form-group">
                                <label for="message">問題 / 訊息</label>
                                <textarea id="message" v-model="formData.message" rows="4" placeholder="請簡述您的需求或疑問..." required :disabled="isSubmitting"></textarea>
                            </div>
                            
                            <button type="submit" class="submit-btn" :disabled="isSubmitting">
                                {{ isSubmitting ? '發送中...' : '送出訊息' }}
                            </button>
                            
                            <p v-if="statusMessage.text" class="status-msg" :class="statusMessage.type">
                                {{ statusMessage.text }}
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped>
.page-container {
    padding-top: 4rem;
    min-height: 80vh;
    animation: fadeIn 0.8s ease-out;
}

.container-narrow { max-width: 900px; margin: 0 auto; padding: 6rem 2rem 2rem; }
.section-header { text-align: center; margin-bottom: 4rem; }
h2 { font-size: 2.5rem; color: #2c2c2c; margin-bottom: 0.5rem; }
.eng-title { font-size: 0.9rem; color: #81C7D4; letter-spacing: 4px; font-weight: bold; }
.ink-line { width: 60px; height: 3px; background: #81C7D4; margin: 1.5rem auto 0; border-radius: 2px; }

/* --- Contact Section --- */
.contact-wrapper { display: flex; gap: 3rem; background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); padding: 3rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
.social-links { flex: 1; border-right: 1px solid #eee; padding-right: 2rem; display: flex; flex-direction: column; }
.contact-form { flex: 1.5; padding-left: 1rem; }

.social-links h3, .contact-form h3 { font-size: 1.5rem; color: #2c2c2c; margin-bottom: 1.5rem; }
.icons { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }
.social-btn { display: flex; align-items: center; gap: 1rem; padding: 0.8rem 1.5rem; border-radius: 8px; font-weight: bold; text-decoration: none; transition: all 0.3s; border: 1px solid transparent; }
.social-btn svg { width: 24px; height: 24px; }
.social-btn.instagram { background: #fee2e2; color: #e1306c; }
.social-btn.instagram:hover { background: #e1306c; color: white; }
.social-btn.threads { background: #f3f4f6; color: #000; }
.social-btn.threads:hover { background: #000; color: white; }
.contact-note { font-size: 0.9rem; color: #666; line-height: 1.6; margin-top: auto; }

.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; font-size: 0.9rem; color: #555; margin-bottom: 0.5rem; font-weight: bold; }
.form-group input, .form-group textarea { width: 100%; padding: 0.8rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; background: rgba(255,255,255,0.8); transition: border 0.3s; resize: none; }
.form-group input:focus, .form-group textarea:focus { border-color: #81C7D4; outline: none; background: white; }

.submit-btn { width: 100%; padding: 1rem; background: #81C7D4; color: white; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: all 0.3s; }
.submit-btn:hover { background: #60a5fa; box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3); }
.submit-btn:disabled { background: #ccc; cursor: not-allowed; }

.status-msg { margin-top: 1rem; text-align: center; font-weight: bold; font-size: 0.95rem; }
.status-msg.success { color: green; }
.status-msg.error { color: red; }

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
    .contact-wrapper { flex-direction: column; padding: 1.5rem; }
    .social-links { border-right: none; border-bottom: 1px solid #eee; padding-right: 0; padding-bottom: 2rem; }
    .contact-form { padding-left: 0; }
}
</style>
