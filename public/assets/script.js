/**
 * ═══════════════════════════════════════════════════════
 * ⚡ MAIN SCRIPT | الجافاسكريبت الأساسي
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * ═══════════════════════════════════════════════════════
 */

// ═══ جلب إحصائيات المنصة ═══
async function fetchPlatformStats() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    
    // تحديث عدد الجلسات في الصفحة الرئيسية
    const statSessions = document.getElementById('stat-sessions');
    if (statSessions) {
      statSessions.textContent = data.sessionsCount || 0;
    }
    
    return data;
  } catch (e) {
    console.error('Error fetching stats:', e);
    return null;
  }
}

// ═══ تشغيل عند تحميل الصفحة ═══
document.addEventListener('DOMContentLoaded', () => {
  fetchPlatformStats();
});

// ═══ تأثيرات حركية عند التمرير ═══
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

// مراقبة العناصر
document.querySelectorAll('.feature-card, .step, .team-card, .stat-card').forEach(el => {
  observer.observe(el);
});

// ═══ تأثير الكتابة في الـ Hero ═══
const heroTitle = document.querySelector('.hero-title');
if (heroTitle) {
  heroTitle.style.opacity = '0';
  heroTitle.style.transform = 'translateY(20px)';
  
  setTimeout(() => {
    heroTitle.style.transition = 'all 0.8s ease';
    heroTitle.style.opacity = '1';
    heroTitle.style.transform = 'translateY(0)';
  }, 300);
}

// ═══ نسخ للنص ═══
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ تم النسخ بنجاح!');
  }).catch(() => {
    showToast('❌ فشل النسخ');
  });
}

// ═══ إشعارات ═══
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ═══ تنسيق الوقت ═══
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

// ═══ إضافة أنماط الإشعارات ═══
const style = document.createElement('style');
style.textContent = `
  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    padding: 16px 32px;
    border-radius: 12px;
    font-family: 'Cairo', sans-serif;
    font-weight: 600;
    z-index: 9999;
    transition: transform 0.3s ease;
  }
  
  .toast.show {
    transform: translateX(-50%) translateY(0);
  }
  
  .toast-success {
    background: #10b981;
    color: white;
  }
  
  .toast-error {
    background: #ef4444;
    color: white;
  }
  
  .visible {
    animation: fadeInUp 0.6s ease forwards;
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);