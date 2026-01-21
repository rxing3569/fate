<script setup>
import { ref, defineProps, defineEmits, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  serviceTitle: String
})

const emit = defineEmits(['close'])

const formData = ref({
    name: '',
    email: '',
    metaID: '',
    message: '',
    type: '服務預約' // Default type for email subject/ categorization
})

// Watch serviceTitle to update service field
watch(() => props.serviceTitle, (newVal) => {
    if (newVal) {
        formData.value.service = newVal
    }
}, { immediate: true })

const isSubmitting = ref(false)
const statusMessage = ref({ text: '', type: '' })

async function submitForm() {
    const { name, email, metaID, message, type, } = formData.value
    
    // Basic validation
    if (!name) {
        alert('請填寫名字 / 暱稱')
        return
    }
    
    // Mutually exclusive / At least one required validation for Email vs Social ID
    if (!email && !metaID) {
        alert('Email 與 IG/Threads ID 請至少填寫一項')
        return
    }
    
    isSubmitting.value = true
    statusMessage.value = { text: '', type: '' }

    const WORKER_URL = "https://sendemail.sasuke01260616.workers.dev/"
    
    let finalMessage = message || ''

    const data = { 
        name, 
        email: email || 'no-email-provided', 
        message: finalMessage, 
        type,
        metaID,
        service: formData.value.service
    }

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            statusMessage.value = { text: "預約請求已發送！我們會盡快聯絡您。", type: 'success' }
            // Reset form
            formData.value = { name: '', email: '', metaID: '', message: '', type: formData.value.type, service: formData.value.service }
            // Close modal after short delay
            setTimeout(() => {
                closeModal()
                statusMessage.value = { text: '', type: '' }
            }, 2000)
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

function closeModal() {
    emit('close')
}
</script>

<template>
    <div v-if="visible" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content glass">
            <button class="close-btn" @click="closeModal">&times;</button>
            
            <h3>立即預約</h3>
            <p class="service-subtitle" v-if="serviceTitle">方案: {{ serviceTitle }}</p>

            <form @submit.prevent="submitForm">
                <div class="form-group">
                    <label for="modal-name">名字 / 暱稱 <span class="required">*</span></label>
                    <input type="text" id="modal-name" name="name" v-model="formData.name" placeholder="您的稱呼" required :disabled="isSubmitting" autocomplete="name">
                </div>
                
                <div class="form-row">
                    <div class="form-group half">
                        <label for="modal-email">Email</label>
                        <input type="email" id="modal-email" name="email" v-model="formData.email" placeholder="二擇一填寫" :disabled="isSubmitting" autocomplete="email">
                    </div>
                    <div class="form-group half">
                        <label for="modal-social">IG / Threads ID</label>
                        <input type="text" id="modal-social" name="social" v-model="formData.metaID" placeholder="二擇一填寫" :disabled="isSubmitting">
                    </div>
                </div>
                <p class="hint-text">* Email 與 社群 ID 請至少填寫其中一項，以便我們聯繫您。</p>

                <div class="form-group">
                    <label for="modal-message">備註 / 訊息</label>
                    <textarea id="modal-message" v-model="formData.message" rows="3" placeholder="想詢問的時間或其他需求..." :disabled="isSubmitting"></textarea>
                </div>
                
                <button type="submit" class="submit-btn" :disabled="isSubmitting">
                    {{ isSubmitting ? '發送預約...' : '確認送出' }}
                </button>
                
                <p v-if="statusMessage.text" class="status-msg" :class="statusMessage.type">
                    {{ statusMessage.text }}
                </p>
            </form>
        </div>
    </div>
</template>

<style scoped>
.modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex; justify-content: center; align-items: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
    animation: fadeIn 0.3s ease-out;
}

.modal-content {
    background: #fff;
    width: 90%; max-width: 500px;
    padding: 2.5rem;
    border-radius: 12px;
    position: relative;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: slideUp 0.3s ease-out;
}

.close-btn {
    position: absolute; top: 1rem; right: 1.5rem;
    font-size: 2rem; color: #999; background: none; border: none;
    cursor: pointer; transition: color 0.2s;
}
.close-btn:hover { color: #333; }

h3 { font-size: 1.8rem; color: #2c2c2c; margin-bottom: 0.5rem; text-align: center; }
.service-subtitle { text-align: center; color: #81C7D4; font-weight: bold; margin-bottom: 1.5rem; }

.form-group { margin-bottom: 1.2rem; }
.form-group label { display: block; font-size: 0.9rem; color: #555; margin-bottom: 0.5rem; font-weight: bold; }
.form-group input, .form-group textarea { width: 100%; padding: 0.8rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; transition: border 0.3s; }
.form-group input:focus, .form-group textarea:focus { border-color: #81C7D4; outline: none; }

.form-row { display: flex; gap: 1rem; }
.form-group.half { flex: 1; }

.required { color: red; }
.hint-text { font-size: 0.8rem; color: #888; margin-bottom: 1.5rem; margin-top: -0.5rem; }

.submit-btn { width: 100%; padding: 1rem; background: #81C7D4; color: white; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; transition: all 0.3s; }
.submit-btn:hover { background: #60a5fa; box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3); }
.submit-btn:disabled { background: #ccc; cursor: not-allowed; }

.status-msg { margin-top: 1rem; text-align: center; font-weight: bold; font-size: 0.95rem; }
.status-msg.success { color: green; }
.status-msg.error { color: red; }

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

@media (max-width: 600px) {
    .form-row { flex-direction: column; gap: 0; }
    .modal-content { padding: 2rem 1.5rem; }
}
</style>
