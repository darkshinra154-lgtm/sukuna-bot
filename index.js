/**
 * ═══════════════════════════════════════════════════════
 * 🚀 SUKUNA PLATFORM SERVER | خادم منصة سوكونا
 * ═══════════════════════════════════════════════════════
 * 👑 المطور: آدم (شادو) | Adam (Shadow)
 * 🤖 البوت: سوكونا | Sukuna
 * 🏷️ الحقوق: ${global.author}
 * 📜 الوصف: خادم ويب احترافي لإدارة بوتات سوكونا الفرعية
 * ═══════════════════════════════════════════════════════
 */

import './settings.js'
import express from 'express'
import bodyParser from 'body-parser'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import chalk from 'chalk'
import cfonts from 'cfonts'
import pairRouter from './pair.js'
import qrRouter from './qr.js'
import SessionMonitor from './lib/session-monitor.js'

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = global.web.port

// ═══ عرض شعار المنصة ═══
console.log(chalk.magentaBright('\nStarting Sukuna Platform...'))
cfonts.say('SUKUNA', {
  font: 'simple',
  align: 'left',
  gradient: ['red', 'yellow']
})
cfonts.say('Platform v2.0', {
  font: 'console',
  align: 'center',
  colors: ['cyan', 'magenta']
})

// ═══ Middleware ═══
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))

// ═══ Routes ═══
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'))
})

app.get('/pair', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pair.html'))
})

app.get('/qr', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr.html'))
})

app.use('/api/pair', pairRouter)
app.use('/api/qr', qrRouter)

// ═══ API للإحصائيات ═══
app.get('/api/stats', (req, res) => {
  const sessionsPath = path.join(process.cwd(), global.sessionsMain, global.sessionsSub)
  let sessionCount = 0

  try {
    if (fs.existsSync(sessionsPath)) {
      sessionCount = fs.readdirSync(sessionsPath).length
    }
  } catch {}

  res.json({
    platform: global.platform,
    sessions: sessionCount,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
})

// ═══ بدء الخادم ═══
app.listen(PORT, global.web.host, async () => {
  console.log(chalk.cyan('\n╔════════════════════════════════════════╗'))
  console.log(chalk.cyan('║') + chalk.green(` 🚀 Server running on http://localhost:${PORT}`) + chalk.cyan('║'))
  console.log(chalk.cyan('╚════════════════════════════════════════╝\n'))

  // بدء مراقب الجلسات
  const monitor = new SessionMonitor()
  await monitor.start()
})

export default app