

/**
 * ═══════════════════════════════════════════════════════
 * ⚙️ SUKUNA PLATFORM CONFIG | إعدادات منصة سوكونا
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 🏷️ الحقوق: ${global.author}
 * 📜 الوصف: إعدادات الموقع + بوت مراقبة الجلسات
 * ═══════════════════════════════════════════════════════
 */

export const config = {
  // ═══ إعدادات السيرفر ═══
  PORT: 8000,
  HOST: '0.0.0.0',

  // ═══ إعدادات الجلسات (نفس مسار conexion.js) ═══
  sessionsDir: './sessions',
  // هذا هو المسار الذي يقرأه conexion.js للبوتات الفرعية
  subSessionsDir: './sessions/session-sub',

  // ═══ إعدادات Telegram ═══
  telegram: {
    token: '8343902916:AAFyuOZBNYFPrTMKxHhq6tEaqte8RpRmmAA',
    sessionsChannel: '@sukuna_sessions',
    owners: ('7374743956').split(',').filter(Boolean),
    checkInterval: 10000
  },

  // ═══ إعدادات البوت (مطابقة تماماً لبوت الواتساب الرئيسي) ═══
  bot: {
    browser: ['Ubuntu', 'Chrome'],
    defaultCountryCode: '20',
    keepAliveIntervalMs: 55000,
    maxIdleTimeMs: 60000,
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    retryRequestDelayMs: 250,
    maxRetries: 5
  },

  // ═══ معلومات المنصة ═══
  platform: {
    name: 'Sukuna Platform',
    version: '3.0.0',
    developer: 'Adam (Shadow)',
    team: 'Shadow Team',
    botName: 'SUKUNA'
  }
}

export default config