/**
 * ═══════════════════════════════════════════════════════
 * 🌐 SUKUNA PLATFORM | منصة سوكونا الرئيسية
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 🏷️ الحقوق: Adam (Shadow)
 * 📜 الوصف: السيرفر الرئيسي للموقع + مراقب الجلسات + جسر التليجرام
 * ═══════════════════════════════════════════════════════
 */

import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { startSessionWatcher } from './session-watcher.js';
import pairRouter from './pair.js';
import qrRouter from './qr.js';

// ═══ إعدادات Express ═══
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

// زيادة الحد الأقصى لـ EventListeners
import('events').then(events => {
  events.EventEmitter.defaultMaxListeners = 500;
});

// ═══ إعداد الجلسات ═══
globalThis.sessions = globalThis.sessions || 'sessions';
globalThis.subSessionsDir = path.join(process.cwd(), globalThis.sessions, 'session-sub');
if (!fs.existsSync(globalThis.subSessionsDir)) {
  fs.mkdirSync(globalThis.subSessionsDir, { recursive: true });
}

// ═══ توكن التليجرام ═══
globalThis.telegramToken = process.env.TELEGRAM_TOKEN || globalThis.telegramToken || '';
globalThis.telegramSessionChannel = process.env.TELEGRAM_SESSION_CHANNEL || globalThis.telegramSessionChannel || '';

// ═══ Middleware ═══
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ═══ Routes ═══
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/pair', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pair.html'));
});

app.get('/qr', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr.html'));
});

app.get('/sessions', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sessions.html'));
});

// ═══ API Endpoints ═══
app.use('/api/pair', pairRouter);
app.use('/api/qr', qrRouter);

// جلب قائمة الجلسات النشطة
app.get('/api/sessions', (req, res) => {
  try {
    const sessions = [];
    if (fs.existsSync(globalThis.subSessionsDir)) {
      const dirs = fs.readdirSync(globalThis.subSessionsDir);
      for (const dir of dirs) {
        const credsPath = path.join(globalThis.subSessionsDir, dir, 'creds.json');
        if (fs.existsSync(credsPath)) {
          try {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
            sessions.push({
              number: dir,
              name: creds.me?.name || 'غير معروف',
              jid: creds.me?.id || '',
              createdAt: fs.statSync(credsPath).birthtime.toISOString()
            });
          } catch {}
        }
      }
    }
    res.json({ success: true, count: sessions.length, sessions });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// إحصائيات المنصة
app.get('/api/stats', (req, res) => {
  try {
    let totalSessions = 0;
    if (fs.existsSync(globalThis.subSessionsDir)) {
      totalSessions = fs.readdirSync(globalThis.subSessionsDir).length;
    }
    res.json({
      success: true,
      stats: {
        totalSessions,
        uptime: process.uptime(),
        platform: 'Sukuna Platform v2.0',
        developer: 'Adam (Shadow)'
      }
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ═══ بدء السيرفر ═══
app.listen(PORT, async () => {
  console.log(chalk.magenta('\n╔════════════════════════════════════════╗'));
  console.log(chalk.magenta('║') + chalk.cyan('  🕸 SUKUNA PLATFORM v2.0') + chalk.magenta('               ║'));
  console.log(chalk.magenta('║') + chalk.white(`  🌐 Server: http://localhost:${PORT}`) + chalk.magenta('       ║'));
  console.log(chalk.magenta('║') + chalk.yellow('  👑 Developer: Adam (Shadow)') + chalk.magenta('         ║'));
  console.log(chalk.magenta('╚════════════════════════════════════════╝\n'));

  // بدء مراقب الجلسات
  try {
    await startSessionWatcher();
  } catch (e) {
    console.error(chalk.red('[WATCHER] فشل بدء مراقب الجلسات:'), e.message);
  }
});

export default app;