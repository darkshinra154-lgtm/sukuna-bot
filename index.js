/**
 * ═══════════════════════════════════════════════════════
 * 🚀 SUKUNA PLATFORM | منصة تنصيب سوكونا
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 🏷️ الحقوق: ${global.author}
 * 📜 الوصف: منصة ويب لتنصيب بوتات واتساب فرعية
 * ═══════════════════════════════════════════════════════
 */

import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import chalk from 'chalk';
import { startSessionWatcher } from './lib/session-watcher.js';

import pairRouter from './routes/pair.js';
import qrRouter from './routes/qr.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

// زيادة حد المستمعين
import('events').then(events => {
  events.EventEmitter.defaultMaxListeners = 500;
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/pair', pairRouter);
app.use('/api/qr', qrRouter);

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Sukuna Platform',
    version: '2.0.0',
    uptime: process.uptime(),
    sessions: global.subBotSessions || {}
  });
});

// Main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(chalk.cyan('\n╔════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.yellow('🕸 SUKUNA PLATFORM STARTED') + chalk.cyan('║'));
  console.log(chalk.cyan('╚════════════════════════════════════════╝'));
  console.log(chalk.green(`✅ Server running on: http://localhost:${PORT}`));
  console.log(chalk.blue(`📡 API Status: http://localhost:${PORT}/api/status`));
  
  // بدء مراقب الجلسات
  await startSessionWatcher().catch(err => {
    console.error(chalk.red('[WATCHER] فشل بدء مراقب الجلسات:'), err.message);
  });
});

export default app;