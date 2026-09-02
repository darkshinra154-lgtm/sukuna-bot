/**
 * ═══════════════════════════════════════════════════════
 * 📊 DASHBOARD SCRIPT | جافاسكريبت لوحة التحكم
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * ═══════════════════════════════════════════════════════
 */

document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refresh-btn');
  
  // ═══ جلب البيانات ═══
  async function fetchData() {
    try {
      // جلب حالة المنصة
      const statusResponse = await fetch('/api/status');
      const statusData = await statusResponse.json();
      
      // تحديث الإحصائيات
      document.getElementById('total-sessions').textContent = statusData.sessionsCount || 0;
      document.getElementById('active-sessions').textContent = statusData.sessionsCount || 0;
      document.getElementById('uptime').textContent = formatUptime(statusData.uptime || 0);
      
      // جلب الجلسات
      const sessionsResponse = await fetch('/api/sessions');
      const sessionsData = await sessionsResponse.json();
      
      updateSessionsTable(sessionsData.sessions || []);
      
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  }
  
  // ═══ تحديث جدول الجلسات ═══
  function updateSessionsTable(sessions) {
    const tbody = document.getElementById('sessions-tbody');
    
    if (!sessions.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="loading-row">📭 مفيش جلسات حالياً</td></tr>';
      return;
    }
    
    tbody.innerHTML = sessions.map((session, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>📱 ${session}</td>
        <td><span class="status-badge status-active">✅ نشطة</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="deleteSession('${session}')">
            🗑️ حذف
          </button>
        </td>
      </tr>
    `).join('');
  }
  
  // ═══ حذف جلسة ═══
  window.deleteSession = async (number) => {
    if (!confirm(`هل أنت متأكد من حذف جلسة ${number}؟`)) return;
    
    try {
      const response = await fetch(`/api/session/${number}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        showToast('✅ تم حذف الجلسة بنجاح');
        fetchData();
      } else {
        showToast('❌ فشل حذف الجلسة', 'error');
      }
    } catch (e) {
      showToast('❌ حصل خطأ', 'error');
    }
  };
  
  // ═══ زر التحديث ═══
  refreshBtn.addEventListener('click', () => {
    fetchData();
    showToast('🔄 جاري التحديث...');
  });
  
  // ═══ تنسيق الوقت ═══
  function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days} يوم`;
    if (hours > 0) return `${hours} ساعة`;
    if (minutes > 0) return `${minutes} دقيقة`;
    return `${Math.floor(seconds)} ثانية`;
  }
  
  // ═══ تشغيل أولي ═══
  fetchData();
  
  // تحديث تلقائي كل 30 ثانية
  setInterval(fetchData, 30000);
});