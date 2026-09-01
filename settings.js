/**
 * ═══════════════════════════════════════════════════════
 * 🎛️ SUKUNA PLATFORM SETTINGS | إعدادات منصة سوكونا
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * ═══════════════════════════════════════════════════════
 */

global.author = 'Adam (Shadow)'
global.botname = 'Sukuna'
global.packname = 'Sukuna Platform'
global.platform = {
  name: 'Sukuna SubBot Platform',
  version: '2.0.0',
  author: 'Adam (Shadow)',
  team: 'Shadow Dev Team'
}

// مجلدات الجلسات
global.sessionsMain = 'sessions'
global.sessionsSub = 'session-sub'
global.sessionsFullPath = `./${global.sessionsMain}/${global.sessionsSub}`

// إعدادات الموقع
global.web = {
  port: process.env.PORT || 3000,
  host: '0.0.0.0',
  url: process.env.URL || 'http://localhost:3000'
}

// إعدادات التليجرام (لرفع الجلسات)
global.telegramBotToken = '8343902916:AAFyuOZBNYFPrTMKxHhq6tEaqte8RpRmmAA'
global.telegramSessionsChannel = '4465532873' // مثال: -1001234567890

// إعدادات التشفير
global.encryptionKey = process.env.ENCRYPTION_KEY || 'sukuna-platform-2025-secret-key'

// إعدادات المنصة
global.platformConfig = {
  maxSubBots: 50,
  sessionTimeout: 300000, // 5 دقائق
  autoCleanup: true,
  cleanupInterval: 3600000 // ساعة
}