/**
 * ═══════════════════════════════════════════════════════
 * ⚙️ WEBSITE SETTINGS | إعدادات منصة سوكونا
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: إعدادات بوت الموقع + قناة الجلسات
 * ═══════════════════════════════════════════════════════
 */

// توكن بوت الموقع (اللي هيبعت الجلسات للقناة)
// الأفضل تحطه في متغير بيئة: WEBSITE_TG_TOKEN
global.websiteBotToken = process.env.WEBSITE_TG_TOKEN || '8343902916:AAFyuOZBNYFPrTMKxHhq6tEaqte8RpRmmAA'

// معرف قناة الجلسات
global.sessionsChannelId = '-1004465532873'

// مجلد حفظ الجلسات الفرعية على الموقع
global.subSessionsDir = 'sessions/session-sub'

// معلومات البوت
global.botname = '【𝙎𝙐𝙆𝙐𝙉𝘼 ـᬼ ꙰💀⑅⃝𝘽𝙊𝙏】'
global.author = 'Adam (Shadow)'
global.wm = '【𝙎𝙐𝙆𝙐𝙉𝘼 ـᬼ ꙰👹⑅⃝𝘽𝙊𝙏】'