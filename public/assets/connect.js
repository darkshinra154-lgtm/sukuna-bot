/**
 * ═══════════════════════════════════════════════════════
 * 🔗 CONNECT SCRIPT | جافاسكريبت صفحة الربط
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * ═══════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', () => {
  const methodCards = document.querySelectorAll('.method-card');
  const pairForm = document.getElementById('pair-form');
  const qrForm = document.getElementById('qr-form');
  const resultSection = document.getElementById('result-section');
  const loading = document.getElementById('loading');
  const resultContent = document.getElementById('result-content');
  const errorMessage = document.getElementById('error-message');
  const generateBtn = document.getElementById('generate-btn');
  const qrGenerateBtn = document.getElementById('qr-generate-btn');
  const phoneInput = document.getElementById('phone-input');
  const copyBtn = document.getElementById('copy-btn');
  
  let currentMethod = 'pair';
  
  // ═══ اختيار طريقة الربط ═══
  methodCards.forEach(card => {
    card.addEventListener('click', () => {
      methodCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentMethod = card.dataset.method;
      
      if (currentMethod === 'pair') {
        pairForm.classList.remove('hidden');
        qrForm.classList.add('hidden');
      } else {
        pairForm.classList.add('hidden');
        qrForm.classList.remove('hidden');
      }
      
      // إخفاء النتيجة السابقة
      resultSection.classList.add('hidden');
    });
  });
  
  // ═══ توليد كود الربط ═══
  generateBtn.addEventListener('click', async () => {
    const phone = phoneInput.value.trim();
    
    if (!phone) {
      showToast('❌ من فضلك ادخل رقم الواتساب', 'error');
      return;
    }
    
    if (phone.length < 10) {
      showToast('❌ الرقم قصير جداً، تأكد من كود الدولة', 'error');
      return;
    }
    
    // إظهار التحميل
    resultSection.classList.remove('hidden');
    loading.classList.remove('hidden');
    resultContent.classList.add('hidden');
    errorMessage.classList.add('hidden');
    
    try {
      const response = await fetch(`/pair?number=${encodeURIComponent(phone)}`);
      const data = await response.json();
      
      loading.classList.add('hidden');
      
      if (data.code && data.code !== 'Invalid phone number') {
        resultContent.classList.remove('hidden');
        document.getElementById('pair-result').classList.remove('hidden');
        document.getElementById('qr-result').classList.add('hidden');
        document.getElementById('pair-code').textContent = data.code;
        showToast('✅ تم توليد كود الربط بنجاح!');
      } else {
        showError(data.code || 'حصل خطأ غير متوقع');
      }
    } catch (e) {
      loading.classList.add('hidden');
      showError('فشل الاتصال بالسيرفر، جرب تاني');
    }
  });
  
  // ═══ توليد كود QR ═══
  qrGenerateBtn.addEventListener('click', async () => {
    resultSection.classList.remove('hidden');
    loading.classList.remove('hidden');
    resultContent.classList.add('hidden');
    errorMessage.classList.add('hidden');
    
    try {
      const response = await fetch('/qr');
      const data = await response.json();
      
      loading.classList.add('hidden');
      
      if (data.qr) {
        resultContent.classList.remove('hidden');
        document.getElementById('qr-result').classList.remove('hidden');
        document.getElementById('pair-result').classList.add('hidden');
        document.getElementById('qr-image').src = data.qr;
        showToast('✅ تم توليد كود QR بنجاح!');
      } else {
        showError(data.code || 'حصل خطأ غير متوقع');
      }
    } catch (e) {
      loading.classList.add('hidden');
      showError('فشل الاتصال بالسيرفر، جرب تاني');
    }
  });
  
  // ═══ نسخ الكود ═══
  copyBtn.addEventListener('click', () => {
    const code = document.getElementById('pair-code').textContent;
    copyToClipboard(code);
  });
  
  // ═══ إظهار الخطأ ═══
  function showError(message) {
    resultContent.classList.add('hidden');
    errorMessage.classList.remove('hidden');
    document.getElementById('error-text').textContent = message;
  }
  
  // ═══ Enter لتوليد الكود ═══
  phoneInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      generateBtn.click();
    }
  });
});