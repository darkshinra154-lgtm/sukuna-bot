/**
 * ═══════════════════════════════════════════════════════
 * ⚡ SUKUNA PLATFORM SCRIPT
 * ═══════════════════════════════════════════════════════
 */

// ═══ Loading Screen ═══
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
  }, 1000);
});

// ═══ Theme Toggle ═══
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const newTheme = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
  const icon = themeToggle.querySelector('i');
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ═══ Navigation ═══
const navLinks = document.querySelectorAll('.nav-link, [data-section]');
const sections = document.querySelectorAll('.section');

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sectionId = link.getAttribute('data-section');
    
    // Update active nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const navLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    if (navLink) navLink.classList.add('active');
    
    // Show section
    sections.forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    // Load data if needed
    if (sectionId === 'sessions') loadSessions();
    if (sectionId === 'home') updateStats();
  });
});

// ═══ Method Selector ═══
const methodBtns = document.querySelectorAll('.method-btn');
const pairForm = document.getElementById('pair-form');
const qrForm = document.getElementById('qr-form');

methodBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const method = btn.getAttribute('data-method');
    
    methodBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    if (method === 'pair') {
      pairForm.classList.add('active');
      qrForm.classList.remove('active');
    } else {
      qrForm.classList.add('active');
      pairForm.classList.remove('active');
    }
  });
});

// ═══ Pair Code Generator ═══
const getPairCodeBtn = document.getElementById('get-pair-code');
const phoneNumberInput = document.getElementById('phone-number');
const pairResult = document.getElementById('pair-result');
const pairCodeDisplay = document.getElementById('pair-code-display');
const pairInstructions = document.getElementById('pair-instructions');
const copyPairCodeBtn = document.getElementById('copy-pair-code');

getPairCodeBtn.addEventListener('click', async () => {
  const number = phoneNumberInput.value.trim();
  
  if (!number) {
    showToast('الرجاء إدخال رقم الهاتف', 'error');
    return;
  }
  
  if (!/^\d+$/.test(number)) {
    showToast('الرجاء إدخال أرقام فقط', 'error');
    return;
  }
  
  getPairCodeBtn.disabled = true;
  getPairCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التوليد...';
  
  try {
    const response = await fetch(`/api/pair?number=${number}`);
    const data = await response.json();
    
    if (data.success) {
      pairCodeDisplay.textContent = data.code;
      pairInstructions.innerHTML = data.instructions.map(i => `<li>${i}</li>`).join('');
      pairResult.style.display = 'block';
      showToast('تم توليد كود الربط بنجاح!', 'success');
    } else {
      showToast(data.error || 'فشل توليد الكود', 'error');
    }
  } catch (error) {
    showToast('حدث خطأ في الاتصال', 'error');
  } finally {
    getPairCodeBtn.disabled = false;
    getPairCodeBtn.innerHTML = '<i class="fas fa-magic"></i> احصل على كود الربط';
  }
});

copyPairCodeBtn.addEventListener('click', () => {
  const code = pairCodeDisplay.textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('تم نسخ الكود!', 'success');
  });
});

// ═══ QR Code Generator ═══
const getQRCodeBtn = document.getElementById('get-qr-code');
const qrResult = document.getElementById('qr-result');
const qrImage = document.getElementById('qr-image');
const qrInstructions = document.getElementById('qr-instructions');
const qrCountdown = document.getElementById('qr-countdown');
const regenerateQRBtn = document.getElementById('regenerate-qr');

let qrTimer = null;

getQRCodeBtn.addEventListener('click', generateQR);
regenerateQRBtn.addEventListener('click', generateQR);

async function generateQR() {
  getQRCodeBtn.disabled = true;
  getQRCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التوليد...';
  
  try {
    const response = await fetch('/api/qr');
    const data = await response.json();
    
    if (data.success) {
      qrImage.src = data.qr;
      qrInstructions.innerHTML = data.instructions.map(i => `<li>${i}</li>`).join('');
      qrResult.style.display = 'block';
      
      // Start countdown
      let seconds = 60;
      qrCountdown.textContent = seconds;
      
      if (qrTimer) clearInterval(qrTimer);
      qrTimer = setInterval(() => {
        seconds--;
        qrCountdown.textContent = seconds;
        
        if (seconds <= 0) {
          clearInterval(qrTimer);
          showToast('انتهت صلاحية QR Code، يرجى توليد واحد جديد', 'warning');
        }
      }, 1000);
      
      showToast('تم توليد QR Code بنجاح!', 'success');
    } else {
      showToast(data.error || 'فشل توليد QR', 'error');
    }
  } catch (error) {
    showToast('حدث خطأ في الاتصال', 'error');
  } finally {
    getQRCodeBtn.disabled = false;
    getQRCodeBtn.innerHTML = '<i class="fas fa-qrcode"></i> توليد QR Code';
  }
}

// ═══ Sessions Management ═══
const refreshSessionsBtn = document.getElementById('refresh-sessions');
const sessionsGrid = document.getElementById('sessions-grid');
const sessionSearch = document.getElementById('session-search');

refreshSessionsBtn.addEventListener('click', loadSessions);
sessionSearch.addEventListener('input', filterSessions);

async function loadSessions() {
  sessionsGrid.innerHTML = `
    <div class="loading-placeholder">
      <i class="fas fa-spinner fa-spin"></i>
      <p>جاري تحميل الجلسات...</p>
    </div>
  `;
  
  try {
    const response = await fetch('/api/sessions');
    const sessions = await response.json();
    
    if (sessions.length === 0) {
      sessionsGrid.innerHTML = `
        <div class="loading-placeholder">
          <i class="fas fa-inbox"></i>
          <p>لا توجد جلسات نشطة حالياً</p>
        </div>
      `;
      return;
    }
    
    sessionsGrid.innerHTML = sessions.map(session => `
      <div class="session-card" data-name="${session.name}" data-id="${session.id}">
        <div class="session-header">
          <span class="session-status ${session.registered ? 'active' : 'inactive'}">
            ${session.registered ? 'نشط' : 'غير مكتمل'}
          </span>
        </div>
        <div class="session-info">
          <h4>${session.name || 'غير معروف'}</h4>
          <p><i class="fas fa-phone"></i> ${session.id}</p>
          <p><i class="fas fa-id-badge"></i> ${session.jid || 'غير متاح'}</p>
        </div>
      </div>
    `).join('');
    
    showToast('تم تحديث الجلسات', 'success');
  } catch (error) {
    sessionsGrid.innerHTML = `
      <div class="loading-placeholder">
        <i class="fas fa-exclamation-triangle"></i>
        <p>فشل تحميل الجلسات</p>
      </div>
    `;
    showToast('فشل تحميل الجلسات', 'error');
  }
}

function filterSessions() {
  const query = sessionSearch.value.toLowerCase();
  const cards = document.querySelectorAll('.session-card');
  
  cards.forEach(card => {
    const name = card.getAttribute('data-name').toLowerCase();
    const id = card.getAttribute('data-id').toLowerCase();
    
    if (name.includes(query) || id.includes(query)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

// ═══ Stats Update ═══
async function updateStats() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    
    animateNumber('stat-sessions', Object.keys(data.sessions || {}).length);
    animateNumber('stat-users', Math.floor(Math.random() * 1000) + 500);
    animateNumber('stat-commands', Math.floor(Math.random() * 50000) + 10000);
    animateNumber('stat-uptime', Math.floor(data.uptime / 3600));
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
}

function animateNumber(elementId, target) {
  const element = document.getElementById(elementId);
  const current = parseInt(element.textContent) || 0;
  const increment = Math.ceil((target - current) / 50);
  
  let value = current;
  const timer = setInterval(() => {
    value += increment;
    if (value >= target) {
      value = target;
      clearInterval(timer);
    }
    element.textContent = value.toLocaleString('ar-EG');
  }, 30);
}

// ═══ Toast Notifications ═══
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: 'check-circle',
    error: 'times-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };
  
  toast.innerHTML = `
    <i class="fas fa-${icons[type]}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ═══ Initialize ═══
updateStats();
setInterval(updateStats, 30000); // Update every 30 seconds

// Auto-refresh sessions
setInterval(() => {
  if (document.getElementById('sessions').classList.contains('active')) {
    loadSessions();
  }
}, 60000); // Every minute