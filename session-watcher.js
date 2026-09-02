/**
 * ═══════════════════════════════════════════════════════
 * 👁️ SESSION WATCHER | مراقب الجلسات الذكي
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 📜 الوصف: يراقب مجلد session-sub ويرفع الجلسات الجديدة على تليجرام
 * ═══════════════════════════════════════════════════════
 */

import fs from 'fs';
import path from 'path';
import { Telegraf } from 'telegraf';

let tgBot = null;
let postedSessions = new Set();
let isWatching = false;

async function sendToTelegram(sessionInfo) {
  if (!tgBot || !globalThis.telegramSessionChannel) {
    console.log('⚠️ [WATCHER] التليجرام أو القناة غير مهيأة');
    return false;
  }

  try {
    const message = [
      '🕸 ════════════════════════════ 🕸',
      '      *🆕 جلسة جديدة!*',
      '🕸 ════════════════════════════ 🕸',
      '',
      `📱 *الرقم:* \`${sessionInfo.number}\``,
      `👤 *الاسم:* ${sessionInfo.name}`,
      `🆔 *JID:* \`${sessionInfo.jid}\``,
      `⏰ *الوقت:* ${new Date().toLocaleString('ar-SA')}`,
      '',
      '📂 *المسار:* `sessions/session-sub/' + sessionInfo.number + '/`',
      '',
      '🕸 ════════════════════════════ 🕸',
      '🤖 *Sukuna Platform v2.0*',
      '👑 *Developed by: Adam (Shadow)*',
      '🕸 ════════════════════════════ 🕸'
    ].join('\n');

    await tgBot.telegram.sendMessage(globalThis.telegramSessionChannel, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });

    console.log(`✅ [WATCHER] تم رفع الجلسة على التليجرام: ${sessionInfo.number}`);
    return true;
  } catch (e) {
    console.error('❌ [WATCHER] فشل الإرسال للتليجرام:', e.message);
    return false;
  }
}

function processSession(sessionDir) {
  const number = path.basename(sessionDir);
  const credsPath = path.join(sessionDir, 'creds.json');

  if (postedSessions.has(number)) return;
  if (!fs.existsSync(credsPath)) return;

  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    const sessionInfo = {
      number: number,
      name: creds.me?.name || 'غير معروف',
      jid: creds.me?.id || 'غير معروف',
      path: sessionDir
    };

    postedSessions.add(number);
    sendToTelegram(sessionInfo);
  } catch (e) {
    console.error(`❌ [WATCHER] خطأ في قراءة جلسة ${number}:`, e.message);
  }
}

function scanExistingSessions() {
  if (!fs.existsSync(globalThis.subSessionsDir)) return;
  
  const dirs = fs.readdirSync(globalThis.subSessionsDir);
  for (const dir of dirs) {
    const fullPath = path.join(globalThis.subSessionsDir, dir);
    if (fs.statSync(fullPath).isDirectory()) {
      processSession(fullPath);
    }
  }
}

function startWatching() {
  if (isWatching || !fs.existsSync(globalThis.subSessionsDir)) return;
  isWatching = true;

  // استخدام fs.watch لمراقبة المجلد
  fs.watch(globalThis.subSessionsDir, { recursive: false }, (eventType, filename) => {
    if (!filename) return;
    
    const fullPath = path.join(globalThis.subSessionsDir, filename);
    
    // انتظار حتى يكتمل نسخ creds.json
    setTimeout(() => {
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        const credsPath = path.join(fullPath, 'creds.json');
        if (fs.existsSync(credsPath)) {
          processSession(fullPath);
        }
      }
    }, 2000);
  });

  console.log(`👁️ [WATCHER] مراقبة مجلد: ${globalThis.subSessionsDir}`);
}

export async function startSessionWatcher() {
  console.log('🚀 [WATCHER] بدء مراقب الجلسات...');

  // محاولة الاتصال ببوت التليجرام
  if (globalThis.telegramToken && globalThis.telegramSessionChannel) {
    try {
      tgBot = new Telegraf(globalThis.telegramToken);
      await tgBot.telegram.getMe();
      console.log('✅ [WATCHER] بوت التليجرام متصل');
    } catch (e) {
      console.error('❌ [WATCHER] فشل الاتصال ببوت التليجرام:', e.message);
      tgBot = null;
    }
  } else {
    console.log('⚠️ [WATCHER] لم يتم تحديد توكن التليجرام أو القناة');
  }

  // مسح الجلسات الموجودة
  scanExistingSessions();

  // بدء المراقبة
  startWatching();

  // فحص دوري كاحتياط
  setInterval(() => {
    if (fs.existsSync(globalThis.subSessionsDir)) {
      const dirs = fs.readdirSync(globalThis.subSessionsDir);
      for (const dir of dirs) {
        const fullPath = path.join(globalThis.subSessionsDir, dir);
        if (fs.statSync(fullPath).isDirectory() && !postedSessions.has(dir)) {
          processSession(fullPath);
        }
      }
    }
  }, 10000);
}